/** Lint stylu: zakaz terminologii growej w lore (PROTOKÓŁ §8.4, ADR 0005). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintStylu, lintKorpus, ZAKAZANE_SLOWA } from '../tools/lint-stylu.mjs';

test('lintStylu: wykrywa żargon kart w zdaniu', () => {
  assert.deepEqual(lintStylu('Byt dostaje haste i trample, gdy gracz zapłaci manę.'), ['haste', 'trample', 'gracz']);
  assert.deepEqual(lintStylu('Rzucasz mill, patrz: talia przeciwnika.'), ['mill', 'talia']);
  // formy odmienione („talię”, „żetonem”) celowo nie łapiemy — heurystyka pełnych słów
});

test('lintStylu: granice słów — brak fałszywych trafień w podobnych wyrazach', () => {
  assert.deepEqual(lintStylu('Kapłan zarządza ogniem ofiarnym na ghatach.'), []);
  assert.deepEqual(lintStylu('Scena ukazana flashem aparatu w młynie nad rzeką.'), []);
  assert.deepEqual(lintStylu('Mano a mano na moście; młyn stary hamulec zgrzyta.'), []);
});

test('lintStylu: wielkość liter i polskie znaki bez znaczenia', () => {
  assert.deepEqual(lintStylu('MANA i Mana i mana'), ['mana']);
  assert.deepEqual(lintStylu('Zdobył żeton odwagi.'), ['żeton']);
});

test('lintStylu: pusty i nietekstowy argument nie wybuchają', () => {
  assert.deepEqual(lintStylu(''), []);
  assert.deepEqual(lintStylu(null), []);
  assert.deepEqual(lintStylu(undefined), []);
});

test('lista zakazanych słów jest kanoniczna: bez duplikatów, małe litery', () => {
  assert.equal(new Set(ZAKAZANE_SLOWA).size, ZAKAZANE_SLOWA.length);
  for (const s of ZAKAZANE_SLOWA) assert.equal(s, s.toLowerCase());
});

test('korpus kartoteki i Bazy Skitów jest wolny od żargonu gry', async () => {
  assert.deepEqual(await lintKorpus(), []);
});
