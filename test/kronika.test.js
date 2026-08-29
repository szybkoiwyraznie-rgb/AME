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
  assert.equal(paliwoPasywne(mapa.get('agni'), kanon), 11);
  assert.equal(paliwoPasywne(mapa.get('egungun'), kanon), 18);
  assert.equal(paliwoPasywne(mapa.get('kentaur-pelion'), kanon), 16);
  assert.equal(paliwoPasywne(mapa.get('empusa-korynt'), kanon), 17);
  assert.equal(paliwoPasywne(mapa.get('lincoln-imp'), kanon), 12);
});

test('Tom I: dwie epoki przechodzą i oś zamyka się na 100', async () => {
  const [tom, epoka1, epoka2, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2],
    indeks,
    kanon,
  });

  assert.equal(wynik.walidacja, true, JSON.stringify(wynik.bledy));
  assert.equal(wynik.epoki.length, 2);
  assert.equal(wynik.stanPo.os.mit + wynik.stanPo.os.racjonalizacja, 100);

  const [e1, e2] = wynik.epoki;
  assert.deepEqual(
    e1.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 18, 21],
      ['barbarossa-kyffhaeuser', 17, 15],
      ['kentaur-pelion', 16, 14],
    ]
  );
  assert.equal(e1.stanPo.os.mit, 35);
  assert.equal(e1.stanPo.os.racjonalizacja, 65);

  assert.deepEqual(
    e2.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['lincoln-imp', 12, 10],
      ['kentaur-pelion', 14, 12],
      ['empusa-korynt', 17, 19],
    ]
  );
  assert.equal(e2.stanPo.os.mit, 33);
  assert.equal(e2.stanPo.os.racjonalizacja, 67);
  assert.equal(e2.stanPo.zasieg.find((z) => z.slug === 'kentaur-pelion').wielkosc, 0.407);
  assert.equal(e2.stanPo.zasieg.find((z) => z.slug === 'empusa-korynt').wielkosc, 0.48);
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
  assert.ok(wynik.bledy.some((b) => /egungun: paliwo przed epoką 18 < koszt wejścia 99/.test(b)));
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

test('Tom I: trzy epoki przechodzą sekwencyjnie i wątki są ciągłe', async () => {
  const [tom, epoka1, epoka2, epoka3, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-3.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2, epoka3],
    indeks,
    kanon,
  });
  assert.equal(wynik.walidacja, true, JSON.stringify(wynik.bledy));
  assert.equal(wynik.epoki.length, 3);
  assert.equal(wynik.stanPo.os.mit + wynik.stanPo.os.racjonalizacja, 100);

  const e3 = wynik.epoki[2];
  assert.deepEqual(
    e3.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 21, 24],
      ['balor', 15, 13],
      ['empusa-korynt', 19, 17],
    ]
  );
  assert.equal(e3.stanPo.os.mit, 31);
  assert.equal(e3.stanPo.os.racjonalizacja, 69);
  assert.equal(e3.stanPo.zasieg.find((z) => z.slug === 'egungun').wielkosc, 0.523);

  // Otwarty wątek „odzwierni" domknięty w III; nowy otwarty „imie-na-progu".
  assert.equal(e3.konsekwencje.watki.find((w) => w.id === 'odzwierni').stan, 'zamkniety');
  assert.ok(e3.konsekwencje.watki.some((w) => w.id === 'imie-na-progu' && w.stan === 'otwarty'));
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