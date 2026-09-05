#!/usr/bin/env node
/**
 * Lint spójności faktograficznej SKIT-ów (BACKLOG „Walidator spójności
 * faktograficznej”, C2+5 obrotu 6).
 *
 * Problem: dialog może wpleść nazwę własną — miejsce, obrzęd, osobę — której
 * nie ma w kartach jego uczestników. Wtedy SKIT zaczyna żyć własnym kanonem,
 * a Kartoteka przestaje być jedynym źródłem faktów (PROTOKÓŁ §8.2, ADR 0005).
 *
 * Twarda egzekucja wymagałaby NLP (poza ADR 0001), więc narzędzie jest
 * HEURYSTYKĄ OSTRZEGAWCZĄ: wypisuje kandydatów i kończy się kodem 0, chyba że
 * podano `--rygor` (wtedy trafienia poziomu „spoza bazy” dają exit 1).
 *
 * Poziomy:
 *   • „obcy fakt”   — nazwa jest w Kartotece, ale w karcie kogoś, kogo nie ma
 *                     przy stole (najczęściej znaczy: dopisz powiązanie albo
 *                     zmień skład);
 *   • „spoza bazy”  — nazwy nie ma nigdzie (najczęściej znaczy: uzupełnij
 *                     kartę uczestnika, bo dialog wie więcej niż Kartoteka).
 *
 * Świadome odstępstwa (np. postać historyczna przywołana tylko w dialogu)
 * zapisuje się w `data/lint-faktow-wyjatki.json` — z powodem, nie hurtowo.
 *
 * Użycie:
 *   node tools/lint-faktow.mjs            — raport
 *   node tools/lint-faktow.mjs --rygor    — exit 1 przy „spoza bazy”
 *   node tools/lint-faktow.mjs --skit=slug
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Minimalna długość rdzenia do porównań — krótsze tokeny dają szum. */
export const MIN_RDZEN = 5;

/**
 * Słowa pisane wielką literą, które nie są faktem o świecie: rejestr Kroniki,
 * pojęcia archiwum, częste wtrącenia. Uzupełniane świadomie, nie hurtowo.
 */
export const POMIJANE = new Set([
  'archiwum', 'kronika', 'kartoteka', 'protokol', 'epoka', 'tom', 'splot', 'prog',
  'bog', 'boga', 'bogu', 'bogow', 'pan', 'pani', 'panie', 'panowie',
  'tak', 'nie', 'ale', 'wiec', 'bo', 'gdy', 'kto', 'co', 'to', 'ja', 'ty', 'my', 'wy',
  'jesli', 'kiedy', 'potem', 'teraz', 'wtedy', 'dlatego', 'moze', 'trzeba', 'wystarczy',
  'niech', 'niechaj', 'owszem', 'dobrze', 'zle', 'jeszcze', 'nawet', 'tylko', 'znowu',
  'poniedzialek', 'wtorek', 'sroda', 'czwartek', 'piatek', 'sobota', 'niedziela',
]);

/** Usuwa diakrytyki i sprowadza do małych liter — porównania odporne na fleksję. */
export function normalizuj(tekst) {
  return String(tekst)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .toLowerCase();
}

/** Rdzeń tokenu do porównania po prefiksie (fleksja polska obcina końcówki). */
export function rdzen(token) {
  const n = normalizuj(token).replace(/[^a-z0-9]/g, '');
  // Obcinamy końcówkę fleksyjną: „Panno” → „pann” pasuje do „Panna” w karcie.
  return n.slice(0, Math.max(4, Math.ceil(n.length * 0.7)));
}

/**
 * Kandydaci na nazwy własne w tekście dialogu: wyrazy wielką literą, które nie
 * stoją na początku zdania ani po myślniku dialogowym (tam wielka litera nic
 * nie znaczy). Sklejone ciągi („Sule Skerry”) zwracane jako jedna nazwa.
 */
export function nazwyWlasne(tekst) {
  if (typeof tekst !== 'string' || !tekst) return [];
  const bezMarkdown = tekst
    .replace(/\*\*[^*]+:\*\*/g, ' ')          // etykiety mówiących
    .replace(/\[[^\]]*\]/g, ' ')               // didaskalia
    .replace(/\r/g, '');
  const znaleziska = new Map();
  // Zdania rozdzielamy po . ? ! : — oraz nowej linii; pierwszy wyraz zdania pomijamy.
  for (const zdanie of bezMarkdown.split(/(?<=[.!?…:;])\s+|\n+/)) {
    const wyrazy = zdanie.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    let pierwszy = true;
    while (i < wyrazy.length) {
      const czysty = wyrazy[i].replace(/^[„”"'(–—-]+|[.,!?…:;„”"')]+$/g, '');
      const wielka = /^\p{Lu}/u.test(czysty);
      if (!wielka || pierwszy) {
        if (czysty) pierwszy = false;
        i += 1;
        continue;
      }
      const ciag = [czysty];
      let j = i + 1;
      while (j < wyrazy.length) {
        const nast = wyrazy[j].replace(/^[„”"'(–—-]+|[.,!?…:;„”"')]+$/g, '');
        if (!/^\p{Lu}/u.test(nast)) break;
        ciag.push(nast);
        j += 1;
      }
      const nazwa = ciag.join(' ');
      if (nazwa.replace(/[^\p{L}]/gu, '').length >= MIN_RDZEN && !POMIJANE.has(normalizuj(nazwa))) {
        znaleziska.set(nazwa, (znaleziska.get(nazwa) ?? 0) + 1);
      }
      i = j;
    }
  }
  return [...znaleziska.keys()];
}

/** Cały tekst rekordu (wpisu albo skitu) jako jeden ciąg do wyszukiwania. */
export function tekstRekordu(obiekt) {
  const kawalki = [];
  const chodz = (v) => {
    if (typeof v === 'string') kawalki.push(v);
    else if (Array.isArray(v)) v.forEach(chodz);
    else if (v && typeof v === 'object') Object.values(v).forEach(chodz);
  };
  chodz(obiekt);
  return normalizuj(kawalki.join(' '));
}

/** Czy nazwa (po rdzeniu każdego członu) występuje w podanym tekście. */
export function wystepuje(nazwa, tekstZnormalizowany) {
  return String(nazwa)
    .split(/\s+/)
    .every((czlon) => {
      const r = rdzen(czlon);
      return r.length >= MIN_RDZEN ? tekstZnormalizowany.includes(r) : true;
    });
}

/**
 * Sprawdza jeden SKIT wobec kart uczestników i reszty Kartoteki.
 * Zwraca listę { nazwa, poziom, gdzie } — `gdzie` to slugi wpisów, w których
 * nazwa jednak występuje (dla poziomu „obcy fakt”).
 */
export function sprawdzSkit(skit, wpisy) {
  const uczestnicy = new Set((skit.uczestnicy ?? []).map((u) => u.slug));
  const tekstUczestnikow = normalizuj(
    (skit.uczestnicy ?? []).map((u) => u.imie ?? '').join(' ') + ' ' +
    wpisy.filter((w) => uczestnicy.has(w.slug)).map(tekstRekordu).join(' ')
  );
  const wynik = [];
  for (const nazwa of nazwyWlasne(skit.tekst)) {
    if (wystepuje(nazwa, tekstUczestnikow)) continue;
    const gdzie = wpisy
      .filter((w) => !uczestnicy.has(w.slug) && wystepuje(nazwa, tekstRekordu(w)))
      .map((w) => w.slug);
    wynik.push({ nazwa, poziom: gdzie.length ? 'obcy fakt' : 'spoza bazy', gdzie });
  }
  return wynik;
}

/** Wyjątki: [{ skit, nazwa, powod }] — pominięte w raporcie, ale udokumentowane. */
export async function wczytajWyjatki(katalogGlowny = process.cwd()) {
  try {
    const surowe = await readFile(join(katalogGlowny, 'data/lint-faktow-wyjatki.json'), 'utf8');
    const dane = JSON.parse(surowe);
    return Array.isArray(dane?.wyjatki) ? dane.wyjatki : [];
  } catch {
    return [];
  }
}

export function czyWyjatek(wyjatki, skitSlug, nazwa) {
  return (wyjatki ?? []).some((w) => w.skit === skitSlug && normalizuj(w.nazwa) === normalizuj(nazwa));
}

export async function lintFaktow(katalogGlowny = process.cwd(), { skit = null } = {}) {
  const wczytaj = async (katalog) => {
    const sciezka = join(katalogGlowny, katalog);
    const pliki = (await readdir(sciezka)).filter((f) => f.endsWith('.json')).sort();
    return Promise.all(pliki.map(async (p) => JSON.parse(await readFile(join(sciezka, p), 'utf8'))));
  };
  const wpisy = await wczytaj('data/manifestations');
  const skity = (await wczytaj('data/skity')).filter((s) => !skit || s.slug === skit);
  const wyjatki = await wczytajWyjatki(katalogGlowny);
  const raport = [];
  for (const s of skity) {
    for (const t of sprawdzSkit(s, wpisy)) {
      if (czyWyjatek(wyjatki, s.slug, t.nazwa)) continue;
      raport.push({ skit: s.slug, ...t });
    }
  }
  return raport;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rygor = process.argv.includes('--rygor');
  const wybrany = process.argv.find((a) => a.startsWith('--skit='))?.slice(7) ?? null;
  const raport = await lintFaktow(process.cwd(), { skit: wybrany });
  const spozaBazy = raport.filter((r) => r.poziom === 'spoza bazy');
  for (const r of raport) {
    const ogon = r.gdzie.length ? ` — nazwa znana z kart: ${r.gdzie.join(', ')}` : '';
    console.log(`${r.poziom === 'spoza bazy' ? '?' : '~'} ${r.skit}: „${r.nazwa}” (${r.poziom})${ogon}`);
  }
  console.log(
    `Lint faktów: ${raport.length} kandydatów — ${raport.length - spozaBazy.length} „obcy fakt”, ${spozaBazy.length} „spoza bazy”.`
  );
  if (rygor && spozaBazy.length) process.exit(1);
}
