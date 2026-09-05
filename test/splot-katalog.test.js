/** C6 (obrót 3): katalog dróg SPLOTU w indeksie — walidacja i rekordy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  KATALOG_DROG,
  wczytajDrogi,
  walidujDroge,
  rekordyDrog,
  PLIK_INDEKSU,
} from '../tools/rebuild-index.mjs';
import { rozegrajDroge } from '../app/splot.js';

const poprawnaDroga = () => ({
  slug: 'proba',
  tytul: 'Próba',
  cel: 'Cel drogi',
  miejsce: 'Gdzieś',
  sklad: ['a', 'b'],
  wezly: [{ slug: 'w1', nazwa: 'Węzeł', trudnosc: 40, proza: { sukces: 'tak', porazka: 'nie' } }],
  proza: { ukonczona: 'x', przerwana: 'y', rozszczepiona: 'z' },
});

test('drogi: katalog w data/splot przechodzi walidację i trafia do indeksu', async () => {
  const indeks = JSON.parse(await readFile(PLIK_INDEKSU, 'utf8'));
  const slugiBytow = new Set(indeks.manifestacje.map((m) => m.slug));
  const drogi = await wczytajDrogi(KATALOG_DROG, slugiBytow);
  assert.ok(drogi.length >= 2, 'archiwum ma co najmniej dwie drogi');
  assert.deepEqual(
    indeks.drogi.map((d) => d.slug),
    drogi.map((d) => d.slug).sort((a, b) => a.localeCompare(b, 'pl'))
  );
  for (const rekord of indeks.drogi) {
    assert.ok(rekord.tytul && rekord.cel && rekord.miejsce, `${rekord.slug}: niepełny rekord katalogu`);
    assert.ok(rekord.wezly >= 1);
    assert.match(rekord.plik, /^data\/splot\/droga-[a-z0-9-]+\.json$/);
    for (const slug of rekord.sklad) assert.ok(slugiBytow.has(slug), `${rekord.slug}: nieznany uczestnik ${slug}`);
  }
});

test('drogi: rekordy katalogu są posortowane i nie niosą pełnych węzłów', () => {
  const rekordy = rekordyDrog([
    { ...poprawnaDroga(), slug: 'zeta', tytul: 'Z' },
    { ...poprawnaDroga(), slug: 'alfa', tytul: 'A' },
  ]);
  assert.deepEqual(rekordy.map((r) => r.slug), ['alfa', 'zeta']);
  assert.equal(rekordy[0].wezly, 1);
  assert.equal(typeof rekordy[0].plik, 'string');
  assert.equal(rekordy[0].proza, undefined, 'katalog nie może dublować pełnej treści drogi');
});

test('drogi: walidator łapie braki struktury i skład spoza kartoteki', () => {
  const znane = new Set(['a', 'b']);
  assert.deepEqual(walidujDroge(poprawnaDroga(), znane), []);
  assert.ok(walidujDroge({ ...poprawnaDroga(), sklad: ['a'] }, znane).some((b) => /2–4/.test(b)));
  assert.ok(walidujDroge({ ...poprawnaDroga(), sklad: ['a', 'a'] }, znane).some((b) => /powtarzać/.test(b)));
  assert.ok(walidujDroge({ ...poprawnaDroga(), sklad: ['a', 'x'] }, znane).some((b) => /nieznany uczestnik/.test(b)));
  assert.ok(walidujDroge({ ...poprawnaDroga(), tytul: '' }, znane).some((b) => /tytul/.test(b)));
  const zlyWezel = poprawnaDroga();
  zlyWezel.wezly = [{ slug: 'w', nazwa: 'W', trudnosc: 140, proza: { sukces: 'a', porazka: 'b' } }];
  assert.ok(walidujDroge(zlyWezel, znane).some((b) => /trudność/.test(b)));
  const bezProzy = poprawnaDroga();
  delete bezProzy.proza.przerwana;
  assert.ok(walidujDroge(bezProzy, znane).some((b) => /przerwana/.test(b)));
});

test('drogi: każda droga z katalogu daje się rozegrać silnikiem SPLOTU', async () => {
  const [indeks, kanon] = await Promise.all([
    readFile('data/index.json', 'utf8').then(JSON.parse),
    readFile('data/kanon-tagow.json', 'utf8').then(JSON.parse),
  ]);
  for (const rekord of indeks.drogi) {
    const droga = JSON.parse(await readFile(rekord.plik, 'utf8'));
    const wynikSukcesow = rozegrajDroge({ droga, indeks, kanon, los: () => 0 });
    assert.equal(wynikSukcesow.status, 'ukonczona', `${rekord.slug}: same sukcesy powinny domknąć drogę`);
    const wynikPorazek = rozegrajDroge({ droga, indeks, kanon, los: () => 0.999 });
    assert.equal(wynikPorazek.status, 'przerwana', `${rekord.slug}: same porażki powinny ją przerwać`);
    assert.ok(wynikSukcesow.proza.length > 40, `${rekord.slug}: brak prozy zamknięcia`);
    assert.equal(wynikSukcesow.echo.watek.stan, 'zamkniety');
  }
});
