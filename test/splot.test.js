/** C5: SPLOT — droga, zasoby i losowe rozstrzygnięcie przy stałej szansie. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizujZasoby, profileDrogi, szansaWezla, rozstrzygnijWezel, rozegrajDroge, naporSwiata, echoDrogi } from '../app/splot.js';

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

/* Sprzężenie Kronika ↔ SPLOT (ADR 0025) */

const KRONIKA_TEST = {
  stanPo: {
    os: { mit: 60, racjonalizacja: 40 },
    zasieg: [
      { slug: 'a', wielkosc: 0.5 },
      { slug: 'b', wielkosc: 0.3 },
    ],
    paliwo: { a: 20, b: 8 },
  },
  epoki: [
    {
      slug: 'epoka-1',
      konsekwencje: {
        watki: [
          { id: 'w1', stan: 'otwarty', byty: ['a'] },
          { id: 'w2', stan: 'zamkniety', byty: ['b'] },
          { id: 'w3', stan: 'otwarty', byty: ['z'] },
        ],
      },
    },
  ],
};

test('napór świata: oś, zasięg, paliwo i otwarte wątki dają deterministyczną premię', () => {
  const s = naporSwiata(KRONIKA_TEST, { sklad: ['a', 'b'] });
  const wg = Object.fromEntries(s.skladniki.map((x) => [x.nazwa, x.wartosc]));
  assert.equal(wg['oś świata'], 2, 'mit 60 → (60-50)*0.2');
  assert.equal(wg['zasięg składu'], 0, 'średni zasięg 0.4 = próg');
  assert.equal(wg['paliwo składu'], 1, 'średnie paliwo 14 → (14-12)*0.5');
  assert.equal(wg['otwarte wątki'], 2, 'jeden otwarty wątek dotykający składu');
  assert.equal(s.premia, 5);
  assert.equal(naporSwiata(null, { sklad: ['a'] }).premia, 0, 'brak Kroniki = zero');
  assert.equal(naporSwiata(KRONIKA_TEST, { sklad: [] }).premia, 0, 'pusty skład = zero');
});

test('napór świata zmienia szansę węzła, ale nigdy poza granice 5–95%', () => {
  const profile = [{ percentyle: { zywotnosc: 50, spryt: 50, rezonans: 50 }, staty: { motywy: [] } }];
  const wezel = { trudnosc: 50 };
  const bez = szansaWezla({ wezel, profile, sklad: ['a', 'b'] });
  const zPremia = szansaWezla({ wezel, profile, sklad: ['a', 'b'], naporSwiata: 10 });
  const zKara = szansaWezla({ wezel, profile, sklad: ['a', 'b'], naporSwiata: -10 });
  assert.ok(zPremia.prawdopodobienstwo > bez.prawdopodobienstwo);
  assert.ok(zKara.prawdopodobienstwo < bez.prawdopodobienstwo);
  assert.equal(szansaWezla({ wezel, profile, sklad: [], naporSwiata: 999 }).naporSwiata, 15, 'napór jest przycięty do ±15');
  const ekstremum = szansaWezla({ wezel: { trudnosc: 100 }, profile, sklad: [], naporSwiata: -15 });
  assert.ok(ekstremum.prawdopodobienstwo >= 0.05);
});

test('echo drogi: rozstrzygnięcie zamienia się w propozycję dla Kroniki', () => {
  const droga = { slug: 'droga-x', sklad: ['a', 'b'] };
  const u = echoDrogi(droga, { status: 'ukonczona', sklad: ['a', 'b'], dziennik: [{ sukces: true }, { sukces: true }] });
  assert.equal(u.os.mit, 1);
  assert.equal(u.os.mit + u.os.racjonalizacja, 0, 'oś Kroniki zostaje zamknięta');
  assert.equal(u.watek.id, 'slad-droga-x');
  assert.equal(u.watek.stan, 'zamkniety');
  assert.deepEqual(u.zasieg.map((z) => z.delta), [0.008, 0.008]);
  assert.deepEqual(u.metryka, { wezly: 2, udane: 2 });

  const r = echoDrogi(droga, { status: 'rozszczepiona', sklad: ['a', 'b'], dziennik: [{ sukces: true }, { sukces: false }] });
  assert.equal(r.os.mit, 0);
  assert.equal(r.watek.stan, 'otwarty');

  const p = echoDrogi(droga, { status: 'przerwana', sklad: ['a'], dziennik: [{ sukces: false }] });
  assert.equal(p.os.mit, -1);
  assert.deepEqual(p.zasieg, [{ slug: 'a', delta: -0.004 }]);
});

test('rozegrajDroge wpina stan świata i zwraca ślad dla Kroniki', async () => {
  const [droga, indeks, kronika] = await Promise.all([
    readFile('data/splot/droga-ostatni-slad-gevaudan.json', 'utf8').then(JSON.parse),
    readFile('data/index.json', 'utf8').then(JSON.parse),
    readFile('data/kronika/summary.json', 'utf8').then(JSON.parse),
  ]);
  const losStaly = () => 0.5;
  const zKronika = rozegrajDroge({ droga, indeks, kanon: indeks.kanon, kronika, los: losStaly });
  const bezKroniki = rozegrajDroge({ droga, indeks, kanon: indeks.kanon, los: losStaly });
  assert.equal(typeof zKronika.swiat.premia, 'number');
  assert.equal(bezKroniki.swiat.premia, 0);
  assert.notDeepEqual(
    zKronika.dziennik.map((w) => w.prawdopodobienstwo),
    bezKroniki.dziennik.map((w) => w.prawdopodobienstwo),
    'stan Kroniki realnie przesuwa szanse drogi'
  );
  assert.equal(zKronika.echo.droga, droga.slug);
  assert.equal(zKronika.echo.watek.id, `slad-${droga.slug}`);
  const powtorka = rozegrajDroge({ droga, indeks, kanon: indeks.kanon, kronika, los: losStaly });
  assert.deepEqual(powtorka.dziennik, zKronika.dziennik, 'ten sam RNG i ta sama Kronika = ten sam przebieg');
});

