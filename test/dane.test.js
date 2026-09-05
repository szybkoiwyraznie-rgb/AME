/** Testy prawdziwych danych repozytorium: walidacja wpisów + spójność indeksu. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import {
  wczytajIKwaliduj,
  wczytajSkiti,
  wczytajKanon,
  zbudujIndeks,
  wczytajDrogi,
  KATALOG_DROG,
  walidujTagi,
  walidujKanon,
  PLIK_INDEKSU,
  KATALOG_WPISOW,
  KATALOG_SKITOW,
} from '../tools/rebuild-index.mjs';

test('wszystkie wpisy w data/manifestations przechodzą walidację protokołu', async () => {
  const wpisy = await wczytajIKwaliduj();
  assert.ok(wpisy.length >= 1, 'kartoteka nie powinna być pusta');
});

test('data/index.json jest spójny z wpisami i bazą skitów (deterministyczny build)', async () => {
  const wpisy = await wczytajIKwaliduj();
  const slugiBytow = new Set(wpisy.map((w) => w.slug));
  const skiti = await wczytajSkiti(KATALOG_SKITOW, slugiBytow);
  const drogi = await wczytajDrogi(KATALOG_DROG, slugiBytow);
  const kanon = await wczytajKanon();
  const istniejacy = await readFile(PLIK_INDEKSU, 'utf8');
  let buildTime = null;
  try {
    buildTime = JSON.parse(istniejacy).buildTime;
  } catch {}
  const oczekiwany = JSON.stringify(zbudujIndeks(wpisy, skiti, kanon, buildTime, drogi), null, 2) + '\n';
  assert.equal(istniejacy, oczekiwany, 'data/index.json jest nieaktualny — uruchom npm run build');
});

test('każdy byt i każda Epoka Kroniki ma istniejącą ilustrację', async () => {
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW);
  for (const w of wpisy) {
    assert.ok(w.wizualizacja?.obraz, `${w.slug}: brak pola wizualizacja.obraz`);
    await access(w.wizualizacja.obraz);
  }
  const epoki = (await readdir('data/kronika')).filter((f) => /^epoka-\d+\.json$/.test(f));
  for (const plik of epoki) {
    const e = JSON.parse(await readFile(`data/kronika/${plik}`, 'utf8'));
    assert.ok(e.grafika?.obraz, `${plik}: brak grafika.obraz`);
    await access(e.grafika.obraz);
  }
});

test('materializacje zleconych kart istnieją we właściwych strefach mapy', async () => {
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW);
  const karty = new Set(wpisy.map((w) => w.karta.nazwa));
  assert.ok(karty.has('Krumar Initiate'), 'Krumar Initiate (TDM) zamaterializowana');
  assert.ok(karty.has('Forge Devil'), 'Forge Devil (DKA) zamaterializowana');
  const e = wpisy.find((w) => w.slug === 'egungun');
  assert.ok(e && e.lokalizacja.lat > 0 && e.lokalizacja.lat < 15 && e.lokalizacja.lon > 0 && e.lokalizacja.lon < 15, 'Oyo, Nigeria ~7.8N 3.9E');
  const i = wpisy.find((w) => w.slug === 'lincoln-imp');
  assert.ok(i && i.lokalizacja.lat > 50 && i.lokalizacja.lat < 60 && i.lokalizacja.lon < 0 && i.lokalizacja.lon > -2, 'Lincoln ~53.2N -0.5E');
  const sfinks = wpisy.find((w) => w.slug === 'sfinks-teby');
  assert.ok(sfinks && sfinks.lokalizacja.lat > 35 && sfinks.lokalizacja.lat < 40 && sfinks.lokalizacja.lon > 20 && sfinks.lokalizacja.lon < 25, 'Sfinks z Teb — Beocja, Grecja ~38.3N 23.3E');
  const loup = wpisy.find((w) => w.slug === 'loup-garou-gevaudan');
  assert.ok(loup && loup.lokalizacja.lat > 44 && loup.lokalizacja.lat < 46 && loup.lokalizacja.lon > 2 && loup.lokalizacja.lon < 5, 'Loup-garou — Gévaudan, Francja ~44.7N 3.5E');
});

test('każde źródło w kartotece ma adres https i nie powtarza się (B3 + ADR 0008)', async () => {
  const wpisy = await wczytajIKwaliduj();
  const adresy = new Set();
  for (const w of wpisy) {
    for (const d of w.dokumentacja) {
      assert.ok(String(d.url).startsWith('https://'), `${w.slug}: źródło bez https: ${JSON.stringify(d.url)}`);
      assert.ok(!adresy.has(d.url), `duplikat adresu w kartotece: ${d.url}`);
      adresy.add(d.url);
    }
    assert.ok(w.dokumentacja.length >= 3, `${w.slug}: kartoteka powinna mieć co najmniej 3 źródła`);
  }
});


test('kanon tagów: słownik jest ważny i obejmuje wszystkie wpisy', async () => {
  const kanon = await wczytajKanon();
  assert.deepEqual(walidujKanon(kanon), [], 'kanon musi być poprawny sam w sobie');
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW, kanon);
  for (const w of wpisy) assert.deepEqual(walidujTagi(w, kanon), [], w.slug);
  assert.deepEqual(kanon.kategorie.map((k) => k.id), ['kultura', 'typ', 'motyw', 'postac']);
  assert.ok(kanon.tagi.length >= 16, `kanon ma tylko ${kanon.tagi.length} tagów`);
  const kategorie = new Set(kanon.kategorie.map((k) => k.id));
  for (const t of kanon.tagi) {
    assert.ok(kategorie.has(t.kategoria), `${t.tag}: kategoria spoza listy`);
    assert.ok(t.opis.length > 12, `${t.tag}: opis ma tłumaczyć tag, nie go powtarzać`);
  }
  for (const kat of kanon.kategorie) {
    assert.ok(typeof kat.skrot === 'string' && kat.skrot.length > 1 && kat.skrot.length <= 9, `${kat.id}: skrót ma być krótki`);
  }
});

test('kanon: tag spoza słownika i brak kategorii = błąd; nadmiar w kategorii = błąd', async () => {
  const kanon = await wczytajKanon();
  const obcy = { tagi: ['joruba', 'duch-przodkow', 'pamiec', 'kultura-ludowa'] };
  assert.ok(walidujTagi(obcy, kanon).some((e) => e.includes('nie istnieje w kanonie')));
  const brak = { tagi: ['joruba', 'pamiec', 'maskarada'] };
  assert.ok(walidujTagi(brak, kanon).some((e) => e.includes('„typ”')), 'brak typu bytu musi być błędem');
  const nadmiar = { tagi: ['joruba', 'duch-przodkow', 'pamiec', 'przemiana', 'burza', 'maskarada'] };
  assert.ok(walidujTagi(nadmiar, kanon).some((e) => e.includes('„motyw”') && e.includes('dopuszcza')));
  const pusty = { tagi: [] };
  assert.ok(walidujTagi(pusty, kanon).length >= 3, 'puste tagi to co najmniej trzy braki');
});

test('indeks v3: tagi z kategorią i opisem, pasma w kolejności kanonu', async () => {
  const kanon = await wczytajKanon();
  const wpisy = await wczytajIKwaliduj(KATALOG_WPISOW, kanon);
  const indeks = zbudujIndeks(wpisy, [], kanon);
  assert.equal(indeks.wersja, 3);
  assert.deepEqual(indeks.kanon.kategorie.map((k) => k.id), ['kultura', 'typ', 'motyw', 'postac']);
  assert.deepEqual(indeks.kanon.kategorie.map((k) => k.skrot), ['kultura', 'typ', 'motyw', 'postać']);
  assert.ok(indeks.kanon.kategorie.every((k) => k.opis.length > 12), 'opisy kategorii też trafiają do indeksu');
  const pierwszy = Object.keys(indeks.tagi)[0];
  assert.equal(indeks.tagi[pierwszy].kategoria, 'kultura', 'pierwsze pasmo: kultura źródłowa');
  assert.ok(indeks.tagi[pierwszy].wpisy.length >= 1);
  for (const [tag, meta] of Object.entries(indeks.tagi)) {
    assert.ok(kanon.kategorie.some((k) => k.id === meta.kategoria), `${tag}: kategoria spoza kanonu`);
    assert.ok(meta.opis.length > 12, `${tag}: brak opisu w indeksie`);
  }
  const ile = Object.fromEntries(indeks.kanon.kategorie.map((k) => [k.id, k.ile]));
  assert.equal(ile.kultura, 16, 'szesnaście kultur źródłowych w kartotece');
});

test('przepis CI jest wklejalny: YAML bez znaczników HTML i z wymaganymi kluczami (L9)', async () => {
  const t = await readFile('docs/setup/ci-workflow.yml', 'utf8');
  assert.ok(!/<!--|--!?>/.test(t), 'znaczniki HTML łamią parser YAML — to była przyczyna martwego CI (L9)');
  assert.ok(!t.includes('\t'), 'tabulacje są zakazane w YAML');
  const klucze = t.split('\n').filter((l) => /^[A-Za-z_][\w-]*:/.test(l)).map((l) => l.split(':')[0]);
  for (const wymagany of ['name', 'on', 'jobs']) {
    assert.ok(klucze.includes(wymagany), `brak klucza głównego ${wymagany}:`);
  }
  const wcięcia = t.split('\n').filter((l) => /^ +\S/.test(l)).map((l) => l.match(/^ */)[0].length);
  assert.ok(wcięcia.every((n) => n % 2 === 0), 'wcięcia muszą być wielokrotnością dwóch spacji');
  assert.ok(/^jobs:\n {2}test:$/m.test(t), 'oczekiwano jobs.test (wcięcie 2 spacje)');
  for (const krok of ['npm test', 'npm run build', 'npm run check', 'git diff --exit-code data/index.json']) {
    assert.ok(t.includes(krok), `brak kroku: ${krok}`);
  }
});

test('receptura CI jest zgodna z plikiem workflow (lustro nie może rozmijać się z bramą)', async () => {
  const [receptura, workflow] = await Promise.all([
    readFile('docs/setup/ci-workflow.yml', 'utf8'),
    readFile('.github/workflows/ci.yml', 'utf8').catch(() => null),
  ]);
  const cialo = receptura.slice(receptura.indexOf('name: CI')).trim();
  assert.ok(cialo_poprawny(cialo), 'receptura musi zaczynać się od `name: CI` i nie mieć znaczników HTML');
  if (workflow === null) return; // drzewo bez .github/workflows (np. klon bez tej ścieżki) — sprawdzamy samo lustro
  const zyciu = workflow.slice(workflow.indexOf('name: CI')).trim();
  assert.equal(cialo, zyciu, 'CI na main i lustro w repo mówią coś innego — zaktualizuj docs/setup/ci-workflow.yml (L12: bez proszenia właściciela)');
});

function cialo_poprawny(cialo) {
  return cialo.startsWith('name: CI') && !/<!--/.test(cialo) && /jobs:\s*\n\s{2}test:/.test(cialo);
}

const OBCE_PISMA = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef\u0400-\u04ff]/;

test('polska proza wpisów i skitów nie zawiera pisma japońskich/chińskich ani cyrylicy', async () => {
  const wpisy = await wczytajIKwaliduj();
  const pola = ['pochodzenie_i_kultura'];
  const bledy = [];
  const sprawdź = (gdzie, tekst) => {
    if (typeof tekst === 'string' && OBCE_PISMA.test(tekst)) {
      const znak = tekst.match(OBCE_PISMA)[0];
      bledy.push(`${gdzie}: znak U+${znak.codePointAt(0).toString(16).toUpperCase()} w „${tekst.slice(Math.max(0, tekst.indexOf(znak) - 40), tekst.indexOf(znak) + 20)}”`);
    }
  };
  for (const w of wpisy) {
    for (const pole of pola) sprawdź(`${w.slug}.${pole}`, w[pole]);
    for (const [pole, wartosc] of Object.entries(w.natura ?? {})) sprawdź(`${w.slug}.natura.${pole}`, wartosc);
    for (const [pole, wartosc] of Object.entries(w.trofea ?? {})) sprawdź(`${w.slug}.trofea.${pole}`, wartosc);
    (w.dokumentacja ?? []).forEach((r, i) => sprawdź(`${w.slug}.dokumentacja[${i}]`, r?.pozycja));
    (w.powiazania ?? []).forEach((r, i) => sprawdź(`${w.slug}.powiazania[${i}]`, r?.opis));
  }
  const { walidujSkit } = await import('../tools/rebuild-index.mjs');
  void walidujSkit;
  for (const plik of (await readdir('data/skity')).sort()) {
    const s = JSON.parse(await readFile(`data/skity/${plik}`, 'utf8'));
    sprawdź(`skity/${plik}.tekst`, s.tekst);
    sprawdź(`skity/${plik}.temat`, s.temat);
  }
  assert.deepEqual(bledy, [], 'obce pismo w polskim tekście — zwykle literówka z edytora (L13)');
});
