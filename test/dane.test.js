/** Testy prawdziwych danych repozytorium: walidacja wpisów + spójność indeksu. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { wczytajIKwaliduj, zbudujIndeks, PLIK_INDEKSU, KATALOG_WPISOW } from '../tools/rebuild-index.mjs';

test('wszystkie wpisy w data/manifestations przechodzą walidację protokołu', async () => {
  const wpisy = await wczytajIKwaliduj();
  assert.ok(wpisy.length >= 1, 'kartoteka nie powinna być pusta');
});

test('data/index.json jest spójny z wpisami (deterministyczny build)', async () => {
  const wpisy = await wczytajIKwaliduj();
  const oczekiwany = JSON.stringify(zbudujIndeks(wpisy), null, 2) + '\n';
  const istniejacy = await readFile(PLIK_INDEKSU, 'utf8');
  assert.equal(istniejacy, oczekiwany, 'data/index.json jest nieaktualny — uruchom npm run build');
});

test('współrzędne wpisów lądują w oczekiwanych strefach mapy', async () => {
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW);
  const w = wpisy.find((x) => x.slug === 'wendigo');
  assert.ok(w, 'wpis wzorcowy wendigo istnieje');
  assert.ok(w.lokalizacja.lat > 40 && w.lokalizacja.lat < 60, 'Kenora ~49-50°N');
  assert.ok(w.lokalizacja.lon > -100 && w.lokalizacja.lon < -85, 'Kenora ~-94°E');
});
