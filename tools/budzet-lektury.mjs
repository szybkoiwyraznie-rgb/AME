#!/usr/bin/env node
/**
 * tools/budzet-lektury.mjs — strażnik budżetu lektury startowej (AGENTS.md §0).
 *
 * AGENTS.md §0 wymaga, żeby obowiązkowa lektura startowa (pozycje 1–5:
 * AGENTS.md, PROTOKÓŁ, wszystkie ADR-y z rejestrem, LESSONS, ENVIRONMENT)
 * mieściła się w 40 tys. tokenów. Powyżej progu skrócenie/rozdzielenie
 * dokumentów przestaje być opcją. Ten skrypt liczy rozmiar zbioru i szacuje
 * tokeny stałą heurystyką (1 token ≈ 4 znaki — zawyża wynik dla polskiej
 * prozy, więc jest bezpieczna), a test `test/budzet.test.js` pilnuje progu.
 *
 * Użycie: `node tools/budzet-lektury.mjs` — wydruk zestawienia dla sesji.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KATALOG_GLOWNY = fileURLToPath(new URL('..', import.meta.url));

/** Budżet z AGENTS.md §0 (tokeny). */
export const BUDZET_TOKENOW = 40000;

/** Znaki przypadające na token (zawyżona heurystyka: liczba tokenów ≥ realna). */
export const ZNAKOW_NA_TOKEN = 4;

export function szacujTokeny(znakow) {
  return Math.ceil(znakow / ZNAKOW_NA_TOKEN);
}

/**
 * Pliki obowiązkowej lektury §0 (pozycje 1–5), w kolejności lektury.
 * Handoff (pozycja 6) jest rotacyjny i jednorazowy — poza budżetem trwałym.
 */
export async function plikiLektury(katalog = KATALOG_GLOWNY) {
  const wpisy = await readdir(join(katalog, 'docs/decisions'));
  const decyzje = [
    'README.md',
    ...wpisy.filter((n) => /^\d{4}-.+\.md$/.test(n)).sort(),
  ];
  return [
    'AGENTS.md',
    'docs/PROTOKOL.md',
    ...decyzje.map((n) => `docs/decisions/${n}`),
    'docs/LESSONS.md',
    'docs/setup/ENVIRONMENT.md',
  ];
}

/** Zwraca [{plik, znaki}] dla każdego pliku lektury oraz sumę. */
export async function zmierzLekture(katalog = KATALOG_GLOWNY) {
  const pozycje = [];
  for (const plik of await plikiLektury(katalog)) {
    const tresc = await readFile(join(katalog, plik), 'utf8');
    pozycje.push({ plik, znaki: tresc.length });
  }
  const znaki = pozycje.reduce((a, p) => a + p.znaki, 0);
  return { pozycje, znaki, tokeny: szacujTokeny(znaki) };
}

const uruchomionyBezposrednio = process.argv[1]
  && fileURLToPath(import.meta.url) === process.argv[1];

if (uruchomionyBezposrednio) {
  const { pozycje, znaki, tokeny } = await zmierzLekture();
  const procent = ((tokeny / BUDZET_TOKENOW) * 100).toFixed(1);
  for (const p of pozycje) {
    console.log(`  ${String(szacujTokeny(p.znaki)).padStart(6)} tok  ${p.plik}`);
  }
  console.log(`  ------`);
  console.log(`  ${String(tokeny).padStart(6)} tok  RAZEM (${znaki} znaków) = ${procent}% budżetu ${BUDZET_TOKENOW}`);
  if (tokeny > BUDZET_TOKENOW) {
    console.error(`BUDZET PRZEKROCZONY o ${tokeny - BUDZET_TOKENOW} tokenów — skróć lub rozdziel dokumenty (AGENTS.md §0).`);
    process.exitCode = 1;
  }
}
