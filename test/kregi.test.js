/**
 * Testy warstwy kręgów kulturowych (app/kregi.js) — czysta geometria otoczek
 * i kontrakt danych `data/kregi-kulturowe.json` z kanonem tagów.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { centroid, otoczkaWypukla, sciezkaKregu, grupujWKregi, kulturyBezKregu, podpisKregu, MARGINES_KREGU } from '../app/kregi.js';

const wczytaj = async (p) => JSON.parse(await readFile(p, 'utf8'));

test('otoczka wypukła pomija punkty wewnętrzne', () => {
  const punkty = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 5, y: 5 },
  ];
  const hull = otoczkaWypukla(punkty);
  assert.equal(hull.length, 4, 'środkowy punkt nie należy do otoczki');
  assert.ok(!hull.some((p) => p.x === 5 && p.y === 5));
});

test('otoczka jest deterministyczna i odporna na kolejność wejścia', () => {
  const a = [{ x: 2, y: 1 }, { x: 8, y: 3 }, { x: 4, y: 9 }];
  const b = [...a].reverse();
  assert.deepEqual(otoczkaWypukla(a), otoczkaWypukla(b));
});

test('ścieżka kręgu: jeden byt daje koło o promieniu marginesu', () => {
  const d = sciezkaKregu([{ x: 100, y: 100 }], 40);
  assert.match(d, /^M60 100a40 40 0 1 0 80 0a40 40 0 1 0 -80 0Z$/);
});

test('ścieżka kręgu obejmuje wszystkie punkty z zapasem', () => {
  const punkty = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 80 },
  ];
  const d = sciezkaKregu(punkty, 30);
  assert.match(d, /^M[-\d.]+ [-\d.]+(Q[-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+)+Z$/, 'kontur z krzywych kwadratowych');
  const liczby = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = liczby.filter((_, i) => i % 2 === 0);
  const ys = liczby.filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) < 0 && Math.max(...xs) > 100, 'kontur wychodzi poza skrajne punkty w poziomie');
  assert.ok(Math.max(...ys) > 80, 'kontur wychodzi poza skrajny punkt w pionie');
});

test('dwa byty dostają owal, nie odcinek', () => {
  const d = sciezkaKregu([{ x: 0, y: 0 }, { x: 60, y: 0 }], 20);
  assert.equal((d.match(/Q/g) ?? []).length, 2, 'dwie krzywe zamykają owal');
  assert.match(d, /Z$/);
});

test('grupowanie w kręgi: tylko kręgi z bytami, punkty posortowane', () => {
  const definicje = {
    kregi: [
      { id: 'a', nazwa: 'Krąg A', kultury: ['grecja', 'egipt'] },
      { id: 'b', nazwa: 'Krąg B', kultury: ['mongolia'] },
      { id: 'c', nazwa: 'Krąg pusty', kultury: ['nieistniejaca'] },
    ],
  };
  const rekordy = [
    { slug: 'sfinks', tagi: ['egipt'], x: 10, y: 10 },
    { slug: 'empusa', tagi: ['grecja'], x: 20, y: 15 },
    { slug: 'robak', tagi: ['mongolia'], x: 300, y: 100 },
    { slug: 'bezmiejsca', tagi: ['grecja'], x: NaN, y: 5 },
  ];
  const kregi = grupujWKregi(rekordy, definicje);
  assert.deepEqual(kregi.map((k) => k.id), ['a', 'b'], 'krąg bez bytów nie trafia na mapę');
  assert.deepEqual(kregi[0].punkty.map((p) => p.slug), ['empusa', 'sfinks'], 'kolejność alfabetyczna = deterministyczny render');
  assert.equal(kregi[0].punkty.length, 2, 'byt bez współrzędnych nie wchodzi do otoczki');
  assert.deepEqual(kregi[1].srodek, { x: 300, y: 100 });
});

test('podpis kręgu odmienia liczebnik i nie mówi żargonem gry', () => {
  assert.equal(podpisKregu({ nazwa: 'Ameryki', punkty: [1] }), 'Ameryki · 1 byt');
  assert.equal(podpisKregu({ nazwa: 'Ameryki', punkty: [1, 2] }), 'Ameryki · 2 byty');
  assert.equal(podpisKregu({ nazwa: 'Ameryki', punkty: [1, 2, 3, 4, 5] }), 'Ameryki · 5 bytów');
});

test('data/kregi-kulturowe.json obejmuje każdą kulturę kanonu dokładnie raz', async () => {
  const [definicje, kanon] = await Promise.all([wczytaj('data/kregi-kulturowe.json'), wczytaj('data/kanon-tagow.json')]);
  const wszystkie = definicje.kregi.flatMap((k) => k.kultury);
  assert.equal(new Set(wszystkie).size, wszystkie.length, 'kultura nie może należeć do dwóch kręgów');
  assert.deepEqual(kulturyBezKregu(kanon, definicje), [], 'każda kultura kanonu ma swój krąg');
  const kultury = new Set(kanon.tagi.filter((t) => t.kategoria === 'kultura').map((t) => t.tag));
  for (const tag of wszystkie) assert.ok(kultury.has(tag), `krąg wskazuje kulturę spoza kanonu: ${tag}`);
  for (const krag of definicje.kregi) {
    assert.match(krag.id, /^[a-z0-9-]+$/);
    assert.ok(krag.nazwa.length > 2 && krag.opis.length > 40, `${krag.id}: nazwa i opis dla czytelnika`);
  }
});

test('kartoteka rozkłada się na kręgi bez sieroty', async () => {
  const [definicje, indeks] = await Promise.all([wczytaj('data/kregi-kulturowe.json'), wczytaj('data/index.json')]);
  const rekordy = indeks.manifestacje.map((m, i) => ({ slug: m.slug, tagi: m.tagi, x: i * 10, y: i * 3 }));
  const kregi = grupujWKregi(rekordy, definicje);
  const objete = new Set(kregi.flatMap((k) => k.punkty.map((p) => p.slug)));
  assert.equal(objete.size, rekordy.length, 'każdy byt kartoteki należy do jakiegoś kręgu');
  assert.ok(kregi.length >= 6, 'kartoteka pokrywa co najmniej sześć kręgów');
});

test('mapa i aplikacja wpinają warstwę kręgów (kontrakt CSS i przełącznika)', async () => {
  const [map, app, html, css] = await Promise.all([
    readFile('app/map.js', 'utf8'),
    readFile('app/app.js', 'utf8'),
    readFile('index.html', 'utf8'),
    readFile('app/styles.css', 'utf8'),
  ]);
  assert.match(map, /class: 'kregi'/);
  assert.match(map, /ustawKregi/);
  assert.match(map, /WIDOCZNE_WARSTWY\.kregi/);
  assert.match(app, /kregi: \{ plik: 'data\/kregi-kulturowe\.json'/);
  assert.match(html, /id="warstwa-kregi"/);
  assert.match(css, /\.krag-halo/);
  assert.match(css, /\.krag-podpis/);
});

test('rdzeń kręgów nie sięga po DOM, sieć ani API Node (ADR 0003, L22)', async () => {
  const kod = await readFile('app/kregi.js', 'utf8');
  assert.ok(!/document\.|window\.|fetch\(|require\(|node:/.test(kod));
  assert.equal(typeof MARGINES_KREGU, 'number');
  assert.deepEqual(centroid([{ x: 0, y: 0 }, { x: 4, y: 2 }]), { x: 2, y: 1 });
});
