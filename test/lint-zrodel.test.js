/** C2+5: lint źródeł — higiena sekcji III (Source Stack). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGREGATORY,
  domenaZrodla,
  czyAgregator,
  lintZrodelWpisu,
  lintZrodelKorpus,
  statystykaDomen,
} from '../tools/lint-zrodel.mjs';

const wpis = (dokumentacja) => ({ slug: 'test', dokumentacja });

test('źródła: domena jest normalizowana, a http i śmieci odrzucane', () => {
  assert.equal(domenaZrodla('https://www.Britannica.com/topic/x'), 'britannica.com');
  assert.equal(domenaZrodla('https://pl.wikisource.org/wiki/X'), 'pl.wikisource.org');
  assert.equal(domenaZrodla('http://example.org/x'), null);
  assert.equal(domenaZrodla('nie-adres'), null);
  assert.equal(domenaZrodla(''), null);
  assert.equal(domenaZrodla(undefined), null);
});

test('źródła: agregatory rozpoznawane także w subdomenach', () => {
  assert.ok(AGREGATORY.includes('wikipedia.org'));
  assert.equal(czyAgregator('en.wikipedia.org'), true);
  assert.equal(czyAgregator('wikipedia.org'), true);
  assert.equal(czyAgregator('sacred-texts.com'), false);
  assert.equal(czyAgregator(null), false);
});

test('Z1: adres, który nie jest https, jest zgłaszany', () => {
  const t = lintZrodelWpisu(wpis([
    { typ: 'a', pozycja: 'x 1900', url: 'http://example.org' },
    { typ: 'b', pozycja: 'y 1901', url: 'https://theoi.com/a' },
    { typ: 'c', pozycja: 'z 1902', url: 'https://sacred-texts.com/a' },
  ]));
  assert.deepEqual(t.map((x) => x.regula), ['Z1']);
});

test('Z2: ten sam adres dwa razy w jednym wpisie', () => {
  const t = lintZrodelWpisu(wpis([
    { typ: 'a', pozycja: 'x', url: 'https://theoi.com/a' },
    { typ: 'b', pozycja: 'y', url: 'https://theoi.com/a' },
  ]));
  assert.ok(t.some((x) => x.regula === 'Z2'));
});

test('Z3: źródło bez adresu musi podać rok albo strony', () => {
  const bezDanych = lintZrodelWpisu(wpis([
    { typ: 'druk', pozycja: 'stara książka o wężach' },
    { typ: 'b', pozycja: 'y', url: 'https://theoi.com/a' },
  ]));
  assert.ok(bezDanych.some((x) => x.regula === 'Z3'));
  const zRokiem = lintZrodelWpisu(wpis([
    { typ: 'druk', pozycja: 'Haur, „Skład abo skarbiec”, 1693, s. 336' },
    { typ: 'b', pozycja: 'y', url: 'https://theoi.com/a' },
    { typ: 'c', pozycja: 'z', url: 'https://sacred-texts.com/a' },
  ]));
  assert.equal(zRokiem.length, 0);
});

test('Z4: stos źródeł nie może stać na jednej domenie', () => {
  const t = lintZrodelWpisu(wpis([
    { typ: 'a', pozycja: 'x', url: 'https://theoi.com/a' },
    { typ: 'b', pozycja: 'y', url: 'https://theoi.com/b' },
  ]));
  assert.ok(t.some((x) => x.regula === 'Z4'));
});

test('Z5: sama Wikipedia nie wystarczy', () => {
  const t = lintZrodelWpisu(wpis([
    { typ: 'a', pozycja: 'x', url: 'https://en.wikipedia.org/wiki/A' },
    { typ: 'b', pozycja: 'y', url: 'https://pl.wikipedia.org/wiki/B' },
  ]));
  assert.ok(t.some((x) => x.regula === 'Z5'));
  const zTekstem = lintZrodelWpisu(wpis([
    { typ: 'a', pozycja: 'x', url: 'https://en.wikipedia.org/wiki/A' },
    { typ: 'b', pozycja: 'y', url: 'https://sacred-texts.com/x' },
  ]));
  assert.ok(!zTekstem.some((x) => x.regula === 'Z5'));
});

test('cały korpus przechodzi lint źródeł', async () => {
  const znaleziska = await lintZrodelKorpus();
  assert.deepEqual(
    znaleziska.map((z) => `${z.slug} ${z.regula}: ${z.opis}`),
    [],
    'sekcja III każdego wpisu ma być czysta'
  );
});

test('statystyka domen zwraca posortowane zestawienie korpusu', async () => {
  const domeny = await statystykaDomen();
  assert.ok(domeny.length > 20);
  for (let i = 1; i < domeny.length; i++) assert.ok(domeny[i - 1][1] >= domeny[i][1]);
  assert.ok(domeny.some(([d]) => d === 'en.wikipedia.org'));
});
