/** Testy formatu SKITów: walidator, unikalność składów, integracja z indeksem. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  walidujSkit,
  walidujUnikalnoscSkitow,
  liczbaSlow,
  wczytajSkiti,
  wczytajIKwaliduj,
  zbudujIndeks,
  KATALOG_SKITOW,
  SKIT_MAX_SLOW,
  SKIT_MIN_SLOW,
} from '../tools/rebuild-index.mjs';
import { skitWzorzec, SLUGI_WPISOW } from './fixtures/skit-wzorzec.js';

test('skit wzorcowy przechodzi walidację', () => {
  assert.deepEqual(walidujSkit(skitWzorzec(), SLUGI_WPISOW), []);
  const slow = liczbaSlow(skitWzorzec().tekst);
  assert.ok(slow >= SKIT_MIN_SLOW && slow <= SKIT_MAX_SLOW, `słów: ${slow}`);
});

test('uczestnicy: 2–4 materializacje, istniejące slugi, bez duplikatów', () => {
  const samJeden = skitWzorzec({ uczestnicy: [{ imie: 'Byt Testowy', slug: 'byt-testowy' }] });
  assert.ok(walidujSkit(samJeden, SLUGI_WPISOW).some((e) => e.includes('uczestnicy')), 'samotna postać to nie rozmowa');

  const pieciu = skitWzorzec({
    uczestnicy: [
      { imie: 'A', slug: 'byt-testowy' },
      { imie: 'B', slug: 'zorza' },
      { imie: 'C', slug: 'egungun' },
      { imie: 'D', slug: 'lincoln-imp' },
      { imie: 'E', slug: 'byt-testowy' },
    ],
  });
  assert.ok(walidujSkit(pieciu, SLUGI_WPISOW).some((e) => e.includes('więcej niż 4')));

  const nieMaGo = skitWzorzec({ uczestnicy: [{ imie: 'X', slug: 'nie_ma_go' }, { imie: 'Y', slug: 'zorza' }] });
  assert.ok(walidujSkit(nieMaGo, SLUGI_WPISOW).some((e) => e.includes('nie istnieje')));

  const dubel = skitWzorzec({ uczestnicy: [{ imie: 'X', slug: 'zorza' }, { imie: 'Y', slug: 'zorza' }] });
  assert.ok(walidujSkit(dubel, SLUGI_WPISOW).some((e) => e.includes('duplikat')));
});

test('tekst: limity długości, forma replik, każdy uczestnik zabiera głos', () => {
  const dlugi = skitWzorzec({ tekst: `**Byt Testowy:** x\n${'słowo '.repeat(SKIT_MAX_SLOW)}` });
  assert.ok(walidujSkit(dlugi, SLUGI_WPISOW).some((e) => e.includes('limit protokołu')));

  const krotki = skitWzorzec({ tekst: '**Byt Testowy:** Krótko.\n\n**Zorza:** Równie krótko.' });
  assert.ok(walidujSkit(krotki, SLUGI_WPISOW).some((e) => e.includes('za krótko')));

  const proza = skitWzorzec({ tekst: 'Rozmowa bez formatu, która ciągnie się bez nagłówków mówców i nie mówi nic, a jej treść jest testowo długa na tyle, że przechodzi próg długości wymagany przez walidator, więc zostaje tylko forma. '.repeat(2) });
  assert.ok(walidujSkit(proza, SLUGI_WPISOW).some((e) => e.includes('replik w formie')));

  const milczacy = skitWzorzec({
    tekst: skitWzorzec().tekst.replace(/\*\*Zorza:\*\*[^\n]*/, '**Nieistotny:** Zdanie wypowiedziane przez kogoś spoza składu rozmowy, więc milczący uczestnik jest błędem.'),
  });
  assert.ok(walidujSkit(milczacy, SLUGI_WPISOW).some((e) => e.includes('nie zabiera głosu')));
});

test('tekst: zakaz żargonu gry i odwołań do kart (rozmowa bytów, nie talii)', () => {
  for (const wtret of ['Dopóki mana nie spadnie na ziemię.', 'Mój P/T jest bez znaczenia.', 'To jak booster w pudełku.']) {
    const s = skitWzorzec({ tekst: `${skitWzorzec().tekst}\n\n**Zorza:** ${wtret}` });
    assert.ok(walidujSkit(s, SLUGI_WPISOW).some((e) => e.includes('zakazany żargon')), wtret);
  }
  const oKarcie = skitWzorzec({ tekst: `${skitWzorzec().tekst}\n\n**Zorza:** Karta Magic przypomina mi o tobie.` });
  assert.ok(walidujSkit(oKarcie, SLUGI_WPISOW).some((e) => e.includes('zakaz odwołań do kart')));
});

test('walidujUnikalnoscSkitow: ten sam skład dwukrotnie = błąd', () => {
  const a = skitWzorzec();
  const b = skitWzorzec({ slug: 'rozmowa-testowa-2', uczestnicy: [{ imie: 'Zorza', slug: 'zorza' }, { imie: 'Byt Testowy', slug: 'byt-testowy' }] });
  const bledy = walidujUnikalnoscSkitow([a, b]);
  assert.equal(bledy.length, 1, 'kolejność listingowa nie może ratować duplikatu');
  assert.match(bledy[0], /ten sam skład uczestników/);

  const c = skitWzorzec({ slug: 'rozmowa-trójka', uczestnicy: [...a.uczestnicy, { imie: 'Egungun', slug: 'egungun' }] });
  assert.deepEqual(walidujUnikalnoscSkitow([a, c]), [], 'skład większy o jedną postać jest dozwolony');
});

test('meta skitu: data i modyfikacje jak w wpisach', () => {
  assert.ok(walidujSkit(skitWzorzec({ meta: { utworzono: '28-08-2026' } }), SLUGI_WPISOW).some((e) => e.includes('utworzono')));
  assert.ok(walidujSkit(skitWzorzec({ meta: { utworzono: '2026-08-28', modyfikacje: [{ data: 'wczoraj', opis: 'x' }] } }), SLUGI_WPISOW).some((e) => e.includes('modyfikacje')));
});

test('Baza Skitów w repo: przechodzi walidację i ma unikalne składy', async () => {
  const wpisy = await wczytajIKwaliduj();
  const slugi = new Set(wpisy.map((w) => w.slug));
  const skiti = await wczytajSkiti(KATALOG_SKITOW, slugi);
  assert.ok(skiti.length >= 1, 'pierwszy SKIT powinien być w bazie');
  for (const s of skiti) {
    assert.ok(s.tytul === s.tytul.toUpperCase(), `tytuł skitu powinien być wersalikami: ${s.tytul}`);
    assert.ok(liczbaSlow(s.tekst) <= SKIT_MAX_SLOW, `${s.slug}: limit 250 słów`);
    for (const u of s.uczestnicy) assert.ok(slugi.has(u.slug), `${s.slug}: uczestnik ${u.slug} nie ma wpisu w kartotece`);
  }
});

test('indeks: sekcja VI (skity przy wpisie) i feed „Co nowego” wyliczone poprawnie', async () => {
  const wpisy = await wczytajIKwaliduj();
  const skiti = await wczytajSkiti(KATALOG_SKITOW, new Set(wpisy.map((w) => w.slug)));
  const indeks = zbudujIndeks(wpisy, skiti);
  assert.equal(indeks.wersja, 2);
  assert.equal(indeks.liczbaSkitow, skiti.length);

  const skit = skiti[0];
  for (const u of skit.uczestnicy) {
    const rekord = indeks.manifestacje.find((m) => m.slug === u.slug);
    assert.ok(rekord.skity.includes(skit.slug), `${u.slug} powinien mieć ${skit.slug} w sekcji VI`);
  }
  for (const m of indeks.manifestacje) {
    const dlaNiego = skiti.filter((s) => s.uczestnicy.some((u) => u.slug === m.slug)).map((s) => s.slug);
    assert.deepEqual(m.skity, [...dlaNiego].sort((a, b) => a.localeCompare(b, 'pl')), `sekcja VI dla ${m.slug}`);
  }

  assert.ok(indeks.aktualizacje.length >= wpisy.length + skiti.length, 'feed obejmuje powstania wpisów i skitów');
  const daty = indeks.aktualizacje.map((a) => a.data);
  assert.deepEqual(daty, [...daty].sort((a, b) => b.localeCompare(a)), 'najnowsze na górze');
  for (const a of indeks.aktualizacje) {
    const zbior = a.typ === 'skit' ? indeks.skity : indeks.manifestacje;
    assert.ok(zbior.some((x) => x.slug === a.slug), `feed wskazuje na nieistniejący ${a.typ}: ${a.slug}`);
  }
  // determinizm
  assert.deepEqual(
    zbudujIndeks(wpisy, skiti).aktualizacje,
    indeks.aktualizacje,
    'feed musi być deterministyczny'
  );
});
