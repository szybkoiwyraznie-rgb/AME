/** Testy generatora HTML panelu wpisu (czyste funkcje ui.js, bez DOM). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { htmlWpisu, htmlWarstwyWpisu, linkDoZrodla, htmlListy, htmlTagow, esc, nastepnyMotyw, motywPoczatkowy, etykietaMotywu, MOTYWY, KLUCZ_MOTYWU } from '../app/ui.js';

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

/* ---- Motyw jasny/ciemny (A2) ---- */

test('nastepnyMotyw: przełącznik wraca do ciemnego', () => {
  assert.equal(nastepnyMotyw('ciemny'), 'jasny');
  assert.equal(nastepnyMotyw('jasny'), 'ciemny');
  assert.equal(nastepnyMotyw(undefined), 'jasny', 'brak stanu = start z ciemnego');
});

test('motywPoczatkowy: zapis wygrywa z preferencją systemu, domyślnie ciemny', () => {
  assert.equal(motywPoczatkowy({}), 'ciemny', 'archiwum jest domyślnie ciemne');
  assert.equal(motywPoczatkowy({ woliJasny: true }), 'jasny');
  assert.equal(motywPoczatkowy({ zapisany: 'ciemny', woliJasny: true }), 'ciemny');
  assert.equal(motywPoczatkowy({ zapisany: 'jasny', woliJasny: false }), 'jasny');
  assert.equal(motywPoczatkowy({ zapisany: 'niebieski', woliJasny: true }), 'jasny', 'śmieć w localStorage nie psuje UI');
});

test('etykietaMotywu: przycisk mówi, co zrobi', () => {
  for (const m of MOTYWY) {
    const e = etykietaMotywu(m);
    assert.ok(e.ikona && e.tekst && e.aria.length > 20, m);
    assert.ok(e.aria.toLowerCase().includes('kliknij'));
  }
});

test('index.html: przełącznik w prawym górnym rogu + strażnik przed błyskiem', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.ok(html.includes('id="przycisk-motyw"'), 'przycisk motywu w topbarze');
  const akcje = html.slice(html.indexOf('class="akcje"'), html.indexOf('</div>', html.indexOf('class="akcje"')));
  assert.ok(akcje.includes('przycisk-motyw'), 'przycisk jest w .akcje (prawa strona nagłówka)');
  assert.ok(html.includes(`localStorage.getItem('${'ame:motyw'}')`), 'strażnik czyta zapis przed pierwszym malowaniem');
  assert.ok(html.indexOf('<script>') < html.indexOf('<link rel="stylesheet"'), 'strażnik przed arkuszem stylów');
  const css = await readFile('app/styles.css', 'utf8');
  assert.ok(css.includes("html[data-motyw='jasny']"), 'motyw jasny jako nadpisanie tokenów');
  assert.ok(css.includes('color-scheme: light'), 'form controls i paski dopasowane w jasnym');
  assert.equal(KLUCZ_MOTYWU, 'ame:motyw');
});

/* ---- Wpis Manifestacji: kolejność sekcji (B1), warstwa (B2), linki (B3) ---- */

const naNumerze = (html, numer) => html.search(new RegExp(`<span class="numer">${numer}</span>`));

test('htmlWpisu: standardowa kolejność sekcji IV → II → III → V → I (B1)', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  const pozycje = ['IV', 'II', 'III', 'V', 'I'].map((n) => naNumerze(html, n));
  assert.ok(pozycje.every((p) => p > 0), 'każda sekcja ma numer w nagłówku');
  assert.deepEqual([...pozycje].sort((a, b) => a - b), pozycje, `sekcyjne numery w złej kolejności: ${pozycje}`);
  assert.ok(html.indexOf('<section') < html.indexOf('Wizualizacja'), 'pierwszą sekcją jest Wizualizacja');
  // numer = tożsamość sekcji, nie pozycja
  assert.match(html, /<span class="numer">IV<\/span> Wizualizacja/);
  assert.match(html, /<span class="numer">I<\/span> Rezonans i tożsamość/);
  assert.match(html, /<span class="numer">III<\/span> Dokumentacja \(The Source Stack\)/);
});

test('htmlWpisu: powiązania i meta zostają na końcu (B1: reszta bez zmian)', async () => {
  const { wpis, indeks } = await dane('lincoln-imp');
  const html = htmlWpisu(wpis, indeks);
  assert.ok(naNumerze(html, 'I') < html.indexOf('Powiązania'), 'sekcje przed wiki');
  assert.ok(html.indexOf('Powiązania') < html.indexOf('meta-wpisu'), 'potem powiązania, na końcu meta');
});

test('htmlWarstwyWpisu: pełnoekranowy dialog z przyciskiem zamknięcia (B2)', () => {
  const html = htmlWarstwyWpisu('<div class="wpis">treść</div>', { slug: 'egungun', nazwa: 'Egungun' });
  assert.match(html, /<div class="warstwa-wpisu" role="dialog" aria-modal="true" tabindex="-1"/);
  assert.match(html, /aria-label="Kartoteka: Egungun"/);
  assert.match(html, /id="zamknij-wpis"/, 'w warstwie jest przycisk zamykający (app.js go nasłuchuje)');
  assert.ok(html.includes('<div class="wpis">treść</div>'), 'tresść wpisu wklejona bez zmian');
  const zlym = htmlWarstwyWpisu('x', { slug: 'a', nazwa: '<b>Egungun</b>' });
  assert.ok(!zlym.includes('<b>Egungun</b>'), 'nazwa escapowana także w aria-label');
});

test('linkDoZrodla: tylko http(s), skrócona etykieta, brak linku gdy pusto (B3)', () => {
  const link = linkDoZrodla('https://www.mdpi.com/2313-5778/3/1/7');
  assert.match(link, /^ <a class="zrodlo" href="https:\/\/www\.mdpi\.com\/2313-5778\/3\/1\/7"/);
  assert.match(link, /rel="noopener noreferrer external"/, 'nowa karta bez dostępu do strony');
  assert.ok(link.includes('www.mdpi.com/2313-5778/3/1/7</a>'));
  assert.equal(linkDoZrodla(''), '');
  assert.equal(linkDoZrodla(undefined), '');
  assert.equal(linkDoZrodla('ftp://muzeum.example/egungun'), '', 'tylko www');
  assert.equal(linkDoZrodla('javascript:alert(1)'), '', 'wektor XSS odrzucony');
  const zkosonym = linkDoZrodla('http://example.com/');
  assert.ok(zkosonym.includes('href="http://example.com/"'), 'href dokładnie taki, jaki zapisano');
  assert.ok(zkosonym.includes('>example.com</a>'), 'kończący ukośnik nie wchodzi do etykiety');
  const dlugi = linkDoZrodla('https://archiwum.example.org/dlugi/odczyt/zbirow/1989/yoruba-nine-centuries-african-art-and-thought-tom-2');
  assert.ok(dlugi.includes('…'), 'długi adres skracany wizualnie');
  assert.ok(dlugi.includes('href="https://archiwum.example.org/dlugi/'), 'href pełny');
});

test('htmlWpisu: Dokumentacja linkuje do źródeł, gdy mają url (B3)', async () => {
  const { wpis, indeks } = await dane();
  wpis.dokumentacja[0].url = 'https://books.google.com/books/about/Yoruba.html?id=fZwVAQAAIAAJ';
  const html = htmlWpisu(wpis, indeks);
  assert.ok(html.includes('href="https://books.google.com/books/about/Yoruba.html?id=fZwVAQAAIAAJ"'), 'klikalny adres źródła');
  assert.ok(html.includes('class="zrodlo"'), 'klasa do stylowania');
});

test('kontrakt identyfikatorów: każdy selektor app.js istnieje w index.html lub ui.js', async () => {
  const [app, html, warstwa] = await Promise.all([
    readFile('app/app.js', 'utf8'),
    readFile('index.html', 'utf8'),
    readFile('app/ui.js', 'utf8'),
  ]);
  const selektory = [...new Set([...app.matchAll(/\$\('#([a-z0-9-]+)'\)/g)].map((m) => m[1]))];
  assert.ok(selektory.length >= 8, `rozpoznano tylko ${selektory.length} selektorów — sprawdź wyrażenie`);
  const braki = selektory.filter((id) => !html.includes(`id="${id}"`) && !warstwa.includes(`id="${id}"`));
  assert.deepEqual(braki, [], `app.js woła elementy, których nie ma w markupie: ${braki.join(', ')}`);
});
