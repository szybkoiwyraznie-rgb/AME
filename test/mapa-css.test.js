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

/** Nazwy, w których zakotwiczone są reguły pisane specjalnie dla mapy. */
const KOTWICE_MAPY = ['mapa-svg', 'mapa', 'pinezka', 'kraj', 'luk', 'ocean', 'siatka'];
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
