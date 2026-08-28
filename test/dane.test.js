/** Testy prawdziwych danych repozytorium: walidacja wpisów + spójność indeksu. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { wczytajIKwaliduj, wczytajSkiti, zbudujIndeks, PLIK_INDEKSU, KATALOG_WPISOW, KATALOG_SKITOW } from '../tools/rebuild-index.mjs';

test('wszystkie wpisy w data/manifestations przechodzą walidację protokołu', async () => {
  const wpisy = await wczytajIKwaliduj();
  assert.ok(wpisy.length >= 1, 'kartoteka nie powinna być pusta');
});

test('data/index.json jest spójny z wpisami i bazą skitów (deterministyczny build)', async () => {
  const wpisy = await wczytajIKwaliduj();
  const skiti = await wczytajSkiti(KATALOG_SKITOW, new Set(wpisy.map((w) => w.slug)));
  const oczekiwany = JSON.stringify(zbudujIndeks(wpisy, skiti), null, 2) + '\n';
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

test('przepis CI jest wklejalny: YAML bez znaczników HTML i z wymaganymi kluczami (L9)', async () => {
  const t = await readFile('docs/setup/ci-workflow.yml', 'utf8');
  assert.ok(!/<!--|--!?>/.test(t), 'znaczniki HTML łamią parser YAML — to była przyczyna martwego CI (L9)');
  assert.ok(!t.includes('\t'), 'tabulacje są zakazane w YAML');
  const klucze = t.split('\n').filter((l) => /^[A-Za-z_][\w-]*:/.test(l)).map((l) => l.split(':')[0]);
  for (const wymagany of ['name', 'on', 'jobs']) {
    assert.ok(klucze.includes(wymagany), `brak klucza głównego ${wymagany}:`);
  }
  const wcięcia = t.split('\n').filter((l) => /^ +\S/.test(l)).map((l) => l.match(/^ */)[0].length);
  assert.ok(wcięcia.every((n) => n % 2 === 0), 'wcięcia muszą być wielokrotnością dwóch spacji');
  assert.ok(/^jobs:\n {2}test:$/m.test(t), 'oczekiwano jobs.test (wcięcie 2 spacje)');
  for (const krok of ['npm test', 'npm run build', 'npm run check', 'git diff --exit-code data/index.json']) {
    assert.ok(t.includes(krok), `brak kroku: ${krok}`);
  }
});

test('receptura CI jest zgodna z plikiem workflow (lustro nie może rozmijać się z bramą)', async () => {
  const [receptura, workflow] = await Promise.all([
    readFile('docs/setup/ci-workflow.yml', 'utf8'),
    readFile('.github/workflows/ci.yml', 'utf8').catch(() => null),
  ]);
  const cialo = receptura.slice(receptura.indexOf('name: CI')).trim();
  assert.ok(cialo_poprawny(cialo), 'receptura musi zaczynać się od `name: CI` i nie mieć znaczników HTML');
  if (workflow === null) return; // drzewo bez .github/workflows (np. klon bez tej ścieżki) — sprawdzamy samo lustro
  const zyciu = workflow.slice(workflow.indexOf('name: CI')).trim();
  assert.equal(cialo, zyciu, 'CI na main i lustro w repo mówią coś innego — zaktualizuj docs/setup/ci-workflow.yml (L12: bez proszenia właściciela)');
});

function cialo_poprawny(cialo) {
  return cialo.startsWith('name: CI') && !/<!--/.test(cialo) && /jobs:\s*\n\s{2}test:/.test(cialo);
}
