/** C6: PRÓG — spotkanie bez walki, klucz zamiast broni. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profileKartoteki } from '../app/arena.js';
import {
  KLUCZE_PROGU,
  kluczeDlaBytu,
  oporProgu,
  pogodaProgu,
  szansaProgu,
  rozstrzygnijProbe,
  rozegrajProg,
  tablicaProgow,
} from '../app/prog.js';

const dane = async () => Promise.all([
  readFile('data/index.json', 'utf8').then(JSON.parse),
  readFile('data/kanon-tagow.json', 'utf8').then(JSON.parse),
  readFile('data/kronika/summary.json', 'utf8').then(JSON.parse),
]);

const profilBytu = (indeks, kanon, slug) => profileKartoteki(indeks.manifestacje, kanon).get(slug);

test('PRÓG: każdy klucz opisuje gest i celuje w motywy kanonu', async () => {
  const [, kanon] = await dane();
  const motywyKanonu = new Set(kanon.tagi.filter((t) => t.kategoria === 'motyw').map((t) => t.tag));
  assert.ok(KLUCZE_PROGU.length >= 5);
  for (const klucz of KLUCZE_PROGU) {
    assert.ok(klucz.gest.length >= 20, `${klucz.rodzaj}: gest musi być opisany zdaniem`);
    assert.ok(klucz.motywy.length > 0, `${klucz.rodzaj}: brak motywów`);
    for (const m of klucz.motywy) assert.ok(motywyKanonu.has(m), `${klucz.rodzaj}: motyw ${m} spoza kanonu`);
  }
});

test('PRÓG: klucz bierze się z motywów bytu, a nie z kolejności tagów', async () => {
  const [indeks, kanon] = await dane();
  const bazyliszek = kluczeDlaBytu(profilBytu(indeks, kanon, 'bazyliszek-warszawski'));
  assert.equal(bazyliszek[0].rodzaj, 'zwierciadlo');
  const psy = kluczeDlaBytu(profilBytu(indeks, kanon, 'syama-i-sarvara'));
  assert.ok(psy.some((k) => k.rodzaj === 'hymn'), 'psy Yamy powinny mieć hymn wśród kluczy');
  const sfinks = kluczeDlaBytu(profilBytu(indeks, kanon, 'sfinks-teby'));
  assert.equal(sfinks[0].rodzaj, 'odpowiedz');
});

test('PRÓG: byt bez pasującego motywu zawsze ma wyjście „zasłona”', () => {
  const profil = { staty: { slug: 'x', nazwa: 'X', motywy: [] }, percentyle: {}, archetyp: 'Samotnik' };
  const klucze = kluczeDlaBytu(profil);
  assert.equal(klucze.length, 1);
  assert.equal(klucze[0].rodzaj, 'zaslona');
  assert.equal(klucze[0].sila, 10);
});

test('PRÓG: opór rośnie z zakorzenieniem bytu w archiwum', async () => {
  const [indeks, kanon] = await dane();
  const stary = oporProgu(profilBytu(indeks, kanon, 'egungun'));
  const nowy = oporProgu(profilBytu(indeks, kanon, 'bazyliszek-warszawski'));
  assert.ok(stary > nowy, `oczekiwano większego oporu bytu z gęstą siecią (${stary} vs ${nowy})`);
  assert.ok(stary <= 60 && nowy >= 0);
});

test('PRÓG: szansa jest deterministyczna i mieści się w widełkach', async () => {
  const [indeks, kanon] = await dane();
  const profil = profilBytu(indeks, kanon, 'morowa-panna');
  const klucz = kluczeDlaBytu(profil)[0];
  const a = szansaProgu({ profil, klucz, staranie: 2 });
  const b = szansaProgu({ profil, klucz, staranie: 2 });
  assert.deepEqual(a, b);
  assert.ok(a.prawdopodobienstwo >= 0.05 && a.prawdopodobienstwo <= 0.95);
  assert.equal(szansaProgu({ profil, klucz, staranie: 9 }).wysilek, 18);
  assert.throws(() => szansaProgu({ profil: null, klucz }), /profil/);
  assert.throws(() => szansaProgu({ profil, klucz: {} }), /klucz/);
});

test('PRÓG: staranie pomaga, opór szkodzi — kierunki są zachowane', async () => {
  const [indeks, kanon] = await dane();
  const profil = profilBytu(indeks, kanon, 'lincoln-imp');
  const klucz = kluczeDlaBytu(profil)[0];
  const bez = szansaProgu({ profil, klucz, staranie: 0 }).prawdopodobienstwo;
  const zeStaraniem = szansaProgu({ profil, klucz, staranie: 3 }).prawdopodobienstwo;
  assert.ok(zeStaraniem > bez);
});

test('PRÓG: Kronika działa na próg odwrotnie niż na drogę SPLOTU', async () => {
  const [indeks, kanon, kronika] = await dane();
  const slug = 'sfinks-teby';
  const pogoda = pogodaProgu(kronika, slug);
  assert.equal(pogoda.skladniki.length, 2);
  assert.ok(pogoda.premia >= -12 && pogoda.premia <= 12);
  const szeroki = pogodaProgu({ stanPo: { os: { mit: 50, racjonalizacja: 50 }, zasieg: [{ slug, wielkosc: 0.8 }] } }, slug);
  const waski = pogodaProgu({ stanPo: { os: { mit: 50, racjonalizacja: 50 }, zasieg: [{ slug, wielkosc: 0.1 }] } }, slug);
  assert.ok(waski.premia > szeroki.premia, 'byt rozlany po świecie trudniej zamknąć w jednych drzwiach');
  assert.equal(pogodaProgu(null, slug).premia, 0);
  assert.equal(profilBytu(indeks, kanon, slug).staty.slug, slug);
});

test('PRÓG: los rozstrzyga trzy wyniki na granicach wyliczonej szansy', () => {
  assert.equal(rozstrzygnijProbe(0.6, () => 0.47).status, 'przejscie');
  assert.equal(rozstrzygnijProbe(0.6, () => 0.48).status, 'cena');
  assert.equal(rozstrzygnijProbe(0.6, () => 0.59).status, 'cena');
  assert.equal(rozstrzygnijProbe(0.6, () => 0.6).status, 'odmowa');
  assert.equal(rozstrzygnijProbe(0.05, () => 0.0).status, 'cena');
  assert.throws(() => rozstrzygnijProbe(0.5), /RNG/);
  assert.throws(() => rozstrzygnijProbe(1.4, () => 0.1), /\[0, 1\]/);
  assert.throws(() => rozstrzygnijProbe(0.5, () => 1.2), /RNG/);
});

test('PRÓG: rozegranie zwraca prozę zgodną ze statusem i nie rusza Kroniki', async () => {
  const [indeks, kanon, kronika] = await dane();
  const profil = profilBytu(indeks, kanon, 'bazyliszek-warszawski');
  const klucz = kluczeDlaBytu(profil)[0];
  const przed = JSON.stringify(kronika);
  const wynik = rozegrajProg({ profil, klucz, staranie: 2, kronika, los: () => 0 });
  assert.equal(wynik.status, 'przejscie');
  assert.equal(wynik.slug, 'bazyliszek-warszawski');
  assert.equal(wynik.klucz.rodzaj, 'zwierciadlo');
  assert.match(wynik.proza, /próg puszcza/);
  const odmowa = rozegrajProg({ profil, klucz, staranie: 2, kronika, los: () => 0.999 });
  assert.equal(odmowa.status, 'odmowa');
  assert.match(odmowa.proza, /nie przyjmuje/);
  assert.equal(JSON.stringify(kronika), przed, 'PRÓG nie może modyfikować stanu Kroniki');
});

test('PRÓG: tablica progów obejmuje całą kartotekę i jest posortowana malejąco', async () => {
  const [indeks, kanon, kronika] = await dane();
  const wiersze = tablicaProgow(indeks.manifestacje, { kanon, kronika, staranie: 1 });
  assert.equal(wiersze.length, indeks.manifestacje.length);
  for (let i = 1; i < wiersze.length; i++) {
    assert.ok(wiersze[i - 1].prawdopodobienstwo >= wiersze[i].prawdopodobienstwo);
  }
  for (const w of wiersze) {
    assert.ok(w.klucz?.rodzaj, `${w.slug}: brak klucza`);
    assert.ok(w.prawdopodobienstwo >= 0.05 && w.prawdopodobienstwo <= 0.95);
  }
  assert.deepEqual(
    tablicaProgow(indeks.manifestacje, { kanon, kronika, staranie: 1 }).map((w) => w.slug),
    wiersze.map((w) => w.slug)
  );
});
