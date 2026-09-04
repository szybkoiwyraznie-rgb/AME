#!/usr/bin/env node
/**
 * tools/rebuild-index.mjs — walidacja wpisów manifestacji + budowa data/index.json.
 *
 *   node tools/rebuild-index.mjs           # waliduj i zapisz data/index.json
 *   node tools/rebuild-index.mjs --check   # waliduj i porównaj z istniejącym indeksem
 *                                          # (kod 1 przy rozbieżności/błędzie)
 *
 * Zasady: docs/PROTOKOL.md (w tym §6 — kanon tagów, §8 — SKITy),
 * docs/ARCHITECTURE.md, ADR 0002/0005/0006/0008/0013/0016.
 * Indeks jest deterministyczny (sortowanie po slugu) — bez znaczników czasu.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const KATALOG_WPISOW = join(ROOT, 'data', 'manifestations');
export const KATALOG_SKITOW = join(ROOT, 'data', 'skity');
export const PLIK_INDEKSU = join(ROOT, 'data', 'index.json');
/** Kanon tagów: zamknięty słownik (kategorie + dozwolone tagi), dane źródłowe. */
export const PLIK_KANONU = join(ROOT, 'data', 'kanon-tagow.json');

/** Rama promptu wizualizacji 21:9 — DOKŁADNIE jak w docs/PROTOKOL.md §5 (ADR 0005). */
export const RAMA_OTWARCIA =
  'Style: A wide-angle full-body cinematic photograph. The central objects/persons of the photo are visible from head to toe, standing centrally in the frame. No parts of the body are cropped.';
export const RAMA_ZAMKNIECIA =
  'Captured with a 35mm anamorphic lens at f/1.8. Shallow depth of field with a heavy, creamy bokeh background. Environmental portraiture. Dramatic cinematic lighting, sharp focus on the character, hyper-realistic textures of clothing and skin. Shot on 70mm film stock, ultra-wide 21:9 aspect ratio. --ar 21:9';

/** Słowa zabronione w treści sceny promptu (protokół: fotografia, nie malarstwo). */
const ZAKAZANE_W_PROMPCIE = ['figurine', 'diorama', 'miniature', 'render', 'painting', 'illustration'];

const RE_SLUG = /^[a-z0-9-]+$/;
/**
 * Slugi zarezerwowane przez routing widoków w hashu (#skity, #nowosci,
 * #skit:<slug>) — wpis o takim slugu byłby nieosiągalny.
 */
export const REZERWOWANE_SLUGI = ['skity', 'nowosci', 'panel', 'mapa', 'lista'];
/** Limity SKITa (zlecenie właściciela 2026-08-28, PROTOKÓŁ §8, ADR 0013). */
export const SKIT_MIN_UCZESTNIKOW = 2;
export const SKIT_MAX_UCZESTNIKOW = 4;
/**
 * Skład PREFEROWANY (zlecenie właściciela 2026-08-28, ADR 0019, PROTOKÓŁ §8.2):
 * 3–4 rozmówców niosą największy potencjał (spięcie trzech kultur, nie duet).
 * To nie twardy próg — 2 osoby pozostają legalne — lecz cel, do którego C3
 * dobiera skład domyślnie; build wypisuje podpowiedź, gdy duetów jest za dużo.
 */
export const SKIT_ZALECANE_UCZESTNIKOW = 3;
export const SKIT_MAX_SLOW = 300;
export const SKIT_MIN_SLOW = 60;
/**
 * Minimalna długość OPISU powiązania (zlecenie właściciela 2026-08-28, ADR 0019,
 * PROTOKÓŁ §6.2). Powiązanie ma tłumaczyć, dlaczego dwa byty są ze sobą związane
 * — nie może być jednym słowem ani samym adresem. Istniejące opisy mają 43–78
 * słów; próg pilnuje, by żaden przyszły nie zszedł do etykiety.
 */
export const POWIAZANIE_MIN_SLOW = 12;
/** Zakazany żargon gry w SKITcie — to rozmowa bytów, nie kart (PROTOKÓŁ §8.3). */
const ZAKAZANY_ZARGON = /\b(mana|P\/T|oracle|booster|deck|life total|sorcery|instant|endure|fetch land|commander)\b/i;
/** Jedna replika: „**Imię:** tekst”. */
const RE_WYPOWIEDZ = /^\*\*[^*\n]{1,40}:\*\*/;
/** Adres źródła w sieci WWW — tylko pełny http(s), nic więcej (B3, ADR 0008). */
const RE_URL = /^https?:\/\/\S+$/i;
const RE_TAG = /^[a-ząćęłńóśźż0-9-]+$/;
// Data w meta (ADR 0017): RRRR-MM-DD albo z godziną RRRR-MM-DD GG:MM (doba
// 00–23, minuta 00–59); forma bez godziny pozostaje legalna (stare wpisy).
const RE_DATA = /^\d{4}-\d{2}-\d{2}(?: ([01]\d|2[0-3]):[0-5]\d)?$/;

const jestStr = (v) => typeof v === 'string' && v.trim().length > 0;

/** Wewnętrzne oznaczenia sesji zakazane w `meta.modyfikacje[].opis`
 * (PROTOKÓŁ §9: opis to zdanie o treści dla czytelnika feedu „Co nowego”,
 * nie notatka robocza — bez „M3”, „B1”, „C1”, „PROTOKÓŁ §”). */
const RE_OZNACZENIA_WEWNETRZNE = /\b(?:C[123]|M\d+|B\d+)\b|Pętla Jakości|PROTOKÓŁ/i;

/** Sprawdza opis modyfikacji pod kątem oznaczeń wewnętrznych (§9). */
export function bladOpisuMeta(opis) {
  if (!jestStr(opis)) return null;
  return RE_OZNACZENIA_WEWNETRZNE.test(opis) ? opis : null;
}

/** Waliduje jeden wpis; zwraca listę błędów (pusta = OK). */
export function walidujWpis(w) {
  const e = [];
  const blad = (m) => e.push(m);

  if (!jestStr(w.slug) || !RE_SLUG.test(w.slug)) blad('slug: wymagane ^[a-z0-9-]+$');
  else if (REZERWOWANE_SLUGI.includes(w.slug)) blad(`slug: „${w.slug}” jest zarezerwowany przez routing widoków (hash)`);
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

  // v1.8 (2026-08-30): sekcja V „Rezonans i tożsamość” usunięta z protokołu —
  // pola `rezonans` nie ma już w materializacjach (decyzja właściciela).

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
    // v1.8 (ADR 0022): zakaz przebicia czwartej ściany — mechanika karty MtG
    // (koszty many, typy, flavor, artyści, printy) nie jest źródłem o bycie.
    if (w.dokumentacja.some((d) => String(d?.typ ?? '').trim() === 'baza kart')) {
      blad('dokumentacja: typ „baza kart” zakazany — mechanika MtG nie jest dokumentacją bytu (ADR 0022)');
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
  if (!jestStr(m.utworzono) || !RE_DATA.test(m.utworzono)) blad('meta.utworzono: brak lub zły format (RRRR-MM-DD albo RRRR-MM-DD GG:MM)');
  if (!Array.isArray(m.modyfikacje ?? [])) blad('meta.modyfikacje: ma być tablicą');
  for (const mod of m.modyfikacje ?? []) {
    if (!jestStr(mod?.data) || !RE_DATA.test(mod.data) || !jestStr(mod?.opis)) {
      blad('meta.modyfikacje: każdy wpis wymaga {data (RRRR-MM-DD albo RRRR-MM-DD GG:MM), opis}');
      break;
    }
    if (bladOpisuMeta(mod.opis)) {
      blad(`meta.modyfikacje: opis zawiera oznaczenie wewnętrzne sesji („${mod.opis.slice(0, 40)}…”) — opis piszemy dla czytelnika feedu, bez kodów C1/M3/PROTOKÓŁ (PROTOKÓŁ §9)`);
    }
  }

  return e;
}

/** Waliduje sam plik kanonu; zwraca listę błędów (pusta = OK). */
export function walidujKanon(k) {
  const e = [];
  if (!k || typeof k !== 'object') return ['kanon: brak pliku data/kanon-tagow.json'];
  const kategorie = k.kategorie ?? [];
  if (!Array.isArray(kategorie) || kategorie.length === 0) e.push('kanon.kategorie: wymagana niepusta tablica');
  const idy = new Set();
  for (const kat of kategorie) {
    if (!jestStr(kat?.id) || !RE_TAG.test(kat.id)) { e.push('kanon.kategorie: każda kategoria wymaga {id: /^[a-z0-9-]+$/}'); continue; }
    if (idy.has(kat.id)) e.push(`kanon.kategorie: duplikat kategorii „${kat.id}”`);
    idy.add(kat.id);
    if (!jestStr(kat.nazwa)) e.push(`kanon.kategorie.${kat.id}: brak nazwy`);
    if (!jestStr(kat.opis)) e.push(`kanon.kategorie.${kat.id}: brak opisu (pokazujemy go w legendzie paska)`);
    if (!jestStr(kat.skrot)) e.push(`kanon.kategorie.${kat.id}: brak skrótu (używamy go w chipach w karcie)`);
    if (!Number.isInteger(kat.min) || !Number.isInteger(kat.max) || kat.min < 0 || kat.min > kat.max) {
      e.push(`kanon.kategorie.${kat.id}: wymagane liczby {min,max} w porządku min ≤ max`);
    }
  }
  const tagi = k.tagi ?? [];
  if (!Array.isArray(tagi) || tagi.length === 0) e.push('kanon.tagi: wymagana niepusta tablica');
  const slugi = new Set();
  for (const tag of tagi) {
    if (!jestStr(tag?.tag) || !RE_TAG.test(tag.tag)) { e.push('kanon.tagi: każdy wpis wymaga {tag: /^[a-z0-9-]+$/}'); continue; }
    if (slugi.has(tag.tag)) e.push(`kanon.tagi: duplikat tagu „${tag.tag}”`);
    slugi.add(tag.tag);
    if (!idy.has(tag.kategoria)) e.push(`kanon.tagi.${tag.tag}: kategoria „${tag.kategoria}” nie istnieje`);
    if (!jestStr(tag.opis)) e.push(`kanon.tagi.${tag.tag}: brak opisu (bez niego tag jest nieczytelny)`);
  }
  for (const id of idy) {
    if (!tagi.some((x) => x?.kategoria === id)) e.push(`kanon.kategorie.${id}: nie ma ani jednego tagu`);
  }
  return e;
}

/** Sprawdzanie tagów jednego wpisu względem kanonu; zwraca listę błędów. */
export function walidujTagi(w, k) {
  if (!k) return [];
  const e = [];
  const dozwolone = new Map((k.tagi ?? []).map((x) => [x.tag, x.kategoria]));
  const tagi = w.tagi ?? [];
  for (const tag of tagi) {
    if (!dozwolone.has(tag)) {
      e.push(`tagi: „${tag}” nie istnieje w kanonie — dopisz go do data/kanon-tagow.json (z kategorią i opisem) albo użyj istniejącego`);
    }
  }
  for (const kat of k.kategorie ?? []) {
    const ile = tagi.filter((tag) => dozwolone.get(tag) === kat.id).length;
    if (ile < kat.min) e.push(`tagi: kategoria „${kat.id}” wymaga ${kat.min === kat.max ? `dokładnie ${kat.min}` : `co najmniej ${kat.min}`} ${kat.min === 1 ? "tagu" : "tagów"}, ma ${ile}`);
    if (ile > kat.max) e.push(`tagi: kategoria „${kat.id}” dopuszcza ${kat.max}, jest ${ile}`);
  }
  return e;
}

/** Wczytuje i waliduje kanon tagów. */
export async function wczytajKanon(sciezka = PLIK_KANONU) {
  let k;
  try {
    k = JSON.parse(await readFile(sciezka, 'utf8'));
  } catch (err) {
    if (err?.code === 'ENOENT') throw new Error(`Brak kanonu tagów: ${sciezka} (jest wymagany — ADR 0016)`);
    throw new Error(`Kanon tagów: niepoprawny JSON (${err.message})`);
  }
  const bledy = walidujKanon(k);
  if (bledy.length) throw new Error(['Walidacja kanonu tagów NIEPRZESZŁA:', ...bledy.map((b) => `  - ${b}`)].join('\n'));
  return k;
}

/** Liczba słów w tekście SKITa (limit protokołu: 300 — ADR 0015). */
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
  else if (REZERWOWANE_SLUGI.includes(s.slug)) blad(`slug: „${s.slug}” jest zarezerwowany przez routing widoków (hash)`);
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
  if (!jestStr(m.utworzono) || !RE_DATA.test(m.utworzono)) blad('meta.utworzono: brak lub zły format (RRRR-MM-DD albo RRRR-MM-DD GG:MM)');
  if (!Array.isArray(m.modyfikacje ?? [])) blad('meta.modyfikacje: ma być tablicą');
  for (const mod of m.modyfikacje ?? []) {
    if (!jestStr(mod?.data) || !RE_DATA.test(mod.data) || !jestStr(mod?.opis)) {
      blad('meta.modyfikacje: każdy wpis wymaga {data (RRRR-MM-DD albo RRRR-MM-DD GG:MM), opis}');
      break;
    }
    if (bladOpisuMeta(mod.opis)) {
      blad(`meta.modyfikacje: opis zawiera oznaczenie wewnętrzne sesji („${mod.opis.slice(0, 40)}…”) — opis piszemy dla czytelnika feedu, bez kodów C1/M3/PROTOKÓŁ (PROTOKÓŁ §9)`);
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
    // ADR 0019: opis ma tłumaczyć związek, nie być etykietą ani samym linkiem.
    const opis = String(x.opis).trim();
    if (RE_URL.test(opis)) {
      e.push(`powiazania[${x.slug}]: opis to sam adres — napisz, dlaczego byty są powiązane (nie link)`);
    } else if (liczbaSlow(opis) < POWIAZANIE_MIN_SLOW) {
      e.push(`powiazania[${x.slug}]: opis za krótki (${liczbaSlow(opis)} słów, min. ${POWIAZANIE_MIN_SLOW}) — uzasadnij związek zdaniem, nie etykietą`);
    }
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
 * słownik tagów, backlinki i feed `aktualizacje` (sekcja „Co nowego”,
 * najnowsze na górze) wyliczony z `meta` wpisów i skitów.
 */
export function zbudujIndeks(wpisy, skiti = [], kanon = null, buildTime = null) {
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
    // Galeria trofeów (C2, 2026-09-04): dowody eliminacji w indeksie, żeby
    // widok „🏆 trofea" nie musiał dociągać wszystkich pełnych wpisów.
    trofea: { pierwotne: w.trofea?.pierwotne ?? '', wtorne: w.trofea?.wtorne ?? null },
  }));
  const mapa = new Map(rekordy.map((r) => [r.slug, r]));
  for (const r of rekordy) {
    for (const cel of r.powiazania) {
      const docelowy = mapa.get(cel);
      if (docelowy && !docelowy.backlinki.includes(r.slug)) docelowy.backlinki.push(r.slug);
    }
  }
  for (const r of rekordy) r.backlinki.sort((a, b) => a.localeCompare(b, 'pl'));

  // Słownik tagów: kolejność i kategorie bierze kanon (bez kanonu — alfabetycznie,
  // jak w katalogach testowych), a puste tagi nie trafiają do indeksu.
  const zbiorTagow = {};
  for (const r of rekordy) for (const t of r.tagi) (zbiorTagow[t] ??= []).push(r.slug);
  for (const t of Object.keys(zbiorTagow)) zbiorTagow[t].sort((a, b) => a.localeCompare(b, 'pl'));
  const porzadek = kanon ? (kanon.tagi ?? []).map((x) => x.tag).filter((t) => zbiorTagow[t]) : Object.keys(zbiorTagow).sort((a, b) => a.localeCompare(b, 'pl'));
  const meta = new Map((kanon?.tagi ?? []).map((x) => [x.tag, x]));
  const posortowaneTagi = {};
  for (const t of porzadek) {
    const opis = meta.get(t);
    posortowaneTagi[t] = {
      kategoria: opis?.kategoria ?? 'bez-kanonu',
      opis: opis?.opis ?? '',
      wpisy: zbiorTagow[t],
    };
  }
  for (const t of Object.keys(zbiorTagow)) if (!porzadek.includes(t)) posortowaneTagi[t] = { kategoria: 'bez-kanonu', opis: '', wpisy: zbiorTagow[t] };
  const kategorie = (kanon?.kategorie ?? []).map((kat) => ({
    id: kat.id,
    nazwa: kat.nazwa,
    skrot: kat.skrot,
    min: kat.min,
    max: kat.max,
    opis: kat.opis,
    ile: Object.values(posortowaneTagi).filter((x) => x.kategoria === kat.id).length,
  }));

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
  // Najnowsze ZDARZENIA na górze. W obrębie pliku numerujemy zdarzenia
  // (`sekwencja`: 0 = utworzenie, k+1 = k-ty wpis `meta.modyfikacje`, które są
  // dopisywane chronologicznie), więc dnia, gdy coś zmieniono, zmiana jest nad
  // utworzeniem — a nie pod nim, jak przy randze po typie akcji. Sort: data
  // malejąco, sekwencja malejąco, potem typ (skity przed wpisami) i slug;
  // porządek totalny i powtarzalny.
  const aktualizacje = [];
  const dodaj = (wpis, sekwencja) => aktualizacje.push({ ...wpis, sekwencja });
  for (const w of posortowane) {
    dodaj(
      {
        data: w.meta?.utworzono ?? '',
        typ: 'manifestacja',
        akcja: 'nowa',
        slug: w.slug,
        tytul: w.nazwa,
        opis: `wpis w kartotece — materializacja karty „${w.karta?.nazwa ?? '?'}”`,
      },
      0
    );
    (w.meta?.modyfikacje ?? []).forEach((mod, k) =>
      dodaj({ data: mod.data, typ: 'manifestacja', akcja: 'zmiana', slug: w.slug, tytul: w.nazwa, opis: mod.opis }, k + 1)
    );
  }
  for (const s of [...skiti].sort((a, b) => a.slug.localeCompare(b.slug, 'pl'))) {
    const kim = (s.uczestnicy ?? []).map((u) => u.imie).join(', ');
    dodaj({ data: s.meta?.utworzono ?? '', typ: 'skit', akcja: 'nowy', slug: s.slug, tytul: s.tytul, opis: `SKIT — skład: ${kim}` }, 0);
    (s.meta?.modyfikacje ?? []).forEach((mod, k) =>
      dodaj({ data: mod.data, typ: 'skit', akcja: 'zmiana', slug: s.slug, tytul: s.tytul, opis: mod.opis }, k + 1)
    );
  }
  // Data malejąco porównywana po znakach (kodowo), nie collation: mieszanka
  // formatów „RRRR-MM-DD” i „RRRR-MM-DD GG:MM” (ADR 0017) ma wtedy porządek
  // totalny niezależny od tabel ICU — dzień z godziną wygrywa z dniem bez
  // godziny, a wśród godzin kolejność jest chronologiczna. Potem sekwencja
  // (L11), typ i slug.
  aktualizacje.sort(
    (a, b) =>
      (String(b.data) > String(a.data)) - (String(b.data) < String(a.data)) ||
      b.sekwencja - a.sekwencja ||
      b.typ.localeCompare(a.typ, 'pl') ||
      a.slug.localeCompare(b.slug, 'pl')
  );
  for (const a of aktualizacje) delete a.sekwencja; // klucz tylko do sortowania — bez szumu w indeksie

  return {
    wersja: 3,
    buildTime: buildTime || new Date().toISOString(),
    liczba: rekordy.length,
    liczbaSkitow: rekordySkitow.length,
    kanon: { kategorie },
    tagi: posortowaneTagi,
    manifestacje: rekordy,
    skity: rekordySkitow,
    aktualizacje,
  };
}

/** Wczytuje i waliduje cały katalog wpisów; rzuca przy błędach (z pełnym raportem). */
export async function wczytajIKwaliduj(katalog = KATALOG_WPISOW, kanon = null) {
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
    for (const blad of walidujTagi(w, kanon)) bledy.push(`${f}: ${blad}`);
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

/**
 * Podpowiedź o składach SKITów (ADR 0019, zlecenie A): zwraca statystykę i —
 * gdy duetów jest więcej niż skitów 3–4-osobowych — tekst zachęty do składów
 * wieloosobowych. Nie jest błędem (2 osoby są legalne), tylko sygnałem dla C3.
 * Czysta funkcja: łatwa do przetestowania, deterministyczna.
 */
export function podpowiedzSkladySkitow(skiti) {
  const duety = skiti.filter((s) => (s.uczestnicy?.length ?? 0) <= 2).length;
  const wieloosobowe = skiti.filter((s) => (s.uczestnicy?.length ?? 0) >= SKIT_ZALECANE_UCZESTNIKOW).length;
  const zacheta =
    skiti.length > 0 && duety > wieloosobowe
      ? `Podpowiedź: ${duety} skitów dwuosobowych vs ${wieloosobowe} o składzie ≥${SKIT_ZALECANE_UCZESTNIKOW}. ` +
        `Preferowane są rozmowy 3–4-osobowe (ADR 0019) — przy kolejnym C3 sięgnij po trójkę lub czwórkę.`
      : null;
  return { duety, wieloosobowe, zacheta };
}

async function main() {
  const trybCheck = process.argv.includes('--check');
  const kanon = await wczytajKanon();
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW, kanon);
  const skiti = await wczytajSkiti(KATALOG_SKITOW, new Set(wpisy.map((w) => w.slug)));

  let istniejacyTresc = '';
  let istniejacyBuildTime = null;
  try {
    istniejacyTresc = await readFile(PLIK_INDEKSU, 'utf8');
    istniejacyBuildTime = JSON.parse(istniejacyTresc).buildTime;
  } catch {}

  // 1. Zbuduj z dotychczasowym buildTime
  let indeks = zbudujIndeks(wpisy, skiti, kanon, istniejacyBuildTime);
  let tresc = JSON.stringify(indeks, null, 2) + '\n';

  if (istniejacyTresc) {
    const ob1 = JSON.parse(istniejacyTresc);
    const ob2 = JSON.parse(tresc);
    delete ob1.buildTime;
    delete ob2.buildTime;
    
    // Jeśli są różnice funkcjonalne, wygeneruj NOWY buildTime
    if (JSON.stringify(ob1) !== JSON.stringify(ob2)) {
      indeks = zbudujIndeks(wpisy, skiti, kanon, new Date().toISOString());
      tresc = JSON.stringify(indeks, null, 2) + '\n';
    }
  } else {
    // Jeśli plik nie istnieje, wygeneruj NOWY buildTime
    indeks = zbudujIndeks(wpisy, skiti, kanon, new Date().toISOString());
    tresc = JSON.stringify(indeks, null, 2) + '\n';
  }

  if (trybCheck) {
    let istniejacy = '';
    try {
      istniejacy = await readFile(PLIK_INDEKSU, 'utf8');
    } catch {
      console.error(`--check: brak ${PLIK_INDEKSU}. Uruchom npm run build.`);
      process.exit(1);
    }
    
    const ob1 = JSON.parse(istniejacy);
    const ob2 = JSON.parse(tresc);
    delete ob1.buildTime;
    delete ob2.buildTime;
    if (JSON.stringify(ob1) !== JSON.stringify(ob2)) {
      console.error('--check: data/index.json nie zgadza się z wpisami. Uruchom npm run build i wcommituj indeks.');
      process.exit(1);
    }
    console.log(`OK: ${indeks.liczba} wpisów, ${indeks.liczbaSkitow} SKITów, indeks spójny (${Object.keys(indeks.tagi).length} tagów z kanonu, ${kanon.tagi.length} zdefiniowanych).`);
  } else {
    await writeFile(PLIK_INDEKSU, tresc, 'utf8');
    console.log(
      `Zbudowano ${PLIK_INDEKSU}: ${indeks.liczba} wpisów, ${indeks.liczbaSkitow} SKITów, ${indeks.aktualizacje.length} wpisów w feedzie, ${Object.keys(indeks.tagi).length} tagów użytych z ${kanon.tagi.length} w kanonie.`
    );
    const { zacheta } = podpowiedzSkladySkitow(skiti);
    if (zacheta) console.log(zacheta);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
