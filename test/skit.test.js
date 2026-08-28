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
  SKIT_ZALECANE_UCZESTNIKOW,
  podpowiedzSkladySkitow,
} from '../tools/rebuild-index.mjs';
import { skitWzorzec, SLUGI_WPISOW } from './fixtures/skit-wzorzec.js';

test('skit wzorcowy przechodzi walidację', () => {
  assert.deepEqual(walidujSkit(skitWzorzec(), SLUGI_WPISOW), []);
  const slow = liczbaSlow(skitWzorzec().tekst);
  assert.ok(slow >= SKIT_MIN_SLOW && slow <= SKIT_MAX_SLOW, `słów: ${slow}`);
});

test('slug skitu: konwencja i zarezerwowane nazwy widoków', () => {
  assert.ok(walidujSkit(skitWzorzec({ slug: 'Zły Slug' }), SLUGI_WPISOW).some((e) => e.startsWith('slug')));
  assert.ok(walidujSkit(skitWzorzec({ slug: 'skity' }), SLUGI_WPISOW).some((e) => e.includes('zarezerwowany')));
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

test('meta skitu (ADR 0017): data z godziną przechodzi, nieprawidłowa godzina nie', () => {
  assert.deepEqual(
    walidujSkit(skitWzorzec({ meta: { utworzono: '2026-08-28 09:07', modyfikacje: [{ data: '2026-08-28 21:44', opis: 'korekta repliki' }] } }), SLUGI_WPISOW),
    [],
    'godzina w meta skitu jest legalna'
  );
  assert.ok(
    walidujSkit(skitWzorzec({ meta: { utworzono: '2026-08-28 23:59+' } }), SLUGI_WPISOW).some((e) => e.includes('utworzono')),
    'śmieci za godziną odrzucane'
  );
});

test('feed (ADR 0017): godzina rozstrzyga w obrębie dnia; dzień z godziną nad dniem bez', () => {
  const wpis = {
    slug: 'a-byt',
    nazwa: 'A Byt',
    karta: { nazwa: 'Karta' },
    meta: {
      utworzono: '2026-03-03 08:10',
      modyfikacje: [
        { data: '2026-03-03 09:15', opis: 'ranek' },
        { data: '2026-03-03 14:32', opis: 'popołudnie' },
        { data: '2026-03-03', opis: 'bez godziny (stary zapis)' },
      ],
    },
  };
  const feed = zbudujIndeks([wpis], []).aktualizacje;
  assert.deepEqual(
    feed.map((f) => `${f.data}|${f.opis}`),
    [
      '2026-03-03 14:32|popołudnie',
      '2026-03-03 09:15|ranek',
      '2026-03-03 08:10|wpis w kartotece — materializacja karty „Karta”',
      '2026-03-03|bez godziny (stary zapis)',
    ],
    'godziny chronologicznie; pozycje bez godziny (stare zapisy sprzed ADR 0017) pod godzinowymi tego dnia'
  );
});

test('Baza Skitów w repo: przechodzi walidację i ma unikalne składy', async () => {
  const wpisy = await wczytajIKwaliduj();
  const slugi = new Set(wpisy.map((w) => w.slug));
  const skiti = await wczytajSkiti(KATALOG_SKITOW, slugi);
  assert.ok(skiti.length >= 1, 'pierwszy SKIT powinien być w bazie');
  for (const s of skiti) {
    assert.ok(s.tytul === s.tytul.toUpperCase(), `tytuł skitu powinien być wersalikami: ${s.tytul}`);
    assert.ok(liczbaSlow(s.tekst) <= SKIT_MAX_SLOW, `${s.slug}: limit ${SKIT_MAX_SLOW} słów`);
    for (const u of s.uczestnicy) assert.ok(slugi.has(u.slug), `${s.slug}: uczestnik ${u.slug} nie ma wpisu w kartotece`);
  }
});

test('indeks: sekcja VI (skity przy wpisie) i feed „Co nowego” wyliczone poprawnie', async () => {
  const wpisy = await wczytajIKwaliduj();
  const skiti = await wczytajSkiti(KATALOG_SKITOW, new Set(wpisy.map((w) => w.slug)));
  const indeks = zbudujIndeks(wpisy, skiti);
  assert.equal(indeks.wersja, 3);
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
  const poZnakach = (a, b) => (b > a) - (b < a); // jak w sortowaniu feedu (kodowo, nie collation)
  assert.deepEqual(daty, [...daty].sort(poZnakach), 'najnowsze na górze');
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

test('renderer: struktura dialogu w prawdziwym skicie zgadza się z liczbą replik', async () => {
  const { readFile } = await import('node:fs/promises');
  const { htmlDialogu } = await import('../app/ui.js');
  const skit = JSON.parse(await readFile('data/skity/plotno-i-kamien.json', 'utf8'));
  const repliki = skit.tekst.split(/\n{2,}/).filter((a) => /^\*\*[^*\n]+:\*\*/.test(a.trim()));
  const html = htmlDialogu(skit.tekst);
  assert.equal((html.match(/class="wypowiedz"/g) ?? []).length, repliki.length, 'każda replika ma swój akapit');
  assert.ok(!(html.match(/class="proza"/g) ?? []).length, 'w dialogu nie ma luźnej narracji');
  for (const u of skit.uczestnicy) assert.ok(html.includes(`>${u.imie}</strong>`), `brak głosu: ${u.imie}`);
});

test('feed „Co nowego”: najnowsze ZDARZENIA na górze (data desc, sekwencja w pliku desc)', () => {
  const wpis = {
    slug: 'a-byt',
    nazwa: 'A Byt',
    karta: { nazwa: 'Karta' },
    meta: { utworzono: '2026-01-01', modyfikacje: [{ data: '2026-03-03', opis: 'poprawki źródłowe' }, { data: '2026-03-03', opis: 'dopisane trofeum wtórne' }] },
  };
  const drugi = { slug: 'b-byt', nazwa: 'B Byt', karta: { nazwa: 'Karta 2' }, meta: { utworzono: '2026-03-03', modyfikacje: [] } };
  const skit = {
    slug: 'c-skit',
    tytul: 'SKIT C',
    uczestnicy: [{ imie: 'A Byt', slug: 'a-byt' }, { imie: 'B Byt', slug: 'b-byt' }],
    tekst: '**A Byt:** zdanie\n\n**B Byt:** druga odpowiedź',
    meta: { utworzono: '2026-03-03', modyfikacje: [] },
  };
  const feed = zbudujIndeks([wpis, drugi], [skit]).aktualizacje;
  const daty = feed.map((f) => f.data);
  assert.deepEqual(daty, [...daty].sort((a, b) => (b > a) - (b < a)), 'daty malejąco');
  // 2026-03-03: ostatnia modyfikacja a-byt, potem utworzenia (skit przed wpisami), a 2026-01-01 na końcu
  assert.deepEqual(
    feed.map((f) => `${f.data}|${f.typ}|${f.akcja}|${f.slug}`),
    [
      '2026-03-03|manifestacja|zmiana|a-byt',
      '2026-03-03|manifestacja|zmiana|a-byt',
      '2026-03-03|skit|nowy|c-skit',
      '2026-03-03|manifestacja|nowa|b-byt',
      '2026-01-01|manifestacja|nowa|a-byt',
    ],
    'kolejność: najnowsza zmiana, wcześniejsza zmiana, nowe skity, nowe wpisy, dawne utworzenia'
  );
  assert.equal(feed[0].opis, 'dopisane trofeum wtórne', 'w obrębie dnia liczy się ostatnia modyfikacja');
  assert.ok(!('sekwencja' in feed[0]), 'klucz sortujący nie trafia do indeksu');
});

test('feed w repo: godzina rozstrzyga nad zapisami dziennymi; wśród dziennych zmiany nad utworzeniami (ADR 0017)', async () => {
  const fs = await import('node:fs/promises');
  const indeks2 = JSON.parse(await fs.readFile('data/index.json', 'utf8'));
  const feed = indeks2.aktualizacje;
  const dzis = feed[0].data.slice(0, 10);
  const poz = feed.map((f, i) => ({ ...f, i }));
  const zGodzina = poz.filter((f) => f.data.includes(' '));
  const dzienne = poz.filter((f) => f.data === dzis);
  assert.ok(zGodzina.length > 0, 'nowe zapisy niosą godzinę (ADR 0017)');
  assert.ok(zGodzina.every(({ data }) => data.startsWith(dzis)), 'pozycje godzinowe pochodzą z najnowszego dnia');
  assert.ok(
    zGodzina.every(({ i }) => dzienne.every(({ i: j }) => j > i)),
    'pozycje z godziną są nad dziennymi zapisami tego samego dnia (zapis dzienny = sprzed v1.5)'
  );
  const zmianyDzienne = dzienne.filter((f) => f.akcja === 'zmiana');
  const utworzeniaDzienne = dzienne.filter((f) => f.akcja === 'nowa');
  assert.ok(
    zmianyDzienne.every(({ i }) => utworzeniaDzienne.every(({ i: j }) => j > i)),
    'wśród dziennych zapisów dnia zmiany są nad utworzeniami (sekwencja, L11)'
  );
  // Po ADR 0017 utworzenia też niosą godziny, więc „skit nad utworzeniami”
  // przestało być niezmiennikiem — liczy się dosłowna chronologia zapisów.
  const maleje = (a, b) => (a > b) - (a < b);
  assert.ok(feed.every((f, i) => i === 0 || maleje(feed[i - 1].data, f.data) >= 0), 'daty w feedzie maleją kodowo, pozycja po pozycji');
  // Na szczycie feedu stoi zdarzenie o najpóźniejszym znaczniku czasu (data +
  // ewentualna godzina) — czy to utworzenie, czy zmiana, rozstrzyga dosłowna
  // chronologia zapisów (ADR 0017), nie ranga typu akcji.
  assert.equal(feed[0].data, feed.map((f) => f.data).sort((a, b) => maleje(b, a))[0], 'pierwsza pozycja feedu ma najpóźniejszy znacznik czasu');
});

test('limit długości jest jeden: kod = protokół = instrukcja (ADR 0015)', async () => {
  const fs = await import('node:fs/promises');
  assert.equal(SKIT_MAX_SLOW, 300, 'walidator: 300 słów');
  assert.equal(SKIT_MIN_SLOW, 60, 'dolna granica bez zmian');
  const prot = await fs.readFile('docs/PROTOKOL.md', 'utf8');
  const workflow = await fs.readFile('docs/WORKFLOW.md', 'utf8');
  const agents = await fs.readFile('AGENTS.md', 'utf8');
  assert.match(prot, /maks\. 300 słów/, 'PROTOKÓŁ §8.2');
  assert.ok(!/maks\. 250 słów/.test(prot), 'PROTOKÓŁ nie może głosić starego limitu');
  assert.match(workflow, /60–300 słów/, 'WORKFLOW');
  assert.match(agents, /maks\. 300 słów/, 'AGENTS §3');
});

test('skład preferowany 3–4: kod = protokół = instrukcja (ADR 0019)', async () => {
  const fs = await import('node:fs/promises');
  assert.equal(SKIT_ZALECANE_UCZESTNIKOW, 3, 'stała zalecanego składu');
  const prot = await fs.readFile('docs/PROTOKOL.md', 'utf8');
  const agents = await fs.readFile('AGENTS.md', 'utf8');
  assert.match(prot, /preferowane 3–4/, 'PROTOKÓŁ §8.2 głosi preferencję 3–4');
  assert.match(agents, /preferowane 3–4/, 'AGENTS §3 głosi preferencję 3–4');
});

test('podpowiedzSkladySkitow: liczy duety vs składy ≥3 i zachęca, gdy duetów więcej', () => {
  const s = (n) => ({ uczestnicy: Array.from({ length: n }, (_, i) => ({ imie: `X${i}`, slug: `x${i}` })) });
  const przewagaDuetow = podpowiedzSkladySkitow([s(2), s(2), s(2), s(3)]);
  assert.equal(przewagaDuetow.duety, 3);
  assert.equal(przewagaDuetow.wieloosobowe, 1);
  assert.ok(przewagaDuetow.zacheta && /3–4/.test(przewagaDuetow.zacheta), 'zachęta do 3–4');
  const rownowaga = podpowiedzSkladySkitow([s(2), s(3), s(4)]);
  assert.equal(rownowaga.zacheta, null, 'gdy składów ≥3 nie mniej niż duetów — bez zachęty');
  assert.equal(podpowiedzSkladySkitow([]).zacheta, null, 'pusta baza — bez zachęty');
});
