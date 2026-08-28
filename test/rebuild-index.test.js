import test from 'node:test';
import assert from 'node:assert/strict';
import { zbudujIndeks, wczytajIKwaliduj } from '../tools/rebuild-index.mjs';
import { wpisWzorzec } from './fixtures/wpis-wzorzec.js';

function dwaWpisy() {
  const a = wpisWzorzec(); // slug: byt-testowy
  const b = wpisWzorzec({ slug: 'zorza', nazwa: 'Zorza', tagi: ['las', 'gory'] });
  b.powiazania = [{ slug: 'byt-testowy', opis: 'oba byty pojawiają się nocą i oba kojarzone są z tą samą okolicą, więc wiąże je wspólny teren i pora' }];
  return [b, a]; // celowo w odwrotnej kolejności
}

test('indeks: deterministyczne sortowanie po slugu', () => {
  const i1 = zbudujIndeks(dwaWpisy());
  const i2 = zbudujIndeks(dwaWpisy());
  assert.deepEqual(i1, i2);
  assert.deepEqual(
    i1.manifestacje.map((m) => m.slug),
    ['byt-testowy', 'zorza']
  );
  assert.equal(i1.liczba, 2);
});

test('indeks bez kanonu: słownik tagów alfabetyczny, ze słowiańskimi znakami', () => {
  const c = wpisWzorzec({ slug: 'zmora', tagi: ['źrenica', 'las'] });
  const i = zbudujIndeks([...dwaWpisy(), c]);
  assert.equal(i.wersja, 3, 'indeks ma wersję 3 (kanon tagów)');
  assert.deepEqual(Object.keys(i.tagi), [...Object.keys(i.tagi)].sort((x, y) => x.localeCompare(y, 'pl')));
  assert.deepEqual(i.tagi.las.wpisy, ['byt-testowy', 'zmora', 'zorza']);
  assert.equal(i.tagi.las.kategoria, 'bez-kanonu', 'bez kanonu nie ma kategorii do pokazania');
  assert.deepEqual(i.kanon.kategorie, [], 'puste kategorie, gdy kanonu nie podano');
});

test('indeks: backlinki wyliczone z powiązań jednokierunkowych', () => {
  const i = zbudujIndeks(dwaWpisy());
  const zorza = i.manifestacje.find((m) => m.slug === 'zorza');
  const byt = i.manifestacje.find((m) => m.slug === 'byt-testowy');
  assert.deepEqual(zorza.powiazania, ['byt-testowy']);
  assert.deepEqual(zorza.backlinki, []);
  assert.deepEqual(byt.backlinki, ['zorza']);
});

test('wczytajIKwaliduj: raport błędów plik po pliku, slug = nazwa pliku', async () => {
  const katalog = new URL('./fixtures/katalog-bledow/', import.meta.url).pathname;
  await assert.rejects(wczytajIKwaliduj(katalog), (err) => {
    assert.match(err.message, /Walidacja wpisów NIEPRZESZŁA/);
    assert.match(err.message, /niepoprawny-slug\.json: slug/);
    assert.match(err.message, /zly-json\.json: niepoprawny JSON/);
    return true;
  });
});

test('wczytajIKwaliduj: poprawny katalog przechodzi', async () => {
  const katalog = new URL('./fixtures/katalog-ok/', import.meta.url).pathname;
  const wpisy = await wczytajIKwaliduj(katalog);
  assert.equal(wpisy.length, 2);
  assert.deepEqual(
    wpisy.map((w) => w.slug).sort(),
    ['byt-testowy', 'zorza']
  );
});
