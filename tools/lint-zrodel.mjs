#!/usr/bin/env node
/**
 * Lint źródeł (Source Stack): higiena sekcji III wpisów.
 *
 * Backlog „Zasady cytowania w aplikacji” — pozycja wzięta w C2+5 obrotu 2
 * Pętli Jakości. Sandbox nie ma egressu (ADR 0003), więc narzędzie NIE sprawdza
 * dostępności linków po sieci. Sprawdza to, co da się sprawdzić lokalnie i co
 * najczęściej psuje kartotekę:
 *
 *  Z1  adres jest poprawnym URL-em https (albo świadomie go nie ma — ADR 0008
 *      dopuszcza źródło drukowane, byle było opisane wydaniem i stronami);
 *  Z2  ten sam adres nie występuje dwa razy w jednym wpisie;
 *  Z3  źródło bez adresu musi nieść w opisie rok albo strony — inaczej nie da
 *      się go odszukać w bibliotece;
 *  Z4  wpis ma co najmniej dwie różne domeny — jedna strona to nie stos źródeł;
 *  Z5  agregatory i encyklopedie zbiorcze (wikipedia, fandom, pinterest…) nie
 *      mogą być JEDYNYM źródłem wpisu; muszą je podpierać teksty źródłowe,
 *      skany albo opracowania.
 *
 * Użycie: node tools/lint-zrodel.mjs   (exit 1, gdy są trafienia)
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Serwisy zbiorcze: przydatne jako punkt wyjścia, za słabe jako jedyny dowód. */
export const AGREGATORY = [
  'wikipedia.org',
  'fandom.com',
  'wikiwand.com',
  'pinterest.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'blogspot.com',
];

/** Domena adresu bez `www.`; null, gdy adres nie jest poprawnym URL-em https. */
export function domenaZrodla(url) {
  if (typeof url !== 'string' || url.trim() === '') return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  return parsed.hostname.replace(/^www\./, '').toLowerCase();
}

export const czyAgregator = (domena) => Boolean(domena) && AGREGATORY.some((a) => domena === a || domena.endsWith(`.${a}`));

/** Lint jednego wpisu: lista trafień {regula, opis}. Pusta lista = czysto. */
export function lintZrodelWpisu(wpis) {
  const trafienia = [];
  const dokumentacja = Array.isArray(wpis?.dokumentacja) ? wpis.dokumentacja : [];
  const domeny = new Set();
  const adresy = new Set();

  for (const [i, pozycja] of dokumentacja.entries()) {
    const numer = i + 1;
    const url = pozycja?.url;
    const opis = String(pozycja?.pozycja ?? '');
    if (url === undefined || url === null || String(url).trim() === '') {
      // Z3: źródło poza siecią musi dać się odszukać w bibliotece.
      if (!/\b(1[0-9]{3}|20[0-9]{2})\b/.test(opis) && !/\bs{1,2}\.\s?[0-9]/.test(opis)) {
        trafienia.push({ regula: 'Z3', opis: `pozycja ${numer}: źródło bez adresu musi podać rok wydania albo strony` });
      }
      continue;
    }
    const domena = domenaZrodla(url);
    if (!domena) {
      trafienia.push({ regula: 'Z1', opis: `pozycja ${numer}: „${url}” nie jest poprawnym adresem https` });
      continue;
    }
    if (adresy.has(url)) {
      trafienia.push({ regula: 'Z2', opis: `pozycja ${numer}: adres „${url}” powtarza się w tym wpisie` });
    }
    adresy.add(url);
    domeny.add(domena);
  }

  if (dokumentacja.length >= 2 && domeny.size < 2) {
    trafienia.push({ regula: 'Z4', opis: `stos źródeł stoi na ${domeny.size} domenie — potrzebne są co najmniej dwie niezależne` });
  }
  const zeSieci = [...domeny];
  if (zeSieci.length > 0 && zeSieci.every((d) => czyAgregator(d))) {
    trafienia.push({ regula: 'Z5', opis: `wpis opiera się wyłącznie na agregatorach (${zeSieci.join(', ')}) — brakuje tekstu źródłowego albo opracowania` });
  }
  return trafienia;
}

/** Lint całego korpusu wpisów. Zwraca listę {plik, slug, regula, opis}. */
export async function lintZrodelKorpus(katalogGlowny = process.cwd()) {
  const katalog = join(katalogGlowny, 'data/manifestations');
  const znaleziska = [];
  for (const plik of (await readdir(katalog)).filter((f) => f.endsWith('.json')).sort()) {
    const wpis = JSON.parse(await readFile(join(katalog, plik), 'utf8'));
    for (const t of lintZrodelWpisu(wpis)) {
      znaleziska.push({ plik, slug: wpis.slug ?? plik, ...t });
    }
  }
  return znaleziska;
}

/** Zestawienie domen w korpusie — materiał do sekcji „skąd wiemy”. */
export async function statystykaDomen(katalogGlowny = process.cwd()) {
  const katalog = join(katalogGlowny, 'data/manifestations');
  const licznik = new Map();
  for (const plik of (await readdir(katalog)).filter((f) => f.endsWith('.json')).sort()) {
    const wpis = JSON.parse(await readFile(join(katalog, plik), 'utf8'));
    for (const pozycja of wpis.dokumentacja ?? []) {
      const domena = domenaZrodla(pozycja?.url) ?? '(bez adresu)';
      licznik.set(domena, (licznik.get(domena) ?? 0) + 1);
    }
  }
  return [...licznik.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const znaleziska = await lintZrodelKorpus();
  if (process.argv.includes('--domeny')) {
    for (const [domena, ile] of await statystykaDomen()) console.log(`${String(ile).padStart(3)} × ${domena}`);
  }
  if (znaleziska.length) {
    for (const z of znaleziska) console.error(`ŹRÓDŁA ${z.regula}: ${z.plik} (${z.slug}) — ${z.opis}`);
    console.error(`Razem: ${znaleziska.length} trafień. Sekcja III ma być stosem źródeł, nie jednym linkiem (PROTOKÓŁ §5, ADR 0008).`);
    process.exit(1);
  }
  console.log('Lint źródeł OK: każdy wpis stoi na co najmniej dwóch niezależnych, opisanych źródłach.');
}
