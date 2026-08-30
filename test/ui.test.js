/** Testy generatora HTML panelu wpisu (czyste funkcje ui.js, bez DOM). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { htmlWpisu, htmlWarstwyWpisu, linkDoZrodla, htmlListy, htmlStronyTagu, htmlTagow, htmlDialogu, htmlSkitu, htmlBazySkitow, htmlNowosci, htmlKronik, htmlTomyIEpoki, esc, nastepnyMotyw, motywPoczatkowy, etykietaMotywu, MOTYWY, KLUCZ_MOTYWU, akcjeZZapytania } from '../app/ui.js';

async function dane(plik = 'egungun') {
  const wpis = JSON.parse(await readFile(`data/manifestations/${plik}.json`, 'utf8'));
  const indeks = JSON.parse(await readFile('data/index.json', 'utf8'));
  return { wpis, indeks };
}

test('Tomy i Epoki: sekcja linkuje Tom i Epoki z udziałem bytu (E)', () => {
  const kronika = {
    tom: 'tom-1',
    tytulTomu: 'Kronika trzech stołów',
    epoki: [
      { slug: 'epoka-1', tytul: 'Trzy stoły: przodek, gospodarz i gość', uczestnicy: [{ slug: 'egungun' }, { slug: 'kentaur-pelion' }] },
      { slug: 'epoka-2', tytul: 'Nieproszeni goście', uczestnicy: [{ slug: 'lincoln-imp' }] },
      { slug: 'epoka-3', tytul: 'Odźwierni', uczestnicy: [{ slug: 'egungun' }, { slug: 'balor' }] },
    ],
  };
  const html = htmlTomyIEpoki('egungun', kronika);
  assert.match(html, /<span class="numer">VI<\/span> Tomy i Epoki/, 'sekcja VI (v1.8)');
  assert.match(html, /href="docs\/kronika-tom-1\.html"/, 'link do Tomu');
  // odnośnik do Tomu w konwencji „brązowego przycisku” jak epoki (recenzja 2026-08-30)
  assert.match(html, /<a class="chip link" href="docs\/kronika-tom-1\.html"/, 'Tom jako chip, nie niebieski link');
  assert.ok(!html.includes('link-zewnetrzny'), 'brak niebieskiego linku zewnętrznego do Tomu');
  assert.match(html, /href="docs\/kronika-epoka-1\.html"/, 'link do epoki 1');
  assert.match(html, /href="docs\/kronika-epoka-3\.html"/, 'link do epoki 3');
  assert.ok(!html.includes('epoka-2'), 'epoka bez bytu nie jest linkowana');
  assert.match(html, /2 epokach/);
  assert.equal(htmlTomyIEpoki('nessos', kronika), '', 'byt spoza Kroniki — brak sekcji');
  assert.equal(htmlTomyIEpoki('egungun', null), '', 'brak danych — brak sekcji');
});

test('htmlWpisu: sekcja Tomy i Epoki tylko z podsumowaniem Kroniki (E)', async () => {
  const { wpis, indeks } = await dane();
  assert.ok(!htmlWpisu(wpis, indeks).includes('Tomy i Epoki'), 'bez kroniki sekcji nie ma');
  const zKronika = htmlWpisu(wpis, indeks, {
    tom: 'tom-1',
    tytulTomu: 'Kronika trzech stołów',
    epoki: [{ slug: 'epoka-1', tytul: 'Trzy stoły', uczestnicy: [{ slug: wpis.slug }] }],
  });
  assert.ok(zKronika.includes('Tomy i Epoki'), 'z kroniką sekcja jest');
  assert.match(zKronika, /<span class="numer">VI<\/span> Tomy i Epoki/, 'numeracja v1.8');
  assert.match(zKronika, /href="docs\/kronika-epoka-1\.html"/);
  // sekcja idzie po SKITach (V), przed Powiązaniami (VII)
  assert.ok(zKronika.indexOf('Tomy i Epoki') > zKronika.indexOf('SKITy'));
  assert.ok(zKronika.indexOf('Tomy i Epoki') < zKronika.indexOf('Powiązania'));
});

test('app.js: zapamiętywanie warstw i widoku mapy w localStorage (D)', async () => {
  const app = await readFile('app/app.js', 'utf8');
  assert.ok(app.includes("'ame:mapa:warstwy'"), 'klucz warstw');
  assert.ok(app.includes("'ame:mapa:widok'"), 'klucz widoku');
  assert.ok(app.includes('zapiszWarstwyMapy') && app.includes('przywrocWarstwyMapy'), 'zapis/odczyt warstw');
  assert.ok(app.includes('zapiszWidokMapy') && app.includes('przywrocWidokMapy'), 'zapis/odczyt widoku');
  assert.ok(app.includes('try {') && app.includes('localStorage.setItem'), 'zapis w try/catch (file://)');
  // cache-bust: wersja w index.html musi być taka sama jak w importach app.js/map.js
  const index = await readFile('index.html', 'utf8');
  const wersja = /app\/app\.js\?v=([\w-]+)/.exec(index)?.[1];
  assert.ok(wersja, 'index.html podaje wersję app.js');
  assert.ok(app.includes(`./map.js?v=${wersja}`) && app.includes(`./ui.js?v=${wersja}`) && app.includes(`./geo.js?v=${wersja}`), `importy app.js zgodne z v=${wersja}`);
  const mapa = await readFile('app/map.js', 'utf8');
  assert.ok(mapa.includes(`./geo.js?v=${wersja}`), `import map.js zgodny z v=${wersja}`);
});

test('esc: znaki HTML uciekają', () => {
  assert.equal(esc('<script>&"\''), '&lt;script&gt;&amp;&quot;&#39;');
});

test('htmlWpisu: komplet sekcji protokołu I–V (egungun)', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  for (const fraza of [
    'Charakterystyka i natura',
    'Dokumentacja (The Source Stack)',
    'Wizualizacja',
    'Trofea i dowody eliminacji',
    'SKITy',
    '--ar 21:9',
    'inspiracja kartą',
    'Krumar Initiate',
  ]) {
    assert.ok(html.includes(fraza), `brak: ${fraza}`);
  }
  // v1.8 (ADR 0022): sekcja „Rezonans i tożsamość” usunięta z protokołu
  assert.ok(!html.includes('Rezonans i tożsamość'), 'brak sekcji V „Rezonans”');
  assert.ok(!html.includes('tabela-translacji'), 'brak tabeli translacji karty');
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
  const tagi = htmlTagow(indeks, 'selkie');
  assert.ok(tagi.includes('data-tag="selkie"'), 'tag z kanonu w pasku');
  assert.ok(tagi.includes('data-kategoria="typ"'), 'pasma noszą kategorie');
  assert.ok(tagi.includes('class="chip tag aktywny"'), 'aktywny tag wyróżniony');
  assert.ok(tagi.includes('Typ bytu'), 'podpis kategorii czytany z kanonu');
  assert.ok(!tagi.includes('data-tag="imp"'), 'tagi spoza kanonu nie wracają do słownika');
  const poKolei = tagi.indexOf('Kultura źródłowa');
  assert.ok(poKolei > -1 && poKolei < tagi.indexOf('Typ bytu'), 'pasma w kolejności kanonu');
  assert.ok(htmlListy(indeks, new Set(['egungun'])).includes('Egungun'));
  assert.ok(!htmlListy(indeks, new Set(['egungun'])).includes('Imp z Lincoln</span>'));
});

test('htmlStronyTagu: strona tagu z kategorią, opisem i listą wpisów (F2/C2)', async () => {
  const { indeks } = await dane();
  const strona = htmlStronyTagu(indeks, 'grecja');
  assert.ok(strona.includes('Kultura źródłowa'), 'nazwa kategorii z kanonu');
  assert.ok(/1 manifestacja|\d+ manifestacji/.test(strona), 'licznik wpisów');
  assert.ok(strona.includes('Egungun') === false && !strona.includes('Imp z Lincoln'), 'lista zawężona do tagu');
  const wpisy = (indeks.tagi['grecja'] || {}).wpisy || [];
  assert.ok(wpisy.length > 0, 'tag kultura ma wpisy w indeksie');
  const tylkoGreckie = htmlStronyTagu(indeks, 'grecja');
  for (const slug of wpisy) {
    const m = indeks.manifestacje.find((x) => x.slug === slug);
    assert.ok(tylkoGreckie.includes(m.nazwa), `wpis ${slug} na stronie tagu`);
  }
  assert.ok(htmlStronyTagu(indeks, 'nie-ma-takiego').includes('Nieznany tag'), 'nieznany tag');
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

test('htmlWpisu: numeracja sekcji = kolejność I–IV … V SKITy (B1 + v1.8)', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  const pozycje = ['I', 'II', 'III', 'IV', 'V'].map((n) => naNumerze(html, n));
  assert.ok(pozycje.every((p) => p > 0), 'każda sekcja ma numer w nagłówku');
  assert.deepEqual([...pozycje].sort((a, b) => a - b), pozycje, `numery muszą iść w kolejności rosnącej: ${pozycje}`);
  // mapa numerów na treść wg PROTOKÓŁ §4.1 (v1.8, ADR 0022)
  assert.match(html, /<span class="numer">I<\/span> Wizualizacja/);
  assert.match(html, /<span class="numer">II<\/span> Charakterystyka i natura/);
  assert.match(html, /<span class="numer">III<\/span> Dokumentacja \(The Source Stack\)/);
  assert.match(html, /<span class="numer">IV<\/span> Trofea i dowody eliminacji/);
  assert.match(html, /<span class="numer">V<\/span> SKITy/);
  assert.ok(!html.includes('Rezonans i tożsamość'), 'sekcja V „Rezonans” usunięta (v1.8)');
});

test('htmlWpisu: powiązania (VII) i meta zostają na końcu (B1: reszta bez zmian)', async () => {
  const { wpis, indeks } = await dane('lincoln-imp');
  const html = htmlWpisu(wpis, indeks);
  assert.ok(naNumerze(html, 'V') < html.indexOf('Powiązania'), 'sekcje przed wiki');
  assert.match(html, /<span class="numer">VII<\/span> Powiązania/, 'powiązania = VII (v1.8)');
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

/* ---- SKITy w UI: dialog, widok, baza, sekcja V, feed (ADR 0013/0014) ---- */

test('htmlDialogu: repliki, didaskalia i safety po escapowaniu', () => {
  const html = htmlDialogu(
    '**Egungun:** [Płótna opadają] Zdanie. [pauza] Drugi szept.\n\n**Imp z Lincoln:** Samo słowo, bez didaskaliów.\n\nZwykły akapit narracji.'
  );
  assert.equal((html.match(/class="wypowiedz"/g) ?? []).length, 2, 'dwie repliki');
  assert.match(html, /<strong class="mowca">Egungun<\/strong>/);
  assert.match(html, /<em class="didaskalia">Płótna opadają<\/em>/);
  assert.match(html, /<em class="didaskalia w-tekscie">\[pauza\]<\/em>/, 'didaskalia w środku wypowiedzi');
  assert.match(html, /<strong class="mowca">Imp z Lincoln<\/strong>/);
  assert.match(html, /<p class="proza">Zwykły akapit narracji.<\/p>/);
  const zly = htmlDialogu('**<img src=x onerror=alert(1)>:** <b>bold</b>');
  assert.ok(!zly.includes('<b>bold</b>') && !zly.includes('<img'), 'treść wpisu nigdy jako HTML');
  assert.ok(zly.includes('&lt;img src=x onerror=alert(1)&gt;'), 'niebezpieczny tekst zostaje treścią');
});

test('htmlDialogu: pusty tekst nie produkuje paragrafów', () => {
  assert.equal(htmlDialogu(''), '');
  assert.equal(htmlDialogu(undefined), '');
});

test('htmlSkitu: nagłówek „SKIT: …”, uczestnicy linkują do kart, meta widoczna', async () => {
  const { indeks } = await dane();
  const skit = JSON.parse(await readFile('data/skity/plotno-i-kamien.json', 'utf8'));
  const html = htmlSkitu(skit, indeks);
  assert.match(html, /<h3 class="skit-tytul"><strong>SKIT: PŁÓTNO I KAMIEŃ<\/strong><\/h3>/);
  assert.ok(html.includes('data-slug="egungun"') && html.includes('data-slug="lincoln-imp"'), 'każdy uczestnik linkuje do swojej karty');
  assert.ok(html.includes('data-skit="plotno-i-kamien"'));
  assert.ok(html.includes(skit.tekst.split('\n')[0].slice(14, 40)), 'fragments tekstu widoczne');
  assert.ok(html.includes('Uczestnicy:'));
  assert.ok(html.includes(skit.meta.utworzono), 'meta ze stopki');
  const xss = htmlSkitu({ ...skit, tytul: '<i>x</i>', tekst: '**A:** <script>alert(1)</script>\n\n**B:** ok' }, indeks);
  assert.ok(!xss.includes('<script>') && !xss.includes('<i>x</i>'), 'escaping w tytule i tekście');
});

test('htmlBazySkitow: wiersze z data-skit, najnowsze na górze, stan pusty', async () => {
  const { indeks } = await dane();
  const lista = htmlBazySkitow(indeks);
  assert.ok(lista.includes('data-skit="plotno-i-kamien"'), 'skit z bazy widoczny');
  assert.ok(lista.includes('SKIT: PŁÓTNO I KAMIEŃ'));
  assert.ok(lista.includes('Egungun × Imp z Lincoln'), 'skład w opisie wiersza');
  const pusty = { ...indeks, skity: [] };
  assert.match(htmlBazySkitow(pusty), /Baza skitów jest pusta/);
  const dwa = {
    ...indeks,
    skity: [
      { slug: 'stary', tytul: 'STARY', imiona: ['A'], slow: 70, data: '2026-01-01' },
      { slug: 'nowy', tytul: 'NOWY', imiona: ['B'], slow: 80, data: '2026-08-28' },
    ],
  };
  const kolejnosc = htmlBazySkitow(dwa);
  assert.ok(kolejnosc.indexOf('NOWY') < kolejnosc.indexOf('STARY'), 'najnowsze na górze');
});

test('sekcja V wpisu wylicza skity z indeksu (nie z pliku wpisu)', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  assert.match(html, /<span class="numer">V<\/span> SKITy/);
  assert.ok(html.includes('data-skit="plotno-i-kamien"'), 'link do skitu pod kartą');
  const bez = { ...wpis, dokumentacja: wpis.dokumentacja };
  const indeksBez = { ...indeks, manifestacje: indeks.manifestacje.map((m) => ({ ...m, skity: [] })) };
  assert.ok(!htmlWpisu(bez, indeksBez).includes('SKITy'), 'brak skitów = brak sekcji V');
});

test('htmlNowosci: feed z linkami do treści i bezwzględnym escapowaniem', async () => {
  const { indeks } = await dane();
  const feed = htmlNowosci({
    ...indeks,
    aktualizacje: [
      { data: '2026-08-28', typ: 'skit', akcja: 'nowy', slug: 'plotno-i-kamien', tytul: 'PŁÓTNO', opis: 'skład: A, B' },
      { data: '2026-08-28', typ: 'manifestacja', akcja: 'zmiana', slug: 'egungun', tytul: 'Egungun', opis: 'nowe źródła' },
    ],
  });
  assert.match(feed, /<time datetime="2026-08-28">2026-08-28<\/time>/);
  const zGodzina = htmlNowosci({
    ...indeks,
    aktualizacje: [{ data: '2026-08-28 14:32', typ: 'manifestacja', akcja: 'zmiana', slug: 'egungun', tytul: 'Egungun', opis: 'nowe źródła' }],
  });
  assert.match(zGodzina, /<time datetime="2026-08-28 14:32">2026-08-28 14:32<\/time>/, 'ADR 0017: data z godziną w feedzie verbatim');
  assert.ok(feed.includes('data-link="skit:plotno-i-kamien"'), 'skit ma link z prefiksem');
  assert.ok(feed.includes('data-link="egungun"'), 'wpis ma link będący slugiem');
  assert.ok(feed.includes('skit · dodano') && feed.includes('kartoteka · zmieniono'));
  const zly = htmlNowosci({ ...indeks, aktualizacje: [{ data: 'x', typ: 'skit', akcja: 'nowy', slug: 'a', tytul: '<b>T</b>', opis: '<i>opis</i>' }] });
  assert.ok(!zly.includes('<b>T</b>') && !zly.includes('<i>opis</i>'), 'feed escapowany');
  assert.match(htmlNowosci({ ...indeks, aktualizacje: [] }), /Brak zmian w archiwum/);
});

test('indeks repo: feed i sekcja V spójne z danymi (bez ręki)', async () => {
  const { indeks } = await dane();
  assert.equal(indeks.wersja, 3);
  assert.ok(indeks.aktualizacje.length >= 5, `feed ma ${indeks.aktualizacje.length} pozycji`);
  const html = htmlNowosci(indeks);
  for (const a of indeks.aktualizacje) assert.ok(html.includes(`data-link="${a.typ === 'skit' ? `skit:${a.slug}` : a.slug}"`), `feed UI: brak linku do ${a.slug}`);
});

/* ---- Stopka karty: tylko daty, bez notatek roboczych (zlecenie 2026-08-28) ---- */

test('htmlStopki: data utworzenia i data ostatniej modyfikacji, nic więcej', async () => {
  const { htmlStopki } = await import('../app/ui.js');
  assert.equal(
    htmlStopki({ utworzono: '2026-01-01', autor: 'sesja X', modyfikacje: [{ data: '2026-03-03', opis: 'długie wyjaśnienia' }] }),
    '<footer class="meta-wpisu">utworzono 2026-01-01 · zmieniono 2026-03-03</footer>'
  );
  assert.equal(
    htmlStopki({ utworzono: '2026-01-01', modyfikacje: [{ data: '2026-05-05', opis: 'p' }, { data: '2026-03-03', opis: 'p' }] }),
    '<footer class="meta-wpisu">utworzono 2026-01-01 · zmieniono 2026-05-05</footer>',
    'najpóźniejsza z dat, nie ostatnia w tablicy'
  );
  assert.equal(htmlStopki({ utworzono: '2026-01-01', modyfikacje: [] }), '<footer class="meta-wpisu">utworzono 2026-01-01</footer>');
  assert.equal(htmlStopki({}), '<footer class="meta-wpisu">utworzono ?</footer>');
  assert.equal(
    htmlStopki({ utworzono: '2026-01-01 09:30', modyfikacje: [{ data: '2026-03-03 16:20', opis: 'p' }] }),
    '<footer class="meta-wpisu">utworzono 2026-01-01 09:30 · zmieniono 2026-03-03 16:20</footer>',
    'stopka zachowuje godzinę z utworzono i z ostatniej modyfikacji'
  );
});

test('karta bytu: brak notatek roboczych w stopce i w sekcji V', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  assert.ok(!/sesja arena|sesja M\d|PROTOKÓŁ §\d|C1|C3/.test(html), 'stopka i sekcje nie cytują wewnętrznych oznaczeń sesji');
  assert.ok(!html.includes('pisze je kolejna sesja'), 'sekcja V bez zdania roboczego');
  assert.match(html, /<footer class="meta-wpisu">utworzono \d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?(?: · zmieniono \d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?)?<\/footer>/);
  const { indeks: i2 } = await dane('lincoln-imp');
  const wpis2 = JSON.parse(await readFile('data/manifestations/lincoln-imp.json', 'utf8'));
  assert.match(htmlWpisu(wpis2, i2), /meta-wpisu/);
});

test('skit: bez zdania „temat” w widoku i na liście bazy', async () => {
  const { indeks } = await dane();
  const skit = JSON.parse(await readFile('data/skity/plotno-i-kamien.json', 'utf8'));
  assert.ok(skit.temat, 'pole temat zostaje w danych (katalogowe)');
  const widok = htmlSkitu(skit, indeks);
  assert.ok(!widok.includes(skit.temat), 'temat nie jest renderowany jako złamane zdanie na wstępie');
  assert.ok(!htmlBazySkitow(indeks).includes(skit.temat), 'temat nie jest opisem wiersza w bazie');
  assert.match(widok, /<footer class="meta-wpisu">utworzono \d{4}-\d{2}-\d{2}/);
  assert.ok(!widok.includes('sesja arena'), 'również w skicie bez autora i opisów');
  assert.ok(htmlBazySkitow(indeks).includes('skład: Egungun × Imp z Lincoln'), 'wiersz mówi, kto rozmawia');
});

/* ---- C2: udostępnianie widoku (kopiuj link) ---- */

test('linkWidoku: baza + adres widoku, bez reszty z bieżącego adresu', async () => {
  const { linkWidoku } = await import('../app/ui.js');
  assert.equal(linkWidoku('http://x/AME/index.html', 'egungun'), 'http://x/AME/index.html#egungun');
  assert.equal(linkWidoku('http://x/AME/index.html#nowosci', 'skit:znak-i-liczba'), 'http://x/AME/index.html#skit:znak-i-liczba');
  assert.equal(linkWidoku('https://example.github.io/AME/', 'balor'), 'https://example.github.io/AME/#balor');
  assert.equal(linkWidoku('', ''), '#', 'brak bazy nie produkuje undefined');
});

test('akcjeZZapytania: ?q i ?action z Kroniki (PR #9); nieznane parametry ignorowane', () => {
  assert.deepEqual(akcjeZZapytania(''), { action: null, q: null });
  assert.deepEqual(akcjeZZapytania(null), { action: null, q: null });
  assert.deepEqual(akcjeZZapytania('?q=sfinks'), { action: null, q: 'sfinks' });
  assert.deepEqual(akcjeZZapytania('?action=wylosuj'), { action: 'wylosuj', q: null });
  assert.deepEqual(akcjeZZapytania('?action=powiazania&q=ogon'), { action: 'powiazania', q: 'ogon' });
  assert.deepEqual(akcjeZZapytania('?action=nieznana&q=%20%20'), { action: null, q: null });
  assert.deepEqual(akcjeZZapytania('?q=%20Imp%20z%20Lincoln%20'), { action: null, q: 'Imp z Lincoln' });
});

test('tagZFragmantu: czyta #tag:…, odrzuca resztę', async () => {
  const { tagZFragmantu } = await import('../app/ui.js');
  assert.equal(tagZFragmantu('tag:woda'), 'woda');
  assert.equal(tagZFragmantu('tag:woda%20i%20burza'), 'woda%20i%20burza', 'helper nie dekoduje — dekoduje caller');
  assert.equal(tagZFragmantu('tag:'), null, 'pusty tag nie jest filtrem');
  assert.equal(tagZFragmantu(''), null);
  assert.equal(tagZFragmantu('egungun'), null);
  assert.equal(tagZFragmantu('skit:znak-i-liczba'), null);
  assert.equal(tagZFragmantu(null), null);
});

test('przyciskKopiowania: etykieta z celem i bez celu pusty', async () => {
  const { przyciskKopiowania, htmlWarstwyWpisu } = await import('../app/ui.js');
  assert.equal(przyciskKopiowania(''), '');
  assert.equal(przyciskKopiowania(null), '');
  const html = przyciskKopiowania('egungun');
  assert.match(html, /^<button class="chip kopiuj-link" type="button" data-kopia="egungun"/);
  assert.ok(html.includes('⧉ kopiuj link'));
    assert.ok(!html.includes('\\'), 'żadnych zbędnych escape’ów w atrybutach');
  const warstwa = htmlWarstwyWpisu('<div class="wpis"></div>', { slug: 'egungun', nazwa: 'Egungun' });
  assert.match(warstwa, /class="akcje-kartoteki"[\s\S]*data-kopia="egungun"[\s\S]*id="zamknij-wpis"/, 'kopiuj przed zamknij, w jednym rzędzie');
});

test('kopiowanie linku jest podpięte w obu warstwach (handlerzy widzą data-kopia)', async () => {
  const app = await readFile('app/app.js', 'utf8');
  const panel = app.slice(app.indexOf("$('#panel').addEventListener"), app.indexOf("$('#lista').addEventListener"));
  const od = app.indexOf("$('#warstwa').addEventListener");
  const do_ = app.indexOf("$('#przycisk-motyw').addEventListener");
  assert.ok(od > -1 && do_ > od, 'w app.js handler #warstwa musi poprzedzać podpięcie przycisku motywu');
  const warstwa = app.slice(od, do_);
  assert.ok(/data-kopia/.test(panel), 'kartoteka: brak obsługi [data-kopia] — przycisk byłby martwy');
  assert.ok(/kopiujLink\(/.test(panel), 'kartoteka: wywołanie kopiujLink');
  assert.ok(/data-kopia/.test(warstwa) && /kopiujLink\(/.test(warstwa), 'warstwa skitów/feedu: to samo');
});

/* ---- Prezentacja kanonu tagów (ADR 0016) ---- */

test('pasek tagów: każde pasmo ma podpis kategorii z opisem w title', async () => {
  const { indeks } = await dane();
  const html = htmlTagow(indeks, null);
  const pasma = [...html.matchAll(/data-kategoria="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(pasma)], ['kultura', 'typ', 'motyw', 'postac'], 'kategorie w kolejności kanonu');
  assert.match(html, /<span class="tagi-nazwa" title="[^"]{12,}">Kultura źródłowa<\/span>/, 'podpis kategorii z legendą');
  assert.match(html, /<button class="chip tag" data-tag="joruba" data-kategoria="kultura" title="[^"]{12,}">/, 'chip z opisem tagu');
  assert.match(html, /<span class="licznik">\d+<\/span>/, 'licznik wpisów przy tagu');
  assert.equal(htmlTagow({ ...indeks, tagi: {} }, null), '', 'pusty słownik = pusty pasek');
});

test('chipy w karcie: podpis kategorii przed nazwą tagu', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  assert.match(html, /<span class="kategoria-tagu">kultura<\/span>joruba<\/button>/, 'w chipie skrót kategorii');
  assert.match(html, /<span class="kategoria-tagu">typ<\/span>duch-przodkow<\/button>/);
  assert.match(html, /title="Kultura źródłowa — [^"]{12,}"/, 'pełna nazwa i opis tagu w tooltipie');
  const chipy = [...html.matchAll(/data-tag="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(chipy, wpis.tagi, 'chipy w kolejności kanonu, bez zgadywanki');
});

test('skrotKategorii: skrót z kanonu, brak kanonu — id', async () => {
  const { skrotKategorii } = await import('../app/ui.js');
  const { indeks } = await dane();
  assert.equal(skrotKategorii(indeks, 'postac'), 'postać');
  assert.equal(skrotKategorii({ kanon: { kategorie: [{ id: 'x', nazwa: 'Iks' }] } }, 'x'), 'Iks', 'bez skrótu wraca nazwa');
  assert.equal(skrotKategorii(indeks, ''), '');
});

test('nazwaKategorii i tagiPosortowane: pomocniki kanonu bez DOM', async () => {
  const { nazwaKategorii, tagiPosortowane } = await import('../app/ui.js');
  const { indeks } = await dane();
  assert.equal(nazwaKategorii(indeks, 'motyw'), 'Motyw przewodni');
  assert.equal(nazwaKategorii(indeks, 'nie-ma-takiej'), 'nie-ma-takiej', 'znany identyfikator wraca bez zmian');
  assert.equal(nazwaKategorii(indeks, ''), '');
  const wTypie = tagiPosortowane(indeks, 'typ');
  assert.deepEqual(wTypie.map((t) => t.tag), [...wTypie.map((t) => t.tag)].sort((a, b) => a.localeCompare(b, 'pl')));
  assert.ok(wTypie.every((t) => t.kategoria === 'typ' && t.wpisy.length > 0));
  assert.equal(tagiPosortowane({}, 'typ').length, 0);
});

test('kopiowanie linku jest w każdym z trzech widoków warstwy i w karcie', async () => {
  const { htmlWarstwyWpisu } = await import('../app/ui.js');
  const app = await readFile('app/app.js', 'utf8');
  assert.match(htmlWarstwyWpisu('<x></x>', { slug: 'drangue-shala', nazwa: 'D' }), /data-kopia="drangue-shala"/, 'karta bytu');
  assert.match(app, /szkicWarstwy\('Baza Skitów[^\n]*kopia: 'skity'/, 'baza skitów');
  assert.match(app, /\{ kopia: 'nowosci' \}/, 'feed „Co nowego”');
  assert.equal((app.match(/data-kopia/g) ?? []).length >= 1, true, 'obsługa [data-kopia] w handlerach');
});

test('kartoteka ma przycisk druku; app.js woła window.print(); arkusz ma @media print (C2)', async () => {
  const { htmlWarstwyWpisu } = await import('../app/ui.js');
  const app = await readFile('app/app.js', 'utf8');
  const css = await readFile('app/styles.css', 'utf8');
  assert.match(htmlWarstwyWpisu('<x></x>', { slug: 'egungun', nazwa: 'Egungun' }), /data-druk/, 'przycisk druku w warstwie kartoteki');
  assert.ok(app.includes('[data-druk]') && app.includes('window.print()'), 'klik [data-druk] → window.print()');
  assert.match(css, /@media print/, 'arkusz ma blok @media print');
  assert.match(css, /\.gora,\s*\n?\s*#tagi,[\s\S]*display:\s*none/, 'topbar i tagi ukryte w druku');
  assert.match(css, /\.panel\.otwarty\s*\{[\s\S]*position:\s*static/, 'otwarta kartoteka układa się w dokumencie');
  assert.match(css, /:root,[\s\S]*html\[data-motyw='ciemny'\][\s\S]*--tekst:\s*#1a1a1a/, 'tokeny nadpisane pod druk (ciemny tekst na jasnym tle)');
  assert.match(css, /@media print\s*\{[\s\S]*transition:\s*none/, 'przejścia i animacje wyłączone w druku');
});

test('wersja protokołu jest jedna: stopka aplikacji = PROTOKÓŁ = README (F2)', async () => {
  const [protokol, html, readme] = await Promise.all([
    readFile('docs/PROTOKOL.md', 'utf8'),
    readFile('index.html', 'utf8'),
    readFile('README.md', 'utf8'),
  ]);
  const wersja = protokol.match(/Status:[^\n]*?obowiązujący\*\* \(v(\d+\.\d+)/)?.[1];
  assert.ok(wersja, 'PROTOKÓŁ musi głosić status obowiązujący z numerem wersji');
  assert.match(html, new RegExp(`protokół MFM v${wersja.replace('.', '\\.')}`), `stopka aplikacji: v${wersja}`);
  assert.match(readme, new RegExp(`protokół MFM v${wersja.replace('.', '\\.')}`), `README: v${wersja}`);
  const stare = [...html.matchAll(/protokół MFM v(\d+\.\d+)/g), ...readme.matchAll(/protokół MFM v(\d+\.\d+)/g)]
    .map((m) => m[1])
    .filter((v) => v !== wersja);
  assert.deepEqual(stare, [], `aplikacja i README nie mogą cytować starszej wersji (v${wersja} obowiązuje)`);
});

test('U3: feed Kroniki renderuje karty epok z ramą narracji i filtrem', () => {
  const html = htmlKronik({
    epoki: [
      {
        slug: 'epoka-1',
        tytul: 'Trzy stoły',
        stanPo: { os: { mit: 34, racjonalizacja: 66 } },
        pytanie: 'Co wolno wziąć gościowi?',
        iskra: 'Przyjdź, zanim siądą.',
        konsekwencje: { zasieg: [{ slug: 'egungun', przed: 0.488, po: 0.518, opis: '' }] },
        uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }],
      },
    ],
  });
  assert.match(html, /kronika-filtr/);
  assert.match(html, /Trzy stoły/);
  assert.match(html, /Co wolno wziąć gościowi/);
  assert.match(html, /data-link="kronika:epoka-1"/);
  assert.match(html, /\+3 pp/);
  assert.match(html, /docs\/kronika\.html/);
});

test('U3: pusty feed pokazuje komunikat', () => {
  const html = htmlKronik({ epoki: [] });
  assert.match(html, /pusto/);
});
