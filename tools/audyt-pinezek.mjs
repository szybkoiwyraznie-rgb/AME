#!/usr/bin/env node
/**
 * Audyt pinezek: czy współrzędne wpisu leżą w kraju, który wpis deklaruje.
 *
 * Zgłoszenie właściciela (todo.txt, punkt B) brzmiało „sprawdź wszystkie
 * pinezki”. Ręczne sprawdzanie nie skaluje się i nie zostawia śladu, więc
 * kartoteka dostaje kontrolę maszynową: punkt (lat, lon) musi wpaść w granice
 * państwa z pola `lokalizacja.kraj`, liczone na tym samym pliku granic, na
 * którym rysuje się mapa (`assets/map/countries-50m.json`, Natural Earth 50m
 * przez world-atlas). Bez sieci, bez API zewnętrznych (ADR 0003).
 *
 * Ograniczenia świadome: granice 50m mają uproszczone wybrzeża, więc punkt na
 * skale albo tuż przy plaży może wypaść „za burtą”. Dlatego wynik ma trzy
 * stopnie — `ok`, `blisko` (poza granicą, ale w promieniu tolerancji) i `blad`.
 *
 * Użycie:
 *   node tools/audyt-pinezek.mjs            # raport, exit 1 przy błędzie
 *   node tools/audyt-pinezek.mjs --wszystko # wypisz też wpisy poprawne
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PLIK_GRANIC = join(ROOT, 'assets', 'map', 'countries-50m.json');
export const KATALOG_WPISOW = join(ROOT, 'data', 'manifestations');

/** Tolerancja dla uproszczonych wybrzeży: stopnie (~55 km na równiku). */
export const TOLERANCJA_STOPNI = 0.5;

/**
 * Świadome odstępstwa: pinezki na morzu albo na skałach, których granice 50m
 * nie rysują. Każde musi mieć uzasadnienie geograficzne — to nie jest miejsce
 * na chowanie pomyłek, tylko na wyspy mniejsze od kreski mapy.
 */
export const ODSTEPSTWA = {
  'selkie-sule-skerry':
    'Sule Skerry — bezludna skała 60 km na zachód od Orkadów, terytorium Szkocji (Wielka Brytania); poligon Natural Earth 50m jej nie rysuje.',
};

/**
 * Nazwy państw po polsku (pole `lokalizacja.kraj`) → nazwy w pliku granic.
 * Klucz to pierwszy człon pola, bez nawiasu z regionem. Kraje historyczne
 * i części składowe Zjednoczonego Królestwa mapujemy na państwo dzisiejsze,
 * bo taki jest podział w danych Natural Earth.
 */
export const KRAJE_PL = {
  albania: 'Albania',
  anglia: 'United Kingdom',
  szkocja: 'United Kingdom',
  walia: 'United Kingdom',
  'irlandia północna': 'United Kingdom',
  'wielka brytania': 'United Kingdom',
  'wyspa man': 'Isle of Man',
  irlandia: 'Ireland',
  polska: 'Poland',
  niemcy: 'Germany',
  francja: 'France',
  grecja: 'Greece',
  włochy: 'Italy',
  hiszpania: 'Spain',
  egipt: 'Egypt',
  izrael: 'Israel',
  turcja: 'Turkey',
  indie: 'India',
  japonia: 'Japan',
  chiny: 'China',
  nigeria: 'Nigeria',
  islandia: 'Iceland',
  norwegia: 'Norway',
  szwecja: 'Sweden',
  dania: 'Denmark',
  finlandia: 'Finland',
  rosja: 'Russia',
  meksyk: 'Mexico',
  peru: 'Peru',
  'stany zjednoczone': 'United States of America',
  kanada: 'Canada',
  australia: 'Australia',
  iran: 'Iran',
  irak: 'Iraq',
  etiopia: 'Ethiopia',
  ghana: 'Ghana',
  benin: 'Benin',
  filipiny: 'Philippines',
  indonezja: 'Indonesia',
  wietnam: 'Vietnam',
};

/** „Grecja (Beocja)” → „Greece”; null, gdy nazwa nieznana słownikowi. */
export function krajDoGranic(kraj) {
  if (typeof kraj !== 'string') return null;
  const glowny = kraj.split('(')[0].trim().toLowerCase();
  if (KRAJE_PL[glowny]) return KRAJE_PL[glowny];
  for (const [pl, en] of Object.entries(KRAJE_PL)) {
    if (glowny.startsWith(pl)) return en;
  }
  return null;
}

/** Dekoduje TopoJSON do map nazwa → lista pierścieni [[lon, lat], …]. */
export function granicePanstw(topologia) {
  const { scale: [sx, sy], translate: [tx, ty] } = topologia.transform;
  const luki = topologia.arcs.map((luk) => {
    let x = 0;
    let y = 0;
    return luk.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
  const pierscien = (indeksy) => {
    const punkty = [];
    for (const i of indeksy) {
      const luk = i < 0 ? [...luki[~i]].reverse() : luki[i];
      for (const p of luk) {
        const ostatni = punkty[punkty.length - 1];
        if (!ostatni || ostatni[0] !== p[0] || ostatni[1] !== p[1]) punkty.push(p);
      }
    }
    return punkty;
  };
  const wynik = new Map();
  for (const g of topologia.objects?.countries?.geometries ?? []) {
    const nazwa = g.properties?.name;
    if (!nazwa) continue;
    const wielokaty = g.type === 'MultiPolygon' ? g.arcs : [g.arcs];
    const pierscienie = [];
    for (const wielokat of wielokaty) for (const ring of wielokat) pierscienie.push(pierscien(ring));
    wynik.set(nazwa, pierscienie);
  }
  return wynik;
}

/** Klasyczny ray casting; punkt na krawędzi liczy się jako wewnątrz. */
export function punktWPierscieniu([lon, lat], pierscien) {
  let wewnatrz = false;
  for (let i = 0, j = pierscien.length - 1; i < pierscien.length; j = i++) {
    const [xi, yi] = pierscien[i];
    const [xj, yj] = pierscien[j];
    const przecina = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (przecina) wewnatrz = !wewnatrz;
  }
  return wewnatrz;
}

export const punktWKraju = (punkt, pierscienie) => (pierscienie ?? []).some((p) => punktWPierscieniu(punkt, p));

/** Najmniejsza odległość punktu od wierzchołków granicy (stopnie). */
export function odlegloscOdGranicy([lon, lat], pierscienie) {
  let min = Infinity;
  for (const pierscien of pierscienie ?? []) {
    for (const [x, y] of pierscien) {
      const d = Math.hypot(x - lon, y - lat);
      if (d < min) min = d;
    }
  }
  return min;
}

/** Ocena jednej pinezki: {status: 'ok'|'blisko'|'blad'|'nieznany-kraj', …}. */
export function ocenPinezke(wpis, granice) {
  const lat = Number(wpis?.lokalizacja?.lat);
  const lon = Number(wpis?.lokalizacja?.lon);
  const kraj = wpis?.lokalizacja?.kraj ?? '';
  const nazwaGranic = krajDoGranic(kraj);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { slug: wpis?.slug, status: 'blad', opis: 'brak poprawnych współrzędnych' };
  }
  if (!nazwaGranic) return { slug: wpis?.slug, status: 'nieznany-kraj', opis: `kraj „${kraj}” spoza słownika KRAJE_PL` };
  const pierscienie = granice.get(nazwaGranic);
  if (!pierscienie) return { slug: wpis?.slug, status: 'nieznany-kraj', opis: `brak granic dla „${nazwaGranic}”` };
  if (punktWKraju([lon, lat], pierscienie)) {
    return { slug: wpis?.slug, status: 'ok', kraj: nazwaGranic, opis: `${lat} / ${lon} w granicach ${nazwaGranic}` };
  }
  const dystans = odlegloscOdGranicy([lon, lat], pierscienie);
  const odstepstwo = ODSTEPSTWA[wpis?.slug];
  const status = odstepstwo ? 'odstepstwo' : dystans <= TOLERANCJA_STOPNI ? 'blisko' : 'blad';
  return {
    slug: wpis?.slug,
    status,
    kraj: nazwaGranic,
    dystans: Math.round(dystans * 1000) / 1000,
    opis: odstepstwo
      ? `${lat} / ${lon} poza poligonem ${nazwaGranic}, odstępstwo uznane: ${odstepstwo}`
      : `${lat} / ${lon} poza granicami ${nazwaGranic} (${Math.round(dystans * 111)} km od najbliższego punktu granicy)`,
  };
}

/** Audyt całego katalogu wpisów. */
export async function audytPinezek(katalog = KATALOG_WPISOW, plikGranic = PLIK_GRANIC) {
  const granice = granicePanstw(JSON.parse(await readFile(plikGranic, 'utf8')));
  const pliki = (await readdir(katalog)).filter((f) => f.endsWith('.json')).sort();
  const wyniki = [];
  for (const f of pliki) {
    const wpis = JSON.parse(await readFile(join(katalog, f), 'utf8'));
    wyniki.push({ plik: f, ...ocenPinezke(wpis, granice) });
  }
  return wyniki;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const wyniki = await audytPinezek();
  const wszystko = process.argv.includes('--wszystko');
  const znak = { ok: '✓', blisko: '~', blad: '✗', 'nieznany-kraj': '?', odstepstwo: '○' };
  for (const w of wyniki) {
    if (w.status === 'ok' && !wszystko) continue;
    console.log(`${znak[w.status]} ${w.slug}: ${w.opis}`);
  }
  const zle = wyniki.filter((w) => w.status === 'blad' || w.status === 'nieznany-kraj');
  const blisko = wyniki.filter((w) => w.status === 'blisko');
  const odstepstwa = wyniki.filter((w) => w.status === 'odstepstwo');
  console.log(
    `Audyt pinezek: ${wyniki.length} wpisów — ${wyniki.filter((w) => w.status === 'ok').length} w granicach, ` +
      `${blisko.length} na granicy tolerancji, ${odstepstwa.length} uznanych odstępstw, ${zle.length} do poprawy.`
  );
  if (zle.length) process.exit(1);
}
