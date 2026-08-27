#!/usr/bin/env node
/**
 * tools/rebuild-index.mjs — walidacja wpisów manifestacji + budowa data/index.json.
 *
 *   node tools/rebuild-index.mjs           # waliduj i zapisz data/index.json
 *   node tools/rebuild-index.mjs --check   # waliduj i porównaj z istniejącym indeksem
 *                                          # (kod 1 przy rozbieżności/błędzie)
 *
 * Zasady: docs/PROTOKOL.md, docs/ARCHITECTURE.md, ADR 0002/0005/0006.
 * Indeks jest deterministyczny (sortowanie po slugu) — bez znaczników czasu.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const KATALOG_WPISOW = join(ROOT, 'data', 'manifestations');
export const PLIK_INDEKSU = join(ROOT, 'data', 'index.json');

/** Rama promptu wizualizacji 21:9 — DOKŁADNIE jak w docs/PROTOKOL.md §5 (ADR 0005). */
export const RAMA_OTWARCIA =
  'Style: A wide-angle full-body cinematic photograph. The central objects/persons of the photo are visible from head to toe, standing centrally in the frame. No parts of the body are cropped.';
export const RAMA_ZAMKNIECIA =
  'Captured with a 35mm anamorphic lens at f/1.8. Shallow depth of field with a heavy, creamy bokeh background. Environmental portraiture. Dramatic cinematic lighting, sharp focus on the character, hyper-realistic textures of clothing and skin. Shot on 70mm film stock, ultra-wide 21:9 aspect ratio. --ar 21:9';

/** Słowa zabronione w treści sceny promptu (protokół: fotografia, nie malarstwo). */
const ZAKAZANE_W_PROMPCIE = ['figurine', 'diorama', 'miniature', 'render', 'painting', 'illustration'];

const RE_SLUG = /^[a-z0-9-]+$/;
const RE_TAG = /^[a-ząćęłńóśźż0-9-]+$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

const WYMAGANE_ELEMENTY_TABELI = ['Nazwa', 'Mechanika', 'Ilustracja', 'Flavor text', 'Lore/Tło'];

const jestStr = (v) => typeof v === 'string' && v.trim().length > 0;

/** Waliduje jeden wpis; zwraca listę błędów (pusta = OK). */
export function walidujWpis(w) {
  const e = [];
  const blad = (m) => e.push(m);

  if (!jestStr(w.slug) || !RE_SLUG.test(w.slug)) blad('slug: wymagane ^[a-z0-9-]+$');
  if (!jestStr(w.nazwa)) blad('nazwa: brak');

  if (!Array.isArray(w.nazwy_alternatywne ?? [])) blad('nazwy_alternatywne: ma być tablicą');

  const k = w.karta ?? {};
  if (!jestStr(k.nazwa)) blad('karta.nazwa: brak (nazwa karty MtG będącej inspiracją)');
  if (k.rok !== undefined && !Number.isInteger(k.rok)) blad('karta.rok: ma być liczbą całkowitą');

  const l = w.lokalizacja ?? {};
  if (!jestStr(l.miejscowosc)) blad('lokalizacja.miejscowosc: brak');
  if (!jestStr(l.kraj)) blad('lokalizacja.kraj: brak');
  if (!Number.isFinite(l.lat) || l.lat < -90 || l.lat > 90) blad('lokalizacja.lat: poza zakresem [-90, 90]');
  if (!Number.isFinite(l.lon) || l.lon < -180 || l.lon > 180) blad('lokalizacja.lon: poza zakresem [-180, 180]');

  if (!jestStr(w.pochodzenie_i_kultura)) blad('pochodzenie_i_kultura: brak');

  const r = w.rezonans ?? {};
  if (!jestStr(r.klucz_przywolania)) blad('rezonans.klucz_przywolania: brak');
  const tabela = r.tabela ?? [];
  if (!Array.isArray(tabela) || tabela.length < WYMAGANE_ELEMENTY_TABELI.length) {
    blad(`rezonans.tabela: wymagane >= ${WYMAGANE_ELEMENTY_TABELI.length} wierszy`);
  }
  if (Array.isArray(tabela)) {
    const elementy = tabela.map((wiersz) => wiersz?.element);
    for (const el of WYMAGANE_ELEMENTY_TABELI) {
      if (!elementy.includes(el)) blad(`rezonans.tabela: brak wiersza "${el}"`);
    }
    for (const wiersz of tabela) {
      if (!jestStr(wiersz?.element) || !jestStr(wiersz?.translacja)) {
        blad('rezonans.tabela: każdy wiersz wymaga {element, translacja}');
        break;
      }
    }
  }

  const n = w.natura ?? {};
  for (const pole of [
    'wyglad_i_aura',
    'charakter_i_motywacje',
    'zdolnosci',
    'slabosci_i_metody_pokonania',
    'preferencje',
  ]) {
    if (!jestStr(n[pole])) blad(`natura.${pole}: brak (protokół II)`);
  }

  if (!Array.isArray(w.dokumentacja) || w.dokumentacja.length === 0) {
    blad('dokumentacja: wymagana co najmniej 1 pozycja (protokół III)');
  } else {
    for (const d of w.dokumentacja) {
      if (!jestStr(d?.typ) || !jestStr(d?.pozycja)) {
        blad('dokumentacja: każdy wpis wymaga {typ, pozycja}');
        break;
      }
    }
  }

  const v = w.wizualizacja ?? {};
  if (!jestStr(v.prompt)) {
    blad('wizualizacja.prompt: brak (protokół IV)');
  } else {
    if (!v.prompt.startsWith(RAMA_OTWARCIA)) blad('wizualizacja.prompt: nie zaczyna się ramą otwarcia 21:9 (docs/PROTOKOL.md §5)');
    if (!v.prompt.endsWith(RAMA_ZAMKNIECIA)) blad('wizualizacja.prompt: nie kończy się ramą zamknięcia 21:9 (docs/PROTOKOL.md §5)');
    const srodek = v.prompt.slice(RAMA_OTWARCIA.length, v.prompt.length - RAMA_ZAMKNIECIA.length).trim();
    if (srodek.length < 100) blad('wizualizacja.prompt: treść sceny zbyt uboga (>= 100 znaków opisu bytu i otoczenia)');
    const zakazane = ZAKAZANE_W_PROMPCIE.filter((s) => v.prompt.toLowerCase().includes(s));
    if (zakazane.length) blad(`wizualizacja.prompt: zakazane słowa (${zakazane.join(', ')}) — celem jest fotografia, nie malarstwo`);
  }
  if (v.obraz !== undefined && v.obraz !== null && !jestStr(v.obraz)) blad('wizualizacja.obraz: ścieżka lub null');

  const t = w.trofea ?? {};
  if (!jestStr(t.pierwotne)) blad('trofea.pierwotne: brak (protokół V)');

  const tagi = w.tagi ?? [];
  if (!Array.isArray(tagi) || tagi.length === 0) blad('tagi: wymagany co najmniej 1 tag');
  else {
    for (const tag of tagi) if (!RE_TAG.test(tag)) blad(`tagi: "${tag}" łamie konwencję (małe litery, myślniki, bez spacji)`);
    if (new Set(tagi).size !== tagi.length) blad('tagi: duplikaty');
  }

  const m = w.meta ?? {};
  if (!jestStr(m.utworzono) || !RE_DATA.test(m.utworzono)) blad('meta.utworzono: brak lub zły format (RRRR-MM-DD)');
  if (!Array.isArray(m.modyfikacje ?? [])) blad('meta.modyfikacje: ma być tablicą');
  for (const mod of m.modyfikacje ?? []) {
    if (!jestStr(mod?.data) || !RE_DATA.test(mod.data) || !jestStr(mod?.opis)) {
      blad('meta.modyfikacje: każdy wpis wymaga {data, opis}');
      break;
    }
  }

  return e;
}

/** Walidacja referencyjna (powiązania) — wymaga zbioru wszystkich slugów. */
export function walidujPowiazania(w, wszystkieSlugi) {
  const e = [];
  const p = w.powiazania ?? [];
  if (!Array.isArray(p)) return ['powiazania: ma być tablicą'];
  const slugi = p.map((x) => x?.slug);
  for (const x of p) {
    if (!jestStr(x?.slug) || !jestStr(x?.opis)) {
      e.push('powiazania: każdy wpis wymaga {slug, opis}');
      break;
    }
    if (x.slug === w.slug) e.push('powiazania: self-link zabroniony');
    if (!wszystkieSlugi.has(x.slug)) e.push(`powiazania: slug "${x.slug}" nie istnieje w data/manifestations/`);
  }
  if (new Set(slugi).size !== slugi.length) e.push('powiazania: duplikaty slugów');
  return e;
}

/** Buduje deterministyczny indeks z tablicy zwalidowanych wpisów. */
export function zbudujIndeks(wpisy) {
  const posortowane = [...wpisy].sort((a, b) => a.slug.localeCompare(b.slug, 'pl'));
  const rekordy = posortowane.map((w) => ({
    slug: w.slug,
    nazwa: w.nazwa,
    nazwy_alternatywne: w.nazwy_alternatywne ?? [],
    karta: w.karta?.nazwa ?? '',
    miejscowosc: w.lokalizacja?.miejscowosc ?? '',
    kraj: w.lokalizacja?.kraj ?? '',
    lat: w.lokalizacja?.lat,
    lon: w.lokalizacja?.lon,
    tagi: [...(w.tagi ?? [])].sort((a, b) => a.localeCompare(b, 'pl')),
    powiazania: (w.powiazania ?? []).map((p) => p.slug).sort((a, b) => a.localeCompare(b, 'pl')),
    backlinki: [],
    obraz: w.wizualizacja?.obraz ?? null,
  }));
  const mapa = new Map(rekordy.map((r) => [r.slug, r]));
  for (const r of rekordy) {
    for (const cel of r.powiazania) {
      const docelowy = mapa.get(cel);
      if (docelowy && !docelowy.backlinki.includes(r.slug)) docelowy.backlinki.push(r.slug);
    }
  }
  for (const r of rekordy) r.backlinki.sort((a, b) => a.localeCompare(b, 'pl'));

  const tagi = {};
  for (const r of rekordy) for (const t of r.tagi) (tagi[t] ??= []).push(r.slug);
  for (const t of Object.keys(tagi)) tagi[t].sort((a, b) => a.localeCompare(b, 'pl'));
  const posortowaneTagi = {};
  for (const t of Object.keys(tagi).sort((a, b) => a.localeCompare(b, 'pl'))) posortowaneTagi[t] = tagi[t];

  return { wersja: 1, liczba: rekordy.length, tagi: posortowaneTagi, manifestacje: rekordy };
}

/** Wczytuje i waliduje cały katalog wpisów; rzuca przy błędach (z pełnym raportem). */
export async function wczytajIKwaliduj(katalog = KATALOG_WPISOW) {
  const pliki = (await readdir(katalog)).filter((f) => f.endsWith('.json')).sort();
  if (pliki.length === 0) throw new Error(`Brak plików .json w ${katalog}`);
  const wpisy = [];
  const bledy = [];
  for (const f of pliki) {
    const sciezka = join(katalog, f);
    let w;
    try {
      w = JSON.parse(await readFile(sciezka, 'utf8'));
    } catch (err) {
      bledy.push(`${f}: niepoprawny JSON (${err.message})`);
      continue;
    }
    const oczekiwanySlug = basename(f, '.json');
    if (w.slug !== oczekiwanySlug) bledy.push(`${f}: slug "${w.slug}" ≠ nazwa pliku "${oczekiwanySlug}"`);
    for (const blad of walidujWpis(w)) bledy.push(`${f}: ${blad}`);
    wpisy.push(w);
  }
  const slugi = new Set(wpisy.map((w) => w.slug));
  if (slugi.size !== wpisy.length) bledy.push('duplikaty slugów w katalogu wpisów');
  for (const w of wpisy) for (const blad of walidujPowiazania(w, slugi)) bledy.push(`${w.slug}.json: ${blad}`);
  if (bledy.length) {
    const raport = ['Walidacja wpisów NIEPRZESZŁA:', ...bledy.map((b) => `  - ${b}`)].join('\n');
    throw new Error(raport);
  }
  return wpisy;
}

async function main() {
  const trybCheck = process.argv.includes('--check');
  const wpisy = await wczytajIKwaliduj();
  const indeks = zbudujIndeks(wpisy);
  const tresc = JSON.stringify(indeks, null, 2) + '\n';
  if (trybCheck) {
    let istniejacy = '';
    try {
      istniejacy = await readFile(PLIK_INDEKSU, 'utf8');
    } catch {
      console.error(`--check: brak ${PLIK_INDEKSU}. Uruchom npm run build.`);
      process.exit(1);
    }
    if (istniejacy !== tresc) {
      console.error('--check: data/index.json nie zgadza się z wpisami. Uruchom npm run build i wcommituj indeks.');
      process.exit(1);
    }
    console.log(`OK: ${indeks.liczba} wpisów, indeks spójny (${Object.keys(indeks.tagi).length} tagów).`);
  } else {
    await writeFile(PLIK_INDEKSU, tresc, 'utf8');
    console.log(`Zbudowano ${PLIK_INDEKSU}: ${indeks.liczba} wpisów, ${Object.keys(indeks.tagi).length} tagów.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
