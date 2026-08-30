/**
 * Warstwy szczegółowości mapy (ADR 0020): geometria GeoJSON wodna, miasta
 * jako punkty LOD i przełączniki widoczności. Bez przeglądarki — na atrapie DOM
 * (jak test/pinezka.test.js), bo geometria i stan warstw są czyste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sciezkaGeoMultiPoligon, SZEROKOSC, WYSOKOSC, projektuj } from '../app/geo.js';
import { stworzMape, PROGI_WARSTW } from '../app/map.js';

function stworzElement(nazwa) {
  const klasy = new Set();
  const e = {
    nazwa,
    atrybuty: {},
    dzieci: [],
    sluchacze: {},
    textContent: '',
    style: {},
    setAttribute(k, v) {
      if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((x) => klasy.add(x));
      this.atrybuty[k] = String(v);
    },
    czyMaKlase(k) { return klasy.has(k); },
    getAttribute(k) { return this.atrybuty[k]; },
    appendChild(d) { this.dzieci.push(d); return d; },
    addEventListener(typ, fn) { (this.sluchacze[typ] ??= []).push(fn); },
    closest() { return null; },
    querySelector() { return null; },
    setPointerCapture() {},
    getBoundingClientRect() { return { width: 1600, height: 640 }; },
  };
  Object.defineProperty(e, 'classList', {
    value: {
      add: (...k) => k.forEach((x) => klasy.add(x)),
      remove: (...k) => k.forEach((x) => klasy.delete(x)),
      contains: (k) => klasy.has(k),
      toggle: (k, w) => {
        const naTak = w === undefined ? !klasy.has(k) : !!w;
        if (naTak) klasy.add(k); else klasy.delete(k);
        return naTak;
      },
    },
  });
  Object.defineProperty(e, 'innerHTML', {
    get: () => '',
    set: () => { e.dzieci.length = 0; },
  });
  return e;
}

function zasciel() {
  globalThis.document = {
    createElementNS: (_ns, nazwa) => stworzElement(nazwa),
    createDocumentFragment: () => stworzElement('fragment'),
  };
  const kontener = { appendChild: (d) => d, getBoundingClientRect: () => ({ width: 1600, height: 640 }) };
  return { kontener };
}

function znajdzElement(element, klasa) {
  if (element.czyMaKlase?.(klasa)) return element;
  for (const d of element.dzieci ?? []) {
    const wynik = znajdzElement(d, klasa);
    if (wynik) return wynik;
  }
  return null;
}

const POZIOM_WODY = {
  type: 'MultiPolygon',
  coordinates: [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]],
};

test('geo.js: sciezkaGeoMultiPoligon czyta [lon, lat] i domyka pierścienie', () => {
  const d = sciezkaGeoMultiPoligon(POZIOM_WODY.coordinates);
  assert.ok(d.startsWith('M'), `d=${d}`);
  assert.ok(d.endsWith('Z'));
  assert.ok(!d.includes('NaN'));
  assert.equal((d.match(/M/g) ?? []).length, 1, 'jeden kwadrat = jedna podścieżka');
});

test('mapa: WSZYSTKIE warstwy domyślnie wyłączone — rzeki/jeziora czekają na przełącznik', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.ustawRzeki({ geometries: [POZIOM_WODY] });
  mapa.ustawJeziora({ geometries: [POZIOM_WODY] });
  const rzeki = znajdzElement(mapa.svg, 'rzeki');
  const jeziora = znajdzElement(mapa.svg, 'jeziora');
  const miasta = znajdzElement(mapa.svg, 'miasta');
  assert.equal(rzeki.getAttribute('display'), 'none', 'rzeki domyślnie OFF');
  assert.equal(jeziora.getAttribute('display'), 'none', 'jeziora domyślnie OFF');
  assert.equal(miasta.getAttribute('display'), 'none', 'miasta domyślnie OFF');

  // sam zoom NIE włącza warstwy — dopiero przełącznik
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 5);
  assert.ok(mapa.widok.k >= PROGI_WARSTW.woda, `k=${mapa.widok.k}`);
  assert.equal(rzeki.getAttribute('display'), 'none');

  mapa.przelaczWidocznoscWarstwy('rzeki', true);
  mapa.przelaczWidocznoscWarstwy('jeziora', true);
  assert.equal(rzeki.getAttribute('display'), 'inherit');
  assert.equal(jeziora.getAttribute('display'), 'inherit');
});

test('mapa: miasta dzielone na rangi i kompensowane do rozmiaru ekranowego', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.ustawMiasta([
    { n: 'Wielkie', lat: 0, lon: 0, p: 2_000_000, c: 'primary' },
    { n: 'Średnie', lat: 0.5, lon: 0.5, p: 600_000 },
    { n: 'Drobne', lat: 1, lon: 1, p: 120_000 },
  ]);
  mapa.przelaczWidocznoscWarstwy('miasta', true); // domyślnie OFF (decyzja 2026-08-30)
  const grupaMiast = znajdzElement(mapa.svg, 'miasta');
  const wielkie = znajdzElement(grupaMiast, 'miasta-wielkie');
  const srednie = znajdzElement(grupaMiast, 'miasta-srednie');
  const drobne = znajdzElement(grupaMiast, 'miasta-drobne');
  assert.equal(grupaMiast.getAttribute('display'), 'none', 'miasta niewidoczne na starcie');

  mapa.zoomDoPunktu({ x: 800, y: 320 }, 4);
  assert.equal(grupaMiast.getAttribute('display'), 'inherit');
  assert.equal(wielkie.getAttribute('display'), 'inherit', 'powyżej 1 mln pokazuje się od progu 4');
  assert.equal(srednie.getAttribute('display'), 'none', 'średnie dopiero od progu 7');

  mapa.zoomDoPunktu({ x: 800, y: 320 }, 2);
  assert.ok(mapa.widok.k >= PROGI_WARSTW.miastaSrednie, `k=${mapa.widok.k}`);
  assert.equal(srednie.getAttribute('display'), 'inherit');
  assert.equal(drobne.getAttribute('display'), 'none', 'drobne dopiero od progu 10');

  const m = wielkie.dzieci[0];
  const transform = m.getAttribute('transform');
  const [, liczba] = /scale\(([\d.]+)\)/.exec(transform) ?? [];
  assert.ok(liczba, `transform=${transform}`);
  assert.ok(Math.abs(Number(liczba) - 1 / mapa.skala) < 1e-6, `kompensacja ${liczba}, oczekiwana ${1 / mapa.skala}`);

  // B/C4: grupa etykiety istnieje, jest ukryta, a miasto ma pole trafienia
  // i opis dostępności (bez <title>, bo nazwa nie ma się pokazywać na hover).
  const etykietaMiasta = znajdzElement(mapa.svg, 'etykieta-miasta');
  assert.ok(etykietaMiasta, 'pływająca etykieta miasta w drzewie SVG');
  assert.ok(!etykietaMiasta.czyMaKlase('widoczna'), 'etykieta ukryta przed kliknięciem');
  const kropka = m.dzieci.find((d) => d.czyMaKlase('kropka'));
  const trafienie = m.dzieci.find((d) => d.czyMaKlase('trafienie'));
  assert.ok(kropka, 'miasto ma kropkę');
  assert.ok(trafienie, 'miasto ma przezroczyste pole trafienia');
  assert.equal(trafienie.getAttribute('r'), '16', 'pole trafienia = PROMIEN_KLIK_MIASTA');
  assert.equal(m.getAttribute('aria-label'), 'Wielkie · 2.0 mln');
  assert.ok(!m.dzieci.some((d) => d.nazwa === 'title'), 'bez <title> — nazwa nie ma się pokazywać na najechanie');

  // wyłączenie warstwy chowa całość mimo wysokiego zoomu
  mapa.przelaczWidocznoscWarstwy('miasta', false);
  assert.equal(grupaMiast.getAttribute('display'), 'none');
  mapa.przelaczWidocznoscWarstwy('miasta', true);
  assert.equal(grupaMiast.getAttribute('display'), 'inherit');
});

test('mapa: przytrzymanie wciśniętego przycisku nad miastem pokazuje etykietę, puszczenie chowa ją', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.svg.getScreenCTM = () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) });
  globalThis.DOMPoint = class {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(m) { return { x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f }; }
  };

  mapa.ustawMiasta([
    { n: 'Warszawa', lat: 52.23, lon: 21.01, p: 1_700_000 },
    { n: 'Gdańsk', lat: 54.35, lon: 18.65, p: 470_000 },
  ]);
  mapa.przelaczWidocznoscWarstwy('miasta', true); // domyślnie OFF
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 4);
  const [wx, wy] = projektuj(52.23, 21.01);
  const px = mapa.widok.x + wx * mapa.skala;
  const py = mapa.widok.y + wy * mapa.skala;
  const etykieta = znajdzElement(mapa.svg, 'etykieta-miasta');
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'etykieta schowana przed wciśnięciem');

  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 1, target: { closest: () => null }, clientX: px, clientY: py });
  const tekst = etykieta?.dzieci.find((d) => d.nazwa === 'text');
  assert.ok(etykieta?.czyMaKlase('widoczna'), 'wciśnięcie nad miastem pokazuje tabliczkę');
  assert.equal(tekst?.textContent, 'Warszawa · 1.7 mln');

  mapa.svg.sluchacze.pointerup[0]({ pointerId: 1 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'puszczenie przycisku chowa tabliczkę');

  // Wciśnięcie w tle nic nie pokazuje; puszczenie niczego nie psuje.
  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 2, target: { closest: () => null }, clientX: 10, clientY: 10 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'wciśnięcie poza miastem nic nie pokazuje');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 2 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'po puszczeniu na tle tabliczka pozostaje schowana');

  // Wyłączenie warstwy miast (lub zoom poniżej progu) musi schować tabliczkę,
  // inaczej wisiałaby nad punktem, którego już nie ma.
  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 3, target: { closest: () => null }, clientX: px, clientY: py });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'ponowne wciśnięcie pokazuje tabliczkę');
  mapa.przelaczWidocznoscWarstwy('miasta', false);
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'wyłączona warstwa chowa otwartą tabliczkę');
  mapa.przelaczWidocznoscWarstwy('miasta', true);

  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 4, target: { closest: () => null }, clientX: px, clientY: py });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'warstwa włączona znowu pozwala wcisnąć');
  mapa.reset();
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'zoom poniżej progu miast chowa tabliczkę');

  delete globalThis.DOMPoint;
  delete mapa.svg.getScreenCTM;
});

test('mapa: nazwa miasta tylko podczas przytrzymania — hover jej nie pokazuje (świadoma decyzja)', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.svg.getScreenCTM = () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) });
  globalThis.DOMPoint = class {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(m) { return { x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f }; }
  };
  mapa.ustawMiasta([{ n: 'Kraków', lat: 50.06, lon: 19.94, p: 1_200_000 }]);
  mapa.przelaczWidocznoscWarstwy('miasta', true); // domyślnie OFF
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 4);
  const [wx, wy] = projektuj(50.06, 19.94);
  const px = mapa.widok.x + wx * mapa.skala;
  const py = mapa.widok.y + wy * mapa.skala;
  const etykieta = znajdzElement(mapa.svg, 'etykieta-miasta');

  const grupaMiast = znajdzElement(mapa.svg, 'miasta');
  const wielkie = znajdzElement(grupaMiast, 'miasta-wielkie');
  const miasto = wielkie.dzieci[0];

  // Hover nie jest obsługiwany (świadoma decyzja: nazwa tylko podczas przytrzymania).
  assert.ok(!miasto.sluchacze.pointerenter?.length && !miasto.sluchacze.pointerleave?.length, 'brak listenerów hover na kropce miasta');
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'bez przytrzymania etykieta nie wisi');

  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 1, target: { closest: () => null }, clientX: px, clientY: py });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'wciśnięcie pokazuje tabliczkę');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 1 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'puszczenie chowa tabliczkę');

  // Przeciągnięcie po wciśnięciu też chowa (drag/pinch to nie „klik”).
  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 2, target: { closest: () => null }, clientX: px, clientY: py });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'wciśnięcie nad miastem pokazuje tabliczkę');
  mapa.svg.sluchacze.pointermove[0]({ pointerId: 2, clientX: px + 20, clientY: py + 10 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'przeciągnięcie chowa tabliczkę');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 2 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'po przeciągnięciu i puszczeniu tabliczka nie wraca');

  delete globalThis.DOMPoint;
  delete mapa.svg.getScreenCTM;
});

test('mapa: przycisk przelaczWidocznoscWarstwy nie psuje warstw wodnych', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.ustawRzeki({ geometries: [POZIOM_WODY] });
  const rzeki = znajdzElement(mapa.svg, 'rzeki');
  mapa.przelaczWidocznoscWarstwy('rzeki', true); // domyślnie OFF
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 5);
  assert.equal(rzeki.getAttribute('display'), 'inherit');
  mapa.przelaczWidocznoscWarstwy('rzeki', false);
  assert.equal(rzeki.getAttribute('display'), 'none');
  mapa.przelaczWidocznoscWarstwy('rzeki', true);
  assert.equal(rzeki.getAttribute('display'), 'inherit');
});

test('assets: warstwy 2km5 dekodują się do ścieżek SVG, miasta mają dane', async () => {
  const [rzeki, jeziora, miasta] = await Promise.all([
    readFile(new URL('../assets/map/rivers-2km5.json', import.meta.url), 'utf8'),
    readFile(new URL('../assets/map/lakes-2km5.json', import.meta.url), 'utf8'),
    readFile(new URL('../assets/map/miasta.json', import.meta.url), 'utf8'),
  ]);
  const rz = JSON.parse(rzeki);
  const je = JSON.parse(jeziora);
  const mi = JSON.parse(miasta);
  assert.equal(rz.geometries[0].type, 'MultiPolygon');
  assert.equal(je.geometries[0].type, 'MultiPolygon');
  const dR = sciezkaGeoMultiPoligon(rz.geometries[0].coordinates);
  const dJ = sciezkaGeoMultiPoligon(je.geometries[0].coordinates);
  assert.ok(dR.length > 1000 && !dR.includes('NaN'), `rzeki d=${dR.length}`);
  assert.ok(dJ.length > 1000 && !dJ.includes('NaN'), `jeziora d=${dJ.length}`);
  assert.ok(mi.length > 1000, `miasta=${mi.length}`);
  for (const m of mi.slice(0, 5)) {
    assert.ok(m.n && Number.isFinite(m.lat) && Number.isFinite(m.lon), JSON.stringify(m));
  }
});

/* ---- M1–M3: POI, miejsca historyczne, hipsometria, podkłady online ----
 * Warstwy „lasy/urban/morza” usunięte decyzją właściciela 2026-08-30 (A). */

test('mapa: POI/historia — domyślnie OFF, włączalne, progi LOD, etykieta punktu (B)', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.ustawSzczyty({ features: [{ type: 'Feature', properties: { n: 'Rysy', e: 2499 }, geometry: { type: 'Point', coordinates: [20.1, 49.18] } }] });
  mapa.ustawHistorie({ features: [{ type: 'Feature', properties: { n: 'Rzym' }, geometry: { type: 'Point', coordinates: [12.5, 41.9] } }] });
  mapa.ustawHipsometrie('assets/map/hipsometria.jpg');

  const poi = znajdzElement(mapa.svg, 'poi');
  const historia = znajdzElement(mapa.svg, 'historia');
  const hipso = znajdzElement(mapa.svg, 'hipsometria');
  const etykietaPunktu = znajdzElement(mapa.svg, 'etykieta-punktu');
  assert.equal(poi.getAttribute('display'), 'none', 'POI domyślnie OFF');
  assert.equal(historia.getAttribute('display'), 'none', 'historia domyślnie OFF');
  assert.ok(etykietaPunktu, 'pływająca etykieta punktu w drzewie SVG');
  assert.ok(!etykietaPunktu.czyMaKlase('widoczna'), 'etykieta ukryta przed wciśnięciem');

  // punkt POI: kropka, pole trafienia, aria-label i bez <title> (B)
  const punkt = znajdzElement(poi, 'punkt');
  assert.ok(punkt, 'punkt POI narysowany z FeatureCollection');
  const kropka = punkt.dzieci.find((d) => d.czyMaKlase('kropka'));
  const trafienie = punkt.dzieci.find((d) => d.czyMaKlase('trafienie'));
  assert.ok(kropka, 'punkt POI ma kropkę');
  assert.ok(trafienie, 'punkt POI ma przezroczyste pole trafienia');
  assert.equal(trafienie.getAttribute('r'), '13', 'pole trafienia = PROMIEN_KLIK_PUNKTU');
  assert.equal(punkt.getAttribute('aria-label'), 'Rysy · 2499 m n.p.m.');
  assert.ok(!punkt.dzieci.some((d) => d.nazwa === 'title'), 'bez <title> — nazwa nie na najechanie');

  const obraz = znajdzElement(hipso, 'hipsometria-obraz');
  assert.ok(obraz, 'raster hipsometrii podpięty');
  assert.equal(obraz.getAttribute('href'), 'assets/map/hipsometria.jpg');

  // włączenie + progi LOD
  mapa.przelaczWidocznoscWarstwy('poi', true);
  mapa.przelaczWidocznoscWarstwy('historia', true);
  mapa.przelaczWidocznoscWarstwy('hipsometria', true);
  assert.equal(hipso.getAttribute('display'), 'inherit', 'hipsometria od razu');
  assert.equal(poi.getAttribute('display'), 'none', 'POI dopiero od k>=8');
  assert.equal(historia.getAttribute('display'), 'none', 'historia dopiero od k>=6');

  mapa.zoomDoPunktu({ x: 800, y: 320 }, 10);
  assert.equal(poi.getAttribute('display'), 'inherit', 'k>=8');
  assert.equal(historia.getAttribute('display'), 'inherit', 'k>=6');
});

test('mapa: POI i miejsca historyczne — nazwa on-press, znika on-release (B)', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.svg.getScreenCTM = () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) });
  globalThis.DOMPoint = class {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(m) { return { x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f }; }
  };

  mapa.ustawSzczyty({ features: [{ type: 'Feature', properties: { n: 'Rysy', e: 2499 }, geometry: { type: 'Point', coordinates: [20.1, 49.18] } }] });
  mapa.ustawHistorie({ features: [{ type: 'Feature', properties: { n: 'Rzym' }, geometry: { type: 'Point', coordinates: [12.5, 41.9] } }] });
  mapa.przelaczWidocznoscWarstwy('poi', true);
  mapa.przelaczWidocznoscWarstwy('historia', true);
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 10);
  const [wx, wy] = projektuj(49.18, 20.1);
  const px = mapa.widok.x + wx * mapa.skala;
  const py = mapa.widok.y + wy * mapa.skala;
  const etykieta = znajdzElement(mapa.svg, 'etykieta-punktu');
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'ukryta przed wciśnięciem');

  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 1, target: { closest: () => null }, clientX: px, clientY: py });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'wciśnięcie nad POI pokazuje tabliczkę');
  const tekst = etykieta.dzieci.find((d) => d.nazwa === 'text');
  assert.equal(tekst?.textContent, 'Rysy · 2499 m n.p.m.');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 1 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'puszczenie chowa tabliczkę');

  // miejsce historyczne — analogicznie
  const [hx, hy] = projektuj(41.9, 12.5);
  const hpx = mapa.widok.x + hx * mapa.skala;
  const hpy = mapa.widok.y + hy * mapa.skala;
  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 2, target: { closest: () => null }, clientX: hpx, clientY: hpy });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'punkt historyczny też pokazuje nazwę');
  assert.equal(etykieta.dzieci.find((d) => d.nazwa === 'text')?.textContent, 'Rzym');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 2 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'po puszczeniu znika');

  // przeciągnięcie chowa, wyłączenie warstwy chowa otwartą tabliczkę
  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 3, target: { closest: () => null }, clientX: px, clientY: py });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'ponowne wciśnięcie pokazuje');
  mapa.svg.sluchacze.pointermove[0]({ pointerId: 3, clientX: px + 20, clientY: py + 10 });
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'przeciągnięcie chowa tabliczkę');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 3 });

  // po przeciągnięciu świat się przesunął — licz współrzędne z aktualnego widoku
  const [wx2, wy2] = projektuj(49.18, 20.1);
  const px2 = mapa.widok.x + wx2 * mapa.skala;
  const py2 = mapa.widok.y + wy2 * mapa.skala;
  mapa.svg.sluchacze.pointerdown[0]({ pointerId: 4, target: { closest: () => null }, clientX: px2, clientY: py2 });
  assert.ok(etykieta.czyMaKlase('widoczna'), 'znowu widać po wciśnięciu');
  mapa.przelaczWidocznoscWarstwy('poi', false);
  assert.ok(!etykieta.czyMaKlase('widoczna'), 'wyłączona warstwa chowa otwartą tabliczkę');
  mapa.svg.sluchacze.pointerup[0]({ pointerId: 4 });

  delete globalThis.DOMPoint;
  delete mapa.svg.getScreenCTM;
});

test('mapa: podkłady online — wyłączone domyślnie; wybór klucza rysuje kafelki', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  assert.equal(mapa.PODKLADY_ONLINE.opentopo.etykieta, 'OpenTopoMap');
  assert.equal(mapa.PODKLADY_ONLINE['esri-satelita'].etykieta, 'Esri World Imagery');
  assert.ok(Object.keys(mapa.PODKLADY_ONLINE).length === 3, 'trzy darmowe podkłady bez klucza');
  assert.ok(!('esri-teren' in mapa.PODKLADY_ONLINE), 'Esri „świat fizyczny” usunięty (A2)');

  const podklad = znajdzElement(mapa.svg, 'podklad-online');
  assert.equal(podklad.getAttribute('display'), 'none', 'domyślnie OFF');

  mapa.przelaczWidocznoscWarstwy('podklad', 'opentopo');
  assert.equal(podklad.getAttribute('display'), 'inherit');
  assert.ok(mapa.svg.czyMaKlase('z-podklad-online'), 'kraje półprzezroczyste pod podkładem');
  const kafelek = znajdzElement(podklad, 'kafelek');
  assert.ok(kafelek, 'kafelki wstawione do grupy');
  assert.equal(kafelek.nazwa, 'image');
  assert.match(String(kafelek.getAttribute('href')), /tile\.opentopomap\.org/);
  assert.ok(Number(kafelek.getAttribute('width')) > 0, 'kafelek ma rozmiar');

  mapa.przelaczWidocznoscWarstwy('podklad', null);
  assert.equal(podklad.getAttribute('display'), 'none');
  assert.ok(!mapa.svg.czyMaKlase('z-podklad-online'), 'po wyłączeniu klasy znikają');
});

test('mapa: głębsze przybliżenie tylko z podkładem online (C)', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  // offline: 32× to twardy sufit
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 1e9);
  assert.equal(mapa.widok.k, 32, 'offline sufit K_MAX');

  // włączony podkład: scroll idzie znacznie głębiej
  mapa.przelaczWidocznoscWarstwy('podklad', 'opentopo');
  mapa.zoomDoPunktu({ x: 800, y: 320 }, 2048);
  assert.ok(mapa.widok.k > 32, `k=${mapa.widok.k} — przekroczono K_MAX`);
  assert.equal(mapa.widok.k, 67, 'sufit online = K_MAX_ONLINE (67× — A)');

  // kafelki wciąż rysowane dla tego powiększenia (z>0, bez NaN)
  const podklad = znajdzElement(mapa.svg, 'podklad-online');
  const kafelek = znajdzElement(podklad, 'kafelek');
  assert.ok(kafelek, 'kafelki przy głębokim zoomie');
  assert.ok(Number(kafelek.getAttribute('width')) > 0);

  // wyłączenie podkładu wraca do sufiksu offline
  mapa.przelaczWidocznoscWarstwy('podklad', null);
  assert.equal(mapa.widok.k, 32, 'po wyłączeniu podkładu sufit wraca do 32×');
});

test('mapa: wyłączenie podkładu oddala w miejscu, nie skacze na krawędź świata (B)', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  // wycentruj na Europie przy maksymalnym zoomie online
  mapa.przelaczWidocznoscWarstwy('podklad', 'opentopo');
  const [wx, wy] = projektuj(52.23, 21.01);
  mapa.ustawWidok(wx, wy, 67);
  const srodekPrzed = {
    wx: (1600 / 2 - mapa.widok.x) / mapa.skala,
    wy: (640 / 2 - mapa.widok.y) / mapa.skala,
  };
  assert.ok(Math.abs(srodekPrzed.wx - wx) < 1e-6 && Math.abs(srodekPrzed.wy - wy) < 1e-6, 'widok wycentrowany na punkcie');

  mapa.przelaczWidocznoscWarstwy('podklad', null);
  assert.equal(mapa.widok.k, 32, 'po wyłączeniu podkładu k wraca do 32×');
  const srodekPo = {
    wx: (1600 / 2 - mapa.widok.x) / mapa.skala,
    wy: (640 / 2 - mapa.widok.y) / mapa.skala,
  };
  assert.ok(
    Math.abs(srodekPo.wx - wx) < 1e-6 && Math.abs(srodekPo.wy - wy) < 1e-6,
    `środek po wyłączeniu (${srodekPo.wx.toFixed(3)}, ${srodekPo.wy.toFixed(3)}) ≠ przed (${wx.toFixed(3)}, ${wy.toFixed(3)})`
  );
});

test('mapa: ustawWidok przywraca środek świata i powiększenie (D)', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  const [wx, wy] = projektuj(50.06, 19.94);
  mapa.ustawWidok(wx, wy, 12);
  assert.equal(mapa.widok.k, 12);
  const srodek = {
    wx: (1600 / 2 - mapa.widok.x) / mapa.skala,
    wy: (640 / 2 - mapa.widok.y) / mapa.skala,
  };
  assert.ok(Math.abs(srodek.wx - wx) < 1e-6 && Math.abs(srodek.wy - wy) < 1e-6, 'środek na zadanym punkcie świata');
  // przywraca też callback zoomu z punktem środka (do zapisu localStorage)
  let widokZKallbacku = null;
  const { kontener: k2 } = zasciel();
  const m2 = stworzMape(k2, { przyZmianieWidoku: (k, info) => { widokZKallbacku = { k, ...info }; } });
  m2.ustawWidok(wx, wy, 9);
  assert.equal(widokZKallbacku.k, 9);
  assert.ok(widokZKallbacku.srodek, 'callback niesie środek świata');
  assert.ok(Math.abs(widokZKallbacku.srodek.wx - wx) < 1e-6 && Math.abs(widokZKallbacku.srodek.wy - wy) < 1e-6);
});

test('assets: nowe warstwy M1–M3 dekodują się do punktów (POI, historia)', async () => {
  const [szczyty, historia] = await Promise.all([
    readFile(new URL('../assets/map/szczyty.json', import.meta.url), 'utf8'),
    readFile(new URL('../assets/map/miejsca-historyczne.json', import.meta.url), 'utf8'),
  ]);
  for (const d of [JSON.parse(szczyty), JSON.parse(historia)]) {
    assert.equal(d.type, 'FeatureCollection');
    assert.equal(d.features[0].geometry.type, 'Point');
    const [lon, lat] = d.features[0].geometry.coordinates;
    assert.ok(Number.isFinite(lon) && Number.isFinite(lat));
    const [wx, wy] = projektuj(lat, lon);
    assert.ok(Number.isFinite(wx) && Number.isFinite(wy));
  }
  assert.ok(JSON.parse(szczyty).features.length >= 20, 'szczyty z NE');
  assert.ok(JSON.parse(historia).features.length >= 100, 'miejsca z Pleiades');
  // A: warstwy usunięte decyzją właściciela nie mają już plików
  for (const nazwa of ['las.json', 'urban.json', 'morza.json']) {
    await assert.rejects(readFile(new URL(`../assets/map/${nazwa}`, import.meta.url), 'utf8'), `brak ${nazwa}`);
  }
});
