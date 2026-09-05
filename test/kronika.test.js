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
  PLIK_PODSUMOWANIA,
  PLIK_KANONU,
  KATALOG_KRONIKA,
  wykresOsiSVG,
  wykresZasiegowSVG,
  slupkiDominacjiSVG,
  diagramRelacjiSVG,
  osWatkowSVG,
  dziennikZmianyHTML,
  heatmapZasiegowSVG,
  kolorZasiegu,
  grafEpokSVG,
  lamaczTekstu,
  tekstWieloliniowy,
  KRONIKA_CSS,
  dominacjeKulturTomu,
  generujMapeSVG,
  generujSpisTomowHTML,
  generujRaportHTML,
  generujRaportTomuHTML,
  ramkaEpokiHTML,
  heroEpokiHTML,
  bytyOtwartychWatkow,
  agendaTomu,
  proponujEpoke,
  sortujPlikiSeriami,
  walidujZrodloSplotu,
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
  assert.equal(paliwoPasywne(mapa.get('agni'), kanon), 18);
  assert.equal(paliwoPasywne(mapa.get('egungun'), kanon), 22);
  assert.equal(paliwoPasywne(mapa.get('kentaur-pelion'), kanon), 18);
  assert.equal(paliwoPasywne(mapa.get('empusa-korynt'), kanon), 25);
  assert.equal(paliwoPasywne(mapa.get('lincoln-imp'), kanon), 16);
  assert.equal(paliwoPasywne(mapa.get('sfinks-teby'), kanon), 28);
  assert.equal(paliwoPasywne(mapa.get('talos-kreta'), kanon), 24);
});

test('Tom I: epoki przechodzą sekwencyjnie i oś zamyka się na 100', async () => {
  const [tom, epoka1, epoka2, epoka3, epoka4, epoka5, epoka6, epoka7, epoka8, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-3.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-4.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-5.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-6.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-7.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-8.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2, epoka3, epoka4, epoka5, epoka6, epoka7, epoka8],
    indeks,
    kanon,
  });

  assert.equal(wynik.walidacja, true, JSON.stringify(wynik.bledy));
  assert.equal(wynik.epoki.length, 8);
  assert.equal(wynik.stanPo.os.mit + wynik.stanPo.os.racjonalizacja, 100);

  const [e1, e2, e3, e4, e5, e6, e7, e8] = wynik.epoki;
  assert.deepEqual(
    e1.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 22, 25],
      ['barbarossa-kyffhaeuser', 23, 21],
      ['kentaur-pelion', 18, 16],
    ]
  );
  assert.equal(e1.stanPo.os.mit, 31);
  assert.equal(e1.stanPo.os.racjonalizacja, 69);

  assert.deepEqual(
    e2.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['lincoln-imp', 16, 14],
      ['kentaur-pelion', 16, 14],
      ['empusa-korynt', 25, 27],
    ]
  );
  assert.equal(e2.stanPo.os.mit, 29);
  assert.equal(e2.stanPo.os.racjonalizacja, 71);

  assert.deepEqual(
    e3.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 25, 28],
      ['balor', 23, 21],
      ['empusa-korynt', 27, 25],
    ]
  );
  assert.equal(e3.stanPo.os.mit, 27);
  assert.equal(e3.stanPo.os.racjonalizacja, 73);

  assert.deepEqual(
    e4.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 28, 31],
      ['selkie-sule-skerry', 28, 26],
      ['indra', 13, 11],
    ]
  );
  assert.equal(e4.stanPo.os.mit, 26);
  assert.equal(e4.stanPo.os.racjonalizacja, 74);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'egungun').wielkosc, 0.508);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'selkie-sule-skerry').wielkosc, 0.49);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'indra').wielkosc, 0.307);

  assert.deepEqual(
    e5.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['sfinks-teby', 28, 26],
      ['talos-kreta', 24, 22],
      ['lincoln-imp', 14, 16],
    ]
  );
  assert.equal(e5.stanPo.os.mit, 25);
  assert.equal(e5.stanPo.os.racjonalizacja, 75);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'lincoln-imp').wielkosc, 0.393);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'sfinks-teby').wielkosc, 0.455);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'talos-kreta').wielkosc, 0.408);

  assert.deepEqual(
    e6.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['pandora', 19, 19],
      ['morowa-panna', 19, 17],
      ['empusa-korynt', 25, 24],
    ]
  );
  assert.equal(e6.stanPo.os.mit, 24);
  assert.equal(e6.stanPo.os.racjonalizacja, 76);
  assert.equal(e6.stanPo.zasieg.find((z) => z.slug === 'pandora').wielkosc, 0.414);
  assert.equal(e6.stanPo.zasieg.find((z) => z.slug === 'morowa-panna').wielkosc, 0.389);
  assert.equal(e6.stanPo.zasieg.find((z) => z.slug === 'empusa-korynt').wielkosc, 0.464);

  assert.deepEqual(
    e7.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['protostates', 13, 14],
      ['knecht-z-koptos', 15, 15],
      ['syama-i-sarvara', 16, 15],
    ]
  );
  assert.equal(e7.stanPo.os.mit, 23);
  assert.equal(e7.stanPo.os.racjonalizacja, 77);
  assert.equal(e7.meta.poprzednik, 'epoka-6');
  assert.equal(e7.stanPo.zasieg.find((z) => z.slug === 'protostates').wielkosc, 0.329);
  assert.equal(e7.stanPo.zasieg.find((z) => z.slug === 'knecht-z-koptos').wielkosc, 0.38);
  assert.equal(e7.stanPo.zasieg.find((z) => z.slug === 'syama-i-sarvara').wielkosc, 0.348);
  // S3: odwołanie poprzednik widoczne także w grafie epok (bez cyklu)
  assert.ok(e7.konsekwencje.watki.some((w) => w.id === 'pierwszy-w-linii' && w.stan === 'otwarty'));

  assert.deepEqual(
    e8.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['empusa-korynt', 24, 24],
      ['barbarossa-kyffhaeuser', 21, 22],
      ['egungun', 31, 30],
    ]
  );
  assert.equal(e8.stanPo.os.mit, 24);
  assert.equal(e8.stanPo.os.racjonalizacja, 76);
  assert.equal(e8.meta.poprzednik, 'epoka-7');
  assert.equal(e8.stanPo.zasieg.find((z) => z.slug === 'barbarossa-kyffhaeuser').wielkosc, 0.451);
  assert.equal(e8.stanPo.zasieg.find((z) => z.slug === 'empusa-korynt').wielkosc, 0.474);
  assert.equal(e8.stanPo.zasieg.find((z) => z.slug === 'egungun').wielkosc, 0.513);
  assert.ok(e8.konsekwencje.watki.some((w) => w.id === 'gosc-ktoremu-zaplacono' && w.stan === 'otwarty'));
  assert.ok(e8.konsekwencje.watki.some((w) => w.id === 'wedrowny-dom-empusy' && w.stan === 'zamkniety'));
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
/* ---- S1: wizualizacje Kroniki (W1–W10) ---- */

test('S1: summary epok niesie ramę narracji (iskra/pytanie/przebieg/meta)', async () => {
  const [tom, epoka1, epoka2, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const podsumowanie = zbudujPodsumowanieTomu({ tom, epoki: [epoka1, epoka2], indeks, kanon });
  const e1 = podsumowanie.epoki[0];
  assert.ok(e1.iskra.length > 20, 'iskra w summary');
  assert.ok(e1.pytanie.length > 10, 'pytanie w summary');
  assert.ok(e1.przebieg.includes('Pełny tekst rozmowy'), 'przebieg w summary');
  assert.ok(e1.meta && e1.meta.autor, 'meta w summary');
});

test('S1: wykres osi rysuje linię mit% i punkty epok (bez NaN, deterministycznie)', () => {
  const epoki = [
    { slug: 'epoka-1', tytul: 'A', stanPo: { os: { mit: 0.34 } } },
    { slug: 'epoka-2', tytul: 'B', stanPo: { os: { mit: 0.32 } } },
    { slug: 'epoka-3', tytul: 'C', stanPo: { os: { mit: 0.3 } } },
  ];
  const a = wykresOsiSVG(epoki);
  const b = wykresOsiSVG(epoki);
  assert.equal(a, b, 'deterministyczne');
  assert.match(a, /class="os-line"/);
  assert.match(a, /class="os-dot"/);
  assert.ok(!a.includes('NaN'));
  assert.equal((a.match(/os-dot/g) ?? []).length, 3);
});

test('S1: W3/W5/W6/W7/W9 i graf epok nie zawracają NaN i mają klasy', () => {
  const relacje = [{ od: 'egungun', do: 'barbarossa-kyffhaeuser', kierunek: 'wzmocnienie', opis: 'razem' }];
  const uczestnicy = [{ slug: 'egungun', nazwa: 'Egungun' }, { slug: 'barbarossa-kyffhaeuser', nazwa: 'Barbarossa' }, { slug: 'kentaur-pelion', nazwa: 'Kentaur' }];
  const epoki = [
    { slug: 'epoka-1', tytul: 'A', uczestnicy, konsekwencje: { watki: [{ id: 'w1', stan: 'otwarty' }] }, stanPo: { paliwo: { egungun: 23 }, zasieg: [{ slug: 'egungun', wielkosc: 0.5 }] } },
    { slug: 'epoka-2', tytul: 'B', uczestnicy, konsekwencje: { watki: [{ id: 'w1', stan: 'zamkniety' }] }, stanPo: { paliwo: { egungun: 24 }, zasieg: [{ slug: 'egungun', wielkosc: 0.6 }] } },
  ];
  const z = wykresZasiegowSVG([{ slug: 'egungun', nazwa: 'Egungun', przed: 0.2, po: 0.5, opis: 'rośnie' }]);
  const d = slupkiDominacjiSVG([{ etykieta: 'joruba · egungun', wielkosc: 0.5, delta: 0.1 }]);
  const r = diagramRelacjiSVG(relacje, uczestnicy);
  const w = osWatkowSVG(epoki);
  const h = heatmapZasiegowSVG(epoki, { egungun: 'Egungun' });
  const g = grafEpokSVG(epoki);
  for (const [nazwa, html] of Object.entries({ z, d, r, w, h, g })) {
    assert.ok(!html.includes('NaN'), `${nazwa}: bez NaN`);
    assert.match(html, /class="/, `${nazwa}: ma klasy`);
  }
  assert.match(z, /zasieg-po/);
  assert.match(r, /rel-luk wzmocnienie/);
  assert.match(g, /graf-os/);
});

test('S1: etykiety wykresów łamią się (tspan) — nazwy nie są ucinane (recenzja A)', () => {
  const dlugie = 'Barbarossa z Kyffhäuser i jego siedmiu towarzyszy';
  assert.deepEqual(lamaczTekstu(dlugie, 19, 2), ['Barbarossa z', 'Kyffhäuser i jego…'], 'łamanie z wielokropkiem');
  assert.deepEqual(lamaczTekstu('Krótka nazwa', 19, 2), ['Krótka nazwa'], 'krótki tekst bez łamania');
  const t = tekstWieloliniowy(100, 50, 'graf-etykieta', dlugie, { maxZnakow: 15, maxLinii: 2 });
  assert.match(t, /<text class="graf-etykieta"/);
  assert.match(t, /<tspan x="100.0">Barbarossa z<\/tspan>/);
  assert.match(t, /<tspan x="100.0" dy="13">Kyffhäuser i…<\/tspan>/);
  assert.equal((t.match(/<tspan/g) ?? []).length, 2, 'dwa wiersze');

  const epoki = [
    { slug: 'epoka-1', tytul: 'Trzy stoły: przodek, gospodarz i gość', uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }], konsekwencje: { watki: [{ id: 'pierwszy-w-linii', stan: 'otwarty' }] }, stanPo: { zasieg: [{ slug: 'egungun', wielkosc: 0.5 }], os: { mit: 34 } } },
    { slug: 'epoka-2', tytul: 'Nieproszeni goście: psuj, zaproszony i zaproszenie', uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }], konsekwencje: { watki: [{ id: 'pierwszy-w-linii', stan: 'otwarty' }] }, stanPo: { zasieg: [{ slug: 'egungun', wielkosc: 0.4 }], os: { mit: 33 } } },
  ];
  for (const [nazwa, html] of Object.entries({
    graf: grafEpokSVG(epoki),
    watki: osWatkowSVG(epoki),
    heat: heatmapZasiegowSVG(epoki, { egungun: 'Egungun' }),
  })) {
    assert.ok(html.includes('<tspan'), `${nazwa}: etykiety łamane w tspan`);
    assert.ok(!html.includes('NaN'), `${nazwa}: bez NaN`);
  }
});

test('W9: macierz zasięgów ma skalę kolorów, wartości w komórkach i legendę (recenzja A)', () => {
  assert.notEqual(kolorZasiegu(0.1).rgb, kolorZasiegu(0.5).rgb, 'skala: różne wartości = różne kolory');
  assert.match(kolorZasiegu(0.5).rgb, /^rgb\(\d+,\d+,\d+\)$/);
  const epoki = [
    { slug: 'epoka-1', tytul: 'A', uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }, { slug: 'balor', nazwa: 'Balor' }], stanPo: { zasieg: [{ slug: 'egungun', wielkosc: 0.1 }, { slug: 'balor', wielkosc: 0.5 }] } },
    { slug: 'epoka-2', tytul: 'B', uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }, { slug: 'balor', nazwa: 'Balor' }], stanPo: { zasieg: [{ slug: 'egungun', wielkosc: 0.3 }, { slug: 'balor', wielkosc: 0.4 }] } },
  ];
  const h = heatmapZasiegowSVG(epoki, { egungun: 'Egungun', balor: 'Balor' });
  assert.match(h, /class="heat-liczba"/);
  assert.match(h, /heat-legenda/);
  assert.match(h, /heat-leg-kolor/);
  assert.ok(h.includes('10%') && h.includes('50%'), 'procenty w komórkach');
  const kolory = [...new Set([...h.matchAll(/style="fill:rgb\(([^)]+)\)"/g)].map((m) => m[1]))];
  assert.ok(kolory.length >= 4, `różne kolory komórek: ${kolory.length}`);
});

test('W5: dominacje Tomu — agregat po kulturach obecnych w Tomie (recenzja B)', () => {
  const podsumowanie = {
    epoki: [
      { slug: 'epoka-1', uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun' }, { slug: 'balor', nazwa: 'Balor' }] },
      { slug: 'epoka-2', uczestnicy: [{ slug: 'kentaur-pelion', nazwa: 'Kentaur z Pelionu' }] },
    ],
    stanPo: {
      dominacje: [
        { kultura: 'joruba', kult: 'egungun', wielkosc: 0.5 },
        { kultura: 'irlandia', kult: 'balor', wielkosc: 0.3 },
        { kultura: 'grecja', kult: 'kentaur-pelion', wielkosc: 0.2 },
        // byt z kartoteki, ale NIE grał w tym Tomie — musi wypaść z wykresu
        { kultura: 'indie', kult: 'indra', wielkosc: 0.9 },
      ],
    },
  };
  const wiersze = dominacjeKulturTomu(podsumowanie);
  assert.deepEqual(wiersze.map((w) => w.kultura), ['joruba', 'irlandia', 'grecja'], 'tylko kultury obecne, ranking malejąco');
  assert.ok(!wiersze.some((w) => w.kultura === 'indie'), 'kultura spoza Tomu pominięta');
  assert.equal(wiersze[0].etykieta, 'Joruba', 'czytelna nazwa kultury');
  assert.equal(wiersze[1].dopisek, '1 byt');
  assert.ok(Math.abs(wiersze.reduce((a, w) => a + w.wielkosc, 0) - 1) < 1e-9, 'udziały sumują się do 1');
  // dwa byty tej samej kultury — jeden słupek z sumą
  const dwa = dominacjeKulturTomu({
    epoki: [{ slug: 'e', uczestnicy: [{ slug: 'pandora' }, { slug: 'talos-kreta' }] }],
    stanPo: {
      dominacje: [
        { kultura: 'grecja', kult: 'pandora', wielkosc: 0.2 },
        { kultura: 'grecja', kult: 'talos-kreta', wielkosc: 0.3 },
      ],
    },
  });
  assert.equal(dwa.length, 1, 'jeden słupek na kulturę');
  assert.equal(dwa[0].dopisek, '2 byty');
  assert.equal(dwa[0].suma, 0.5);
  // łamanie etykiet w pierwszej kolumnie + dopisek w delcie
  const d = slupkiDominacjiSVG([{ etykieta: 'Szkocja Północna', wielkosc: 0.4, dopisek: '1 byt' }]);
  assert.match(d, /<tspan/);
  assert.match(d, /· 1 byt/);
});

test('mapa SVG bytów: halo liczbowe, title bez NaN', () => {
  const svg = generujMapeSVG({
    manifestacje: [
      { slug: 'balor', nazwa: 'Balor z Tory Island', kraj: 'Irlandia', lat: 55.26, lon: -8.2 },
      { slug: 'egungun', nazwa: 'Egungun', kraj: 'Nigeria', lat: 7.5, lon: 4.5 },
    ],
    uczestnicySlugi: ['balor', 'egungun'],
    zasiegi: [{ slug: 'balor', wielkosc: 0.5 }],
    viewBox: '0 0 1000 500',
  });
  assert.ok(!svg.includes('NaN'), 'tytuł halo i promień są liczbowe (był bug: NaN%% / r="NaN")');
  assert.ok(!svg.includes('NaN%%'));
  assert.match(svg, /r="84"/, 'halo = 24 + 0,5·120');
});

test('KRONIKA_CSS: minimalna czcionka 12px — żadna mniejsza (recenzja A)', () => {
  const male = KRONIKA_CSS.match(/font-size:\s*(?:9|10|11|11\.5)px/g) || [];
  assert.deepEqual(male, [], `mniejsze niż 12px: ${male.join(', ')}`);
  assert.match(KRONIKA_CSS, /\.heat-legenda/);
  assert.match(KRONIKA_CSS, /\.dom-grupa-etykieta/);
});

test('S1: dziennik zmiany to tabela z paliwem, zasięgiem, dominacją i pozycją', () => {
  const e = {
    uczestnicy: [{ slug: 'egungun', nazwa: 'Egungun', saldoPrzed: 20, saldoPo: 23 }],
    konsekwencje: {
      zasieg: [{ slug: 'egungun', przed: 0.4, po: 0.5 }],
      dominacje: [{ kultura: 'joruba', kult: 'egungun', delta: 0.1 }],
      pozycje: [{ slug: 'egungun', status: 'wzmocniony', opis: 'przodek u stołu' }],
    },
  };
  const html = dziennikZmianyHTML(e, { egungun: 'Egungun' });
  assert.match(html, /class="dziennik"/);
  assert.match(html, /20 → <b>23<\/b>/);
  assert.match(html, /\+10 pp/);
  assert.match(html, /wzmocniony/);
  assert.ok(!html.includes('NaN'));
});

test('S1: raport epoki zawiera ramkę, dziennik, wykresy i łuki relacji; Tom — wykresy i filtr', async () => {
  const [tom, epoki, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    Promise.all([1, 2, 3, 4, 5, 6].map((n) => wczytaj(join(KATALOG_KRONIKA, `epoka-${n}.json`)))),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const podsumowanie = zbudujPodsumowanieTomu({ tom, epoki, indeks, kanon });
  const e = podsumowanie.epoki[0];
  const raport = generujRaportHTML({
    tom: podsumowanie.tom,
    tytulTomu: podsumowanie.tytulTomu,
    slug: e.slug,
    tytulEpoki: e.tytul,
    skit: e.skit,
    iskra: e.iskra,
    pytanie: e.pytanie,
    przebieg: e.przebieg,
    meta: e.meta,
    skitTekst: 'Tekst rozmowy.',
    uczestnicy: e.uczestnicy,
    stanPo: e.stanPo,
    konsekwencje: e.konsekwencje,
    narrator: e.narrator,
    wszystkieManifestacje: indeks.manifestacje,
    landD: '',
    manifestacjePelne: {},
    indeks,
    liczbaEpok: podsumowanie.epoki.length,
  });
  assert.match(raport, /class="ramka-epoki"/);
  assert.match(raport, /class="dziennik"/);
  assert.match(raport, /class="chart zasieg-chart"/);
  assert.match(raport, /class="chart rel-chart"/);
  assert.match(raport, /rel-arc wzmocnienie|rel-arc schlodzenie|rel-arc neutralna/);
  assert.match(raport, /Epoki powiązane/);

  const tomRaport = generujRaportTomuHTML(podsumowanie, indeks, '', {}, [{ slug: 'tom-1', tytul: 'Kronika trzech stołów', plik: 'kronika-tom-1.html' }]);
  assert.match(tomRaport, /class="chart os-chart"/);
  assert.match(tomRaport, /class="chart heat-chart"/);
  assert.match(tomRaport, /wykres-paliwa/);
  assert.match(tomRaport, /class="chart watki-chart"/);
  assert.match(tomRaport, /class="chart graf-chart"/);
  assert.match(tomRaport, /id="filtr-bytow"/);
  assert.match(tomRaport, /kronika-filtr-info/);
  assert.match(tomRaport, /generujSkryptFiltraTomy|byty = \[/);
});

test('S3: spis Tomów generuje stronę z kartami', () => {
  const html = generujSpisTomowHTML([
    { slug: 'tom-1', nr: 1, tytul: 'Kronika trzech stołów', opis: 'Pierwszy Tom', plik: 'kronika-tom-1.html', epoki: 6 },
  ]);
  assert.match(html, /Spis Tomów/);
  assert.match(html, /Kronika trzech stołów/);
  assert.match(html, /6 epok/);
});

test('U4: epoka nie może być własnym poprzednikiem/kontynuacją', async () => {
  const [tom, epoka1, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const zepsuta = { ...epoka1, meta: { ...(epoka1.meta || {}), poprzednik: 'epoka-1' } };
  const wynik = przeliczEpoke({ tom, epoka: zepsuta, indeks, kanon, stan: structuredClone(tom.stanStart), watkiPoprzednie: new Map() });
  assert.ok(wynik.bledy.some((b) => /własnym poprzednikiem/.test(b)));
});

/* ---- Silnik Kronikarza (2026-08-30): hero grafik, R1–R5, rozstaje ---- */

test('heroEpokiHTML: figcaption, podpis, styl i prompt w details (bez XSS)', () => {
  const html = heroEpokiHTML({
    obraz: 'assets/wizualizacje/kronika-tom-1-epoka-1.jpg',
    podpis: 'Trzy stoły <script>',
    prompt: 'kinowy kadr <b>',
    styl: 'hiperrealistyczna kinowa fotografia',
  });
  assert.match(html, /class="hero-grafika"/);
  assert.match(html, /src="\.\.\/assets\/wizualizacje\/kronika-tom-1-epoka-1\.jpg"/);
  assert.match(html, /details class="prompt"/);
  assert.match(html, /Trzy stoły &lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /figcaption/);
});

test('heroEpokiHTML: pusty obiekt nie generuje figure', () => {
  assert.equal(heroEpokiHTML(null), '');
  assert.equal(heroEpokiHTML({}), '');
});

test('R1: bytyOtwartychWatkow zbiera slugi z otwartych wątków ostatniej epoki', async () => {
  const podsumowanie = await wczytaj(PLIK_PODSUMOWANIA);
  const byty = bytyOtwartychWatkow(podsumowanie);
  assert.ok(byty.size > 0);
  assert.ok(byty.has('empusa-korynt'));
  assert.ok(byty.has('barbarossa-kyffhaeuser'));
  assert.ok(byty.has('protostates'));
  // wątki zamknięte nie wliczają się
});

test('R1–R5: proponujEpoke zwraca deterministyczny ranking zróżnicowanych składów', async () => {
  const [indeks, podsumowanie] = await Promise.all([
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_PODSUMOWANIA),
  ]);
  const a = proponujEpoke(podsumowanie, indeks, { limit: 4 });
  const b = proponujEpoke(podsumowanie, indeks, { limit: 4 });
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'determinizm');
  assert.ok(a.length >= 1 && a.length <= 4);
  for (const p of a) {
    assert.equal(p.sklad.length, 3);
    // R3: max 1 byt z poprzedniej epoki
    const poprzedni = new Set((podsumowanie.epoki.at(-1).uczestnicy || []).map((u) => u.slug));
    const powtorki = p.sklad.filter((u) => poprzedni.has(u.slug)).length;
    assert.ok(powtorki <= 1, `R3: ${p.sklad.map((u) => u.slug).join(',')} ma ${powtorki} powtórek`);
    // R4: min 1 byt spoza ostatnich 2 epok
    const ostatnie2 = new Set(
      podsumowanie.epoki.slice(-2).flatMap((e) => (e.uczestnicy || []).map((u) => u.slug))
    );
    assert.ok(p.sklad.some((u) => !ostatnie2.has(u.slug)), 'R4: brak świeżego bytu');
    assert.ok(p.wynik > 0);
  }
  // różnorodność dróg: max 1 wspólny byt między dwiema drogami
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const wspolne = a[i].sklad.filter((u) => a[j].sklad.some((v) => v.slug === u.slug)).length;
      assert.ok(wspolne <= 1, `drogi ${i}/${j} mają ${wspolne} wspólnych bytów`);
    }
  }
});

test('agendaTomu: otwarte wątki, słabe paliwo i ciche kultury', async () => {
  const [indeks, podsumowanie] = await Promise.all([
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_PODSUMOWANIA),
  ]);
  const a = agendaTomu(podsumowanie, indeks);
  assert.ok(Array.isArray(a.watki) && a.watki.length > 0);
  assert.ok(a.watki.every((w) => w.id && Array.isArray(w.byty)));
  assert.ok(Array.isArray(a.slabi));
  assert.equal(a.ostatnia, 'epoka-13');
});

test('S1: raport Tomu zawiera miniatury epok i rozstaje silnika', async () => {
  const [indeks, podsumowanie] = await Promise.all([
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_PODSUMOWANIA),
  ]);
  const html = generujRaportTomuHTML(podsumowanie, indeks);
  assert.match(html, /epoka-mini/);
  assert.match(html, /Rozstaje — drogi dalej/);
  assert.match(html, /Droga A/);
  assert.match(html, /R1: otwarty wątek/);
});

test('S1: raport epoki osadza hero-grafikę z promptem', async () => {
  const [tom, epoka1, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = przeliczEpoke({ tom, epoka: epoka1, indeks, kanon, stan: structuredClone(tom.stanStart), watkiPoprzednie: new Map() });
  const html = generujRaportHTML(wynik, { manifestacje: indeks.manifestacje });
  assert.match(html, /class="hero-grafika"/);
  assert.match(html, /src="\.\.\/assets\/wizualizacje\/kronika-tom-1-epoka-1\.jpg"/);
  assert.match(html, /details class="prompt"/);
});

test('S1: graf epok — krótkie etykiety nie nachodzą na siebie (recenzja 2026-08-30)', () => {
  const epoki = [
    { slug: 'epoka-1', tytul: 'Trzy stoły: przodek, gospodarz i gość' },
    { slug: 'epoka-2', tytul: 'Nieproszeni goście: psuj, zaproszony i zaproszenie' },
    { slug: 'epoka-3', tytul: 'Odźwierni: zapraszany, otwierany i ten, który jest drzwiami' },
    { slug: 'epoka-4', tytul: 'Imię na progu: skóra, kres i pieśń' },
    { slug: 'epoka-5', tytul: 'Zagadka ze spiżu: rozum, żart i głuchy krok' },
    { slug: 'epoka-6', tytul: 'Czwarty stół: kto nie wie, że bierze' },
    { slug: 'epoka-7', tytul: 'Kolejność: nikt nie szedł za pierwszym' },
  ];
  const g = grafEpokSVG(epoki);
  assert.match(g, /viewBox="0 0 1100 250"/, 'szeroki kadr');
  const etykiety = [...g.matchAll(/<text class="graf-etykieta" x="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(etykiety.length, 7);
  const odstępy = etykiety.slice(1).map((x, i) => x - etykiety[i]);
  assert.ok(odstępy.every((d) => d >= 160), `odstępy ${odstępy} — etykiety się nie zlewają`);
  for (const m of g.matchAll(/<text class="graf-etykieta"[^>]*>(.*?)<\/text>/g)) {
    const czysto = m[1].replace(/<[^>]+>/g, ' ');
    assert.ok(czysto.trim().length <= 18, `etykieta krótka: „${czysto.trim()}”`);
    assert.ok((m[1].match(/<tspan/g) ?? []).length <= 2, 'maks. 2 linie');
  }
  assert.ok(g.includes('<title>') && g.includes('przodek, gospodarz'), 'pełny tytuł dostępny w tooltipie węzła');
});

test('Kronika CSS: odnośniki-chip w konwencji brązowego przycisku (recenzja 2026-08-30)', () => {
  assert.match(KRONIKA_CSS, /a\.chip\s*,\s*\.chip\.link\s*\{[^}]*color:\s*var\(--accent\)/s, 'a.chip ma brązowy kolor');
  assert.match(KRONIKA_CSS, /a\.chip\s*,\s*\.chip\.link\s*\{[^}]*text-decoration:\s*none/s, 'bez podkreślenia');
});

test('U4: raport epoki linkuje epoki powiązane jako chipy (nie gołe linki)', async () => {
  const [tom, epoka3, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-3.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = przeliczEpoke({ tom, epoka: epoka3, indeks, kanon, stan: structuredClone(tom.stanStart), watkiPoprzednie: new Map() });
  wynik.liczbaEpok = 7;
  wynik.wszystkieManifestacje = indeks.manifestacje;
  const html = generujRaportHTML(wynik);
  assert.match(html, /Epoki powiązane:/);
  assert.match(html, /<a class="chip" href="kronika-epoka-[0-9]+\.html">epoka-[0-9]+<\/a>/, 'chip, nie goły <a>');
  assert.match(html, /a\.chip/, 'CSS z regułą brązowego przycisku');
});

test('sortowanie plików serii jest liczbowe, nie leksykalne (epoka-10 po epoce-9)', () => {
  const wejscie = ['epoka-10.json', 'epoka-2.json', 'epoka-1.json', 'epoka-9.json'];
  assert.deepEqual(sortujPlikiSeriami(wejscie), [
    'epoka-1.json',
    'epoka-2.json',
    'epoka-9.json',
    'epoka-10.json',
  ]);
  assert.deepEqual(sortujPlikiSeriami(['tom-2.json', 'tom-1.json']), ['tom-1.json', 'tom-2.json']);
  assert.deepEqual(wejscie[0], 'epoka-10.json', 'wejście nie jest mutowane');
});

test('Epoka X domyka Tom I zgodnie z rozliczeniem paliwa i osi', async () => {
  const podsumowanie = await wczytaj(PLIK_PODSUMOWANIA);
  assert.equal(podsumowanie.walidacja, true, JSON.stringify(podsumowanie.bledy));
  assert.equal(podsumowanie.epoki.length, 13);

  const e10 = podsumowanie.epoki[9];
  assert.equal(e10.slug, 'epoka-10');
  assert.equal(e10.skit, 'gruz-i-odplyw');
  assert.deepEqual(
    e10.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['cormoran-st-michaels-mount', 9, 11],
      ['ben-varrey', 14, 15],
      ['lincoln-imp', 16, 16],
      ['loup-garou-gevaudan', 12, 13],
    ]
  );
  assert.equal(e10.stanPo.os.mit, 24);
  assert.equal(e10.stanPo.os.racjonalizacja, 76);
  assert.equal(
    e10.stanPo.zasieg.find((z) => z.slug === 'cormoran-st-michaels-mount').wielkosc,
    0.21
  );
  const nowy = (e10.konsekwencje.watki || []).find((w) => w.id === 'prawo-progu');
  assert.ok(nowy, 'Epoka X otwiera wątek prawa przejścia');
  assert.equal(nowy.byty.length, 4);
});

test('Epoka XI wyrasta z drogi SPLOTU, nie ze skitu', async () => {
  const podsumowanie = await wczytaj(PLIK_PODSUMOWANIA);
  const e11 = podsumowanie.epoki[10];
  assert.equal(e11.slug, 'epoka-11');
  assert.equal(e11.skit, null, 'epoka z drogi nie ma skitu');
  assert.deepEqual(e11.zrodloSplotu, { droga: 'ostatni-slad-gevaudan', status: 'rozszczepiona' });
  assert.deepEqual(
    e11.uczestnicy.map((u) => u.slug).sort(),
    ['loup-garou-gevaudan', 'neith-z-sais', 'sfinks-teby']
  );
  const slad = (e11.konsekwencje.watki || []).find((w) => w.id === 'slad-ostatni-slad-gevaudan');
  assert.ok(slad && slad.stan === 'otwarty', 'ślad drogi wchodzi do Kroniki jako wątek');
  assert.equal(e11.walidacja, true, JSON.stringify(e11.bledy));
});

test('Epoka XII wraca do rodowodu ze SKIT-u i wpina pierwszy byt zza oceanu', async () => {
  const podsumowanie = await wczytaj(PLIK_PODSUMOWANIA);
  const e12 = podsumowanie.epoki[11];
  assert.equal(e12.slug, 'epoka-12');
  assert.equal(e12.skit, 'co-sie-podaje', 'Epoka XII wyrasta z rozmowy, nie z drogi SPLOTU');
  assert.equal(e12.zrodloSplotu ?? null, null, 'jeden rodowód naraz');
  assert.deepEqual(
    e12.uczestnicy.map((u) => u.slug).sort(),
    ['iktomi', 'nessos', 'pandora']
  );
  assert.equal(e12.walidacja, true, JSON.stringify(e12.bledy));
  const drzwi = (e12.konsekwencje.watki || []).find((w) => w.id === 'zwezone-drzwi');
  assert.ok(drzwi && drzwi.stan === 'otwarty', 'Epoka XII otwiera wątek zwężonego przejścia');
  assert.deepEqual(drzwi.byty.sort(), ['iktomi', 'nessos', 'pandora']);
  const lakota = (e12.stanPo.dominacje || []).find((d) => d.kultura === 'lakota');
  assert.ok(lakota && lakota.wielkosc > 0, 'kultura lakocka wchodzi do dominacji Tomu I');
});

test('Epoka XIII zamyka obrót 6: trzy przedmioty i wątek ceny znaku', async () => {
  const podsumowanie = await wczytaj(PLIK_PODSUMOWANIA);
  const e13 = podsumowanie.epoki.at(-1);
  assert.equal(e13.slug, 'epoka-13');
  assert.equal(e13.skit, 'co-sie-nosi', 'Epoka XIII wyrasta z rozmowy, nie z drogi SPLOTU');
  assert.equal(e13.zrodloSplotu ?? null, null, 'jeden rodowód naraz');
  assert.deepEqual(
    e13.uczestnicy.map((u) => u.slug).sort(),
    ['boto-encantado', 'protostates', 'selkie-sule-skerry']
  );
  assert.equal(e13.walidacja, true, JSON.stringify(e13.bledy));
  const cena = (e13.konsekwencje.watki || []).find((w) => w.id === 'cena-znaku');
  assert.ok(cena && cena.stan === 'otwarty', 'Epoka XIII otwiera wątek ceny znaku');
  assert.deepEqual(cena.byty.slice().sort(), ['boto-encantado', 'protostates', 'selkie-sule-skerry']);
  assert.equal(e13.stanPo.os.mit, 24);
  assert.equal(e13.stanPo.os.racjonalizacja, 76);
});

test('walidujZrodloSplotu pilnuje zgodności Epoki z rozstrzygnięciem drogi', () => {
  const droga = { slug: 'droga-x', sklad: ['a', 'b'] };
  const epokaSlug = ['a', 'b'];
  const poprawna = {
    konsekwencje: {
      os: { mit: 1, racjonalizacja: -1 },
      watki: [{ id: 'slad-droga-x', stan: 'zamkniety', byty: ['a', 'b'], pytanie: '?' }],
    },
  };
  let bledy = [];
  walidujZrodloSplotu({ epoka: poprawna, zrodloSplotu: { droga: 'droga-x', status: 'ukonczona' }, epokaSlug, drogi: [droga], bledy });
  assert.deepEqual(bledy, [], 'ukończona droga: oś w górę i wątek domknięty');

  bledy = [];
  walidujZrodloSplotu({ epoka: poprawna, zrodloSplotu: { droga: 'droga-y', status: 'ukonczona' }, epokaSlug, drogi: [droga], bledy });
  assert.match(bledy.join(' '), /nie istnieje/);

  bledy = [];
  walidujZrodloSplotu({ epoka: poprawna, zrodloSplotu: { droga: 'droga-x', status: 'wygrana' }, epokaSlug, drogi: [droga], bledy });
  assert.match(bledy.join(' '), /nieznane rozstrzygnięcie/);

  bledy = [];
  walidujZrodloSplotu({ epoka: poprawna, zrodloSplotu: { droga: 'droga-x', status: 'przerwana' }, epokaSlug, drogi: [droga], bledy });
  assert.match(bledy.join(' '), /wątek .* ma stan/, 'przerwana droga zostawia wątek otwarty');
  assert.match(bledy.join(' '), /oś przesuwa się/, 'przerwana droga cofa oś, nie podnosi');

  bledy = [];
  walidujZrodloSplotu({ epoka: poprawna, zrodloSplotu: { droga: 'droga-x', status: 'ukonczona' }, epokaSlug: ['a'], drogi: [droga], bledy });
  assert.match(bledy.join(' '), /nie są równi składowi drogi/);
});

test('epoka bez źródła i epoka z dwoma źródłami są odrzucane', async () => {
  const [tom, epoka11, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-11.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const bezZrodla = { ...epoka11, zrodloSplotu: undefined };
  const w1 = przeliczEpoke({ tom, epoka: bezZrodla, indeks, kanon, stan: structuredClone(tom.stanStart), watkiPoprzednie: new Map() });
  assert.match(w1.bledy.join(' '), /musi wyrastać ze skitu albo z drogi/);

  const dwaZrodla = { ...epoka11, skit: 'zaslona-i-siersc' };
  const w2 = przeliczEpoke({ tom, epoka: dwaZrodla, indeks, kanon, stan: structuredClone(tom.stanStart), watkiPoprzednie: new Map() });
  assert.match(w2.bledy.join(' '), /dwa źródła naraz/);
});
