/**
 * Testy renderu mapy (A1, A4, A5) bez przeglądarki: map.js jest pisany tak, by
 * dało się go sprawdzić na atrapie DOM — sprawdzamy rozmiar pinezki, pole
 * trafienia, badge etykiety i skalowanie widoku.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { szacujSzerokoscTekstu, wymiaryEtykiety, stworzMape, PROMIEN_MINIATURY } from '../app/map.js';
import { SZEROKOSC, WYSOKOSC, projektuj } from '../app/geo.js';

function stworzElement(nazwa) {
  const klasy = new Set();
  const e = {
    nazwa,
    atrybuty: {},
    dzieci: [],
    style: {},
    sluchacze: {},
    textContent: '',
    setAttribute(k, v) {
      if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((x) => klasy.add(x));
      this.atrybuty[k] = String(v);
    },
    czyMaKlase(k) {
      return klasy.has(k);
    },
    getAttribute(k) {
      return this.atrybuty[k];
    },
    appendChild(d) {
      this.dzieci.push(d);
      return d;
    },
    addEventListener(typ, fn) {
      (this.sluchacze[typ] ??= []).push(fn);
    },
    closest() {
      return null;
    },
    querySelector() {
      return null;
    },
    setPointerCapture() {},
    getBoundingClientRect() {
      return { width: 0, height: 0 };
    },
  };
  Object.defineProperty(e, 'classList', {
    value: {
      add: (...k) => k.forEach((x) => klasy.add(x)),
      remove: (...k) => k.forEach((x) => klasy.delete(x)),
      contains: (k) => klasy.has(k),
      toggle: (k, w) => {
        const naTak = w === undefined ? !klasy.has(k) : !!w;
        if (naTak) klasy.add(k);
        else klasy.delete(k);
        return naTak;
      },
    },
  });
  Object.defineProperty(e, 'innerHTML', {
    get: () => '',
    set: () => {
      e.dzieci.length = 0;
    },
  });
  return e;
}

function zaiscz(kontenerRozmiar = { width: 1600, height: 640 }) {
  globalThis.document = { createElementNS: (_ns, nazwa) => stworzElement(nazwa) };
  const kontener = {
    appendChild: (d) => d,
    getBoundingClientRect: () => ({ ...kontenerRozmiar }),
  };
  return { kontener, kontenerRozmiar };
}

const znajdz = (element, klasa) => {
  if (element.czyMaKlase?.(klasa)) return element;
  for (const d of element.dzieci ?? []) {
    const wynik = znajdz(d, klasa);
    if (wynik) return wynik;
  }
  return null;
};

test('szacujSzerokoscTekstu: rośnie z długością nazwy i mieści się w realiach 19 px', () => {
  const krotka = szacujSzerokoscTekstu('Egungun');
  const dluga = szacujSzerokoscTekstu('Dziki Gon dziki gon');
  assert.ok(krotka > 50 && krotka < 90, `Egungun ~${krotka.toFixed(1)} px`);
  assert.ok(dluga > krotka, 'dłuższy tekst = szerszy badge');
  assert.equal(szacujSzerokoscTekstu(''), 0);
});

test('wymiaryEtykiety: bez layoutu — szacunek, z layoutem — pomiar; zawsze z oddechem', () => {
  const a = wymiaryEtykiety('Egungun');
  assert.ok(a.szer >= 80 && a.szer <= 105, `szerokość ${a.szer}`);
  assert.equal(a.wys, 39, 'wysokość badge dla pisma 19 px z paddingiem');
  const mierzony = wymiaryEtykiety('Egungun', { getComputedTextLength: () => 200 });
  assert.equal(mierzony.szer, 200 + 22, 'padding po obu stronach');
  const pusty = wymiaryEtykiety('');
  assert.ok(pusty.szer > 0 && pusty.wys > 0, 'nawet pusta nazwa ma plecki');
  const psujący = wymiaryEtykiety('Egungun', { getComputedTextLength: () => { throw new Error('brak layoutu'); } });
  assert.equal(psujący.szer, a.szer, 'błąd pomiaru wraca do szacunku');
});

test('pinezka (A5): głowa ø26 px i pole trafienia ø52 px — w pikselach CSS', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([{ slug: 'egungun', nazwa: 'Egungun', lat: 7.84, lon: 3.94 }]);
  const pinezka = znajdz(mapa.svg, 'pinezka');
  assert.ok(pinezka, 'pinezka w drzewie SVG');
  const glowy = pinezka.dzieci.filter((d) => d.czyMaKlase('glowa'));
  const trafienia = pinezka.dzieci.filter((d) => d.czyMaKlase('trafienie'));
  assert.equal(glowy.length, 1);
  assert.equal(trafienia.length, 1, 'osobny element pola trafienia');
  assert.equal(Number(glowy[0].getAttribute('r')), 13, 'głowa pinezki 13 px promienia');
  assert.ok(Number(trafienia[0].getAttribute('r')) >= 2 * Number(glowy[0].getAttribute('r')), 'pole trafienia ≥ 2× głowy');
});

test('badge nazwy (A4): 19 px, plecki nad pinezką, tekst wyśrodkowany', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([{ slug: 'lincoln-imp', nazwa: 'Imp z Lincoln', lat: 53.23, lon: -0.54 }]);
  const etykieta = znajdz(mapa.svg, 'etykieta');
  assert.ok(etykieta, 'grupa etykiety');
  const rect = etykieta.dzieci.find((d) => d.nazwa === 'rect');
  const tekst = etykieta.dzieci.find((d) => d.nazwa === 'text');
  assert.equal(tekst.textContent, 'Imp z Lincoln');
  assert.ok(Number(tekst.getAttribute('y')) < 0, 'etykieta nad pinezką (ujemne y)');
  assert.ok(Number(rect.getAttribute('width')) >= 90, `szerokość pleców ${rect.getAttribute('width')}`);
  assert.ok(Number(rect.getAttribute('height')) >= 30, 'plecy mają wysokość dla pisma 19 px');
  const y0 = Number(rect.getAttribute('y'));
  const y1 = y0 + Number(rect.getAttribute('height'));
  const yTekst = Number(tekst.getAttribute('y'));
  assert.ok(y0 < yTekst && yTekst < y1, `baseline ${yTekst} musi być w pleckach [${y0}, ${y1}]`);
});

test('widok (A1): skala bazowa = contain, pinezki kompensują skalę, resize nie ucieka', () => {
  const { kontener } = zaiscz({ width: 1600, height: 640 });
  const mapa = stworzMape(kontener, {});
  const grupaSwiata = mapa.svg.dzieci.find((d) => d.czyMaKlase('swiat'));
  const oczekiwana = Math.min(1600 / SZEROKOSC, 640 / WYSOKOSC);
  assert.ok(Math.abs(mapa.skala - oczekiwana) < 1e-9, `skala ${mapa.skala}`);
  assert.match(grupaSwiata.style.transform, /^translate\(/, 'transform grupy świata');
  assert.ok(grupaSwiata.style.transform.includes(`scale(${oczekiwana})`), `transform = ${grupaSwiata.style.transform}`);

  mapa.ustawPinezki([{ slug: 'x', nazwa: 'X', lat: 0, lon: 0 }]);
  const pinezka = znajdz(mapa.svg, 'pinezka');
  const skalPinezki = Number(pinezka.getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]);
  assert.ok(Math.abs(skalPinezki - 1 / oczekiwana) < 1e-9, 'pinezka w stałym rozmiarze ekranowym');

  // zmiana kontenera (np. zamknięcie panelu) — nie może zmieniać powiększenia
  const kBefore = mapa.widok.k;
  kontener.getBoundingClientRect = () => ({ width: 900, height: 900 });
  mapa.odswiezRozmiar();
  assert.equal(mapa.widok.k, kBefore, 'zoom nie skacze przy resize');
  assert.ok(Math.abs(mapa.skala - 900 / SZEROKOSC) < 1e-9, 'nowa skala bazowa = contain kwadratowego okna (ogranicznik: szerokość)');
  assert.ok(Math.abs(mapa.widok.x - (900 - SZEROKOSC * mapa.skala) / 2) < 1e-6, 'świat wyśrodkowany w węższym oknie');
  assert.ok(Math.abs(mapa.widok.y - (900 - WYSOKOSC * mapa.skala) / 2) < 1e-6, 'i w pionie — bez ucinania bieguna');
});

test('zoom i środowanie: punkt świata zostaje pod środkiem okna', () => {
  const { kontener } = zaiscz({ width: 1200, height: 600 });
  const mapa = stworzMape(kontener, {});
  mapa.wysrodkuj(52.23, 21.01, 4, false); // Warszawa
  assert.equal(mapa.widok.k, 4);
  const s = mapa.skala;
  const [wx, wy] = projektuj(52.23, 21.01);
  assert.ok(Math.abs(mapa.widok.x + wx * s - 600) < 1e-6, 'Warszawa w środku okna (x)');
  assert.ok(Math.abs(mapa.widok.y + wy * s - 300) < 1e-6, 'Warszawa w środku okna (y)');

  mapa.zoomDoPunktu({ x: 600, y: 300 }, 2, false);
  assert.equal(mapa.widok.k, 8, 'zoom do środka nie przesuwa świata');
  assert.ok(Math.abs(mapa.widok.x + wx * mapa.skala - 600) < 1e-6, 'środek stabilny przy zoomie');

  mapa.reset();
  assert.equal(mapa.widok.k, 1);
  assert.ok(Math.abs(mapa.widok.x - (1200 - SZEROKOSC * mapa.skala) / 2) < 1e-6, 'reset = cały świat wyśrodkowany');
});

test('obsługa zdarzeń pinezki: klik i klawiatura wywołują wybór wpisu', () => {
  const { kontener } = zaiscz();
  let wywolane = [];
  const mapa = stworzMape(kontener, { przyZmianieZaznaczenia: (slug) => wywolane.push(slug) });
  mapa.ustawPinezki([{ slug: 'egungun', nazwa: 'Egungun', lat: 7.84, lon: 3.94 }]);
  const pinezka = znajdz(mapa.svg, 'pinezka');
  pinezka.sluchacze.click[0]({ stopPropagation: () => {} });
  pinezka.sluchacze.keydown[0]({ key: 'Enter', preventDefault: () => {} });
  pinezka.sluchacze.keydown[0]({ key: 'a', preventDefault: () => {} });
  assert.deepEqual(wywolane, ['egungun', 'egungun'], 'tylko klik i Enter/Spacja');
});

test('etykiety (A3, M6): warstwa badge\'ów PO pinezkach — badge nie chowa się pod pinezką', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([
    { slug: 'a', nazwa: 'A Byt', lat: 10, lon: 10 },
    { slug: 'b', nazwa: 'B Byt', lat: 10.001, lon: 10.001 },
  ]);
  const swiat = mapa.svg.dzieci.find((d) => d.czyMaKlase('swiat'));
  const indeksKlasy = (klasa) => swiat.dzieci.findIndex((d) => d.czyMaKlase(klasa));
  const iPinezki = indeksKlasy('pinezki');
  const iEtykiety = indeksKlasy('etykiety');
  assert.ok(iPinezki > -1 && iEtykiety > iPinezki, `kolejność malowania SVG: pinezki=${iPinezki}, etykiety=${iEtykiety} — etykiety muszą być PO pinezkach`);
  const pinezka = znajdz(mapa.svg, 'pinezka');
  assert.ok(!pinezka.dzieci.some((d) => d.czyMaKlase('etykieta')), 'etykieta nie siedzi w grupie pinezki — musi być nad wszystkimi pinezkami');
  assert.equal(swiat.dzieci[iEtykiety].dzieci.length, 2, 'obie etykiety w warstwie .etykiety');
});

test('etykiety (A3, M6): transform etykiety = transform pinezki (ten sam punkt świata)', () => {
  const { kontener } = zaiscz({ width: 1600, height: 640 });
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([{ slug: 'x', nazwa: 'X', lat: 0, lon: 0 }]);
  const pinezka = znajdz(mapa.svg, 'pinezka');
  const etykieta = znajdz(mapa.svg, 'etykieta');
  assert.equal(etykieta.getAttribute('transform'), pinezka.getAttribute('transform'), 'etykieta podąża za pinezką w warstwie świata');
});

test('etykiety (A1, M6): widoczna po najechaniu i po fokusu, ukryta po opuszczeniu', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([{ slug: 'x', nazwa: 'X', lat: 0, lon: 0 }]);
  const pinezka = znajdz(mapa.svg, 'pinezka');
  const etykieta = znajdz(mapa.svg, 'etykieta');
  assert.equal(etykieta.czyMaKlase('widoczna'), false, 'na starcie badge ukryty');
  pinezka.sluchacze.pointerenter[0]();
  assert.equal(etykieta.czyMaKlase('widoczna'), true, 'najechanie pokazuje badge');
  pinezka.sluchacze.pointerleave[0]();
  assert.equal(etykieta.czyMaKlase('widoczna'), false, 'opuszczenie pinezki chowa badge');
  pinezka.sluchacze.focus[0]();
  assert.equal(etykieta.czyMaKlase('widoczna'), true, 'fokus klawiatury pokazuje badge');
  pinezka.sluchacze.blur[0]();
  assert.equal(etykieta.czyMaKlase('widoczna'), false, 'utrata fokusu chowa badge');
});

test('etykiety (A1, M6): zaznaczona pinezka trzyma badge; przygaszona gaśnie razem z pinezką', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([{ slug: 'x', nazwa: 'X', lat: 0, lon: 0 }]);
  const etykieta = znajdz(mapa.svg, 'etykieta');
  mapa.zaznacz('x');
  assert.equal(etykieta.czyMaKlase('wybrana'), true, 'zaznaczona pinezka = widoczny badge');
  mapa.zaznacz(null);
  assert.equal(etykieta.czyMaKlase('wybrana'), false, 'bez zaznaczenia badge ukryty');
  mapa.podswietl(new Set());
  assert.equal(etykieta.czyMaKlase('przygaszona'), true, 'filtr przygasa badge');
  mapa.podswietl(null);
  assert.equal(etykieta.czyMaKlase('przygaszona'), false, 'bez filtra badge pełny');
});

test('podgląd powiązań (C2): najechanie zwęża łuki do połączeń pinezki i podświetla sąsiadów', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([
    { slug: 'a', nazwa: 'A', lat: 0, lon: 0 },
    { slug: 'b', nazwa: 'B', lat: 1, lon: 1 },
    { slug: 'c', nazwa: 'C', lat: 2, lon: 2 },
  ]);
  mapa.ustawPolaczenia([
    { slug: 'a', powiazania: ['b'] },
    { slug: 'c', powiazania: ['a'] },
    { slug: 'b', powiazania: ['c'] },
  ]);
  const luki = znajdz(mapa.svg, 'luki');
  const grupaPinezek = mapa.svg.dzieci.find((d) => d.czyMaKlase('swiat')).dzieci.find((d) => d.czyMaKlase('pinezki'));
  const pinSluga = (slug) => grupaPinezek.dzieci.find((d) => d.getAttribute('data-slug') === slug);
  assert.equal(luki.getAttribute('display'), 'none', 'warstwa łuków domyślnie ukryta');

  pinSluga('a').sluchacze.pointerenter[0]();
  assert.equal(luki.getAttribute('display'), 'inherit', 'podgląd odsłania warstwę łuków');
  assert.equal(luki.dzieci.length, 2, 'rysowane są tylko łuki dotykające a (a-b, c-a; b-c pominięty)');
  assert.ok(luki.dzieci.every((p) => p.czyMaKlase('aktywny')), 'łuki podglądu są aktywne');
  assert.ok(pinSluga('b').czyMaKlase('powiazana') && pinSluga('c').czyMaKlase('powiazana'), 'sąsiedzi podświetleni');
  assert.ok(!pinSluga('a').czyMaKlase('powiazana'), 'wskazana pinezka nie podświetla siebie');

  pinSluga('a').sluchacze.pointerleave[0]();
  assert.equal(luki.getAttribute('display'), 'none', 'po opuszczeniu warstwa gaśnie (stan stały wyłączony)');
  assert.ok(!pinSluga('b').czyMaKlase('powiazana'), 'podświetlenie sąsiadów znika');
  assert.equal(luki.dzieci.length, 3, 'po opuszczeniu znowu wszystkie pary powiązań');

  // stan stały (∞): podgląd zwęża, opuszczenie przywraca pełną warstwę
  mapa.przelaczLuki(true);
  assert.equal(luki.getAttribute('display'), 'inherit');
  pinSluga('a').sluchacze.pointerenter[0]();
  assert.equal(luki.dzieci.length, 2, 'podgląd zwęża łuki także przy warstwie stałej (z trzech do dwóch)');
  pinSluga('a').sluchacze.pointerleave[0]();
  assert.equal(luki.getAttribute('display'), 'inherit', 'po opuszczeniu wraca stan stały');
  assert.equal(luki.dzieci.length, 3);
  mapa.przelaczLuki(false);

  // fokus klawiatury działa jak najechanie (dostępność)
  pinSluga('a').sluchacze.focus[0]();
  assert.equal(luki.getAttribute('display'), 'inherit', 'fokus odsłania podgląd powiązań');
  assert.ok(pinSluga('c').czyMaKlase('powiazana'));
  pinSluga('a').sluchacze.blur[0]();
  assert.equal(luki.getAttribute('display'), 'none');
});

test('warstwa „rozmowy” skitu (C2): łuki uczestników w osobnej grupie, czyszczenie', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([
    { slug: 'balor', nazwa: 'Balor', lat: 55.26, lon: -8.22 },
    { slug: 'selkie-sule-skerry', nazwa: 'Selkie', lat: 59.08, lon: -4.41 },
    { slug: 'knecht-z-koptos', nazwa: 'Knecht', lat: 26.1, lon: 32.67 },
  ]);
  const rozmowa = znajdz(mapa.svg, 'rozmowa');
  assert.ok(rozmowa, 'grupa .rozmowa w drzewie SVG');
  assert.equal(rozmowa.getAttribute('display'), 'none', 'domyślnie ukryta');

  mapa.pokazRozmowe([{ a: 'balor', b: 'selkie-sule-skerry' }, { a: 'balor', b: 'knecht-z-koptos' }, { a: 'selkie-sule-skerry', b: 'knecht-z-koptos' }]);
  const luki = rozmowa.dzieci.filter((d) => d.czyMaKlase('rozmowy'));
  assert.equal(luki.length, 3, 'trzy łuki rozmowy');
  assert.ok(luki.every((l) => l.nazwa === 'path'), 'łuki to ścieżki');
  assert.ok(luki.every((l) => l.getAttribute('pathLength') === '1'), 'pathLength=1 normalizuje kreskowanie animacji');
  assert.equal(rozmowa.getAttribute('display'), 'inherit', 'warstwa widoczna po pokazaniu');

  // nieznany slug nie wysadza renderu — pomijany
  mapa.pokazRozmowe([{ a: 'balor', b: 'nie-ma-go' }]);
  assert.equal(rozmowa.dzieci.length, 0, 'para bez pinezki pomijana');
  assert.equal(rozmowa.getAttribute('display'), 'none', 'pusta rozmowa z powrotem ukryta');

  mapa.pokazRozmowe([{ a: 'balor', b: 'selkie-sule-skerry' }]);
  mapa.ukryjRozmowe();
  assert.equal(rozmowa.dzieci.length, 0, 'ukrycie czyści warstwę');
  assert.equal(rozmowa.getAttribute('display'), 'none');
});

test('medalion wizualizacji: koło 2× większe od głowy, tylko na najechanie/fokus', () => {
  const { kontener } = zaiscz();
  const mapa = stworzMape(kontener, {});
  mapa.ustawPinezki([
    { slug: 'glamr', nazwa: 'Glámr', lat: 65.31, lon: -20.13, obraz: 'assets/wizualizacje/glamr.jpg' },
    { slug: 'bez-obrazu', nazwa: 'Bez obrazu', lat: 0, lon: 0 },
  ]);
  const grupaPinezek = znajdz(mapa.svg, 'pinezki');
  const zObrazem = grupaPinezek.dzieci.find((d) => d.getAttribute('data-slug') === 'glamr');
  const bezObrazu = grupaPinezek.dzieci.find((d) => d.getAttribute('data-slug') === 'bez-obrazu');
  const miniatura = zObrazem.dzieci.find((d) => d.czyMaKlase('miniatura'));
  const ramka = zObrazem.dzieci.find((d) => d.czyMaKlase('miniatura-ramka'));

  assert.ok(miniatura, 'pinezka z obrazem dostaje medalion');
  assert.ok(ramka, 'medalion ma obwódkę');
  assert.equal(bezObrazu.dzieci.filter((d) => d.czyMaKlase('miniatura')).length, 0, 'brak obrazu = brak medalionu');
  assert.equal(bezObrazu.dzieci.filter((d) => d.czyMaKlase('miniatura-ramka')).length, 0, 'i bez pustej obwódki');

  assert.equal(PROMIEN_MINIATURY, 26, 'dwukrotność promienia głowy pinezki (13)');
  assert.equal(Number(miniatura.getAttribute('width')), 52, 'bok kadru = średnica medalionu');
  assert.equal(Number(miniatura.getAttribute('height')), 52);
  assert.equal(Number(miniatura.getAttribute('x')), -26, 'kadr wyśrodkowany na pinezce');
  assert.equal(Number(ramka.getAttribute('r')), 26);

  // Koło, nie kwadrat: maska musi istnieć w DOM, inaczej przeglądarka rysuje
  // pełny kadr (to był błąd zgłoszony przez właściciela 2026-09-05).
  assert.equal(miniatura.getAttribute('clip-path'), 'url(#przyciecie-miniatury)');
  const defs = mapa.svg.dzieci.find((d) => d.nazwa === 'defs');
  const maska = defs?.dzieci.find((d) => d.getAttribute('id') === 'przyciecie-miniatury');
  assert.ok(maska, 'clipPath medalionu jest w <defs> mapy');
  assert.equal(maska.nazwa, 'clipPath');
  assert.equal(maska.getAttribute('clipPathUnits'), 'objectBoundingBox');
  const kolo = maska.dzieci[0];
  assert.equal(kolo.nazwa, 'circle');
  assert.equal(Number(kolo.getAttribute('r')), 0.5, 'maska to koło wpisane w kadr');

  // Zachowanie: jak badge z nazwą — dopiero na najechaniu, i wtedy ładuje plik.
  assert.equal(miniatura.getAttribute('href'), undefined, 'plik nie ładuje się przy rysowaniu mapy');
  assert.equal(zObrazem.czyMaKlase('z-miniatura'), false, 'spoczynek: medalion schowany');
  zObrazem.sluchacze.pointerenter[0]();
  assert.equal(zObrazem.czyMaKlase('z-miniatura'), true, 'najechanie pokazuje medalion');
  assert.equal(miniatura.getAttribute('href'), 'assets/wizualizacje/glamr.jpg', 'obraz dociągany leniwie');
  zObrazem.sluchacze.pointerleave[0]();
  assert.equal(zObrazem.czyMaKlase('z-miniatura'), false, 'zjechanie chowa medalion');
  zObrazem.sluchacze.focus[0]();
  assert.equal(zObrazem.czyMaKlase('z-miniatura'), true, 'fokus klawiatury działa jak najechanie');
  zObrazem.sluchacze.blur[0]();
  assert.equal(zObrazem.czyMaKlase('z-miniatura'), false);

  // Bez obrazu nic się nie włącza — klasa nie pojawia się nawet na najechaniu.
  bezObrazu.sluchacze.pointerenter[0]();
  assert.equal(bezObrazu.czyMaKlase('z-miniatura'), false, 'pinezka bez obrazu nie miga pustą obwódką');
});

test('klastrowanie (BACKLOG, obrót 4): gniazdo zamiast plamy pinezek, klik przybliża', () => {
  const { kontener } = zaiscz({ width: 1200, height: 600 });
  const mapa = stworzMape(kontener, {});
  // Trzy byty z jednego regionu (Grecja) + jeden daleki (Japonia).
  mapa.ustawPinezki([
    { slug: 'sfinks-teby', nazwa: 'Sfinga z Teb', lat: 38.32, lon: 23.28 },
    { slug: 'empusa-korynt', nazwa: 'Empusa', lat: 37.94, lon: 22.93 },
    { slug: 'nessos', nazwa: 'Nessos', lat: 38.4, lon: 22.9 },
    { slug: 'kannon-hase', nazwa: 'Kannon', lat: 35.31, lon: 139.53 },
  ]);
  const grupaKlastrow = mapa.svg.dzieci
    .find((d) => d.czyMaKlase('swiat'))
    .dzieci.find((d) => d.czyMaKlase('klastry'));
  assert.ok(grupaKlastrow, 'osobna warstwa klastrów w drzewie świata');
  const klaster = grupaKlastrow.dzieci.find((d) => d.czyMaKlase('klaster'));
  assert.ok(klaster, 'trzy greckie pinezki w oddaleniu tworzą jedno gniazdo');
  assert.equal(klaster.getAttribute('data-ile'), '3');
  assert.match(klaster.getAttribute('aria-label'), /Skupisko: 3 manifestacje/);
  assert.equal(klaster.dzieci.find((d) => d.nazwa === 'text').textContent, '3');
  assert.equal(klaster.getAttribute('role'), 'button');
  assert.equal(klaster.getAttribute('tabindex'), '0');

  const znajdzPinezke = (slug) => {
    const grupa = mapa.svg.dzieci.find((d) => d.czyMaKlase('swiat')).dzieci.find((d) => d.czyMaKlase('pinezki'));
    return grupa.dzieci.find((d) => d.getAttribute('data-slug') === slug);
  };
  assert.equal(znajdzPinezke('sfinks-teby').czyMaKlase('w-klastrze'), true, 'pinezka w gnieździe znika');
  assert.equal(znajdzPinezke('kannon-hase').czyMaKlase('w-klastrze'), false, 'daleki byt zostaje pinezką');

  // Klik w gniazdo przybliża — po zoomie klaster musi zniknąć.
  const kPrzed = mapa.widok.k;
  klaster.sluchacze.click[0]({ stopPropagation: () => {} });
  assert.ok(mapa.widok.k > kPrzed, 'klik w gniazdo przybliża mapę');
  assert.ok(mapa.widok.k >= 6, 'klik przeskakuje próg klastrowania, żeby gniazdo na pewno pękło');
  const poZoomie = mapa.svg.dzieci
    .find((d) => d.czyMaKlase('swiat'))
    .dzieci.find((d) => d.czyMaKlase('klastry'));
  assert.equal(poZoomie.dzieci.length, 0, 'przy dużym przybliżeniu gniazd nie ma');
  assert.equal(znajdzPinezke('sfinks-teby').czyMaKlase('w-klastrze'), false, 'pinezki wracają');
});
