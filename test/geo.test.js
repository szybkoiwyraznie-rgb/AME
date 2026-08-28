import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projektuj,
  dopasujWidok,
  K_MAX,
  odwroc,
  dekodujLuki,
  punktyLuku,
  poskladajPierscien,
  sciezka,
  dekodujKraje,
  siatka,
  potnijPierscien,
  potnijPierscienie,
  przeciecieAntypoludnika,
  SZEROKOSC,
  WYSOKOSC,
} from '../app/geo.js';

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

/* ---- Antypołudnik (A3, ADR 0009): cięcie pierścieni na ±180° ------------- */

const domknij = (p) => [...p, [p[0][0], p[0][1]]];
const pole = (p) => {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += p[i - 1][0] * p[i][1] - p[i][0] * p[i - 1][1];
  return Math.abs(s / 2);
};
const maxSkokLon = (p) => Math.max(...p.slice(1).map((q, i) => Math.abs(q[0] - p[i][0])));

test('przeciecieAntypoludnika: interpoluje szerokość przecięcia', () => {
  const p = przeciecieAntypoludnika([170, 10], [-170, 20]); // krok przez +180 w połowie
  assert.ok(p, 'powinno zgłosić przecięcie');
  assert.equal(p.brzegA, 180);
  assert.equal(p.brzegB, -180);
  assert.ok(Math.abs(p.lat - 15) < 1e-9, `lat=${p.lat}`);
});

test('przeciecieAntypoludnika: brak przecięcia i krok po szwie', () => {
  assert.equal(przeciecieAntypoludnika([10, 5], [20, 6]), null);
  assert.equal(przeciecieAntypoludnika([170, 5], [175, 6]), null);
  // 180° i -180° to ten sam południk: krawędź na tej samej szerokości nie jest
  // cięciwą przez mapę, tylko przejściem po szwie
  const szew = przeciecieAntypoludnika([180, -16.5], [-180, -16.5]);
  assert.ok(szew && Math.abs(szew.lat + 16.5) < 1e-9);
});

test('potnijPierscien: pierścień bez przekroczenia wraca bez zmian', () => {
  const p = domknij([[10, 50], [20, 50], [20, 60], [10, 60]]);
  assert.deepEqual(potnijPierscien(p), [p]);
});

test('potnijPierscien: prostokąt przez antypołudnik dostaje dwa kawałki bez cięciwy', () => {
  const p = domknij([[170, 10], [170, 20], [-170, 20], [-170, 10]]);
  const czesci = potnijPierscien(p);
  assert.equal(czesci.length, 2, 'wschodni i zachodni kawałek');
  for (const c of czesci) {
    assert.ok(c.length >= 4, 'każdy kawałek to pełny wielokąt');
    assert.deepEqual(c[0], c[c.length - 1], 'domknięty');
    assert.ok(maxSkokLon(c) <= 180, `skok ${maxSkokLon(c)} nie może przekraczać szwu`);
    assert.ok(Math.max(...c.map((q) => Math.abs(q[0]))) <= 180, 'wewnątrz świata');
  }
  const [zach, wsch] = czesci; // spacer zaczyna się za przecięciem: zachód, potem wschód
  assert.ok(zach.every((q) => q[0] <= -170 + 1e-9), 'zachód: od -180° do -170°');
  assert.ok(wsch.every((q) => q[0] >= 170 - 1e-9), 'wschód: od 170° do 180°');
  assert.ok(zach[0][0] === -180 && zach[zach.length - 1][0] === -180, 'domknięcie zachodu po szwie');
  assert.ok(wsch[0][0] === 180 && wsch[wsch.length - 1][0] === 180, 'domknięcie wschodu po szwie');
  assert.ok(Math.abs(pole(wsch) + pole(zach) - 200) < 1e-9, 'pole obu kawałków = pole prostokąta 20°×10°');
});

test('potnijPierscien: pierścień rozcięty na szwie (typ Antarktydy) domyka się przy biegunie', () => {
  // kontur od -180° do 180° z jednym skokiem na końcu: bez cięcia dałby pas
  // przez całą mapę; kawałek musi zostać domknięty wzdłuż bieguna
  const p = domknij([[-180, -70], [-90, -75], [0, -72], [90, -75], [179.6, -84]]);
  const czesci = potnijPierscien(p);
  assert.equal(czesci.length, 1, 'jeden kawałek, bo kontur jest rozcięty raz');
  const c = czesci[0];
  for (let i = 1; i < c.length; i++) {
    const skok = Math.abs(c[i][0] - c[i - 1][0]);
    const poKrawedzi = Math.abs(c[i][1]) === 90 && Math.abs(c[i - 1][1]) === 90;
    assert.ok(skok <= 180 || poKrawedzi, `zakaz cięciwy przez mapę (skok ${skok})`);
  }
  assert.ok(c.some((q) => Math.abs(q[1] + 90) < 1e-9), 'domknięcie po stronie bieguna południowego');
});

test('potnijPierscien: nie pomnaża geometrii — punkty to oryginały lub szew', () => {
  const original = [[170, 10], [180, 15], [-170, 20], [-175, 12], [-180, 8], [180, 8], [170, 10]];
  const czesci = potnijPierscien(domknij(original.slice(0, -1)));
  const punkty = original.slice(0, -1); // wierzchołki wejściowe (bez duplikatu domknięcia)
  for (const c of czesci) {
    for (const [lon, lat] of c) {
      assert.ok(Math.abs(lon) <= 180 + 1e-9 && Math.abs(lat) <= 90 + 1e-9, 'punkty w zakresie świata');
      const znany = punkty.some(([a, b]) => Math.abs(a - lon) < 1e-9 && Math.abs(b - lat) < 1e-9);
      assert.ok(znany || Math.abs(Math.abs(lon) - 180) < 1e-9, `punkt [${lon}, ${lat}] jest nowy i nie leży na szwie`);
    }
    assert.deepEqual(c[0], c[c.length - 1], 'każdy kawałek domknięty');
  }
  const suma = czesci.reduce((s, c) => s + pole(c), 0);
  assert.ok(suma > 0 && suma < 400, `pola kawałków nie mogą urosnąć ponad pierścień (${suma})`);
});

test('dekodujKraje: kraje przekraczające szew nie rysują cięciwy przez świat', () => {
  const topologia = {
    type: 'Topology',
    transform: { scale: [1, 1], translate: [0, 0] },
    arcs: [
      [
        [170, 10],
        [0, 10],
        [-340, 0],
        [0, -10],
        [-10, 0],
      ],
    ],
    objects: {
      countries: {
        type: 'GeometryCollection',
        geometries: [{ type: 'Polygon', arcs: [[0]], properties: { name: 'Przeszum' }, id: 'PSZ' }],
      },
    },
  };
  const [kraj] = dekodujKraje(topologia);
  const podsciezki = kraj.d.split('M').filter(Boolean);
  assert.equal(podsciezki.length, 2, 'podścieżka po każdej stronie szwu');
  for (const s of podsciezki) {
    const l = s.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 2; i < l.length; i += 2) assert.ok(Math.abs(l[i] - l[i - 2]) <= 1800 + 1e-6, 'odcinek w granicach półkuli');
  }
});

/* ---- Widok mapy: dopasowanie do kontenera (A1, ADR 0009) ----------------- */

test('dopasujWidok: skala jednostajna, świat mieści się w oknie bez przycinania', () => {
  const szeroki = dopasujWidok({ szerokosc: 1600, wysokosc: 640 }, { x: 0, y: 0, k: 1 });
  assert.equal(szeroki.szerokosc, 1280, 'świat 1280 px szerokości przy 640 px wysokości');
  assert.equal(szeroki.wysokosc, 640);
  assert.ok(Math.abs(szeroki.s - 640 / 1800) < 1e-9, 'skala liczona z wysokości (contain)');
  assert.equal(szeroki.x, 160, 'wyśrodkowany w poziomie, bez ucinania biegunów');
  assert.equal(szeroki.y, 0);

  const waski = dopasujWidok({ szerokosc: 1000, wysokosc: 900 }, { x: 0, y: 0, k: 1 });
  assert.equal(waski.szerokosc, 1000, 'przy oknie węższym niż 2:1 świat mieści się co do szerokości');
  assert.equal(waski.wysokosc, 500);
  assert.equal(waski.y, 200, 'wyśrodkowany w pionie — ani jednego stopnia nie ucinamy');
  assert.ok(Math.abs(waski.s - szeroki.s) > 0, 'każde okno ma własną skalę bazową');
  assert.ok(Math.abs(waski.szerokosc / waski.wysokosc - 2) < 1e-9, 'proporcje świata 2:1 zachowane (brak rozciągu)');
});

test('dopasujWidok: powiększenie trzyma przesunięcie w granicach świata', () => {
  const d = dopasujWidok({ szerokosc: 1000, wysokosc: 500 }, { x: -99999, y: 500, k: 4 });
  assert.equal(d.k, 4);
  assert.equal(d.x, 1000 - 1000 * 4, `x=${d.x}`);
  assert.equal(d.y, 0, 'y dociśnięte do góry świata');
  const minimalny = dopasujWidok({ szerokosc: 1000, wysokosc: 500 }, { x: -50, y: -50, k: 0.2 });
  assert.equal(minimalny.k, 1, 'zoom poniżej dopasowania jest niedozwolony');
  const maksymalny = dopasujWidok({ szerokosc: 1000, wysokosc: 500 }, { x: 0, y: 0, k: 99999 });
  assert.equal(maksymalny.k, K_MAX);
});

test('dopasujWidok: kontener zero/degenerat nie produkuje NaN', () => {
  for (const kontener of [{ szerokosc: 0, wysokosc: 0 }, { szerokosc: NaN, wysokosc: undefined }, {}]) {
    const d = dopasujWidok(kontener, { x: 0, y: 0, k: 1 });
    assert.ok(Number.isFinite(d.x) && Number.isFinite(d.y) && d.s > 0, JSON.stringify({ kontener, d }));
  }
  const bezWidoku = dopasujWidok({ szerokosc: 800, wysokosc: 400 }, { k: NaN });
  assert.equal(bezWidoku.k, 1);
  assert.ok(Number.isFinite(bezWidoku.x));
});
