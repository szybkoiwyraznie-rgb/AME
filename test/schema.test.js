import test from 'node:test';
import assert from 'node:assert/strict';
import { walidujWpis, walidujPowiazania, POWIAZANIE_MIN_SLOW, RAMA_OTWARCIA, RAMA_ZAMKNIECIA, REZERWOWANE_SLUGI } from '../tools/rebuild-index.mjs';
import { wpisWzorzec, ustaw } from './fixtures/wpis-wzorzec.js';

test('wzorzec przechodzi walidację bez błędów', () => {
  assert.deepEqual(walidujWpis(wpisWzorzec()), []);
});

test('slug: zarezerwowane nazwy widoków nie mogą być bytami (routing hash)', () => {
  for (const slug of REZERWOWANE_SLUGI) {
    assert.ok(walidujWpis(wpisWzorzec({ slug })).some((e) => e.includes('zarezerwowany')), slug);
  }
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
  assert.ok(walidujPowiazania(ustaw(w, { powiazania: [{ slug: 'byt-testowy', opis: 'sam ze sobą uzasadniony długim zdaniem które ma na pewno ponad dwanaście słów treści' }] }), new Set(['byt-testowy'])).some((e) => e.includes('self-link')));
  assert.ok(walidujPowiazania(ustaw(w, { powiazania: [{ slug: 'nie_ma_go', opis: 'x' }] }), new Set(['byt-testowy'])).some((e) => e.includes('nie istnieje')));
});

test('powiązania: opis musi być zdaniem, nie etykietą ani linkiem (ADR 0019)', () => {
  const w = wpisWzorzec();
  const zbior = new Set(['byt-testowy', 'inny']);
  // za krótki: jedno-dwa słowa
  assert.ok(
    walidujPowiazania(ustaw(w, { powiazania: [{ slug: 'inny', opis: 'złe oko' }] }), zbior).some((e) => e.includes('za krótki')),
    'opis w kilka słów jest odrzucany'
  );
  // sam adres www
  assert.ok(
    walidujPowiazania(ustaw(w, { powiazania: [{ slug: 'inny', opis: 'https://example.com/artykul-o-powiazaniu' }] }), zbior).some((e) => e.includes('sam adres')),
    'goły link jest odrzucany'
  );
  // dobre, długie zdanie uzasadniające
  assert.deepEqual(
    walidujPowiazania(
      ustaw(w, { powiazania: [{ slug: 'inny', opis: 'oba byty wiąże ten sam wypowiedziany warunek i oba w końcu przegrywają go w kalendarzu, bo termin wyprzedza przeznaczenie' }] }),
      zbior
    ),
    [],
    'zdanie ≥12 słów przechodzi'
  );
});

test('próg opisu powiązania jest jeden: kod = protokół (ADR 0019)', async () => {
  const fs = await import('node:fs/promises');
  assert.equal(POWIAZANIE_MIN_SLOW, 12, 'walidator: min. 12 słów');
  const prot = await fs.readFile('docs/PROTOKOL.md', 'utf8');
  assert.match(prot, /12 słów/, 'PROTOKÓŁ §6.2 cytuje ten sam próg');
});

test('meta: format dat i struktura modyfikacji', () => {
  assert.ok(walidujWpis(wpisWzorzec({ meta: { utworzono: '27-08-2026', modyfikacje: [] } })).some((e) => e.includes('utworzono')));
  assert.ok(
    walidujWpis(wpisWzorzec({ meta: { utworzono: '2026-08-27', modyfikacje: [{ data: 'jutro', opis: 'x' }] } })).some((e) => e.includes('modyfikacje'))
  );
});

test('meta (ADR 0017): data z godziną RRRR-MM-DD GG:MM jest legalna, zła godzina nie', () => {
  const zGodzina = { utworzono: '2026-08-28 14:32', modyfikacje: [{ data: '2026-08-28 16:05', opis: 'dopisane źródło' }] };
  assert.deepEqual(walidujWpis(wpisWzorzec({ meta: zGodzina })), [], 'data z godziną przechodzi');
  const zle = ['2026-08-28 24:00', '2026-08-28 12:60', '2026-08-28T12:00', '2026-08-28 9:15', '2026-08-28  12:00', '2026-08-28 12:00:00'];
  for (const data of zle) {
    assert.ok(
      walidujWpis(wpisWzorzec({ meta: { utworzono: '2026-08-28', modyfikacje: [{ data, opis: 'x' }] } })).some((e) => e.includes('modyfikacje')),
      `odrzucane: ${data}`
    );
  }
});

test('dokumentacja: url musi być adresem www i musi się pojawić choć raz (B3)', () => {
  const bezLinkow = wpisWzorzec();
  bezLinkow.dokumentacja = [{ typ: 'książka', pozycja: 'Autor, Tytuł (2000)' }];
  assert.ok(bezLinkow.dokumentacja.length === 1);
  assert.ok(
    walidujWpis(bezLinkow).some((e) => e.includes('co najmniej jedno źródło musi mieć url')),
    'brak jakiegokolwiek linku = wpis nieobronny (ADR 0008)'
  );

  const zlyUrl = wpisWzorzec();
  zlyUrl.dokumentacja = [{ typ: 'książka', pozycja: 'X', url: 'ftp://example.org/x' }];
  assert.ok(walidujWpis(zlyUrl).some((e) => e.includes('pełnym adresem http(s)')));

  const dziwnyUrl = wpisWzorzec();
  dziwnyUrl.dokumentacja = [{ typ: 'książka', pozycja: 'X', url: 'https://' }];
  assert.ok(walidujWpis(dziwnyUrl).some((e) => e.includes('pełnym adresem http(s)')));

  const czesciowo = wpisWzorzec();
  czesciowo.dokumentacja = [
    { typ: 'książka', pozycja: 'X' },
    { typ: 'www', pozycja: 'Y', url: 'https://example.org/y' },
  ];
  assert.deepEqual(walidujWpis(czesciowo), [], 'wystarczy jedno źródło z linkiem — reszta może być papierowa');
});
