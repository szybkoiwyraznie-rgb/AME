/** Testy mechaniki Kroniki: paliwo pasywne, sekwencja epok Tomu, oś zamknięta. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  paliwoPasywne,
  przeliczEpoke,
  zbudujPodsumowanieTomu,
  kalibrujStanStart,
  walidujCiągłośćWątków,
  plikRaportu,
  PLIK_TOM_1,
  PLIK_EPOKA_1,
  PLIK_INDEKSU,
  PLIK_KANONU,
  KATALOG_KRONIKA,
} from '../tools/kronika.mjs';

async function wczytaj(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('seedy w tom-1.json są skalibrowane deterministycznie z kartoteki', async () => {
  const [tom, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  assert.deepEqual(kalibrujStanStart(indeks, kanon), tom.stanStart);
});

test('paliwo pasywne: 2×backlinki + tagi kanonu + sieć powiązań (max 3)', async () => {
  const [indeks, kanon] = await Promise.all([wczytaj(PLIK_INDEKSU), wczytaj(PLIK_KANONU)]);
  const mapa = new Map((indeks.manifestacje || []).map((m) => [m.slug, m]));
  assert.equal(paliwoPasywne(mapa.get('agni'), kanon), 14);
  assert.equal(paliwoPasywne(mapa.get('egungun'), kanon), 20);
  assert.equal(paliwoPasywne(mapa.get('kentaur-pelion'), kanon), 16);
  assert.equal(paliwoPasywne(mapa.get('empusa-korynt'), kanon), 17);
  assert.equal(paliwoPasywne(mapa.get('lincoln-imp'), kanon), 12);
  assert.equal(paliwoPasywne(mapa.get('sfinks-teby'), kanon), 14);
  assert.equal(paliwoPasywne(mapa.get('talos-kreta'), kanon), 14);
});

test('Tom I: epoki przechodzą sekwencyjnie i oś zamyka się na 100', async () => {
  const [tom, epoka1, epoka2, epoka3, epoka4, epoka5, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-3.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-4.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-5.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2, epoka3, epoka4, epoka5],
    indeks,
    kanon,
  });

  assert.equal(wynik.walidacja, true, JSON.stringify(wynik.bledy));
  assert.equal(wynik.epoki.length, 5);
  assert.equal(wynik.stanPo.os.mit + wynik.stanPo.os.racjonalizacja, 100);

  const [e1, e2, e3, e4, e5] = wynik.epoki;
  assert.deepEqual(
    e1.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 20, 23],
      ['barbarossa-kyffhaeuser', 17, 15],
      ['kentaur-pelion', 16, 14],
    ]
  );
  assert.equal(e1.stanPo.os.mit, 36);
  assert.equal(e1.stanPo.os.racjonalizacja, 64);

  assert.deepEqual(
    e2.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['lincoln-imp', 12, 10],
      ['kentaur-pelion', 14, 12],
      ['empusa-korynt', 17, 19],
    ]
  );
  assert.equal(e2.stanPo.os.mit, 34);
  assert.equal(e2.stanPo.os.racjonalizacja, 66);

  assert.deepEqual(
    e3.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 23, 26],
      ['balor', 21, 19],
      ['empusa-korynt', 19, 17],
    ]
  );
  assert.equal(e3.stanPo.os.mit, 32);
  assert.equal(e3.stanPo.os.racjonalizacja, 68);

  assert.deepEqual(
    e4.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 26, 29],
      ['selkie-sule-skerry', 24, 22],
      ['indra', 13, 11],
    ]
  );
  assert.equal(e4.stanPo.os.mit, 31);
  assert.equal(e4.stanPo.os.racjonalizacja, 69);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'egungun').wielkosc, 0.548);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'selkie-sule-skerry').wielkosc, 0.478);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'indra').wielkosc, 0.345);

  assert.deepEqual(
    e5.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['sfinks-teby', 14, 12],
      ['talos-kreta', 14, 12],
      ['lincoln-imp', 10, 12],
    ]
  );
  assert.equal(e5.stanPo.os.mit, 30);
  assert.equal(e5.stanPo.os.racjonalizacja, 70);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'lincoln-imp').wielkosc, 0.406);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'sfinks-teby').wielkosc, 0.284);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'talos-kreta').wielkosc, 0.289);
});

test('oś: delty mit+racjonalizacja muszą sumować się do 0', async () => {
  const [tom, epoka1, epoka2, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const zepsute = structuredClone(epoka1);
  zepsute.konsekwencje.os.mit = -1; // racjonalizacja +2 → suma delt +1
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [zepsute, epoka2],
    indeks,
    kanon,
  });
  assert.equal(wynik.walidacja, false);
  assert.ok(wynik.bledy.some((b) => /oś: delty/.test(b)));
});

test('uczestnik bez wystarczającego paliwa nie może wejść do epoki', async () => {
  const [tom, epoka1, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const zepsute = structuredClone(epoka1);
  zepsute.uczestnicy[0].kosztUdzialu = 99;
  const wynik = przeliczEpoke({ tom, epoka: zepsute, indeks, kanon });
  assert.equal(wynik.ok, false);
  assert.ok(wynik.bledy.some((b) => /egungun: paliwo przed epoką \d+ < koszt wejścia 99/.test(b)));
});

test('zwrot wymaga realnej dodatniej zmiany zasięgu', async () => {
  const [tom, epoka1, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const zepsute = structuredClone(epoka1);
  zepsute.uczestnicy[1].zwrot = 2; // Barbarossa: delta zasięgu = 0
  const wynik = przeliczEpoke({ tom, epoka: zepsute, indeks, kanon });
  assert.equal(wynik.ok, false);
  assert.ok(
    wynik.bledy.some((b) => /barbarossa-kyffhaeuser: zwrot 2 bez dodatniej zmiany/.test(b))
  );
});

test('epoki zapisują delty, a nie bezwzględne przed/po (auto-rebase seedu)', async () => {
  const [e1, e4] = await Promise.all([
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-4.json')),
  ]);
  for (const row of e1.konsekwencje.zasieg) {
    assert.equal(typeof row.delta, 'number');
    assert.equal(row.przed, undefined);
    assert.equal(row.po, undefined);
  }
  for (const row of e1.konsekwencje.dominacje) {
    assert.equal(typeof row.delta, 'number');
    assert.equal(row.przed, undefined);
    assert.equal(row.po, undefined);
  }
  assert.ok(e4.konsekwencje.watki.some((w) => w.id === 'imie-na-progu' && w.stan === 'zamkniety'));
  assert.ok(e4.konsekwencje.watki.some((w) => w.id === 'kres-indry' && w.stan === 'otwarty'));
});

test('wątki z Epoki I–II są przenoszone przez cały Tom (do Epoki IV)', async () => {
  const [tom, epoka1, epoka2, epoka3, epoka4, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-3.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-4.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2, epoka3, epoka4],
    indeks,
    kanon,
  });
  assert.equal(wynik.walidacja, true, JSON.stringify(wynik.bledy));
  const e4 = wynik.epoki[3];
  assert.ok(e4.konsekwencje.watki.some((w) => w.id === 'czwarty-stol' && w.stan === 'otwarty'));
  assert.ok(e4.konsekwencje.watki.some((w) => w.id === 'warunek-barbarossy' && w.stan === 'otwarty'));
  assert.ok(e4.konsekwencje.watki.some((w) => w.id === 'wedrowny-dom-empusy' && w.stan === 'otwarty'));
});

test('ciągłość: otwarty wątek zaginiony jest błędem, zamknięty nie może się otworzyć', () => {
  const bledy = [];
  walidujCiągłośćWątków(
    [{ id: 'czwarty-stol', stan: 'otwarty' }],
    new Map([
      ['czwarty-stol', { stan: 'otwarty', epoka: 'epoka-1' }],
      ['warunek-barbarossy', { stan: 'otwarty', epoka: 'epoka-1' }],
      ['wino-w-uczcie', { stan: 'zamkniety', epoka: 'epoka-1' }],
    ]),
    bledy
  );
  assert.equal(bledy.length, 1);
  assert.ok(bledy.some((b) => /zaginął/.test(b)));

  const bledy2 = [];
  walidujCiągłośćWątków(
    [{ id: 'wino-w-uczcie', stan: 'otwarty' }],
    new Map([['wino-w-uczcie', { stan: 'zamkniety', epoka: 'epoka-1' }]]),
    bledy2
  );
  assert.equal(bledy2.length, 1);
  assert.ok(bledy2.some((b) => /nie może się otworzyć/.test(b)));
});

test('podsumowanie zawiera epoki, ocenę narratora i raport mapuje się do pliku', async () => {
  const [tom, epoka1, epoka2, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const podsumowanie = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2],
    indeks,
    kanon,
  });
  assert.equal(podsumowanie.walidacja, true);
  assert.equal(podsumowanie.epoki.length, 2);
  assert.equal(podsumowanie.epoki[0].narrator.ocena.length, 2);
  assert.ok(podsumowanie.stanPo.dominacje.length >= 5);
  assert.match(plikRaportu('epoka-1'), /docs\/kronika-epoka-1\.html$/);
});