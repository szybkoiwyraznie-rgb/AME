#!/usr/bin/env node
/**
 * tools/rebuild-index.mjs — walidacja wpisów manifestacji + budowa data/index.json.
 *
 *   node tools/rebuild-index.mjs           # waliduj i zapisz data/index.json
 *   node tools/rebuild-index.mjs --check   # waliduj i porównaj z istniejącym indeksem
 *                                          # (kod 1 przy rozbieżności/błędzie)
 *
 * Zasady: docs/PROTOKOL.md (w tym §8 — SKITy), docs/ARCHITECTURE.md,
 * ADR 0002/0005/0006/0008/0013.
 * Indeks jest deterministyczny (sortowanie po slugu) — bez znaczników czasu.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const KATALOG_WPISOW = join(ROOT, 'data', 'manifestations');
export const KATALOG_SKITOW = join(ROOT, 'data', 'skity');
export const PLIK_INDEKSU = join(ROOT, 'data', 'index.json');

/** Rama promptu wizualizacji 21:9 — DOKŁADNIE jak w docs/PROTOKOL.md §5 (ADR 0005). */
export const RAMA_OTWARCIA =
  'Style: A wide-angle full-body cinematic photograph. The central objects/persons of the photo are visible from head to toe, standing centrally in the frame. No parts of the body are cropped.';
export const RAMA_ZAMKNIECIA =
  'Captured with a 35mm anamorphic lens at f/1.8. Shallow depth of field with a heavy, creamy bokeh background. Environmental portraiture. Dramatic cinematic lighting, sharp focus on the character, hyper-realistic textures of clothing and skin. Shot on 70mm film stock, ultra-wide 21:9 aspect ratio. --ar 21:9';

/** Słowa zabronione w treści sceny promptu (protokół: fotografia, nie malarstwo). */
const ZAKAZANE_W_PROMPCIE = ['figurine', 'diorama', 'miniature', 'render', 'painting', 'illustration'];

const RE_SLUG = /^[a-z0-9-]+$/;
/** Limity SKITa (zlecenie właściciela 2026-08-28, PROTOKÓŁ §8, ADR 0013). */
export const SKIT_MIN_UCZESTNIKOW = 2;
export const SKIT_MAX_UCZESTNIKOW = 4;
export const SKIT_MAX_SLOW = 250;
export const SKIT_MIN_SLOW = 60;
/** Zakazany żargon gry w SKITcie — to rozmowa bytów, nie kart (PROTOKÓŁ §8.3). */
const ZAKAZANY_ZARGON = /\b(mana|P\/T|oracle|booster|deck|life total|sorcery|instant|endure|fetch land|commander)\b/i;
/** Jedna replika: „**Imię:** tekst”. */
const RE_WYPOWIEDZ = /^\*\*[^*\n]{1,40}:\*\*/;
/** Adres źródła w sieci WWW — tylko pełny http(s), nic więcej (B3, ADR 0008). */
const RE_URL = /^https?:\/\/\S+$/i;
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
      if (d?.url !== undefined && d?.url !== null && !RE_URL.test(String(d.url).trim())) {
        blad(`dokumentacja: url musi być pełnym adresem http(s) (dostano: ${JSON.stringify(d.url)})`);
      }
    }
    if (!w.dokumentacja.some((d) => RE_URL.test(String(d?.url ?? '').trim()))) {
      blad('dokumentacja: co najmniej jedno źródło musi mieć url prowadzący do niego w sieci (protokół III, ADR 0008)');
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

/** Liczba słów w tekście SKITa (limit protokołu: 250). */
export function liczbaSlow(tekst) {
  return String(tekst ?? '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Waliduje jeden SKIT; zwraca listę błędów (pusta = OK).
 * `slugiManifestacji` — zbiór istniejących wpisów; uczestnicy muszą do
 * niego należeć (inaczej sekcja VI wpisu donikąd nie prowadzi).
 */
export function walidujSkit(s, slugiManifestacji = new Set()) {
  const e = [];
  const blad = (m) => e.push(m);

  if (!jestStr(s.slug) || !RE_SLUG.test(s.slug)) blad('slug: wymagane ^[a-z0-9-]+$');
  if (!jestStr(s.tytul)) blad('tytul: brak (SKIT dostaje nagłówek „SKIT: <tytuł>”)');

  const u = s.uczestnicy;
  if (!Array.isArray(u) || u.length < SKIT_MIN_UCZESTNIKOW) {
    blad(`uczestnicy: wymagane ${SKIT_MIN_UCZESTNIKOW}–${SKIT_MAX_UCZESTNIKOW} materializacje`);
  } else {
    if (u.length > SKIT_MAX_UCZESTNIKOW) blad(`uczestników nie może być więcej niż ${SKIT_MAX_UCZESTNIKOW}`);
    const slugi = [];
    for (const x of u) {
      if (!jestStr(x?.imie) || !jestStr(x?.slug)) {
        blad('uczestnicy: każdy wpis wymaga {imie, slug}');
        continue;
      }
      if (!slugiManifestacji.has(x.slug)) blad(`uczestnicy: slug „${x.slug}” nie istnieje w data/manifestations/`);
      slugi.push(x.slug);
    }
    if (new Set(slugi).size !== slugi.length) blad('uczestnicy: duplikat tej samej materializacji w jednym skicie');
  }

  if (!jestStr(s.tekst)) blad('tekst: brak (dialog postaci)');
  else {
    const slow = liczbaSlow(s.tekst);
    if (slow > SKIT_MAX_SLOW) blad(`tekst: ${slow} słów — limit protokołu to ${SKIT_MAX_SLOW}`);
    if (slow < SKIT_MIN_SLOW) blad(`tekst: ${slow} słów — za krótko na rozmowę (min. ${SKIT_MIN_SLOW})`);
    const wiersze = s.tekst.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const repliki = wiersze.filter((l) => RE_WYPOWIEDZ.test(l));
    if (repliki.length < SKIT_MIN_UCZESTNIKOW) {
      blad(`tekst: oczekiwano co najmniej ${SKIT_MIN_UCZESTNIKOW} replik w formie „**Imię:** …”`);
    }
    const imiona = new Set(repliki.map((l) => l.slice(2, l.indexOf(':**')).trim()));
    for (const nazwa of u ?? []) {
      if (jestStr(nazwa?.imie) && !imiona.has(nazwa.imie.trim())) blad(`tekst: uczestnik „${nazwa.imie}” nie zabiera głosu`);
    }
    for (const nazwa of imiona) {
      if (jestStr(s.uczestnicy) === false && !(u ?? []).some((x) => x?.imie?.trim() === nazwa)) {
        blad(`tekst: głos „${nazwa}” należy do postaci spoza uczestników`);
      }
    }
    const zargon = s.tekst.match(ZAKAZANY_ZARGON);
    if (zargon) blad(`tekst: zakazany żargon gry („${zargon[0]}”) — SKIT to rozmowa bytów, nie kart (PROTOKÓŁ §8.3)`);
    if (/\bkart\w*\s+(?:MtG|Magic)\b/i.test(s.tekst) || /Scryfall/i.test(s.tekst)) {
      blad('tekst: zakaz odwołań do kart i zestawów (PROTOKÓŁ §8.3)');
    }
  }

  const m = s.meta ?? {};
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

/**
 * Zestaw uczestników musi być unikalny w całej bazie (zlecenie właściciela:
 * zakaz powtarzania składu). Zwraca listę błędów.
 */
export function walidujUnikalnoscSkitow(skiti) {
  const e = [];
  const sklady = new Map();
  for (const s of skiti) {
    const klucz = [...(s.uczestnicy ?? []).map((x) => x?.slug).filter(Boolean)].sort().join('+');
    if (!klucz) continue;
    if (sklady.has(klucz)) e.push(`${s.slug}.json: ten sam skład uczestników co w „${sklady.get(klucz)}” — każdy SKIT musi mieć unikalny zestaw postaci`);
    else sklady.set(klucz, s.slug);
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

/** Rekord SKITa dla indeksu (skrót potrzebny liście, sekcji VI i feedowi). */
function rekordSkitu(s) {
  const uczestnicy = [...(s.uczestnicy ?? [])];
  return {
    slug: s.slug,
    tytul: s.tytul,
    temat: s.temat ?? null,
    uczestnicy: uczestnicy.map((u) => u.slug).sort((a, b) => a.localeCompare(b, 'pl')),
    imiona: uczestnicy.map((u) => u.imie),
    slow: liczbaSlow(s.tekst),
    data: s.meta?.utworzono ?? '',
  };
}

/**
 * Buduje deterministyczny indeks: skróty wpisów (+ skity jako sekcja VI),
 * słownik tagów, backlinki i feed `aktualizacje` (sekcja „Co nowego",
 * najnowsze na górze) wyliczony z `meta` wpisów i skitów.
 */
export function zbudujIndeks(wpisy, skiti = []) {
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

  // Sekcja VI wpisów: skity z daną materializacją w składzie (bez duplikatów).
  const rekordySkitow = [...skiti].sort((a, b) => a.slug.localeCompare(b.slug, 'pl')).map(rekordSkitu);
  const skityWpisu = new Map(rekordy.map((r) => [r.slug, []]));
  for (const s of [...skiti].sort((a, b) => a.slug.localeCompare(b.slug, 'pl'))) {
    for (const u of new Set((s.uczestnicy ?? []).map((x) => x?.slug).filter(Boolean))) {
      const lista = skityWpisu.get(u);
      if (lista && !lista.includes(s.slug)) lista.push(s.slug);
    }
  }
  for (const r of rekordy) r.skity = (skityWpisu.get(r.slug) ?? []).sort((a, b) => a.localeCompare(b, 'pl'));

  // Feed „Co nowego”: powstania i modyfikacje wpisów oraz skitów, najnowsze na górze.
  const aktualizacje = [];
  const dodaj = (wpis) => aktualizacje.push(wpis);
  for (const w of posortowane) {
    dodaj({
      data: w.meta?.utworzono ?? '',
      typ: 'manifestacja',
      akcja: 'nowa',
      slug: w.slug,
      tytul: w.nazwa,
      opis: `wpis w kartotece — materializacja karty „${w.karta?.nazwa ?? '?'}”`,
    });
    for (const mod of w.meta?.modyfikacje ?? []) {
      dodaj({ data: mod.data, typ: 'manifestacja', akcja: 'zmiana', slug: w.slug, tytul: w.nazwa, opis: mod.opis });
    }
  }
  for (const s of [...skiti].sort((a, b) => a.slug.localeCompare(b.slug, 'pl'))) {
    const kim = (s.uczestnicy ?? []).map((u) => u.imie).join(', ');
    dodaj({ data: s.meta?.utworzono ?? '', typ: 'skit', akcja: 'nowy', slug: s.slug, tytul: s.tytul, opis: `SKIT — skład: ${kim}` });
    for (const mod of s.meta?.modyfikacje ?? []) {
      dodaj({ data: mod.data, typ: 'skit', akcja: 'zmiana', slug: s.slug, tytul: s.tytul, opis: mod.opis });
    }
  }
  // Najnowsze na górze; przy tej samej dacie: najpierw przyrosty (nowe wpisy i
  // skity), potem zmiany, a na końcu porządek alfabetyczny — totalny i powtarzalny.
  const RANGA_AKCJI = { nowa: 0, nowy: 0, zmiana: 1 };
  aktualizacje.sort(
    (a, b) =>
      String(b.data).localeCompare(String(a.data)) ||
      (RANGA_AKCJI[a.akcja] ?? 9) - (RANGA_AKCJI[b.akcja] ?? 9) ||
      a.typ.localeCompare(b.typ, 'pl') ||
      a.slug.localeCompare(b.slug, 'pl')
  );

  return {
    wersja: 2,
    liczba: rekordy.length,
    liczbaSkitow: rekordySkitow.length,
    tagi: posortowaneTagi,
    manifestacje: rekordy,
    skity: rekordySkitow,
    aktualizacje,
  };
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

/**
 * Wczytuje i waliduje bazę SKITów. Brak katalogu = brak skitów (to nie błąd);
 * każdy inny błąd odczytu przerywa build. `slugi` — zbiór manifestacji, do
 * których muszą prowadzić uczestnicy.
 */
export async function wczytajSkiti(katalog = KATALOG_SKITOW, slugi = new Set()) {
  let pliki;
  try {
    pliki = (await readdir(katalog)).filter((f) => f.endsWith('.json')).sort();
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
  const skiti = [];
  const bledy = [];
  for (const f of pliki) {
    let s;
    try {
      s = JSON.parse(await readFile(join(katalog, f), 'utf8'));
    } catch (err) {
      bledy.push(`${f}: niepoprawny JSON (${err.message})`);
      continue;
    }
    const oczekiwanySlug = basename(f, '.json');
    if (s.slug !== oczekiwanySlug) bledy.push(`${f}: slug "${s.slug}" ≠ nazwa pliku "${oczekiwanySlug}"`);
    for (const blad of walidujSkit(s, slugi)) bledy.push(`${f}: ${blad}`);
    skiti.push(s);
  }
  for (const blad of walidujUnikalnoscSkitow(skiti)) bledy.push(`skity: ${blad}`);
  const slugiSkitow = skiti.map((s) => s.slug);
  if (new Set(slugiSkitow).size !== slugiSkitow.length) bledy.push('skity: duplikaty slugów w katalogu');
  if (bledy.length) {
    const raport = ['Walidacja SKITów NIEPRZESZŁA:', ...bledy.map((b) => `  - ${b}`)].join('\n');
    throw new Error(raport);
  }
  return skiti;
}

async function main() {
  const trybCheck = process.argv.includes('--check');
  const wpisy = await wczytajIKwaliduj();
  const skiti = await wczytajSkiti(KATALOG_SKITOW, new Set(wpisy.map((w) => w.slug)));
  const indeks = zbudujIndeks(wpisy, skiti);
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
    console.log(`OK: ${indeks.liczba} wpisów, ${indeks.liczbaSkitow} SKITów, indeks spójny (${Object.keys(indeks.tagi).length} tagów).`);
  } else {
    await writeFile(PLIK_INDEKSU, tresc, 'utf8');
    console.log(
      `Zbudowano ${PLIK_INDEKSU}: ${indeks.liczba} wpisów, ${indeks.liczbaSkitow} SKITów, ${indeks.aktualizacje.length} wpisów w feedzie, ${Object.keys(indeks.tagi).length} tagów.`
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
