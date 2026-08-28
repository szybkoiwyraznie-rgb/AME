/** Testy generatora HTML panelu wpisu (czyste funkcje ui.js, bez DOM). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { htmlWpisu, htmlListy, htmlTagow, esc } from '../app/ui.js';

async function dane(plik = 'egungun') {
  const wpis = JSON.parse(await readFile(`data/manifestations/${plik}.json`, 'utf8'));
  const indeks = JSON.parse(await readFile('data/index.json', 'utf8'));
  return { wpis, indeks };
}

test('esc: znaki HTML uciekają', () => {
  assert.equal(esc('<script>&"\''), '&lt;script&gt;&amp;&quot;&#39;');
});

test('htmlWpisu: komplet sekcji protokołu I–V (egungun)', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  for (const fraza of [
    'Rezonans i tożsamość',
    'Charakterystyka i natura',
    'Dokumentacja (The Source Stack)',
    'Wizualizacja',
    'Trofea i dowody eliminacji',
    '--ar 21:9',
    'inspiracja kartą',
    'Krumar Initiate',
  ]) {
    assert.ok(html.includes(fraza), `brak: ${fraza}`);
  }
  assert.ok(!html.includes('<script'), 'treść wpisu nigdy jako HTML');
});

test('htmlWpisu: powiązanie do istniejącego wpisu (lincoln-imp → egungun)', async () => {
  const { wpis, indeks } = await dane('lincoln-imp');
  const html = htmlWpisu(wpis, indeks);
  assert.ok(html.includes('Powiązania'));
  assert.ok(html.includes('data-slug="egungun"'));
});

test('htmlWpisu: backlinki liczone z indeksu (egungun ← lincoln-imp)', async () => {
  const { wpis, indeks } = await dane('egungun');
  const html = htmlWpisu(wpis, indeks);
  assert.ok(html.includes('wzmiankowany przez'));
  assert.ok(html.includes('data-slug="lincoln-imp"'));
});

test('htmlWpisu: tagi i nazwa karty escapowane', async () => {
  const { wpis, indeks } = await dane();
  wpis.tagi = ['<xss>'];
  wpis.karta.nazwa = '<b>Nightmare</b>';
  const html = htmlWpisu(wpis, indeks);
  assert.ok(!html.includes('<b>Nightmare</b>'));
  assert.ok(html.includes('&lt;b&gt;Nightmare&lt;/b&gt;'));
  assert.ok(html.includes('data-tag="&lt;xss&gt;"'));
});

test('htmlListy i htmlTagow: rekordy z indeksu, licznik tagów', async () => {
  const { indeks } = await dane();
  const lista = htmlListy(indeks, null);
  assert.ok(lista.includes('Egungun'));
  assert.ok(lista.includes('Imp z Lincoln'));
  assert.ok(lista.includes('insp. Krumar Initiate'));
  const tagi = htmlTagow(indeks, 'imp');
  assert.ok(tagi.includes('data-tag="imp"'));
  assert.ok(tagi.includes('class="chip tag aktywny"'));
  assert.ok(htmlListy(indeks, new Set(['egungun'])).includes('Egungun'));
  assert.ok(!htmlListy(indeks, new Set(['egungun'])).includes('Imp z Lincoln</span>'));
});
