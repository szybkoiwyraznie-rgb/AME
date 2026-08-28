/**
 * Testy ZRĘBÓW „Areny Rezonansu" (idle battler) — czyste funkcje app/arena.js.
 * Projekt: docs/plans/POMYSL_arena-rezonansu-idle-battler.md. Fundament do
 * akceptacji właściciela (ADR 0007); tu tylko rdzeń, bez UI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  statyManifestacji,
  motywyZTagow,
  mnoznikKontry,
  obrazeniaRundy,
  kolejnosc,
  WAGA_MOTYWU,
  percentyl,
  profileKartoteki,
  archetypBytu,
} from '../app/arena.js';

const rekord = (o = {}) => ({
  slug: 'byt',
  nazwa: 'Byt',
  nazwy_alternatywne: [],
  tagi: [],
  powiazania: [],
  backlinki: [],
  skity: [],
  ...o,
});

test('statyManifestacji: bez rekordu rzuca', () => {
  assert.throws(() => statyManifestacji(null), TypeError);
  assert.throws(() => statyManifestacji({}), TypeError);
});

test('statyManifestacji: staty wyprowadzone z rekordu (deterministyczne)', () => {
  const s = statyManifestacji(
    rekord({ nazwy_alternatywne: ['a', 'b'], powiazania: ['x'], backlinki: ['y', 'z'], skity: ['s1'], tagi: ['irlandia', 'olbrzym'] })
  );
  assert.equal(s.zywotnosc, 40 + 2 * 6 + 1 * 4, 'HP = baza + backlinki×6 + skity×4 (bez motywu)');
  assert.equal(s.moc, 8 + 2 * 3, 'MOC = baza + epitety×3 (bez motywu)');
  assert.equal(s.spryt, 6 + 1 * 4, 'SPRYT = baza + powiazania×4');
  assert.equal(s.rezonans, 10 + 1 * 3 + 2 * 2, 'REZONANS = baza + skity×3 + tagi×2');
  // powtórzenie daje identyczny wynik
  const s2 = statyManifestacji(
    rekord({ nazwy_alternatywne: ['a', 'b'], powiazania: ['x'], backlinki: ['y', 'z'], skity: ['s1'], tagi: ['irlandia', 'olbrzym'] })
  );
  assert.deepEqual(s, s2);
});

test('statyManifestacji: motyw ofensywny podbija MOC, defensywny ŻYWOTNOŚĆ', () => {
  const zleOko = statyManifestacji(rekord({ tagi: ['zle-oko'] }));
  const oplata = statyManifestacji(rekord({ tagi: ['oplaty'] }));
  assert.equal(zleOko.moc, 8 + WAGA_MOTYWU['zle-oko'].atak, 'złe oko dokłada do MOCY');
  assert.equal(oplata.zywotnosc, 40 + WAGA_MOTYWU.oplaty.obrona * 3, 'opłata dokłada do ŻYWOTNOŚCI');
});

test('statyManifestacji: REZONANS ma sufit 90', () => {
  const s = statyManifestacji(rekord({ skity: Array(30).fill('s'), tagi: Array(30).fill('t') }));
  assert.equal(s.rezonans, 90);
});

test('motywyZTagow: kanon zawęża do kategorii motyw; bez kanonu — znane wagi', () => {
  const kanon = { tagi: [
    { tag: 'zle-oko', kategoria: 'motyw' },
    { tag: 'irlandia', kategoria: 'kultura' },
    { tag: 'olbrzym', kategoria: 'typ' },
  ] };
  assert.deepEqual(motywyZTagow(['zle-oko', 'irlandia', 'olbrzym'], kanon), ['zle-oko']);
  assert.deepEqual(motywyZTagow(['zle-oko', 'irlandia'], null), ['zle-oko'], 'bez kanonu bierze znane z WAGA_MOTYWU');
});

test('mnoznikKontry: warunek tłumi złe oko; brak kontry = 1', () => {
  const balor = { motywy: ['zle-oko'] };
  const znajacyWarunek = { motywy: ['warunek'] };
  assert.ok(mnoznikKontry(balor, znajacyWarunek) < 1, 'obrońca z warunkiem tnie atak złego oka');
  assert.equal(mnoznikKontry(balor, { motywy: ['pamiec'] }), 1, 'brak kontry = pełny atak');
  assert.ok(mnoznikKontry(balor, znajacyWarunek) >= 0.3, 'mnożnik nie schodzi poniżej 0.3');
});

test('obrazeniaRundy: min. 1, rozbłysk tylko przy RNG < rezonans/100', () => {
  const a = { moc: 20, rezonans: 100, motywy: [] };
  const b = { zywotnosc: 60, motywy: [] };
  const bezLosu = obrazeniaRundy(a, b);
  assert.ok(bezLosu >= 1);
  const zRozblyskiem = obrazeniaRundy(a, b, () => 0); // los=0 < 1 → rozbłysk
  assert.ok(zRozblyskiem > bezLosu, 'rozbłysk wzmacnia cios');
  const slaby = { moc: 1, rezonans: 0, motywy: [] };
  const gruby = { zywotnosc: 240, motywy: [] };
  assert.equal(obrazeniaRundy(slaby, gruby), 1, 'obrażenia nie schodzą poniżej 1');
});

test('kolejnosc: wyższy SPRYT pierwszy; remis po slugu', () => {
  const a = { slug: 'a', spryt: 10 };
  const b = { slug: 'b', spryt: 5 };
  assert.deepEqual(kolejnosc(a, b).map((x) => x.slug), ['a', 'b']);
  assert.deepEqual(kolejnosc(b, a).map((x) => x.slug), ['a', 'b']);
  const c = { slug: 'c', spryt: 7 };
  const d = { slug: 'd', spryt: 7 };
  assert.deepEqual(kolejnosc(d, c).map((x) => x.slug), ['c', 'd'], 'remis → slug alfabetycznie');
});

test('każdy motyw z kanonu ma wagę bojową (bez cichych zer)', async () => {
  const kanon = JSON.parse(await readFile('data/kanon-tagow.json', 'utf8'));
  const motywy = kanon.tagi.filter((t) => t.kategoria === 'motyw').map((t) => t.tag);
  for (const m of motywy) {
    assert.ok(m in WAGA_MOTYWU, `motyw „${m}" z kanonu musi mieć wagę w WAGA_MOTYWU`);
  }
});

/* ---- Normalizacja i archetypy (fundament kierunków A/B, M9 C2) ---- */

test('percentyl: skrajne, środek, pusta i jednoelementowa kartoteka', () => {
  const w = [10, 20, 30, 40];
  assert.equal(percentyl(10, w), 13, 'najniższy: (0 + 0.5)/4 = 12.5 → 13');
  assert.equal(percentyl(40, w), 88, 'najwyższy: (3 + 0.5)/4 = 87.5 → 88');
  assert.equal(percentyl(5, []), 0, 'pusta pula → 0');
  assert.equal(percentyl(99, [99]), 50, 'jednoelementowa → środek 50');
});

test('percentyl: identyczne wartości dają wszystkim 50', () => {
  const w = [7, 7, 7, 7];
  assert.equal(percentyl(7, w), 50);
});

test('profileKartoteki: percentyle względne, deterministyczne, z archetypem', () => {
  const rekordy = [
    rekord({ slug: 'a', backlinki: ['x', 'y', 'z', 'w'], skity: ['s1', 's2'] }), // wysoka ŻYWOTNOŚĆ
    rekord({ slug: 'b', powiazania: ['p1', 'p2', 'p3', 'p4'] }), // wysoki SPRYT
    rekord({ slug: 'c' }), // baza — nic nie wystaje
  ];
  const prof = profileKartoteki(rekordy);
  assert.equal(prof.size, 3);
  // a ma najwyższą ŻYWOTNOŚĆ w kartotece → percentyl 100-ish i archetyp Filar
  assert.ok(prof.get('a').percentyle.zywotnosc >= prof.get('c').percentyle.zywotnosc);
  assert.equal(prof.get('a').archetyp, 'Filar');
  assert.equal(prof.get('b').archetyp, 'Splotca', 'najwięcej własnych powiązań → Splotca');
  assert.equal(prof.get('c').archetyp, 'Samotnik', 'nic nie wystaje ponad środek → Samotnik');
  // determinizm: drugie wywołanie identyczne
  const prof2 = profileKartoteki(rekordy);
  for (const slug of ['a', 'b', 'c']) {
    assert.deepEqual(prof.get(slug).percentyle, prof2.get(slug).percentyle);
    assert.equal(prof.get(slug).archetyp, prof2.get(slug).archetyp);
  }
});

test('archetypBytu: kształt profilu → etykieta; wyrównany niski = Samotnik', () => {
  assert.equal(archetypBytu({ zywotnosc: 90, moc: 20, spryt: 10, rezonans: 30 }), 'Filar');
  assert.equal(archetypBytu({ zywotnosc: 20, moc: 88, spryt: 10, rezonans: 30 }), 'Drapieżnik');
  assert.equal(archetypBytu({ zywotnosc: 20, moc: 20, spryt: 80, rezonans: 30 }), 'Splotca');
  assert.equal(archetypBytu({ zywotnosc: 20, moc: 20, spryt: 10, rezonans: 75 }), 'Pieśniarz');
  assert.equal(archetypBytu({ zywotnosc: 40, moc: 50, spryt: 30, rezonans: 20 }), 'Samotnik', 'nic > 50');
});

test('archetypy na prawdziwej kartotece: każdy byt dostaje znaną etykietę', async () => {
  const indeks = JSON.parse(await readFile('data/index.json', 'utf8'));
  const kanon = JSON.parse(await readFile('data/kanon-tagow.json', 'utf8'));
  const prof = profileKartoteki(indeks.manifestacje, kanon);
  const znane = new Set(['Filar', 'Drapieżnik', 'Splotca', 'Pieśniarz', 'Samotnik']);
  assert.equal(prof.size, indeks.manifestacje.length);
  for (const [slug, p] of prof) {
    assert.ok(znane.has(p.archetyp), `${slug}: archetyp „${p.archetyp}" spoza listy`);
    for (const o of ['zywotnosc', 'moc', 'spryt', 'rezonans']) {
      assert.ok(p.percentyle[o] >= 0 && p.percentyle[o] <= 100, `${slug}.${o} percentyl w [0,100]`);
    }
  }
});

test('staty na prawdziwym indeksie: każdy byt ma dodatnie, całkowite staty', async () => {
  const indeks = JSON.parse(await readFile('data/index.json', 'utf8'));
  const kanon = JSON.parse(await readFile('data/kanon-tagow.json', 'utf8'));
  for (const m of indeks.manifestacje) {
    const s = statyManifestacji(m, kanon);
    for (const k of ['zywotnosc', 'moc', 'spryt', 'rezonans']) {
      assert.ok(Number.isInteger(s[k]) && s[k] > 0, `${m.slug}.${k} = ${s[k]} (dodatnie, całkowite)`);
    }
  }
});
