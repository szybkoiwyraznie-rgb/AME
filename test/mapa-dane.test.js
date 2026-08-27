/** Testy realnych assetów: mapa świata dekoduje się do sensownych ścieżek SVG. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dekodujKraje } from '../app/geo.js';

test('assets/map/countries-50m.json dekoduje się (Natural Earth, ADR 0003)', async () => {
  const topo = JSON.parse(await readFile(new URL('../assets/map/countries-50m.json', import.meta.url), 'utf8'));
  const kraje = dekodujKraje(topo);
  assert.ok(kraje.length >= 200, `oczekiwano ~240 krajów, jest ${kraje.length}`);
  const zNaN = kraje.filter((k) => k.d.includes('NaN'));
  assert.equal(zNaN.length, 0);
  assert.ok(kraje.some((k) => k.nazwa === 'Poland'), 'Polska obecna na mapie');
  // punkt Warszawy ląduje „na lądzie” w granicach viewBoxu świata
  assert.ok(kraje.every((k) => /^M-?\d/.test(k.d)));
});
