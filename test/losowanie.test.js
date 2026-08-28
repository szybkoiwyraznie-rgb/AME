/** Testy „wylosuj manifestację” (tryb ekspedycji) — czysta funkcja data.js. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { wylosujSlug } from '../app/data.js';

test('wylosujSlug: pusta pula → null', () => {
  assert.equal(wylosujSlug([]), null);
  assert.equal(wylosujSlug(null), null);
  assert.equal(wylosujSlug(undefined), null);
});

test('wylosujSlug: pojedynczy element zawsze wraca, nawet gdy jest pomijany', () => {
  assert.equal(wylosujSlug(['balor']), 'balor');
  assert.equal(wylosujSlug(['balor'], { pomin: 'balor' }), 'balor', 'jedynego wpisu nie ma czym zastąpić');
});

test('wylosujSlug: deterministyczny przy wstrzykniętym RNG (indeks = floor(los*n))', () => {
  const pula = ['a', 'b', 'c', 'd'];
  assert.equal(wylosujSlug(pula, { los: () => 0 }), 'a');
  assert.equal(wylosujSlug(pula, { los: () => 0.5 }), 'c');
  assert.equal(wylosujSlug(pula, { los: () => 0.999 }), 'd');
  assert.equal(wylosujSlug(pula, { los: () => 1 }), 'd', 'los===1 nie wychodzi poza tablicę');
});

test('wylosujSlug: pomija otwarty wpis, gdy pula > 1', () => {
  const pula = ['a', 'b', 'c'];
  // po odjęciu 'a' zostają ['b','c']; los=0 → 'b'
  assert.equal(wylosujSlug(pula, { pomin: 'a', los: () => 0 }), 'b');
  // dwa losowania z rzędu z tym samym RNG nie oddają pominiętego
  for (const r of [0, 0.34, 0.67, 0.99]) {
    assert.notEqual(wylosujSlug(pula, { pomin: 'a', los: () => r }), 'a');
  }
});

test('wylosujSlug: odfiltrowuje wartości puste/niełańcuchowe', () => {
  const pula = ['', null, 'x', 42, undefined, 'y'];
  const wynik = new Set();
  for (const r of [0, 0.49, 0.5, 0.99]) wynik.add(wylosujSlug(pula, { los: () => r }));
  assert.deepEqual([...wynik].sort(), ['x', 'y'], 'losowane są tylko poprawne slugi');
});
