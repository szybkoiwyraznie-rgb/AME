/**
 * Lint spójności faktograficznej SKIT-ów (tools/lint-faktow.mjs, C2+5 obrotu 6):
 * heurystyka szuka nazw własnych z dialogu, których nie ma w kartach jego
 * uczestników. Testy pilnują zarówno mechaniki, jak i czystości korpusu.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizuj,
  rdzen,
  nazwyWlasne,
  tekstRekordu,
  wystepuje,
  sprawdzSkit,
  czyWyjatek,
  lintFaktow,
  MIN_RDZEN,
} from '../tools/lint-faktow.mjs';

test('normalizuj i rdzeń: diakrytyki znikają, końcówka fleksyjna nie przeszkadza', () => {
  assert.equal(normalizuj('Kolchidy'), 'kolchidy');
  assert.equal(normalizuj('Świętość'), 'swietosc');
  assert.equal(normalizuj('Łysa Góra'), 'lysa gora');
  assert.ok('panna'.startsWith(rdzen('Panno')), 'wołacz pasuje do mianownika');
  assert.ok('vritry'.startsWith(rdzen('Vritrę')), 'biernik pasuje do dopełniacza');
  assert.ok(rdzen('Chironem').length >= 4);
});

test('nazwyWlasne: pomija początki zdań, didaskalia i etykiety mówiących', () => {
  const tekst = '**Indra:** [Kręci głową.] U mnie piszą krótko: Król Dewów. Vritrahan to tytuł za Vritrę.\n\n**Agni:** Kolchida leży daleko.';
  const nazwy = nazwyWlasne(tekst);
  assert.ok(nazwy.includes('Vritrę'), 'nazwa w środku zdania trafia na listę');
  assert.ok(!nazwy.includes('Indra'), 'etykieta mówiącego nie jest faktem');
  assert.ok(!nazwy.includes('Kręci'), 'didaskalia pomijane');
  assert.ok(!nazwy.includes('Kolchida'), 'pierwszy wyraz zdania pomijany (za dużo szumu)');
  assert.deepEqual(nazwyWlasne(''), []);
  assert.deepEqual(nazwyWlasne(null), []);
});

test('nazwyWlasne: ciąg wielkich liter to jedna nazwa', () => {
  const nazwy = nazwyWlasne('Wracam na Sule Skerry przed świtem.');
  assert.ok(nazwy.includes('Sule Skerry'), `oczekiwano „Sule Skerry”, jest: ${nazwy.join(' | ')}`);
});

test('sprawdzSkit: rozróżnia „obcy fakt” od „spoza bazy”', () => {
  const wpisy = [
    { slug: 'a', nazwa: 'Alfa', natura: { zdolnosci: 'Mieszka pod Górą Widmową.' } },
    { slug: 'b', nazwa: 'Beta', natura: { zdolnosci: 'Zna drogę przez Wąwóz Kruczy.' } },
  ];
  const skit = {
    slug: 's',
    uczestnicy: [{ imie: 'Alfa', slug: 'a' }],
    tekst: '**Alfa:** Wracam pod Górę Widmową, potem przez Wąwóz Kruczy, a na końcu do Miasta Solnego.',
  };
  const wynik = sprawdzSkit(skit, wpisy);
  const nazwy = Object.fromEntries(wynik.map((w) => [w.nazwa, w]));
  assert.ok(!nazwy['Górę Widmową'], 'fakt z karty uczestnika nie jest zgłaszany');
  assert.equal(nazwy['Wąwóz Kruczy']?.poziom, 'obcy fakt');
  assert.deepEqual(nazwy['Wąwóz Kruczy']?.gdzie, ['b']);
  assert.equal(nazwy['Miasta Solnego']?.poziom, 'spoza bazy');
  assert.deepEqual(nazwy['Miasta Solnego']?.gdzie, []);
});

test('tekstRekordu i wystepuje: przeszukują cały rekord, także zagnieżdżenia', () => {
  const tekst = tekstRekordu({ a: 'Termopile', b: { c: ['Kallidromos'] } });
  assert.ok(wystepuje('Termopilach', tekst), 'fleksja nie gubi trafienia');
  assert.ok(wystepuje('Kallidromosu', tekst));
  assert.ok(!wystepuje('Maraton', tekst));
  assert.ok(wystepuje('Ab', tekst), `token krótszy niż ${MIN_RDZEN} znaków nie jest sprawdzany`);
});

test('czyWyjatek: dopasowanie po skicie i nazwie, odporne na diakrytyki', () => {
  const wyjatki = [{ skit: 's', nazwa: 'Kolchidy', powod: 'test' }];
  assert.equal(czyWyjatek(wyjatki, 's', 'kolchidy'), true);
  assert.equal(czyWyjatek(wyjatki, 'inny', 'Kolchidy'), false);
  assert.equal(czyWyjatek([], 's', 'Kolchidy'), false);
});

test('korpus przechodzi lint faktów: żaden SKIT nie wnosi faktu spoza kart', async () => {
  const raport = await lintFaktow(process.cwd());
  const opis = raport.map((r) => `${r.skit}: ${r.nazwa} (${r.poziom})`).join('; ');
  assert.equal(raport.length, 0, `kandydaci do sprawdzenia — ${opis}`);
});
