/** Testy mechaniki Kroniki: paliwo pasywne, sekwencja epok Tomu, oś zamknięta. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  paliwoPasywne,
  przeliczEpoke,
  zbudujPodsumowanieTomu,
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
  assert.equal(e1.stanPo.os.mit, 50);
  assert.equal(e1.stanPo.os.racjonalizacja, 50);

  assert.deepEqual(
    e2.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['lincoln-imp', 12, 10],
      ['kentaur-pelion', 14, 12],
      ['empusa-korynt', 17, 19],
    ]
  );
  assert.equal(e2.stanPo.os.mit + e2.stanPo.os.racjonalizacja, 100);
  assert.equal(e2.stanPo.zasieg.find((z) => z.slug === 'kentaur-pelion').wielkosc, 0.12);
  assert.equal(e2.stanPo.zasieg.find((z) => z.slug === 'empusa-korynt').wielkosc, 0.2);
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