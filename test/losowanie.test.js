/** Testy „wylosuj manifestację” (tryb ekspedycji) — czysta funkcja data.js. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { wylosujSlug, slugDnia } from '../app/data.js';

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

test('slugDnia: pusta pula → null', () => {
  assert.equal(slugDnia([], '2026-09-04'), null);
  assert.equal(slugDnia(null, '2026-09-04'), null);
});

test('slugDnia: ta sama data → ten sam slug (determinizm dnia)', () => {
  const pula = ['wendigo', 'zmora', 'indra', 'barbarossa'];
  const pierwszy = slugDnia(pula, '2026-09-04');
  assert.equal(slugDnia(pula, '2026-09-04'), pierwszy);
  assert.ok(pula.includes(pierwszy), 'wybór zawsze pochodzi z puli');
});

test('slugDnia: złoczony wynik — algorytm nie dryfuje', () => {
  assert.equal(slugDnia(['a', 'b', 'c', 'd'], '2026-09-04'), 'a');
  assert.equal(slugDnia(['a', 'b', 'c', 'd'], '2026-09-05'), 'd');
});

test('slugDnia: wybory dla roku dat zawsze mieszczą się w puli i trafiają w każdy slug', () => {
  const pula = ['wendigo', 'zmora', 'indra', 'barbarossa', 'talos-kreta'];
  const trafione = new Set();
  const d = new Date(2026, 0, 1);
  for (let i = 0; i < 366; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const slug = slugDnia(pula, iso);
    assert.ok(pula.includes(slug), `poza pulą: ${slug}`);
    trafione.add(slug);
    d.setDate(d.getDate() + 1);
  }
  assert.equal(trafione.size, pula.length, 'rok dat rozkłada się na całą pulę');
});

test('slugDnia: odfiltrowuje wartości puste/niełańcuchowe', () => {
  const pula = ['', null, 'x', 42, undefined, 'y'];
  for (const iso of ['2026-01-01', '2026-06-15', '2026-12-31']) {
    assert.ok(['x', 'y'].includes(slugDnia(pula, iso)));
  }
});
