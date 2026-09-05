/** Testy generatora HTML panelu wpisu (czyste funkcje ui.js, bez DOM). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { htmlWpisu, htmlSplotu, htmlProfiluAreny, htmlNaporuSwiata, htmlEchaDrogi, znacznikZrodlaBezAdresu, opisZasobow, htmlWarstwyWpisu, linkDoZrodla, htmlListy, htmlStronyTagu, htmlTagow, htmlDialogu, htmlSkitu, htmlBazySkitow, htmlNowosci, htmlKronik, htmlTomyIEpoki, esc, rzymskie, nastepnyMotyw, motywPoczatkowy, etykietaMotywu, MOTYWY, KLUCZ_MOTYWU, akcjeZZapytania, tekstDoLektora, htmlTrofeow, paryRozmowySkitu, doB64utf8, zB64utf8, dataZmianySluga } from '../app/ui.js';

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

test('SPLOT: raport pokazuje prozę, szanse, los, zasoby, skład i wizualizację', () => {
  const droga = { tytul: 'Droga testowa', miejsce: 'las', sklad: ['a'], grafika: { obraz: 'assets/droga.jpg' } };
  const wynik = { status: 'rozszczepiona', proza: 'Świat zmienił kierunek.', zasoby: { pamiec: 3, przejscie: 1 }, dziennik: [{ nazwa: 'Próba', prawdopodobienstwo: 0.4, wartoscLosowa: 0.2, sukces: true, zasoby: { pamiec: 3 }, proza: 'Próba się udała.' }] };
  const html = htmlSplotu(droga, wynik, { manifestacje: [{ slug: 'a', nazwa: 'Byt A' }] });
  for (const fragment of ['Droga testowa', 'rozszczepiona', 'Próba się udała.', 'szansa 40%', 'los 20.0%', 'pamiec', 'assets/droga.jpg']) assert.ok(html.includes(fragment), fragment);
});

test('Profil Rezonansu: statystyki są wyprowadzone z rekordu i pokazane poza numeracją MFM', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlProfiluAreny(wpis, indeks);
  assert.match(html, /Profil Rezonansu/);
  for (const etykieta of ['Żywotność', 'Moc', 'Spryt', 'Rezonans']) assert.ok(html.includes(etykieta));
  assert.match(html, /--arena-wartosc:\d+/);
  assert.ok(html.includes('Statystyki wynikają wyłącznie z sieci archiwum'));
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

test('htmlListy: miniatura wizualizacji w wierszu, gdy rekord ma obraz (C2)', () => {
  const indeks = {
    manifestacje: [
      { slug: 'z-obrazem', nazwa: 'Byt A', karta: 'Karta A', miejscowosc: 'Miejscowość A', kraj: 'Kraj A', obraz: 'assets/wizualizacje/z-obrazem.jpg' },
      { slug: 'bez-obrazu', nazwa: 'Byt B', karta: 'Karta B', miejscowosc: 'Miejscowość B', kraj: 'Kraj B' },
    ],
  };
  const lista = htmlListy(indeks, null);
  assert.match(lista, /<button class="wiersz ma-miniature" data-slug="z-obrazem">/, 'wiersz z obrazem ma klasę modyfikatora');
  assert.match(lista, /<img class="miniatura" src="assets\/wizualizacje\/z-obrazem\.jpg" alt="" loading="lazy">/, 'miniatura ładowana leniwie');
  assert.match(lista, /<button class="wiersz" data-slug="bez-obrazu">/, 'wiersz bez obrazu bez modyfikatora');
  assert.equal((lista.match(/<img class="miniatura"/g) ?? []).length, 1, 'dokładnie jedna miniatura');
  const zlosliwy = htmlListy({ manifestacje: [{ slug: 'x', nazwa: 'X', karta: 'K', miejscowosc: 'M', kraj: 'KR', obraz: 'a" onload="alert(1)' }] }, null);
  assert.ok(!zlosliwy.includes('onload="alert'), 'src miniatury jest escapowany');
});

test('htmlListy: sortowanie az / zmiana / kraj, remisy deterministyczne (C2)', () => {
  const indeks = {
    manifestacje: [
      { slug: 'zeus', nazwa: 'Zeus', karta: 'K1', miejscowosc: 'Olimp', kraj: 'Grecja' },
      { slug: 'alrauna', nazwa: 'Alrauna', karta: 'K2', miejscowosc: 'Wittenberg', kraj: 'Niemcy' },
      { slug: 'baba', nazwa: 'Baba Jaga', karta: 'K3', miejscowosc: 'Lasy', kraj: 'Rosja' },
      { slug: 'anansi', nazwa: 'Anansi', karta: 'K4', miejscowosc: 'Aszantiland', kraj: 'Ghana' },
      { slug: 'bez-daty', nazwa: 'Widmo', karta: 'K5', miejscowosc: 'Nigdzie', kraj: 'Rosja' },
    ],
    aktualizacje: [
      { data: '2026-09-01 10:00', typ: 'manifestacja', akcja: 'nowa', slug: 'alrauna', tytul: 'Alrauna', opis: 'x' },
      { data: '2026-09-03 12:00', typ: 'manifestacja', akcja: 'zmiana', slug: 'zeus', tytul: 'Zeus', opis: 'x' },
      { data: '2026-09-03 12:00', typ: 'manifestacja', akcja: 'zmiana', slug: 'anansi', tytul: 'Anansi', opis: 'x' },
      { data: '2026-09-02 08:00', typ: 'skit', akcja: 'nowy', slug: 'alrauna', tytul: 'skit', opis: 'x' },
    ],
  };
  const kolejnosc = (html) => [...html.matchAll(/data-slug="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(kolejnosc(htmlListy(indeks, null)), ['alrauna', 'anansi', 'baba', 'bez-daty', 'zeus'], 'domyślnie A–Z');
  assert.deepEqual(
    kolejnosc(htmlListy(indeks, null, { sort: 'zmiana' })),
    ['anansi', 'zeus', 'alrauna', 'baba', 'bez-daty'],
    'ostatnio zmienione na górze, remis po nazwie, bez daty na końcu'
  );
  assert.deepEqual(
    kolejnosc(htmlListy(indeks, null, { sort: 'kraj' })),
    ['anansi', 'zeus', 'alrauna', 'baba', 'bez-daty'],
    'grupowanie wg kraju, potem nazwa'
  );
});

test('dataZmianySluga: maksymalna data z feedu, brak wpisu = null (C2)', () => {
  const indeks = {
    aktualizacje: [
      { data: '2026-08-01 09:00', typ: 'manifestacja', akcja: 'nowa', slug: 'x', tytul: 'X', opis: '' },
      { data: '2026-09-01 09:00', typ: 'manifestacja', akcja: 'zmiana', slug: 'x', tytul: 'X', opis: '' },
      { data: '2026-09-05 09:00', typ: 'skit', akcja: 'nowy', slug: 'x', tytul: 'X', opis: '' },
      { data: '2026-09-04 09:00', typ: 'manifestacja', akcja: 'zmiana', slug: 'y', tytul: 'Y', opis: '' },
    ],
  };
  assert.equal(dataZmianySluga(indeks, 'x'), '2026-09-01 09:00', 'skity nie liczą się do zmiany wpisu');
  assert.equal(dataZmianySluga(indeks, 'y'), '2026-09-04 09:00');
  assert.equal(dataZmianySluga(indeks, 'z'), null);
  assert.equal(dataZmianySluga({}, 'x'), null, 'brak feedu nie wywala funkcji');
});

test('htmlTrofeow: galeria trofeów z indeksu, linki do kart, escaping (C2)', async () => {
  const { indeks } = await dane();
  const galeria = htmlTrofeow(indeks);
  const egungun = indeks.manifestacje.find((m) => m.slug === 'egungun');
  assert.match(galeria, /class="trofea-lista"/, 'lista galerii');
  assert.ok(galeria.includes(`data-slug="egungun"`), 'nazwa bytu linkuje do kartoteki');
  assert.ok(galeria.includes(esc(egungun.trofea.pierwotne)), 'treść trofeum pierwotnego z indeksu');
  assert.ok(galeria.includes('Trofeum pierwotne:'), 'etykieta trofeum pierwotnego');
  assert.ok(!galeria.includes('<script>'), 'escaping nietknięty');
  assert.equal(htmlTrofeow({ manifestacje: [] }), '<p class="pusto">Brak trofeów w archiwum.</p>', 'pusta galeria');
  assert.equal(htmlTrofeow({ manifestacje: [{ slug: 'x', nazwa: 'X' }] }), '<p class="pusto">Brak trofeów w archiwum.</p>', 'rekord bez trofeów pomijany');
  const zlosliwy = htmlTrofeow({ manifestacje: [{ slug: 'x', nazwa: '<b>X</b>', trofea: { pierwotne: 'p", onerror="x', wtorne: null } }] });
  assert.ok(!zlosliwy.includes('<b>X</b>'), 'nazwa i treść escapowane');
});

test('Galeria trofeów w topbarze: przycisk, handler i routing #trofea (C2)', async () => {
  const html = await readFile('index.html', 'utf8');
  const app = await readFile('app/app.js', 'utf8');
  assert.match(html, /id="przycisk-trofea"[^>]*aria-pressed="false"[^>]*>🏆 trofea</, 'przycisk w topbarze');
  assert.ok(app.includes("$('#przycisk-trofea').addEventListener('click', otworzTrofea)"), 'listener przycisku');
  assert.ok(app.includes("fragment === 'trofea'"), 'routing deep-linku #trofea (hashchange i start)');
  assert.ok(app.includes("kopia: 'trofea'"), 'kopiowanie linku do galerii');
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

test('tekstDoLektora: czyści markdown i didaskalia do czystego dialogu (lektor)', () => {
  const tekst = `**Nessos:** [Stoi w brodzie.] Przewiozę na grzbiecie.

**Śyāma i Śarvara:** My nie bierzemy [wskazuje psy] opłaty.`;
  const mowa = tekstDoLektora(tekst);
  assert.ok(mowa.startsWith('Nessos. Przewiozę na grzbiecie.'), 'mówca + kwestia, bez gwiazdek i didaskaliów');
  assert.ok(mowa.includes('Śyāma i Śarvara. My nie bierzemy opłaty.'), 'didaskalia w środku usunięte, imię zachowane');
  assert.ok(!mowa.includes('**') && !mowa.includes('[') && !mowa.includes(']'), 'brak markdownu i nawiasów');
  assert.equal(tekstDoLektora(''), '');
  assert.equal(tekstDoLektora(undefined), '');
});

test('htmlSkitu: przycisk lektora (data-lektor) obecny, nie psuje escapingu', async () => {
  const { indeks } = await dane();
  const skit = JSON.parse(await readFile('data/skity/plotno-i-kamien.json', 'utf8'));
  const html = htmlSkitu(skit, indeks);
  assert.match(html, /<button class="chip lektor"[^>]*data-lektor[^>]*>🔊 odsłuchaj<\/button>/, 'przycisk lektora');
  assert.ok(!html.includes('<script>'), 'escaping nietknięty');
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

test('htmlBazySkitow: temat w wierszu + pole wyszukiwania bazy (C2)', async () => {
  const { indeks } = await dane();
  const lista = htmlBazySkitow(indeks);
  assert.match(lista, /id="skity-filtr"/, 'input wyszukiwarki bazy');
  const zTematem = indeks.skity.find((s) => s.temat);
  assert.ok(lista.includes(`data-temat="${Buffer.from(zTematem.temat, 'utf8').toString('base64')}"`), 'li nosi data-temat w base64 (katalogowe, nie tekst wiersza)');
  assert.ok(!lista.includes(zTematem.temat), 'temat NIE jest renderowany wprost (§8.1)');
  assert.ok(!lista.includes('<script>'), 'escaping nietknięty');
  const bezTematu = htmlBazySkitow({ ...indeks, skity: [{ slug: 'x', tytul: 'X', imiona: ['A'], slow: 70, data: '2026-01-01' }] });
  assert.ok(bezTematu.includes('data-temat=""'), 'brak tematu = pusty atrybut');
  const app = await readFile('app/app.js', 'utf8');
  assert.ok(app.includes("#skity-filtr"), 'app.js podejmuje filtr bazy');
});

test('htmlBazySkitow: działa bez Node’owego Buffer (parzystość z przeglądarką)', async () => {
  // Regresja 2026-09-04: `Buffer.from` w htmlBazySkitow w przeglądarce rzucał
  // ReferenceError PO otwarciu warstwy — efekt: pusta strona zamiast bazy.
  const { indeks } = await dane();
  const zachowaj = globalThis.Buffer;
  try {
    delete globalThis.Buffer;
    const lista = htmlBazySkitow(indeks);
    assert.match(lista, /id="skity-filtr"/, 'baza renderuje się bez Buffera');
    assert.match(lista, /data-temat="[A-Za-z0-9+/=]*"/, 'data-temat to czysty base64');
  } finally {
    globalThis.Buffer = zachowaj;
  }
});

test('doB64utf8/zB64utf8: pełna runda UTF-8 (polskie znaki, emoji)', () => {
  const probki = ['zażółć gęślą jaźń', 'kto zgubił się na własnej dokumentacji: rozkaz za dużo 🜏', '', 'plain ascii'];
  for (const p of probki) assert.equal(zB64utf8(doB64utf8(p)), p, `runda b64: ${p.slice(0, 20)}`);
  assert.equal(doB64utf8('ż'), Buffer.from('ż', 'utf8').toString('base64'), 'kodowanie zgodne bajtowo z UTF-8');
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

test('reakcja na zmianę preferencji systemu — tylko bez zapisu użytkownika', async () => {
  const app = await readFile('app/app.js', 'utf8');
  assert.ok(/addEventListener\?\.\('change'/.test(app), 'nasłuch na zmianę prefers-color-scheme');
  const nasluch = app.indexOf("addEventListener?.('change'");
  const wolanie = app.indexOf('sledzPreferencjeSystemu();');
  assert.ok(wolanie > nasluch, 'start() podpina nasłuch po zdefiniowaniu funkcji');
  const cialo = app.slice(app.indexOf('function sledzPreferencjeSystemu'), app.indexOf('async function start'));
  assert.ok(/czytajMotyw\(\)/.test(cialo), 'zapis użytkownika wygrywa — bez zapisu podążamy za systemem');
  assert.ok(/motywPoczatkowy\(\{ woliJasny: e\.matches \}\)/.test(cialo), 'zmiana systemowa przełącza motyw');
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

test('U3: warstwa Kroniki otwiera się listą Kronik (Tomów), nie listą Epok', () => {
  // Recenzja właściciela 2026-09-04: link „kronika" otwierał od razu listę
  // Epok; oczekiwane: najpierw lista Kronik, dopiero po wyborze Tomu epoki.
  const podsumowanie = {
    tom: 'tom-1',
    tytulTomu: 'Kronika trzech stołów',
    tomy: [{ slug: 'tom-1', nr: 1, tytul: 'Kronika trzech stołów', opis: 'Pierwsza księga.', plik: 'kronika-tom-1.html', epoki: 7 }],
    epoki: [
      {
        slug: 'epoka-1',
        tytul: 'Trzy stoły',
        stanPo: { os: { mit: 34, racjonalizacja: 66 } },
        konsekwencje: { zasieg: [] },
        uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }],
      },
    ],
  };
  const lista = htmlKronik(podsumowanie);
  assert.match(lista, /data-tom="tom-1"/, 'karta Tomu z wyborem księgi');
  assert.match(lista, /Kronika trzech stołów/);
  assert.match(lista, /Tom I/, 'numer Tomu rzymski');
  assert.match(lista, /7 epok/);
  assert.match(lista, /href="docs\/kronika-tom-1\.html"/, 'odnośnik do raportu Tomu');
  assert.ok(!lista.includes('kronika-filtr'), 'filtr epok nie należy do listy Kronik');
  assert.ok(!lista.includes('data-link="kronika:epoka-1"'), 'epoki nie widać przed wyborem Tomu');

  const epokiTomu = htmlKronik(podsumowanie, {}, { tom: 'tom-1' });
  assert.match(epokiTomu, /data-link="kronika:epoka-1"/, 'po wyborze Tomu — karty epok');
  assert.match(epokiTomu, /kronika-filtr/, 'filtr bytów na poziomie epok');
});

test('U3: summary bez spisu Tomów (stary format) otwiera od razu epoki', () => {
  const html = htmlKronik({
    epoki: [
      {
        slug: 'epoka-1',
        tytul: 'Trzy stoły',
        stanPo: { os: { mit: 34, racjonalizacja: 66 } },
        konsekwencje: { zasieg: [] },
        uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }],
      },
    ],
  });
  assert.match(html, /data-link="kronika:epoka-1"/, 'kompatybilność wstecz: brak tomy → lista epok');
});

test('rzymskie: numery Tomów', () => {
  assert.equal(rzymskie(1), 'I');
  assert.equal(rzymskie(4), 'IV');
  assert.equal(rzymskie(9), 'IX');
  assert.equal(rzymskie(14), 'XIV');
});

test('paryRozmowySkitu: pełne spójne pary składu, bez duplikatów i self-linków (C2)', () => {
  const trio = paryRozmowySkitu([{ imie: 'A', slug: 'a' }, { imie: 'B', slug: 'b' }, { imie: 'C', slug: 'c' }]);
  assert.deepEqual(trio, [{ a: 'a', b: 'b' }, { a: 'a', b: 'c' }, { a: 'b', b: 'c' }], 'trójka = 3 pary');
  const czworka = paryRozmowySkitu([{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }]);
  assert.equal(czworka.length, 6, 'czwórka = 6 par');
  assert.deepEqual(paryRozmowySkitu([{ slug: 'a' }, { slug: 'a' }, { slug: 'b' }]), [{ a: 'a', b: 'b' }], 'duplikat uczestnika nie mnoży par');
  assert.deepEqual(paryRozmowySkitu([{ slug: 'a' }]), [], 'samotnik bez pary');
  assert.deepEqual(paryRozmowySkitu([]), []);
  assert.deepEqual(paryRozmowySkitu(undefined), []);
  assert.deepEqual(paryRozmowySkitu([{ imie: 'Bez sluga' }]), [], 'uczestnik bez sluga pomijany');
});

test('źródło bez adresu dostaje znacznik, a klikalne go nie dostaje', () => {
  assert.equal(linkDoZrodla('https://example.org/tekst'), linkDoZrodla('https://example.org/tekst'));
  assert.equal(znacznikZrodlaBezAdresu('https://example.org/tekst'), '');
  assert.equal(znacznikZrodlaBezAdresu('  HTTPS://Example.org  '), '');
  const znak = znacznikZrodlaBezAdresu('');
  assert.match(znak, /zrodlo-offline/);
  assert.match(znak, /bez adresu w sieci/);
  assert.equal(znacznikZrodlaBezAdresu(undefined), znak, 'brak pola url = ten sam znacznik');
  assert.equal(znacznikZrodlaBezAdresu('ftp://serwer/plik.pdf'), znak, 'adres nieklikalny też jest poza siecią');
});

test('sekcja III oznacza pozycje papierowe, ale nie internetowe', () => {
  const wpis = {
    slug: 'x',
    nazwa: 'Byt X',
    karta: { nazwa: 'Karta', rok: 2001 },
    lokalizacja: { miejscowosc: 'M', kraj: 'K', lat: 1, lon: 2 },
    pochodzenie_i_kultura: 'skądś',
    tagi: [],
    natura: { wyglad_i_aura: 'a', charakter_i_motywacje: 'b', zdolnosci: 'c', slabosci_i_metody_pokonania: 'd', preferencje: 'e' },
    dokumentacja: [
      { typ: 'monografia', pozycja: 'Papierowa monografia, 1891' },
      { typ: 'monografia', pozycja: 'Wersja cyfrowa', url: 'https://example.org/skan' },
    ],
    trofea: { pierwotne: 'kamień' },
    wizualizacja: { prompt: 'p' },
    powiazania: [],
    meta: { utworzono: '2026-09-05', modyfikacje: [] },
  };
  const html = htmlWpisu(wpis, { manifestacje: [], tagi: {}, kanon: { kategorie: [] } });
  assert.match(html, /<li class="poza-siecia">.*Papierowa monografia/);
  assert.match(html, /<li class="w-sieci">.*Wersja cyfrowa/);
  assert.equal((html.match(/zrodlo-offline/g) ?? []).length, 1, 'tylko pozycja bez adresu jest oznaczona');
});

test('Profil Rezonansu stoi po numerowanych sekcjach protokołu', async () => {
  const { wpis, indeks } = await dane();
  const html = htmlWpisu(wpis, indeks);
  const v = html.indexOf('>V</span>');
  const profil = html.indexOf('arena-profil');
  assert.ok(v > 0 && profil > 0);
  assert.ok(profil > v, 'dodatek aplikacji nie przerywa numeracji I–V');
});

test('SPLOT: zasoby po próbie są czytelne, nie surowym JSON-em', () => {
  assert.equal(opisZasobow({ pamiec: 3, przejscie: 1 }), 'pamiec 3 · przejscie 1');
  assert.equal(opisZasobow({}), 'bez zmian');
  assert.equal(opisZasobow(undefined), 'bez zmian');
  const wynik = { status: 'ok', proza: 'p', zasoby: { pamiec: 3 }, dziennik: [{ nazwa: 'Próba', prawdopodobienstwo: 0.4, wartoscLosowa: 0.2, sukces: true, zasoby: { pamiec: 3, przejscie: 1 }, proza: 'q' }] };
  const html = htmlSplotu({ tytul: 't', cel: 'c', sklad: [] }, wynik, { manifestacje: [] });
  assert.ok(html.includes('zasoby po próbie: pamiec 3 · przejscie 1'));
  assert.ok(!html.includes('{&quot;'), 'żadnego surowego JSON-a w raporcie');
});

test('raport SPLOTU pokazuje napór świata i ślad dla Kroniki', () => {
  const swiat = {
    premia: -5.2,
    skladniki: [
      { nazwa: 'oś świata', wartosc: -4.2, opis: 'mit 29 / racjonalizacja 71' },
      { nazwa: 'otwarte wątki', wartosc: 4, opis: 'znak-nie-wystarcza' },
    ],
  };
  const panel = htmlNaporuSwiata(swiat);
  assert.match(panel, /Napór świata: -5.2/);
  assert.match(panel, /splot-swiat-wiersz minus/);
  assert.match(panel, /splot-swiat-wiersz plus/);
  assert.equal(htmlNaporuSwiata(null), '', 'brak Kroniki = brak panelu');
  assert.equal(htmlNaporuSwiata({ premia: 0, skladniki: [] }), '');

  const echo = {
    droga: 'droga-x',
    status: 'rozszczepiona',
    os: { mit: 0, racjonalizacja: 0 },
    zasieg: [{ slug: 'a', delta: 0.004 }],
    watek: { id: 'slad-droga-x', stan: 'otwarty', byty: ['a'], pytanie: 'Kto wróci?' },
  };
  const html = htmlEchaDrogi(echo, { manifestacje: [{ slug: 'a', nazwa: 'Byt A' }] });
  assert.match(html, /Ślad dla Kroniki/);
  assert.match(html, /oś świata bez zmian/);
  assert.match(html, /Byt A \+0.004/);
  assert.match(html, /slad-droga-x/);
  assert.match(html, /Kto wróci\?/);
  assert.equal(htmlEchaDrogi(null, {}), '');

  const wynik = { status: 'rozszczepiona', proza: 'p', zasoby: {}, swiat, echo, dziennik: [] };
  const raport = htmlSplotu({ tytul: 't', cel: 'c', sklad: [] }, wynik, { manifestacje: [] });
  assert.ok(raport.includes('Napór świata') && raport.includes('Ślad dla Kroniki'));
});

