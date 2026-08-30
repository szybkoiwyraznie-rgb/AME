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
  generujSpisTomowHTML,
  generujRaportHTML,
  generujRaportTomuHTML,
  ramkaEpokiHTML,
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
  assert.equal(paliwoPasywne(mapa.get('agni'), kanon), 16);
  assert.equal(paliwoPasywne(mapa.get('egungun'), kanon), 20);
  assert.equal(paliwoPasywne(mapa.get('kentaur-pelion'), kanon), 18);
  assert.equal(paliwoPasywne(mapa.get('empusa-korynt'), kanon), 19);
  assert.equal(paliwoPasywne(mapa.get('lincoln-imp'), kanon), 12);
  assert.equal(paliwoPasywne(mapa.get('sfinks-teby'), kanon), 22);
  assert.equal(paliwoPasywne(mapa.get('talos-kreta'), kanon), 18);
});

test('Tom I: epoki przechodzą sekwencyjnie i oś zamyka się na 100', async () => {
  const [tom, epoka1, epoka2, epoka3, epoka4, epoka5, epoka6, epoka7, indeks, kanon] = await Promise.all([
    wczytaj(PLIK_TOM_1),
    wczytaj(PLIK_EPOKA_1),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-2.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-3.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-4.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-5.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-6.json')),
    wczytaj(join(KATALOG_KRONIKA, 'epoka-7.json')),
    wczytaj(PLIK_INDEKSU),
    wczytaj(PLIK_KANONU),
  ]);
  const wynik = zbudujPodsumowanieTomu({
    tom,
    epoki: [epoka1, epoka2, epoka3, epoka4, epoka5, epoka6, epoka7],
    indeks,
    kanon,
  });

  assert.equal(wynik.walidacja, true, JSON.stringify(wynik.bledy));
  assert.equal(wynik.epoki.length, 7);
  assert.equal(wynik.stanPo.os.mit + wynik.stanPo.os.racjonalizacja, 100);

  const [e1, e2, e3, e4, e5, e6, e7] = wynik.epoki;
  assert.deepEqual(
    e1.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 20, 23],
      ['barbarossa-kyffhaeuser', 17, 15],
      ['kentaur-pelion', 18, 16],
    ]
  );
  assert.equal(e1.stanPo.os.mit, 35);
  assert.equal(e1.stanPo.os.racjonalizacja, 65);

  assert.deepEqual(
    e2.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['lincoln-imp', 12, 10],
      ['kentaur-pelion', 16, 14],
      ['empusa-korynt', 19, 21],
    ]
  );
  assert.equal(e2.stanPo.os.mit, 33);
  assert.equal(e2.stanPo.os.racjonalizacja, 67);

  assert.deepEqual(
    e3.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 23, 26],
      ['balor', 21, 19],
      ['empusa-korynt', 21, 19],
    ]
  );
  assert.equal(e3.stanPo.os.mit, 31);
  assert.equal(e3.stanPo.os.racjonalizacja, 69);

  assert.deepEqual(
    e4.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['egungun', 26, 29],
      ['selkie-sule-skerry', 24, 22],
      ['indra', 13, 11],
    ]
  );
  assert.equal(e4.stanPo.os.mit, 30);
  assert.equal(e4.stanPo.os.racjonalizacja, 70);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'egungun').wielkosc, 0.548);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'selkie-sule-skerry').wielkosc, 0.478);
  assert.equal(e4.stanPo.zasieg.find((z) => z.slug === 'indra').wielkosc, 0.345);

  assert.deepEqual(
    e5.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['sfinks-teby', 22, 20],
      ['talos-kreta', 18, 16],
      ['lincoln-imp', 10, 12],
    ]
  );
  assert.equal(e5.stanPo.os.mit, 29);
  assert.equal(e5.stanPo.os.racjonalizacja, 71);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'lincoln-imp').wielkosc, 0.406);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'sfinks-teby').wielkosc, 0.381);
  assert.equal(e5.stanPo.zasieg.find((z) => z.slug === 'talos-kreta').wielkosc, 0.337);

  assert.deepEqual(
    e6.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['pandora', 15, 15],
      ['morowa-panna', 11, 9],
      ['empusa-korynt', 19, 18],
    ]
  );
  assert.equal(e6.stanPo.os.mit, 28);
  assert.equal(e6.stanPo.os.racjonalizacja, 72);
  assert.equal(e6.stanPo.zasieg.find((z) => z.slug === 'pandora').wielkosc, 0.316);
  assert.equal(e6.stanPo.zasieg.find((z) => z.slug === 'morowa-panna').wielkosc, 0.243);
  assert.equal(e6.stanPo.zasieg.find((z) => z.slug === 'empusa-korynt').wielkosc, 0.501);

  assert.deepEqual(
    e7.uczestnicy.map((u) => [u.slug, u.saldoPrzed, u.saldoPo]),
    [
      ['protostates', 11, 12],
      ['knecht-z-koptos', 13, 13],
      ['syama-i-sarvara', 10, 9],
    ]
  );
  assert.equal(e7.stanPo.os.mit, 27);
  assert.equal(e7.stanPo.os.racjonalizacja, 73);
  assert.equal(e7.meta.poprzednik, 'epoka-6');
  assert.equal(e7.stanPo.zasieg.find((z) => z.slug === 'protostates').wielkosc, 0.27);
  assert.equal(e7.stanPo.zasieg.find((z) => z.slug === 'knecht-z-koptos').wielkosc, 0.292);
  assert.equal(e7.stanPo.zasieg.find((z) => z.slug === 'syama-i-sarvara').wielkosc, 0.25);
  // S3: odwołanie poprzednik widoczne także w grafie epok (bez cyklu)
  assert.ok(e7.konsekwencje.watki.some((w) => w.id === 'pierwszy-w-linii' && w.stan === 'otwarty'));
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

test('W5: dominacje Tomu — grupowanie kulturami i ranking (recenzja A)', () => {
  const rows = [
    { grupa: 'grecja', etykieta: 'Kentaur', wielkosc: 0.4 },
    { grupa: 'grecja', etykieta: 'Talos', wielkosc: 0.2 },
    { grupa: 'germania', etykieta: 'Barbarossa', wielkosc: 0.3 },
  ];
  const d = slupkiDominacjiSVG(rows);
  assert.equal((d.match(/class="dom-grupa"/g) ?? []).length, 2, 'nagłówek na każdą kulturę');
  assert.match(d, /class="dom-grupa-etykieta"/);
  assert.ok(d.indexOf('Kentaur') < d.indexOf('Talos'), 'ranking wewnątrz kultury zachowany');
  // łamanie etykiet w pierwszej kolumnie
  const dluga = slupkiDominacjiSVG([{ etykieta: 'Barbarossa z Kyffhäuser i jego towarzysze', wielkosc: 0.4 }]);
  assert.match(dluga, /<tspan/);
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
