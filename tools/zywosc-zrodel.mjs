#!/usr/bin/env node
/**
 * Kontrola żywości adresów źródłowych (pozycja z docs/BACKLOG.md, wzięta
 * w C2+5 obrotu 7 Pętli Jakości).
 *
 * Backlog stawiał dwa warunki i oba są tu spełnione:
 *
 *  1. **Narzędzie sesji, nie CI.** Sandbox i CI nie mają egressu (ADR 0003, L3),
 *     więc skrypt NIE jest wpięty w `npm run check` ani w `npm test`. Uruchamia
 *     się go ręcznie tam, gdzie sieć jest — i tylko wtedy, gdy ktoś chce
 *     przejrzeć Source Stack.
 *  2. **Rozstrzygnięcie: martwy link = ostrzeżenie, nie błąd walidatora.**
 *     Powód jest zapisany w backlogu: Theoi „HephaestusWorks” dawało 404
 *     30 sierpnia i znów 200 cztery dni później. Jednorazowa cisza serwera nie
 *     może wywracać bramki jakości. Kto chce twardego wyniku, dokłada `--rygor`
 *     i bierze odpowiedzialność za fałszywe alarmy.
 *
 * Sieć wchodzi wyłącznie przez wstrzyknięty `fetchImpl`, więc testy sprawdzają
 * całą logikę bez jednego pakietu w kablu.
 *
 * Użycie:
 *   node tools/zywosc-zrodel.mjs                 # raport tekstowy
 *   node tools/zywosc-zrodel.mjs --json          # raport maszynowy
 *   node tools/zywosc-zrodel.mjs --wpis=balor    # jeden wpis
 *   node tools/zywosc-zrodel.mjs --rygor         # exit 1, gdy coś jest martwe
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Ile adresów sprawdzamy równolegle — grzeczność wobec cudzych serwerów. */
export const RownoleglOSC = 4;
/** Limit czasu pojedynczego sprawdzenia (ms). */
export const LIMIT_MS = 12000;

/** Statusy wyniku, od najlepszego do najgorszego. */
export const STATUSY = Object.freeze(['zywy', 'przekierowany', 'niepewny', 'martwy']);

/**
 * Klasyfikacja odpowiedzi HTTP. Świadomie łagodna: 401/403/405/429 to nie jest
 * martwy adres, tylko serwer, który nie lubi robotów — człowiek otworzy stronę
 * bez problemu.
 */
export function ocenOdpowiedz({ status, redirected = false, url = '', finalUrl = '' } = {}) {
  const kod = Number(status);
  if (!Number.isFinite(kod)) return { status: 'niepewny', powod: 'brak kodu odpowiedzi' };
  if (kod === 404 || kod === 410) return { status: 'martwy', powod: `HTTP ${kod}` };
  if (kod >= 500) return { status: 'niepewny', powod: `HTTP ${kod} — awaria po stronie serwera` };
  if ([401, 403, 405, 429].includes(kod)) return { status: 'niepewny', powod: `HTTP ${kod} — serwer nie lubi robotów` };
  if (kod >= 400) return { status: 'niepewny', powod: `HTTP ${kod}` };
  if (redirected && finalUrl && finalUrl !== url) return { status: 'przekierowany', powod: `→ ${finalUrl}` };
  return { status: 'zywy', powod: `HTTP ${kod}` };
}

/** Wszystkie adresy z sekcji III kartoteki: {slug, url, pozycja}. */
export function adresyKartoteki(wpisy) {
  const out = [];
  for (const w of wpisy ?? []) {
    for (const [i, d] of (w?.dokumentacja ?? []).entries()) {
      const url = typeof d?.url === 'string' ? d.url.trim() : '';
      if (url === '') continue;
      out.push({ slug: w.slug, numer: i + 1, url, pozycja: String(d?.pozycja ?? '').slice(0, 120) });
    }
  }
  return out;
}

/**
 * Jedno sprawdzenie: najpierw HEAD (tanie), a gdy serwer go nie obsługuje —
 * GET. Błąd sieci nigdy nie leci wyżej: zamienia się w status „niepewny”.
 */
export async function sprawdzAdres(url, { fetchImpl, limit = LIMIT_MS } = {}) {
  const f = fetchImpl ?? globalThis.fetch;
  if (typeof f !== 'function') throw new TypeError('zywosc-zrodel: brak fetch — wstrzyknij fetchImpl');
  const wywolaj = async (metoda) => {
    const kontroler = typeof AbortController === 'function' ? new AbortController() : null;
    const zegar = kontroler ? setTimeout(() => kontroler.abort(), limit) : null;
    try {
      return await f(url, { method: metoda, redirect: 'follow', signal: kontroler?.signal });
    } finally {
      if (zegar) clearTimeout(zegar);
    }
  };
  try {
    let odp = await wywolaj('HEAD');
    if (odp && [400, 403, 405, 501].includes(Number(odp.status))) odp = await wywolaj('GET');
    const ocena = ocenOdpowiedz({ status: odp?.status, redirected: odp?.redirected, url, finalUrl: odp?.url });
    return { url, kod: Number(odp?.status) || null, ...ocena };
  } catch (err) {
    return { url, kod: null, status: 'niepewny', powod: `sieć: ${err?.message ?? err}` };
  }
}

/** Wczytuje wpisy z katalogu manifestacji (bez walidacji — to robi build). */
export async function wczytajWpisy(katalog = 'data/manifestations') {
  const pliki = (await readdir(katalog)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(pliki.map(async (f) => JSON.parse(await readFile(join(katalog, f), 'utf8'))));
}

/** Raport dla całej kartoteki (albo jednego wpisu). Nigdy nie rzuca na sieci. */
export async function raportZywosci(wpisy, { fetchImpl, wpis = null, rownolegle = RownoleglOSC, limit = LIMIT_MS } = {}) {
  const adresy = adresyKartoteki(wpisy).filter((a) => !wpis || a.slug === wpis);
  const wyniki = [];
  for (let i = 0; i < adresy.length; i += rownolegle) {
    const paczka = adresy.slice(i, i + rownolegle);
    const zbadane = await Promise.all(paczka.map(async (a) => ({ ...a, ...(await sprawdzAdres(a.url, { fetchImpl, limit })) })));
    wyniki.push(...zbadane);
  }
  const licznik = Object.fromEntries(STATUSY.map((s) => [s, wyniki.filter((w) => w.status === s).length]));
  return { sprawdzone: wyniki.length, licznik, wyniki };
}

const ZNAK = { zywy: '✓', przekierowany: '→', niepewny: '?', martwy: '✗' };

/** Raport tekstowy: cisza dla żywych, jedna linia dla reszty. */
export function sformatujRaport(raport) {
  const linie = [];
  for (const w of raport.wyniki) {
    if (w.status === 'zywy') continue;
    linie.push(`${ZNAK[w.status]} ${w.slug} [${w.numer}] ${w.url} — ${w.powod}`);
  }
  const l = raport.licznik;
  linie.push(
    `Żywość źródeł: ${raport.sprawdzone} adresów — ${l.zywy} żywych, ${l.przekierowany} przekierowanych, ${l.niepewny} niepewnych, ${l.martwy} martwych.`,
  );
  if (l.martwy > 0) linie.push('Martwy adres to OSTRZEŻENIE, nie błąd: sprawdź ponownie po dobie, zanim wymienisz źródło (BACKLOG: przypadek Theoi).');
  return linie.join('\n');
}

const uruchomionoBezposrednio = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (uruchomionoBezposrednio) {
  const arg = (nazwa) => process.argv.find((a) => a.startsWith(`--${nazwa}=`))?.split('=')[1] ?? null;
  const wpisy = await wczytajWpisy();
  const raport = await raportZywosci(wpisy, { wpis: arg('wpis') });
  console.log(process.argv.includes('--json') ? JSON.stringify(raport, null, 2) : sformatujRaport(raport));
  if (process.argv.includes('--rygor') && raport.licznik.martwy > 0) process.exit(1);
}
