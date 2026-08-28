/**
 * Warstwy szczegółowości mapy (ADR 0020): geometria GeoJSON wodna, miasta
 * jako punkty LOD i przełączniki widoczności. Bez przeglądarki — na atrapie DOM
 * (jak test/pinezka.test.js), bo geometria i stan warstw są czyste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sciezkaGeoMultiPoligon, SZEROKOSC, WYSOKOSC } from '../app/geo.js';
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
  globalThis.document = { createElementNS: (_ns, nazwa) => stworzElement(nazwa) };
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

test('mapa: rzeki i jeziora ukryte przy k=1, widoczne od PROGI_WARSTW.woda', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.ustawRzeki({ geometries: [POZIOM_WODY] });
  mapa.ustawJeziora({ geometries: [POZIOM_WODY] });
  const rzeki = znajdzElement(mapa.svg, 'rzeki');
  const jeziora = znajdzElement(mapa.svg, 'jeziora');
  assert.equal(rzeki.getAttribute('display'), 'none', 'przy całym świecie rzek nie widać');
  assert.equal(jeziora.getAttribute('display'), 'none');

  mapa.zoomDoPunktu({ x: 800, y: 320 }, 5);
  assert.ok(mapa.widok.k >= PROGI_WARSTW.woda, `k=${mapa.widok.k}`);
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

  // B (klik w miasto): grupa etykiety istnieje, jest ukryta, a kropka niesie nazwę.
  const etykietaMiasta = znajdzElement(mapa.svg, 'etykieta-miasta');
  assert.ok(etykietaMiasta, 'pływająca etykieta miasta w drzewie SVG');
  assert.ok(!etykietaMiasta.czyMaKlase('widoczna'), 'etykieta ukryta przed kliknięciem');
  const kropka = m.dzieci.find((d) => d.czyMaKlase('kropka'));
  const tytul = kropka?.dzieci.find((d) => d.nazwa === 'title');
  assert.ok(tytul, 'kropka ma <title> z nazwą');
  assert.equal(tytul.textContent, 'Wielkie · 2.0 mln');

  // wyłączenie warstwy chowa całość mimo wysokiego zoomu
  mapa.przelaczWidocznoscWarstwy('miasta', false);
  assert.equal(grupaMiast.getAttribute('display'), 'none');
  mapa.przelaczWidocznoscWarstwy('miasta', true);
  assert.equal(grupaMiast.getAttribute('display'), 'inherit');
});

test('mapa: przycisk przelaczWidocznoscWarstwy nie psuje warstw wodnych', () => {
  const { kontener } = zasciel();
  const mapa = stworzMape(kontener, {});
  mapa.ustawRzeki({ geometries: [POZIOM_WODY] });
  const rzeki = znajdzElement(mapa.svg, 'rzeki');
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
