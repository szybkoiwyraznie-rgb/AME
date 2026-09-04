#!/usr/bin/env node
/**
 * Lint stylu wpisów: wykrywa terminologię grową (MtG) w treści lore —
 * sekcja II wpisów (`natura.*`) i dialogi SKITów (PROTOKÓŁ §8.4: „zero
 * żargonu gry"). Karta MtG jest kluczem identyfikacji, nie tematem wpisu
 * (ADR 0005), więc słownictwo mechaniki nie może przeciekać do opisu bytu.
 *
 * Użycie: node tools/lint-stylu.mjs   (exit 1, gdy są trafienia)
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const ZAKAZANE_SLOWA = [
  // mechaniki i terminy kart
  'haste', 'trample', 'mana', 'tap', 'untap', 'kicker', 'flash', 'flying',
  'deathtouch', 'lifelink', 'vigilance', 'menace', 'prowess', 'scry', 'mill',
  'battlefield', 'deck', 'planeswalker',
  // polskie odpowiedniki żargonu stołowego
  'żeton', 'talia', 'punkty życia', 'gracz',
];

const REGEXY = ZAKAZANE_SLOWA.map((s) => ({
  slowo: s,
  rx: new RegExp(`(?<![\\p{L}\\p{N}_])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu'),
}));

/** Zwraca listę zakazanych słów znalezionych w tekście (bez powtórzeń). */
export function lintStylu(tekst) {
  if (typeof tekst !== 'string' || !tekst) return [];
  return REGEXY.filter(({ rx }) => rx.test(tekst)).map(({ slowo }) => slowo);
}

const KATALOGI = [
  { katalog: 'data/manifestations', pola: (d) => Object.entries(d.natura || {}) },
  { katalog: 'data/skity', pola: (d) => [['tekst', d.tekst]] },
];

export async function lintKorpus(katalogGlowny = process.cwd()) {
  const znaleziska = [];
  for (const { katalog, pola } of KATALOGI) {
    const sciezka = join(katalogGlowny, katalog);
    for (const plik of (await readdir(sciezka)).filter((f) => f.endsWith('.json')).sort()) {
      const dane = JSON.parse(await readFile(join(sciezka, plik), 'utf8'));
      for (const [pole, tekst] of pola(dane)) {
        for (const slowo of lintStylu(tekst)) {
          znaleziska.push({ plik, slug: dane.slug ?? plik, pole, slowo });
        }
      }
    }
  }
  return znaleziska;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const znaleziska = await lintKorpus();
  if (znaleziska.length) {
    for (const z of znaleziska) {
      console.error(`ŻARGON GRY: ${z.plik} (${z.slug}) pole „${z.pole}” — słowo „${z.slowo}”`);
    }
    console.error(`Razem: ${znaleziska.length} trafień. Treść lore ma być wolna od terminologii kart (PROTOKÓŁ §8.4, ADR 0005).`);
    process.exit(1);
  }
  console.log('Lint stylu OK: brak terminologii growej w sekcjach II wpisów i dialogach SKITów.');
}
