/**
 * Testy audytu pinezek: geometria (znane punkty) + kontrola całej kartoteki.
 *
 * Powód istnienia: właściciel dwukrotnie zgłosił pinezkę w złym kraju.
 * Kontrola ręczna nie zostawia śladu i nie łapie regresji, więc granica
 * państwa jest teraz sprawdzana maszynowo na tym samym pliku, na którym
 * rysuje się mapa.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  audytPinezek,
  granicePanstw,
  krajDoGranic,
  punktWKraju,
  ocenPinezke,
  ODSTEPSTWA,
  PLIK_GRANIC,
  TOLERANCJA_STOPNI,
} from '../tools/audyt-pinezek.mjs';

const granice = granicePanstw(JSON.parse(await readFile(PLIK_GRANIC, 'utf8')));

test('słownik krajów: nazwa z regionem w nawiasie i część składowa Zjednoczonego Królestwa', () => {
  assert.equal(krajDoGranic('Grecja (Beocja)'), 'Greece');
  assert.equal(krajDoGranic('Egipt (muhafaza al-Gharbijja)'), 'Egypt');
  assert.equal(krajDoGranic('Szkocja (Wielka Brytania)'), 'United Kingdom');
  assert.equal(krajDoGranic('Anglia (Wielka Brytania)'), 'United Kingdom');
  assert.equal(krajDoGranic('Wyspa Man (Morze Irlandzkie)'), 'Isle of Man');
  assert.equal(krajDoGranic('Wakanda'), null, 'nieznany kraj nie może cicho przejść');
});

test('geometria: znane punkty trafiają w swoje państwa, a nie w sąsiednie', () => {
  assert.ok(punktWKraju([31.1342, 29.9792], granice.get('Egypt')), 'Wielki Sfinks z Gizy leży w Egipcie');
  assert.ok(!punktWKraju([31.1342, 29.9792], granice.get('Greece')), 'Giza nie leży w Grecji');
  assert.ok(punktWKraju([23.28, 38.32], granice.get('Greece')), 'góra Fikion pod Tebami Beockimi leży w Grecji');
  assert.ok(!punktWKraju([23.28, 38.32], granice.get('Egypt')), 'Beocja nie leży w Egipcie');
  assert.ok(punktWKraju([21.0119, 52.2506], granice.get('Poland')), 'Stare Miasto w Warszawie leży w Polsce');
  assert.ok(!punktWKraju([0, 0], granice.get('Poland')), 'punkt zerowy na Atlantyku nie jest w Polsce');
});

test('ocena pinezki rozróżnia trafienie, tolerancję wybrzeża i błąd', () => {
  const wpis = (lat, lon, kraj) => ({ slug: 'x', lokalizacja: { lat, lon, kraj } });
  assert.equal(ocenPinezke(wpis(52.25, 21.01, 'Polska'), granice).status, 'ok');
  assert.equal(ocenPinezke(wpis(54.07, -4.75, 'Wyspa Man (Morze Irlandzkie)'), granice).status, 'blisko');
  assert.equal(ocenPinezke(wpis(30.0, 31.13, 'Grecja'), granice).status, 'blad', 'Giza podpisana Grecją to błąd');
  assert.equal(ocenPinezke(wpis(52.25, 21.01, 'Wakanda'), granice).status, 'nieznany-kraj');
  assert.equal(ocenPinezke({ slug: 'x', lokalizacja: { kraj: 'Polska' } }, granice).status, 'blad');
  assert.ok(TOLERANCJA_STOPNI > 0 && TOLERANCJA_STOPNI < 1, 'tolerancja wybrzeża to ułamek stopnia');
});

test('kartoteka: każda pinezka leży w kraju, który wpis deklaruje', async () => {
  const wyniki = await audytPinezek();
  const zle = wyniki.filter((w) => w.status === 'blad' || w.status === 'nieznany-kraj');
  assert.deepEqual(
    zle.map((w) => `${w.slug}: ${w.opis}`),
    [],
    'pinezka poza granicami deklarowanego kraju — popraw współrzędne albo pole lokalizacja.kraj'
  );
  assert.ok(wyniki.length >= 25, 'audyt musi obejmować całą kartotekę');
});

test('odstępstwa są jawne, uzasadnione i tylko dla istniejących wpisów', async () => {
  const wyniki = await audytPinezek();
  const slugi = new Set(wyniki.map((w) => w.slug));
  for (const [slug, powod] of Object.entries(ODSTEPSTWA)) {
    assert.ok(slugi.has(slug), `odstępstwo dla nieistniejącego wpisu: ${slug}`);
    assert.ok(powod.split(/\s+/).length >= 8, `${slug}: odstępstwo bez uzasadnienia geograficznego`);
    const w = wyniki.find((x) => x.slug === slug);
    assert.equal(w.status, 'odstepstwo', `${slug}: odstępstwo przestało być potrzebne — usuń je z ODSTEPSTWA`);
  }
});
test('sfinksy stoją na dwóch kontynentach: grecka Sfinga w Beocji, egipski w Gizie', async () => {
  const wyniki = await audytPinezek();
  const grecka = wyniki.find((w) => w.slug === 'sfinks-teby');
  assert.equal(grecka.kraj, 'Greece', 'wpis o Sfindze z cyklu tebańskiego zostaje w Grecji');
  const egipski = wyniki.find((w) => w.slug === 'wielki-sfinks-z-gizy');
  assert.ok(egipski, 'kartoteka musi mieć osobny byt egipskiego Sfinksa');
  assert.equal(egipski.status, 'ok');
  assert.equal(egipski.kraj, 'Egypt');
});
