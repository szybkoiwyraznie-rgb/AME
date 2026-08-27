/** Testy generatora HTML panelu wpisu (czyste funkcje ui.js, bez DOM). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { htmlWpisu, htmlListy, htmlTagow, esc } from '../app/ui.js';

async function dane(plik = 'zmora') {
  const wpis = JSON.parse(await readFile(`data/manifestations/${plik}.json`, 'utf8'));
  const indeks = JSON.parse(await readFile('data/index.json', 'utf8'));
  return { wpis, indeks };
}

test('esc: znaki HTML uciekają', () => {
  assert.equal(esc('<script>&"\''), '&lt;script&gt;&amp;&quot;&#39;');
});

test('htmlWpisu: komplet sekcji protokołu I–V + powiązania (zmora → wendigo)', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  for (const fraza of [
    'Rezonans i tożsamość',
    'Charakterystyka i natura',
    'Dokumentacja (The Source Stack)',
    'Wizualizacja',
    'Trofea i dowody eliminacji',
    'Powiązania',
    'data-slug="wendigo"',
    '--ar 21:9',
  ]) {
    assert.ok(html.includes(fraza), `brak: ${fraza}`);
  }
  assert.ok(!html.includes('<script'), 'treść wpisu nigdy jako HTML');
});

test('htmlWpisu: backlinki liczone z indeksu (wendigo ← zmora)', async () => {
  const { wpis, indeks } = await dane('wendigo');
  const html = htmlWpisu(wpis, indeks);
  assert.ok(html.includes('wzmiankowany przez'));
  assert.ok(html.includes('data-slug="zmora"'));
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
  assert.ok(lista.includes('Wendigo'));
  assert.ok(lista.includes('Zmora'));
  assert.ok(lista.includes('insp. Tarmogoyf'));
  const tagi = htmlTagow(indeks, 'byt-nocny');
  assert.ok(tagi.includes('data-tag="byt-nocny"'));
  assert.ok(tagi.includes('class="chip tag aktywny"'));
  assert.ok(htmlListy(indeks, new Set(['zmora'])).includes('Zmora'));
  assert.ok(!htmlListy(indeks, new Set(['zmora'])).includes('Wendigo</span>'));
});
