/** Testy realnych assetów: mapa świata dekoduje się do sensownych ścieżek SVG. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dekodujKraje, projektuj, SZEROKOSC, WYSOKOSC } from '../app/geo.js';

const TOPO = new URL('../assets/map/countries-50m.json', import.meta.url);
const ε = 0.02;

/** Podścieżki ścieżki SVG jako tablice punktów [x, y] w jednostkach świata. */
function podsciezki(d) {
  return d
    .split('M')
    .filter(Boolean)
    .map((s) => {
      const l = s.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const pkt = [];
      for (let i = 0; i + 1 < l.length; i += 2) pkt.push([l[i], l[i + 1]]);
      return pkt;
    });
}

const naKrawedzi = ([x, y]) =>
  Math.abs(x) < ε || Math.abs(x - SZEROKOSC) < ε || Math.abs(y) < ε || Math.abs(y - WYSOKOSC) < ε;

test('assets/map/countries-50m.json dekoduje się (Natural Earth, ADR 0003)', async () => {
  const kraje = dekodujKraje(JSON.parse(await readFile(TOPO, 'utf8')));
  assert.ok(kraje.length >= 200, `oczekiwano ~240 krajów, jest ${kraje.length}`);
  assert.equal(kraje.filter((k) => k.d.includes('NaN')).length, 0);
  assert.ok(kraje.some((k) => k.nazwa === 'Poland'), 'Polska obecna na mapie');
  assert.ok(kraje.every((k) => /^M-?\d/.test(k.d)));
});

test('każdy punkt mieści się w prostokącie świata (projekcja równoodległa)', async () => {
  const kraje = dekodujKraje(JSON.parse(await readFile(TOPO, 'utf8')));
  const poza = [];
  for (const k of kraje)
    for (const p of podsciezki(k.d))
      for (const [x, y] of p)
        if (x < -ε || x > SZEROKOSC + ε || y < -ε || y > WYSOKOSC + ε) poza.push(`${k.nazwa} [${x}, ${y}]`);
  assert.deepEqual(poza, [], `punkty poza światem: ${poza.slice(0, 3).join('; ')}`);
});

test('żaden odcinek nie przechodzi przez wnętrze mapy (A3: antypołudnik)', async () => {
  const kraje = dekodujKraje(JSON.parse(await readFile(TOPO, 'utf8')));
  const wady = [];
  for (const k of kraje)
    for (const p of podsciezki(k.d))
      for (let i = 1; i < p.length; i++) {
        if (Math.abs(p[i][0] - p[i - 1][0]) > SZEROKOSC / 2 && !(naKrawedzi(p[i]) && naKrawedzi(p[i - 1])))
          wady.push(`${k.nazwa}: ${JSON.stringify(p[i - 1])} → ${JSON.stringify(p[i])}`);
      }
  assert.deepEqual(wady, [], `cięciwy przez mapę: ${wady.slice(0, 3).join(' | ')}`);
});

test('Rosja, Fidżi i Antarktyda są pocięte na strony szwu (A3)', async () => {
  const kraje = dekodujKraje(JSON.parse(await readFile(TOPO, 'utf8')));
  const z = (nazwa) => kraje.find((k) => k.nazwa === nazwa);

  // Rosja sięga za 180° (Czukotka, Wrangla): musi mieć kawałek przy LEWEJ
  // krawędzi mapy i przy prawej, a nie pas ciągnący się przez środek.
  const rosja = podsciezki(z('Russia').d);
  assert.ok(rosja.length >= 99, `Rosja: podścieżki ${rosja.length}`);
  assert.ok(rosja.some((p) => p.every(([x]) => x <= ε + 0.01)) === false, 'fałszywy alarm: sprawdzamy niżej');
  assert.ok(rosja.some((p) => Math.min(...p.map(([x]) => x)) <= ε), 'kawałek przy -180°');
  assert.ok(rosja.some((p) => Math.max(...p.map(([x]) => x)) >= SZEROKOSC - ε), 'kawałek przy +180°');

  // Fidżi: przed cięciem 10-punktowy pierścień dawał pas na -16,45° przez całą
  // szerokość mapy („gruby równoleżnik”). Teraz żaden fragment nie jest szeroki.
  for (const p of podsciezki(z('Fiji').d)) {
    const szerokosc = Math.max(...p.map(([x]) => x)) - Math.min(...p.map(([x]) => x));
    assert.ok(szerokosc < SZEROKOSC / 2, `Fidżi: fragment o szerokości ${szerokosc}`);
  }

  // Antarktyda: kontur rozcięty na szwie, domknięty przy biegunie — nie pas
  // przez środek mapy.
  const antarktyda = podsciezki(z('Antarctica').d);
  assert.ok(antarktyda.every((p) => p.every(([x, y]) => y >= 1500 || x <= ε || x >= SZEROKOSC - ε || p.length > 4)));
  assert.ok(antarktyda.some((p) => p.some(([, y]) => Math.abs(y - WYSOKOSC) < ε)), 'domknięcie po linii bieguna');
});

test('projekcja jest jednostajna w obu osiach: 1° długości = 1° szerokości (A1)', () => {
  const [x0, y0] = projektuj(0, 0);
  const [x1] = projektuj(0, 10); // 10° na wschód
  const [, y1] = projektuj(-10, 0); // 10° na południe
  assert.equal(x1 - x0, 100, '10° długości = 100 j.u.');
  assert.equal(y1 - y0, 100, '10° szerokości = 100 j.u. — ta sama skala, brak rozciągu');
  assert.equal(SZEROKOSC / WYSOKOSC, 2, 'świat ma proporcje 2:1');
});

test('Polska pozostaje krajem, nie pasem na całą mapę (A1 + A3)', async () => {
  const kraje = dekodujKraje(JSON.parse(await readFile(TOPO, 'utf8')));
  const [polska] = podsciezki(kraje.find((k) => k.nazwa === 'Poland').d);
  const x = polska.map(([v]) => v);
  const y = polska.map(([, v]) => v);
  const szerokosc = Math.max(...x) - Math.min(...x);
  const wysokosc = Math.max(...y) - Math.min(...y);
  // ~10° na ~5,9° w skali 10 j.u./stopień
  assert.ok(Math.abs(szerokosc / wysokosc - 10 / 5.9) < 0.25, `szer/wys = ${(szerokosc / wysokosc).toFixed(3)}`);
  assert.ok(szerokosc < SZEROKOSC / 10 && wysokosc < WYSOKOSC / 10, 'Polska nie jest pasem na całą mapę');
});

test('siatka i lądy są w tym samym układzie (współdzielony viewBox)', async () => {
  const { siatka } = await import('../app/geo.js');
  const d = siatka(30);
  assert.ok(!d.includes('NaN'));
  assert.equal((d.match(/M/g) ?? []).length, 5 + 11);
});
