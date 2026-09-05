/** C5: SPLOT — droga, zasoby i losowe rozstrzygnięcie przy stałej szansie. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizujZasoby, profileDrogi, szansaWezla, rozstrzygnijWezel, rozegrajDroge } from '../app/splot.js';

const dane = async () => Promise.all([
  readFile('data/index.json', 'utf8').then(JSON.parse),
  readFile('data/kanon-tagow.json', 'utf8').then(JSON.parse),
  readFile('data/splot/droga-ostatni-slad-gevaudan.json', 'utf8').then(JSON.parse),
]);

test('SPLOT: normalizacja zasobów nie dopuszcza ujemnego długu', () => {
  assert.deepEqual(normalizujZasoby({ pamiec: 3.9, przejscie: -2 }), { pamiec: 3, przejscie: 0, dlug: 0, slad: 0 });
});

test('SPLOT: droga ma 2–4 znanych uczestników i profile z kartoteki', async () => {
  const [indeks, kanon, droga] = await dane();
  const profile = profileDrogi(droga, indeks, kanon);
  assert.equal(profile.length, 3);
  assert.deepEqual(profile.map((p) => p.staty.slug), droga.sklad);
  assert.throws(() => profileDrogi({ ...droga, sklad: ['nie-ma-takiego'] }, indeks, kanon), /nieznany uczestnik/);
});

test('SPLOT: ta sama droga i dane dają tę samą szansę, niezależnie od losu', async () => {
  const [indeks, kanon, droga] = await dane();
  const profile = profileDrogi(droga, indeks, kanon);
  const a = szansaWezla({ wezel: droga.wezly[0], profile, zasoby: droga.start.zasoby, sklad: droga.sklad });
  const b = szansaWezla({ wezel: droga.wezly[0], profile, zasoby: droga.start.zasoby, sklad: droga.sklad });
  assert.deepEqual(a, b);
  assert.ok(a.prawdopodobienstwo >= 0.05 && a.prawdopodobienstwo <= 0.95);
});

test('SPLOT: los rozstrzyga na granicy wyliczonej szansy', () => {
  assert.equal(rozstrzygnijWezel(0.4, () => 0.39).sukces, true);
  assert.equal(rozstrzygnijWezel(0.4, () => 0.4).sukces, false);
  assert.equal(rozstrzygnijWezel(0.4, () => 0.99).sukces, false);
  assert.throws(() => rozstrzygnijWezel(0.4), /RNG/);
});

test('SPLOT: dziennik zawiera szansę, los, zasoby i prozę wyniku', async () => {
  const [indeks, kanon, droga] = await dane();
  const wynik = rozegrajDroge({ droga, indeks, kanon, los: (() => { const wartosci = [0.01, 0.99, 0.01]; return () => wartosci.shift(); })() });
  assert.equal(wynik.status, 'rozszczepiona');
  assert.equal(wynik.dziennik.length, 3);
  for (const wpis of wynik.dziennik) {
    assert.ok(wpis.prawdopodobienstwo >= 0.05 && wpis.prawdopodobienstwo <= 0.95);
    assert.ok(wpis.wartoscLosowa >= 0 && wpis.wartoscLosowa < 1);
    assert.ok(typeof wpis.proza === 'string' && wpis.proza.length > 20);
    assert.ok(wpis.zasoby.pamiec >= 0);
  }
  assert.ok(wynik.proza.includes('Droga'));
});

test('SPLOT: ten sam RNG powtarza cały dziennik, inny RNG może zmienić fabułę', async () => {
  const [indeks, kanon, droga] = await dane();
  const run = (wartosci) => rozegrajDroge({ droga, indeks, kanon, los: (() => { const v = [...wartosci]; return () => v.shift(); })() });
  const a = run([0.2, 0.2, 0.2]);
  const b = run([0.2, 0.2, 0.2]);
  const c = run([0.99, 0.99, 0.99]);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.dziennik.map((x) => x.sukces), c.dziennik.map((x) => x.sukces));
});
