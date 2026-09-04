/**
 * Kontrakt między arkuszem stylów a klasami renderu mapy (F1 z audytu PR #2).
 *
 * Testy mapy działają na atrapie DOM, która nie liczy kaskady CSS — dlatego
 * kolizja nazwy klasy (grupa świata `warstwa` vs nakładka UI `.warstwa` z
 * `display: none`) przeszła przez 108 testów zielonych i wyszła dopiero
 * u właściciela jako „mapa w ogóle się nie rysuje”. Ten plik spinia oba
 * światy: skan `app/map.js` po klasach, które lądują w SVG, i sprawdza, czy
 * żadna reguła arkusza nie gasi ich przez pomyłkę.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MAPA = new URL('../app/map.js', import.meta.url);
const STYLE = new URL('../app/styles.css', import.meta.url);

/** Klasy, które `app/map.js` nadaje elementom wewnątrz `<svg>` mapy. */
export function klasyRenderuMapy(zrodlo) {
  const klasy = new Set();
  // el('g', { class: 'kraje' }) oraz class: `luk${aktywny ? ' aktywny' : ''}`
  for (const m of zrodlo.matchAll(/class:\s*[`'"]([^`'"]*)[`'"]/g)) {
    for (const k of m[1].split(/\s+/)) if (k) klasy.add(k);
  }
  // classList.add/remove/toggle('wybrana', …)
  for (const m of zrodlo.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    for (const q of m[1].matchAll(/['"`]([^'"`$]+)['"`]/g)) {
      for (const k of q[1].split(/\s+/)) if (k) klasy.add(k);
    }
  }
  return klasy;
}

/**
 * Reguły arkusza jako { selektor, cialo }. Podział po `}` i `{` znosi też
 * reguły zagnieżdżone w `@media` — dla tego kontraktu liczy się selektor
 * właściwy, nie warstwa at-rule.
 */
export function regulyCss(css) {
  const czysty = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const wynik = [];
  for (const kawalek of czysty.split('}')) {
    const czesci = kawalek.split('{');
    if (czesci.length < 2) continue;
    const cialo = czesci.pop();
    const selektor = czesci.pop();
    wynik.push({ selektor: selektor.trim(), cialo });
  }
  return wynik;
}

const klasyWSelektorze = (selektor) => [...selektor.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
const gasi = (cialo) => /(?:^|;|\s)display\s*:\s*none/.test(cialo);
const przywraca = (cialo) => /(?:^|;|\s)display\s*:\s*(?!none)[\w-]+/.test(cialo);

/** Nazwy, w których zakotwiczone są reguły pisane specjalnie dla mapy
 * („etykiety” — warstwa badge'ów nad pinezkami, M6/A3). */
const KOTWICE_MAPY = ['mapa-svg', 'mapa', 'pinezka', 'kraj', 'luk', 'ocean', 'siatka', 'etykiety'];
const zakotwiczonaWMapie = (selektor) => {
  const klasy = klasyWSelektorze(selektor);
  return klasy.length > 1 && klasy.some((k) => KOTWICE_MAPY.includes(k));
};

test('żadna reguła ukrywająca element nie gasi zawartości mapy (F1: kolizja klas)', async () => {
  const [mapa, css] = await Promise.all([readFile(MAPA, 'utf8'), readFile(STYLE, 'utf8')]);
  const klasyMapy = klasyRenderuMapy(mapa);
  assert.ok(klasyMapy.size >= 10, `klasy renderu mapy: ${[...klasyMapy].join(', ')}`);

  const kolizje = [];
  for (const { selektor, cialo } of regulyCss(css)) {
    if (!gasi(cialo)) continue;
    for (const klasa of klasyWSelektorze(selektor)) {
      if (!klasyMapy.has(klasa)) continue;
      if (zakotwiczonaWMapie(selektor)) continue; // reguła pisana dla mapy (np. badge etykiety)
      kolizje.push(`reguła "${selektor}" gasi klasę mapy .${klasa}`);
    }
  }
  assert.deepEqual(
    kolizje,
    [],
    'klasa nadawana elementom SVG mapy nie może być selektorem reguły ukrywającej ' +
      'element strony (ukryta nakładka `.warstwa` wyłączyła cały świat — ADR 0010)'
  );
});

test('to, co mapa chowa, musi mieć drogę powrotu na ekran (etykieta pinezki)', async () => {
  const [mapa, css] = await Promise.all([readFile(MAPA, 'utf8'), readFile(STYLE, 'utf8')]);
  const klasyMapy = klasyRenderuMapy(mapa);
  const reguly = regulyCss(css);

  const ukryte = new Set();
  const przywrocone = new Set();
  for (const { selektor, cialo } of reguly) {
    for (const klasa of klasyWSelektorze(selektor)) {
      if (!klasyMapy.has(klasa)) continue;
      if (gasi(cialo)) ukryte.add(klasa);
      if (przywraca(cialo)) przywrocone.add(klasa);
    }
  }
  const slepe = [...ukryte].filter((k) => !przywrocone.has(k));
  assert.deepEqual(slepe, [], `klasy gaszone bez reguły przywracającej: ${slepe.join(', ')}`);
  assert.ok(ukryte.size > 0, 'kontrakt ma sens tylko wtedy, gdy coś jest chowane (etykieta pinezki)');
});

test('A2 (M6): przeciąganie mapy nie zaznacza tekstów — user-select: none na .mapa-svg', async () => {
  const [, css] = await Promise.all([readFile(MAPA, 'utf8'), readFile(STYLE, 'utf8')]);
  const reguly = regulyCss(css).filter(({ selektor }) => klasyWSelektorze(selektor).includes('mapa-svg'));
  const noszace = reguly.filter(({ cialo }) => /(?:^|;|\s)user-select\s*:\s*none/.test(cialo));
  assert.ok(noszace.length > 0, 'brak reguły user-select: none dla .mapa-svg — przeciąganie zaznacza napisy badge\'ów (A2)');
});

test('C4: nad miastem kursor to strzałka, nie łapka, a pole trafienia łapie wskaźnik', async () => {
  const [, css] = await Promise.all([readFile(MAPA, 'utf8'), readFile(STYLE, 'utf8')]);
  const reguly = regulyCss(css);
  const miasto = reguly.find(
    ({ selektor, cialo }) => /\.warstwy-szczegolow\s+\.miasta\s+\.miasto/.test(selektor) && /cursor\s*:\s*default/.test(cialo)
  );
  assert.ok(miasto, 'brak reguły cursor: default dla .warstwy-szczegolow .miasta .miasto');
  const trafienie = reguly.find(
    ({ selektor, cialo }) => /\.warstwy-szczegolow\s+\.miasta\s+\.trafienie/.test(selektor) && /pointer-events\s*:\s*all/.test(cialo)
  );
  assert.ok(trafienie, 'brak reguły pointer-events: all dla pola trafienia miasta');
});

test('B: POI i miejsca historyczne — kursor strzałka, pole trafienia jak miasta', async () => {
  const [, css] = await Promise.all([readFile(MAPA, 'utf8'), readFile(STYLE, 'utf8')]);
  const reguly = regulyCss(css);
  for (const warstwa of ['poi', 'historia']) {
    const punkt = reguly.find(
      ({ selektor, cialo }) =>
        selektor.includes('warstwy-szczegolow') &&
        selektor.includes(`.${warstwa} .punkt`) &&
        /cursor\s*:\s*default/.test(cialo)
    );
    assert.ok(punkt, `brak reguły cursor: default dla .warstwy-szczegolow .${warstwa} .punkt`);
    const trafienie = reguly.find(
      ({ selektor, cialo }) =>
        selektor.includes('warstwy-szczegolow') &&
        selektor.includes(`.${warstwa} .trafienie`) &&
        /pointer-events\s*:\s*all/.test(cialo)
    );
    assert.ok(trafienie, `brak reguły pointer-events: all dla pola trafienia .${warstwa}`);
  }
});

test('minimalna czcionka aplikacji: 12px — żadna mniejsza (recenzja właściciela)', async () => {
  const css = await readFile(STYLE, 'utf8');
  const male = css.match(/font-size:\s*(?:9|10|11|11\.5)px/g) || [];
  assert.deepEqual(male, [], `mniejsze niż 12px: ${male.join(', ')}`);
});

test('łuk rozmowy: animacja przebiegnięcia z normalizacją i uciszeniem przy reduced-motion', async () => {
  const [mapa, css] = await Promise.all([readFile(MAPA, 'utf8'), readFile(STYLE, 'utf8')]);
  assert.ok(mapa.includes("class: 'luk rozmowy'") && mapa.includes('pathLength: 1'), 'map.js normalizuje łuk rozmowy (pathLength=1)');
  const reguly = regulyCss(css);
  const rozmowy = reguly.filter(({ selektor }) => selektor.includes('.luk.rozmowy'));
  const animowana = rozmowy.find(({ cialo }) => /animation\s*:\s*przebieg-rozmowy/.test(cialo));
  assert.ok(animowana, '.luk.rozmowy ma animację przebieg-rozmowy');
  assert.ok(/stroke-dasharray\s*:\s*0?\.\d+\s+0?\.\d+/.test(animowana.cialo), 'kreskowanie w ułamkach długości (pathLength=1)');
  assert.ok(css.includes('@keyframes przebieg-rozmowy'), 'klatkowanie przebiegu zdefiniowane');
  const cicha = rozmowy.find(({ cialo }) => /animation\s*:\s*none/.test(cialo));
  assert.ok(cicha, 'reduced-motion ucisza animację rozmowy');
});

