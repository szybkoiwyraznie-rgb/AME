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

test('materializacje zleconych kart istnieją we właściwych strefach mapy', async () => {
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW);
  const karty = new Set(wpisy.map((w) => w.karta.nazwa));
  assert.ok(karty.has('Krumar Initiate'), 'Krumar Initiate (TDM) zamaterializowana');
  assert.ok(karty.has('Forge Devil'), 'Forge Devil (DKA) zamaterializowana');
  const e = wpisy.find((w) => w.slug === 'egungun');
  assert.ok(e && e.lokalizacja.lat > 0 && e.lokalizacja.lat < 15 && e.lokalizacja.lon > 0 && e.lokalizacja.lon < 15, 'Oyo, Nigeria ~7.8N 3.9E');
  const i = wpisy.find((w) => w.slug === 'lincoln-imp');
  assert.ok(i && i.lokalizacja.lat > 50 && i.lokalizacja.lat < 60 && i.lokalizacja.lon < 0 && i.lokalizacja.lon > -2, 'Lincoln ~53.2N -0.5E');
});

test('każde źródło w kartotece ma adres https i nie powtarza się (B3 + ADR 0008)', async () => {
  const wpisy = await wczytajIKwaliduj();
  const adresy = new Set();
  for (const w of wpisy) {
    for (const d of w.dokumentacja) {
      assert.ok(String(d.url).startsWith('https://'), `${w.slug}: źródło bez https: ${JSON.stringify(d.url)}`);
      assert.ok(!adresy.has(d.url), `duplikat adresu w kartotece: ${d.url}`);
      adresy.add(d.url);
    }
    assert.ok(w.dokumentacja.length >= 3, `${w.slug}: kartoteka powinna mieć co najmniej 3 źródła`);
  }
});
