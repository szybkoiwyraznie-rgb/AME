/**
 * Klastrowanie pinezek (BACKLOG „Klastrowanie pinezek”, C2+5 obrotu 4).
 * Rachunek jest czystą funkcją, więc testujemy go bez DOM; render sprawdza
 * dodatkowo `test/pinezka.test.js` na atrapie SVG.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  grupujPunkty,
  podpisKlastra,
  opisKlastra,
  czyKlastrowac,
  PROMIEN_KLASTRA,
  MIN_W_KLASTRZE,
  ZOOM_KLASTRA,
  PROG_KLASTROWANIA,
} from '../app/klastry.js';

const punkt = (slug, wx, wy) => ({ slug, wx, wy });

test('grupujPunkty: bliskie punkty tworzą gniazdo, daleki zostaje sam', () => {
  const punkty = [punkt('a', 100, 100), punkt('b', 105, 102), punkt('c', 900, 900)];
  const { klastry, samotne } = grupujPunkty(punkty, { skala: 1 });
  assert.equal(klastry.length, 1);
  assert.deepEqual(klastry[0].slugi, ['a', 'b']);
  assert.deepEqual(samotne, ['c']);
  assert.equal(klastry[0].wx, 102.5, 'centroid = średnia współrzędnych');
  assert.equal(klastry[0].wy, 101);
  assert.deepEqual(klastry[0].bbox, { minWx: 100, minWy: 100, maxWx: 105, maxWy: 102 });
});

test('grupujPunkty: przybliżenie rozbija gniazdo (komórka jest ekranowa)', () => {
  const punkty = [punkt('a', 10, 10), punkt('b', 50, 10)];
  const daleko = grupujPunkty(punkty, { skala: 0.5 });
  assert.equal(daleko.klastry.length, 1, 'przy oddaleniu 40 jednostek świata mieści się w komórce 120');
  const blisko = grupujPunkty(punkty, { skala: 8 });
  assert.equal(blisko.klastry.length, 0, 'po przybliżeniu każdy stoi osobno');
  assert.deepEqual(blisko.samotne, ['a', 'b']);
  assert.ok(blisko.bokKomorki < daleko.bokKomorki, 'komórka maleje ze wzrostem skali');
  assert.equal(daleko.bokKomorki, (2 * PROMIEN_KLASTRA) / 0.5);
});

test('grupujPunkty: wynik jest deterministyczny i posortowany (ADR 0002)', () => {
  const punkty = [punkt('zeta', 10, 10), punkt('alfa', 11, 11), punkt('beta', 12, 10), punkt('omega', 800, 400)];
  const raz = grupujPunkty(punkty, { skala: 1 });
  const dwa = grupujPunkty([...punkty].reverse(), { skala: 1 });
  assert.deepEqual(raz, dwa, 'kolejność wejścia nie zmienia wyniku');
  assert.deepEqual(raz.klastry[0].slugi, ['alfa', 'beta', 'zeta'], 'slugi alfabetycznie');
});

test('grupujPunkty: próg liczności i odporność na śmieci w danych', () => {
  const punkty = [punkt('a', 5, 5), punkt('b', 6, 5), punkt('c', 7, 5)];
  assert.equal(grupujPunkty(punkty, { skala: 1, minimum: 4 }).klastry.length, 0, 'próg 4 > 3 punkty');
  assert.equal(grupujPunkty(punkty, { skala: 1, minimum: 3 }).klastry.length, 1);
  assert.equal(MIN_W_KLASTRZE, 2);
  const brudne = grupujPunkty([punkt('a', 5, 5), { slug: 'x', wx: NaN, wy: 1 }, null, { wx: 1, wy: 1 }], { skala: 1 });
  assert.deepEqual(brudne.samotne, ['a'], 'punkty bez sluga albo bez współrzędnych wypadają');
  assert.throws(() => grupujPunkty([], { skala: 0 }), RangeError);
  assert.throws(() => grupujPunkty([], { skala: 1, promien: -3 }), RangeError);
  assert.throws(() => grupujPunkty('nie tablica', { skala: 1 }), TypeError);
});

test('podpis i opis gniazda: liczba na krążku, pełne zdanie dla czytnika', () => {
  assert.equal(podpisKlastra(3), '3');
  assert.equal(podpisKlastra(140), '99+');
  assert.match(opisKlastra(2), /^Skupisko: 2 manifestacje/);
  assert.match(opisKlastra(5), /5 manifestacji/);
  assert.match(opisKlastra(1), /1 manifestacja/);
  assert.match(opisKlastra(12), /12 manifestacji/, 'nastolatki biorą dopełniacz');
  assert.ok(ZOOM_KLASTRA > 1, 'klik w gniazdo przybliża');
});

test('próg klastrowania: przy dużym przybliżeniu gniazd nie ma (sufit zoomu 32×)', () => {
  assert.equal(PROG_KLASTROWANIA, 6);
  assert.equal(czyKlastrowac(1), true, 'cały świat: klastrujemy');
  assert.equal(czyKlastrowac(5.9), true);
  assert.equal(czyKlastrowac(6), false, 'od progu pokazujemy wszystkie pinezki');
  assert.equal(czyKlastrowac(32), false, 'inaczej gniazdo Empusy i Nessosa nigdy by nie pękło');
  assert.equal(czyKlastrowac('nie liczba'), false);
});
