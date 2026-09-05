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
  wsparcieSwiadka,
  najlepszySwiadek,
  MAX_SWIADEK,
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

test('PRÓG: klucz „czuwanie” obsługuje motyw ostrzeżenia i nie wypiera mocniejszych gestów', async () => {
  const [indeks, kanon] = await dane();
  const czuwanie = KLUCZE_PROGU.find((k) => k.rodzaj === 'czuwanie');
  assert.ok(czuwanie, 'klucz czuwania istnieje');
  assert.deepEqual(czuwanie.motywy, ['ostrzezenie']);
  const sily = KLUCZE_PROGU.map((k) => k.sila);
  assert.deepEqual([...sily].sort((a, b) => b - a), sily, 'klucze idą od najmocniejszego');
  const yara = profilBytu(indeks, kanon, 'yara-ma-yha-who');
  const klucze = kluczeDlaBytu(yara).map((k) => k.rodzaj);
  assert.ok(klucze.includes('czuwanie'), `czuwanie pasuje do bytu z ostrzeżeniem: ${klucze.join(', ')}`);
  assert.equal(klucze[0], 'czuwanie', 'przy przemianie i ostrzeżeniu mocniejsze jest czuwanie');
});

test('PRÓG: świadek pomaga, gdy zna słabość progu, i szkodzi, gdy jest z tej samej tradycji', () => {
  const p = (slug, motywy) => ({ staty: { slug, nazwa: slug, motywy } });
  const prog = p('prog', ['zle-oko']);

  const zna = wsparcieSwiadka(prog, p('swiadek-warunek', ['warunek']));
  assert.equal(zna.premia, 6, 'warunek tnie złe oko');
  assert.deepEqual(zna.powody.map((x) => x.nazwa), ['zna słabość progu']);

  const swojak = wsparcieSwiadka(prog, p('swiadek-swojak', ['zle-oko']));
  assert.equal(swojak.premia, -5, 'ktoś z tej samej tradycji trzyma drzwi razem z progiem');

  const czuwajacy = wsparcieSwiadka(prog, p('swiadek-czuwa', ['ostrzezenie']));
  assert.equal(czuwajacy.premia, 3, 'przestroga pilnuje, żeby nikt nie został sam');

  const mieszany = wsparcieSwiadka(prog, p('swiadek-mieszany', ['warunek', 'ostrzezenie', 'zle-oko']));
  assert.equal(mieszany.premia, 4, '6 + 3 − 5 = 4');
  assert.equal(mieszany.powody.length, 3);

  assert.equal(wsparcieSwiadka(prog, prog).premia, 0, 'byt nie jest świadkiem samego siebie');
  assert.equal(wsparcieSwiadka(prog, null).premia, 0);
  assert.equal(wsparcieSwiadka(null, p('x', ['warunek'])).premia, 0);

  const skrajny = wsparcieSwiadka(p('prog2', ['zle-oko', 'jad', 'furia', 'klatwa', 'obrona']), p('s', ['warunek', 'uzdrowienie', 'oplaty', 'ostrzezenie']));
  assert.ok(Math.abs(skrajny.premia) <= MAX_SWIADEK, 'wpływ świadka jest przycięty');
});

test('PRÓG: świadek przesuwa szansę i zostaje opisany w prozie próby', async () => {
  const [indeks, kanon, kronika] = await dane();
  const profile = profileKartoteki(indeks.manifestacje, kanon);
  const profil = profile.get('balor');
  const klucz = kluczeDlaBytu(profil)[0];
  const kandydat = najlepszySwiadek(profil, profile);
  assert.ok(kandydat && kandydat.premia > 0, 'dla Balora ktoś w kartotece jest pomocny');

  const bez = szansaProgu({ profil, klucz, staranie: 1 });
  const ze = szansaProgu({ profil, klucz, staranie: 1, swiadek: kandydat.premia });
  assert.ok(ze.prawdopodobienstwo > bez.prawdopodobienstwo, 'towarzystwo podnosi szansę');
  assert.equal(ze.swiadek, kandydat.premia);
  assert.equal(szansaProgu({ profil, klucz, swiadek: 999 }).swiadek, MAX_SWIADEK);

  const ostatnia = kronika.epoki.at(-1);
  const wynik = rozegrajProg({ profil, klucz, staranie: 1, kronika: ostatnia, swiadek: profile.get(kandydat.slug), los: () => 0.01 });
  assert.equal(wynik.status, 'przejscie');
  assert.equal(wynik.swiadek.slug, kandydat.slug);
  assert.ok(wynik.proza.includes(kandydat.nazwa), 'proza mówi, kto stał obok');

  const samotny = rozegrajProg({ profil, klucz, staranie: 1, kronika: ostatnia, los: () => 0.99 });
  assert.equal(samotny.swiadek.premia, 0);
  assert.ok(samotny.proza.includes('Nikt nie stał obok'), 'brak świadka też jest zapisany');
});

test('PRÓG: tablica podaje najlepszego świadka albo mówi wprost, że go nie ma', async () => {
  const [indeks, kanon] = await dane();
  const wiersze = tablicaProgow(indeks.manifestacje, { kanon });
  assert.ok(wiersze.length >= 30);
  for (const w of wiersze) {
    if (w.swiadek === null) continue;
    assert.ok(w.swiadek.premia > 0, `${w.slug}: podpowiadamy tylko świadków, którzy pomagają`);
    assert.notEqual(w.swiadek.slug, w.slug);
    assert.ok(w.swiadek.powody.length > 0, `${w.slug}: powód towarzystwa musi być nazwany`);
  }
  assert.ok(wiersze.some((w) => w.swiadek), 'przynajmniej jeden próg ma sensownego świadka');
});
