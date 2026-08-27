import test from 'node:test';
import assert from 'node:assert/strict';
import { walidujWpis, walidujPowiazania, RAMA_OTWARCIA, RAMA_ZAMKNIECIA } from '../tools/rebuild-index.mjs';
import { wpisWzorzec, ustaw } from './fixtures/wpis-wzorzec.js';

test('wzorzec przechodzi walidację bez błędów', () => {
  assert.deepEqual(walidujWpis(wpisWzorzec()), []);
});

test('slug: konwencja i zgodność wymagań', () => {
  assert.ok(walidujWpis(wpisWzorzec({ slug: 'Zły Slug' })).some((e) => e.startsWith('slug')));
  assert.ok(walidujWpis(wpisWzorzec({ slug: 'slug ze spacją' })).length > 0);
});

test('lokalizacja: zakresy współrzędnych', () => {
  assert.ok(walidujWpis(ustaw(wpisWzorzec(), { 'lokalizacja.lat': 91 })).some((e) => e.includes('lat')));
  assert.ok(walidujWpis(ustaw(wpisWzorzec(), { 'lokalizacja.lat': -90 })).length === 0);
  assert.ok(walidujWpis(ustaw(wpisWzorzec(), { 'lokalizacja.lon': 181 })).some((e) => e.includes('lon')));
  assert.ok(walidujWpis(ustaw(wpisWzorzec(), { 'lokalizacja.lon': -180 })).length === 0);
});

test('rezonans.tabela: wymagane wszystkie elementy translacji', () => {
  const bezFlavor = wpisWzorzec();
  bezFlavor.rezonans.tabela = bezFlavor.rezonans.tabela.filter((w) => w.element !== 'Flavor text');
  assert.ok(walidujWpis(bezFlavor).some((e) => e.includes('Flavor text')));
});

test('natura: komplet pięciu pól protokołu II', () => {
  for (const pole of ['wyglad_i_aura', 'charakter_i_motywacje', 'zdolnosci', 'slabosci_i_metody_pokonania', 'preferencje']) {
    assert.ok(walidujWpis(ustaw(wpisWzorzec(), { [`natura.${pole}`]: '' })).some((e) => e.includes(pole)), pole);
  }
});

test('prompt wizualizacji: rama 21:9 obowiązkowa w całości', () => {
  const bezOtwarcia = wpisWzorzec({ slug: 'a' });
  bezOtwarcia.wizualizacja.prompt = bezOtwarcia.wizualizacja.prompt.slice(10);
  assert.ok(walidujWpis(bezOtwarcia).some((e) => e.includes('ramą otwarcia')));

  const bezZamkniecia = wpisWzorzec({ slug: 'b' });
  bezZamkniecia.wizualizacja.prompt = bezZamkniecia.wizualizacja.prompt.slice(0, -12);
  assert.ok(walidujWpis(bezZamkniecia).some((e) => e.includes('ramą zamknięcia')));

  const krotkiSrodek = wpisWzorzec({ slug: 'c' });
  krotkiSrodek.wizualizacja.prompt = `${RAMA_OTWARCIA}\n\nKrótko.\n\n${RAMA_ZAMKNIECIA}`;
  assert.ok(walidujWpis(krotkiSrodek).some((e) => e.includes('treść sceny zbyt uboga')));
});

test('prompt wizualizacji: zakaz słów „niestartowych” (fotografia, nie malarstwo)', () => {
  const zFigurka = wpisWzorzec({ slug: 'd' });
  zFigurka.wizualizacja.prompt = `${RAMA_OTWARCIA}\n\nA weathered forest spirit posed like a museum figurine among frozen pines under moonlight.\n\n${RAMA_ZAMKNIECIA}`;
  assert.ok(walidujWpis(zFigurka).some((e) => e.includes('zakazane słowa')));
});

test('tagi: konwencja, duplikaty', () => {
  assert.ok(walidujWpis(wpisWzorzec({ tagi: ['Zły Tag'] })).some((e) => e.startsWith('tagi')));
  assert.ok(walidujWpis(wpisWzorzec({ tagi: ['las', 'las'] })).some((e) => e.includes('duplikaty')));
  assert.equal(walidujWpis(wpisWzorzec({ tagi: ['polski-znak-ą'] })).length, 0);
});

test('powiązania: self-link, nieistniejący slug, duplikaty', () => {
  const w = wpisWzorzec();
  assert.deepEqual(walidujPowiazania(w, new Set(['byt-testowy', 'inny'])), []);
  assert.ok(walidujPowiazania(ustaw(w, { powiazania: [{ slug: 'byt-testowy', opis: 'sam ze sobą' }] }), new Set(['byt-testowy'])).some((e) => e.includes('self-link')));
  assert.ok(walidujPowiazania(ustaw(w, { powiazania: [{ slug: 'nie_ma_go', opis: 'x' }] }), new Set(['byt-testowy'])).some((e) => e.includes('nie istnieje')));
});

test('meta: format dat i struktura modyfikacji', () => {
  assert.ok(walidujWpis(wpisWzorzec({ meta: { utworzono: '27-08-2026', modyfikacje: [] } })).some((e) => e.includes('utworzono')));
  assert.ok(
    walidujWpis(wpisWzorzec({ meta: { utworzono: '2026-08-27', modyfikacje: [{ data: 'jutro', opis: 'x' }] } })).some((e) => e.includes('modyfikacje'))
  );
});
