/** Testy mechaniki Kroniki: paliwo pasywne, ledger epoki, walidacja świata. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  paliwoPasywne,
  przeliczEpoke,
  zbudujPodsumowanie,
  PLIK_TOM_1,
  PLIK_EPOKA_1,
  PLIK_INDEKSU,
  PLIK_KANONU,
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
});

test('Tom I / Epoka I: mechanizm przechodzi i prowadzi czytelny ledger', async () => {
  const [tom, epoka, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = przeliczEpoke({ tom, epoka, indeks, kanon });

  assert.equal(wynik.ok, true, JSON.stringify(wynik.bledy));
  assert.deepEqual(
    wynik.uczestnicy.map((u) => [u.slug, u.pasywne, u.saldoPo]),
    [
      ['egungun', 18, 21],
      ['barbarossa-kyffhaeuser', 17, 15],
      ['kentaur-pelion', 16, 14],
    ]
  );
  assert.equal(wynik.stanPo.os.mit, 51);
  assert.equal(wynik.stanPo.os.racjonalizacja, 50);
  assert.equal(wynik.stanPo.zasieg.find((z) => z.slug === 'egungun').wielkosc, 0.27);
  assert.equal(wynik.stanPo.zasieg.find((z) => z.slug === 'kentaur-pelion').wielkosc, 0.14);
  assert.equal(wynik.narrator.ocena.length, 2);
  assert.equal(wynik.narrator.ocena[0].stopien, 2);
});

test('uczestnik bez wystarczającego paliwa nie może wejść do epoki', async () => {
  const [tom, epoka, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const zepsute = structuredClone(epoka);
  zepsute.uczestnicy[0].kosztUdzialu = 99;
  const wynik = przeliczEpoke({ tom, epoka: zepsute, indeks, kanon });
  assert.equal(wynik.ok, false);
  assert.ok(wynik.bledy.some((b) => /egungun: paliwo pasywne 18 < koszt wejścia 99/.test(b)));
});

test('zwrot wymaga realnej dodatniej zmiany zasięgu', async () => {
  const [tom, epoka, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const zepsute = structuredClone(epoka);
  zepsute.uczestnicy[1].zwrot = 2; // Barbarossa: delta zasięgu = 0
  const wynik = przeliczEpoke({ tom, epoka: zepsute, indeks, kanon });
  assert.equal(wynik.ok, false);
  assert.ok(
    wynik.bledy.some((b) => /barbarossa-kyffhaeuser: zwrot 2 bez dodatniej zmiany/.test(b))
  );
});

test('podsumowanie zawiera stan po epoce i ocenę narratora', async () => {
  const [tom, epoka, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const podsumowanie = zbudujPodsumowanie({ tom, epoka, indeks, kanon });
  assert.equal(podsumowanie.walidacja, true);
  assert.equal(podsumowanie.epoka, 'epoka-1');
  assert.equal(podsumowanie.narrator.ocena.length, 2);
  assert.ok(podsumowanie.stanPo.dominacje.length >= 3);
});