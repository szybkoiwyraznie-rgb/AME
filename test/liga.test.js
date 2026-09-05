/**
 * Testy Ligi Rezonansu (app/liga.js) — sezon Areny rozpisany na kalendarz.
 * Rdzeń jest czysty: żadnego DOM, żadnej sieci, zero zapisanego stanu.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DZIEN_ZERO,
  PUNKTY,
  numerDnia,
  terminarzSezonu,
  dlugoscSezonu,
  kalendarzDnia,
  paryKolejki,
  rozegrajKolejke,
  tabelaLigi,
  opisSezonu,
} from '../app/liga.js';
import { profileKartoteki } from '../app/arena.js';

const SLUGI = ['a', 'b', 'c', 'd'];

async function statyKartoteki() {
  const indeks = JSON.parse(await readFile('data/index.json', 'utf8'));
  const profile = profileKartoteki(indeks.manifestacje, indeks.kanon ?? null);
  return {
    indeks,
    slugi: indeks.manifestacje.map((m) => m.slug),
    staty: new Map([...profile].map(([slug, p]) => [slug, p.staty])),
  };
}

test('numerDnia liczy dni od dnia zerowego i przyjmuje daty sprzed startu', () => {
  assert.equal(numerDnia(DZIEN_ZERO), 0);
  assert.equal(numerDnia('2026-09-07'), 1);
  assert.equal(numerDnia('2026-10-06'), 30);
  assert.equal(numerDnia('2026-09-05'), -1);
  assert.throws(() => numerDnia('nie-data'), TypeError);
});

test('terminarz sezonu: każdy z każdym dokładnie raz', () => {
  const kolejki = terminarzSezonu(SLUGI);
  assert.equal(kolejki.length, 3, 'cztery byty grają trzy kolejki');
  const pary = kolejki.flat().map(([a, b]) => [a, b].sort().join('|'));
  assert.equal(pary.length, 6);
  assert.equal(new Set(pary).size, 6, 'żadna para nie powtarza się w sezonie');
  for (const kolejka of kolejki) {
    const grajacy = kolejka.flat();
    assert.equal(new Set(grajacy).size, grajacy.length, 'nikt nie gra dwa razy w jednej kolejce');
  }
});

test('nieparzysta liczba bytów: jeden pauzuje, pauza nie trafia do par', () => {
  const kolejki = terminarzSezonu(['a', 'b', 'c']);
  assert.equal(kolejki.length, 3);
  for (const kolejka of kolejki) {
    assert.equal(kolejka.length, 1, 'trzech graczy = jedna para i jedna pauza');
    assert.ok(kolejka.flat().every((s) => ['a', 'b', 'c'].includes(s)), 'pauza nie jest bytem');
  }
  const pary = kolejki.flat().map(([a, b]) => [a, b].sort().join('|'));
  assert.deepEqual([...new Set(pary)].sort(), ['a|b', 'a|c', 'b|c']);
});

test('terminarz nie zależy od kolejności wejścia ani duplikatów', () => {
  assert.deepEqual(terminarzSezonu(['d', 'c', 'b', 'a', 'a']), terminarzSezonu(SLUGI));
  assert.throws(() => terminarzSezonu(['a']), RangeError);
});

test('kalendarz: jedna kolejka na dobę, po ostatniej rusza nowy sezon', () => {
  assert.deepEqual(kalendarzDnia(SLUGI, DZIEN_ZERO), { sezon: 1, kolejka: 1, dlugosc: 3, dzien: 0 });
  assert.deepEqual(kalendarzDnia(SLUGI, '2026-09-08'), { sezon: 1, kolejka: 3, dlugosc: 3, dzien: 2 });
  assert.deepEqual(kalendarzDnia(SLUGI, '2026-09-09'), { sezon: 2, kolejka: 1, dlugosc: 3, dzien: 3 });
  assert.equal(kalendarzDnia(SLUGI, '2026-09-01').sezon, 0, 'przed startem ligi nie ma');
});

test('kolejność kolejek przestawia się co sezon, ale komplet par zostaje', () => {
  const s1 = [1, 2, 3].map((k) => paryKolejki(SLUGI, 1, k));
  const s2 = [1, 2, 3].map((k) => paryKolejki(SLUGI, 2, k));
  assert.notDeepEqual(s1[0], s2[0], 'drugi sezon nie zaczyna się od tej samej kolejki');
  const klucz = (kolejki) => kolejki.flat().map(([a, b]) => [a, b].sort().join('|')).sort();
  assert.deepEqual(klucz(s1), klucz(s2), 'w każdym sezonie rozgrywa się ten sam komplet par');
  assert.deepEqual(paryKolejki(SLUGI, 1, 9), [], 'kolejka spoza sezonu jest pusta');
});

test('rozegrajKolejke jest deterministyczne i wstrzykuje losowość', () => {
  const staty = new Map(SLUGI.map((slug, i) => [slug, { slug, zywotnosc: 40 + i, moc: 8, spryt: 6 + i, rezonans: 10, motywy: [] }]));
  const zapis = [];
  const atrapa = ({ a, b, los }) => {
    zapis.push(typeof los);
    return { zwyciezca: a.slug, remis: false, rundy: 4, stan: { [a.slug]: 10, [b.slug]: 0 }, kolejnosc: [a.slug, b.slug], dziennik: [] };
  };
  const pierwsze = rozegrajKolejke(staty, SLUGI, 1, 1, { rozegraj: atrapa });
  const drugie = rozegrajKolejke(staty, SLUGI, 1, 1, { rozegraj: atrapa });
  assert.deepEqual(pierwsze.map((m) => [m.a, m.b, m.wynik.zwyciezca]), drugie.map((m) => [m.a, m.b, m.wynik.zwyciezca]));
  assert.ok(zapis.every((t) => t === 'function'), 'rdzeń dostaje wstrzyknięty RNG, nie Math.random');
});

test('tabela ligi: punktacja, bilans i forma zgadzają się z rozegranymi kolejkami', () => {
  const staty = new Map(SLUGI.map((slug) => [slug, { slug, zywotnosc: 40, moc: 8, spryt: 6, rezonans: 10, motywy: [] }]));
  // atrapa: wygrywa zawsze byt wcześniejszy alfabetycznie, poza parą c–d (remis)
  const atrapa = ({ a, b }) => {
    const [x, y] = [a.slug, b.slug].sort();
    if (x === 'c' && y === 'd') return { zwyciezca: null, remis: true, rundy: 12, stan: { [a.slug]: 5, [b.slug]: 5 }, kolejnosc: [a.slug, b.slug], dziennik: [] };
    return { zwyciezca: x, remis: false, rundy: 3, stan: { [x]: 12, [y]: 0 }, kolejnosc: [a.slug, b.slug], dziennik: [] };
  };
  const liga = tabelaLigi(staty, SLUGI, '2026-09-08', { rozegraj: atrapa });
  assert.equal(liga.sezon, 1);
  assert.equal(liga.kolejka, 3, 'trzeciego dnia rozegrane są trzy kolejki');
  const wiersz = (slug) => liga.tabela.find((w) => w.slug === slug);
  assert.equal(wiersz('a').mecze, 3);
  assert.equal(wiersz('a').punkty, 3 * PUNKTY.wygrana);
  assert.equal(wiersz('a').pozycja, 1);
  assert.equal(wiersz('d').punkty, PUNKTY.remis, 'd wygrywa tylko remis z c');
  assert.equal(wiersz('a').przewaga, 36, 'bilans to suma różnic pozostałej wytrzymałości');
  assert.equal(wiersz('a').forma.length, 3);
  assert.match(wiersz('a').forma, /^W+$/);
  const suma = liga.tabela.reduce((s, w) => s + w.mecze, 0);
  assert.equal(suma, 12, 'trzy kolejki po dwa mecze = dwanaście występów');
});

test('tabela ligi nie zapisuje stanu: ten sam dzień = ten sam wynik', async () => {
  const { staty, slugi } = await statyKartoteki();
  const a = tabelaLigi(staty, slugi, '2026-09-12');
  const b = tabelaLigi(staty, slugi, '2026-09-12');
  assert.deepEqual(a.tabela.map((w) => [w.slug, w.punkty, w.przewaga]), b.tabela.map((w) => [w.slug, w.punkty, w.przewaga]));
  assert.equal(a.sezon, 1);
  assert.equal(a.kolejka, 7);
  assert.equal(a.tabela.length, slugi.length, 'w tabeli stoi cała kartoteka');
});

test('kartoteka: sezon domyka się i mieści w rozsądnym czasie', async () => {
  const { staty, slugi } = await statyKartoteki();
  const dlugosc = dlugoscSezonu(slugi);
  assert.ok(dlugosc >= slugi.length - 1, 'sezon obejmuje mecz każdego z każdym');
  const start = Date.now();
  const ostatniDnia = new Date(Date.parse(`${DZIEN_ZERO}T00:00:00Z`) + (dlugosc - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
  const liga = tabelaLigi(staty, slugi, ostatniDnia);
  assert.equal(liga.kolejka, dlugosc, 'ostatniego dnia sezonu rozegrane są wszystkie kolejki');
  assert.ok(liga.nastepna.nowySezon, 'po ostatniej kolejce zapowiadany jest nowy sezon');
  const rozegrane = liga.tabela.reduce((s, w) => s + w.mecze, 0) / 2;
  assert.equal(rozegrane, (slugi.length * (slugi.length - 1)) / 2, 'pełny turniej każdy z każdym');
  assert.ok(Date.now() - start < 4000, 'pełny sezon liczy się bez zauważalnej zwłoki');
});

test('opisSezonu mówi po ludzku i nie zdradza żargonu gry', async () => {
  const { staty, slugi, indeks } = await statyKartoteki();
  const nazwy = Object.fromEntries(indeks.manifestacje.map((m) => [m.slug, m.nazwa]));
  const liga = tabelaLigi(staty, slugi, '2026-09-10');
  const opis = opisSezonu(liga, nazwy);
  assert.match(opis, /Sezon 1, kolejka 5 z \d+/);
  assert.ok(!/hp|dmg|mana/i.test(opis));
  assert.match(opisSezonu({ sezon: 0 }), /jeszcze się nie zaczął/);
});

test('widok ligi renderuje tabelę, ostatnią kolejkę i zapowiedź', async () => {
  const { staty, slugi, indeks } = await statyKartoteki();
  const { htmlLigi } = await import('../app/ui.js');
  const liga = tabelaLigi(staty, slugi, '2026-09-11');
  const html = htmlLigi(indeks, liga);
  assert.match(html, /liga-tabela/);
  assert.match(html, /data-liga-spor="[a-z0-9-]+\|[a-z0-9-]+"/, 'mecz kolejki prowadzi do Areny');
  assert.match(html, /Kolejka 6/);
  assert.equal((html.match(/<tr/g) ?? []).length, liga.tabela.length + 1, 'wiersz na byt plus nagłówek');
  assert.ok(!html.includes('<script'), 'treść wchodzi przez esc');
  assert.match(htmlLigi(indeks, null), /pusto/);
});

test('aplikacja wpina Ligę: przycisk, routing i style', async () => {
  const [html, app, css] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('app/app.js', 'utf8'),
    readFile('app/styles.css', 'utf8'),
  ]);
  assert.match(html, /id="przycisk-liga"/);
  assert.match(app, /fragment === 'liga'/);
  assert.match(app, /kopia: 'liga'/);
  assert.match(css, /\.liga-tabela/);
});

test('rdzeń Ligi nie sięga po API Node ani po sieć (ADR 0003, L22)', async () => {
  const kod = await readFile('app/liga.js', 'utf8');
  assert.ok(!/require\(|node:|fetch\(|Math\.random/.test(kod));
});
