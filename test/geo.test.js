import test from 'node:test';
import assert from 'node:assert/strict';
import { projektuj, odwroc, dekodujLuki, punktyLuku, poskladajPierscien, sciezka, dekodujKraje, siatka, SZEROKOSC, WYSOKOSC } from '../app/geo.js';

test('projekcja: rogi świata i punkty kontrolne', () => {
  assert.deepEqual(projektuj(90, -180), [0, 0]); // lewy górny róg
  assert.deepEqual(projektuj(-90, 180), [SZEROKOSC, WYSOKOSC]); // prawy dolny
  const [x, y] = projektuj(52.23, 21.01); // Warszawa
  assert.ok(Math.abs(x - 2010.1) < 0.5, `x=${x}`);
  assert.ok(Math.abs(y - 377.7) < 0.5, `y=${y}`);
});

test('projekcja jest odwracalna', () => {
  const [lat, lon] = odwroc(...projektuj(-33.9, 151.2)); // Sydney
  assert.ok(Math.abs(lat + 33.9) < 1e-9 && Math.abs(lon - 151.2) < 1e-9);
});

test('projekcja: współrzędne poza zakresem rzucane', () => {
  assert.throws(() => projektuj(NaN, 0), RangeError);
  assert.throws(() => projektuj(0, 'wschód'), RangeError);
});

/**
 * Minimalna topologia (scale 10, translate 0). Uwaga: pierwszy delta każdego
 * łuku koduje punkt absolutny (łuki startują od (0,0)). Łuki 0–2 tworzą
 * kwadrat (0,0)→(10,0)→(10,10)→(0,10); łuk 3 służy do testu indeksu
 * odwróconego (~3).
 */
function miniTopologia() {
  return {
    type: 'Topology',
    transform: { scale: [10, 10], translate: [0, 0] },
    arcs: [
      [
        [0, 0],
        [1, 0],
      ], // absolutnie: (0,0)→(10,0)
      [
        [1, 0],
        [0, 1],
        [-1, 0],
      ], // absolutnie: (10,0)→(10,10)→(0,10)
      [
        [0, 1],
        [0, -1],
      ], // absolutnie: (0,10)→(0,0)
      [
        [0, 0],
        [1, 0],
        [0, 1],
      ], // absolutnie: (0,0)→(10,0)→(10,10); używany jako ~3 (odwrócony)
    ],
    objects: {
      countries: {
        type: 'GeometryCollection',
        geometries: [{ type: 'Polygon', arcs: [[0, 1, 2], [0, ~3]], properties: { name: 'Testlandia' }, id: 'TST' }],
      },
    },
  };
}

test('dekoder TopoJSON: kwantyzacja i transformacja', () => {
  const luki = dekodujLuki(miniTopologia());
  assert.deepEqual(luki[0], [
    [0, 0],
    [10, 0],
  ]);
  assert.deepEqual(luki[1], [
    [10, 0],
    [10, 10],
    [0, 10],
  ]);
  assert.deepEqual(luki[2], [
    [0, 10],
    [0, 0],
  ]);
});

test('dekoder TopoJSON: łuk odwrotny (~i) czytany od końca', () => {
  const luki = dekodujLuki(miniTopologia());
  assert.deepEqual(luki[3], [
    [0, 0],
    [10, 0],
    [10, 10],
  ]);
  assert.deepEqual(punktyLuku(luki, ~3), [
    [10, 10],
    [10, 0],
    [0, 0],
  ]);
  assert.throws(() => punktyLuku(luki, 99), RangeError);
});

test('poskladajPierscien: skleja łuki bez zdublowanych punktów i domyka', () => {
  const luki = dekodujLuki(miniTopologia());
  const pierscien = poskladajPierscien(luki, [0, 1, 2]);
  assert.deepEqual(pierscien, [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ]);
});

test('dekoder TopoJSON: pełne kraje ze ścieżkami SVG', () => {
  const kraje = dekodujKraje(miniTopologia());
  assert.equal(kraje.length, 1);
  assert.equal(kraje[0].nazwa, 'Testlandia');
  assert.ok(kraje[0].d.startsWith('M'));
  assert.ok(kraje[0].d.endsWith('Z'));
  assert.ok(kraje[0].d.includes('ZM'), 'pierścień zewnętrzny i wewnętrzny jako osobne podścieżki');
});

test('siatka: linie bez NaN, oczekiwana liczba linii', () => {
  const d = siatka(30);
  assert.ok(!d.includes('NaN'));
  assert.equal((d.match(/M/g) ?? []).length, 5 + 11); // 5 południków + 11 równoleżników
});
