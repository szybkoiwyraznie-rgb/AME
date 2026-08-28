/**
 * app/app.js — bootstrap AME: ładuje indeks, mapę świata, spina UI.
 */
import { stworzMape, PROGI_WARSTW } from './map.js?v=mercator-1';
import { zaladujIndeks, zaladujWpis, zaladujSkit, dopasowania, wylosujSlug } from './data.js?v=mercator-1';
import {
  htmlWpisu,
  htmlWarstwyWpisu,
  htmlListy,
  htmlTagow,
  nazwaKategorii,
  htmlBazySkitow,
  htmlSkitu,
  htmlNowosci,
  przyciskKopiowania,
  linkWidoku,
  esc,
  tagZFragmantu,
  nastepnyMotyw,
  motywPoczatkowy,
  etykietaMotywu,
  KLUCZ_MOTYWU,
} from './ui.js?v=mercator-1';
import { SZEROKOSC, WYSOKOSC } from './geo.js?v=mercator-1';

const $ = (sel) => document.querySelector(sel);

const stan = {
  indeks: null,
  wpis: null, // aktualnie otwarty wpis (pełny JSON)
  filtr: null, // Set<slug> | null
  aktywnyTag: null,
  luki: false,
  motyw: 'ciemny',
  warstwa: null, // { tryb: 'skity' | 'skit' | 'nowosci', slug? }
  ostatniLos: null, // ostatnio wylosowany slug — reroll go pomija (nawet po zamknięciu karty)
  warstwy: { rzeki: true, jeziora: true, miasta: true, poi: false }, // włączone przełącznikami
  zaladowane: { rzeki: false, jeziora: false, miasta: false, poi: false },
  panelWarstw: false,
};

let mapa;

/* ---- Motyw jasny/ciemny (A2): żywa zmiana CSS, wybór zapamiętany ---- */

function czytajMotyw() {
  try {
    return localStorage.getItem(KLUCZ_MOTYWU);
  } catch {
    return null; // tryb prywatny / file:// — decyzja tylko na tę sesję
  }
}

function zapiszMotyw(motyw) {
  try {
    localStorage.setItem(KLUCZ_MOTYWU, motyw);
  } catch {
    /* pamiec niedostępna — ignorujemy, UI i tak przełącza */
  }
}

function zastosujMotyw(motyw) {
  stan.motyw = motyw;
  document.documentElement.dataset.motyw = motyw;
  const przycisk = $('#przycisk-motyw');
  if (!przycisk) return;
  const etykieta = etykietaMotywu(motyw);
  przycisk.textContent = `${etykieta.ikona} ${etykieta.tekst}`;
  przycisk.title = etykieta.aria;
  przycisk.setAttribute('aria-label', etykieta.aria);
  przycisk.setAttribute('aria-pressed', String(motyw === 'jasny'));
}

function pasujace() {
  let zbior = stan.filtr;
  if (stan.aktywnyTag) {
    const zTagu = new Set(stan.indeks.tagi[stan.aktywnyTag]?.wpisy ?? []);
    zbior = zbior ? new Set([...zbior].filter((s) => zTagu.has(s))) : zTagu;
  }
  return zbior;
}

function odswiezFiltr() {
  const zbior = pasujace();
  mapa.podswietl(zbior);
  odswiezLicznik(zbior);
  if (stan.wpis && zbior && !zbior.has(stan.wpis.slug)) zamknijWpis(false);
}

/** Ustawia aktywny tag (C2, deep-link #tag:…) i odświeża pasek + filtr. */
function zastosujTag(tag) {
  const istniejacy = tag && stan.indeks.tagi[tag] ? tag : null;
  stan.aktywnyTag = istniejacy;
  $('#tagi').innerHTML = htmlTagow(stan.indeks, stan.aktywnyTag);
  odswiezFiltr();
}

function odswiezLicznik(zbior = null) {
  const n = zbior === null ? stan.indeks.liczba : zbior.size;
  const skitow = stan.indeks.skity?.length ?? 0;
  const kategoria = stan.aktywnyTag ? ` · filtr: ${nazwaKategorii(stan.indeks, stan.indeks.tagi[stan.aktywnyTag]?.kategoria)}` : '';
  $('#status').textContent =
    `${n} ${n === 1 ? 'manifestacja' : 'manifestacji'} · ${Object.keys(stan.indeks.tagi).length} tagów · ${skitow} ${
      skitow === 1 ? 'skit' : 'skitów'
    }${kategoria}`;
}

let punktPowrotu = null; // element, który otworzył kartotekę (fokus po zamknięciu)

async function otworzWpis(slug, { przewin = true } = {}) {
  const panel = $('#panel');
  const rekord = stan.indeks.manifestacje.find((m) => m.slug === slug);
  if (!rekord) return;
  if (!stan.wpis) punktPowrotu = document.activeElement;
  if (stan.warstwa) zamknijWarstwe();
  panel.classList.add('otwarty');
  panel.setAttribute('aria-busy', 'true');
  panel.innerHTML = '<p class="ladowanie">Wczytywanie kartoteki…</p>';
  try {
    const wpis = await zaladujWpis(slug);
    stan.wpis = wpis;
    panel.innerHTML = htmlWarstwyWpisu(htmlWpisu(wpis, stan.indeks), { slug: wpis.slug, nazwa: wpis.nazwa });
    panel.scrollTop = 0;
    panel.querySelector('.warstwa-wpisu')?.focus?.();
    mapa.zaznacz(slug);
    // Kartoteka to pełnoekranowa warstwa (B2), więc mapę środkujemy „na zapas” —
    // po zamknięciu pinezka zostanie pod środkiem okna.
    if (przewin) mapa.wysrodkuj(rekord.lat, rekord.lon, Math.max(mapa.widok.k, 3.2));
    if (location.hash !== `#${slug}`) history.replaceState(null, '', `#${slug}`);
  } catch (err) {
    panel.innerHTML = htmlWarstwyWpisu(`<p class="blad">Nie udało się wczytać wpisu: ${esc(err.message)}</p>`, { slug });
  } finally {
    panel.setAttribute('aria-busy', 'false');
  }
}

function zamknijWpis(czyscHash = true) {
  stan.wpis = null;
  $('#panel').classList.remove('otwarty');
  $('#panel').innerHTML = '';
  mapa.zaznacz(null);
  if (czyscHash && location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (punktPowrotu?.focus) punktPowrotu.focus();
  punktPowrotu = null;
}

/* ---- Warstwa pomocnicza: Baza Skitów, widok SKITa, „Co nowego” ---- */

/* Kopiowanie adresu widoku (kartoteka, skit, feed). Brak Clipboard API
 * (file:// albo odmowa uprawnień) nie psuje UI: przycisk mówi, co zrobić. */
function kopiujLink(cel, przycisk) {
  const adres = linkWidoku(location.origin + location.pathname, cel);
  const pokaz = (ok) => {
    przycisk.textContent = ok ? 'skopiowano ✓' : 'zaznacz i skopiuj';
    setTimeout(() => (przycisk.textContent = '⧉ kopiuj link'), 1800);
  };
  if (!navigator.clipboard?.writeText) return pokaz(false);
  navigator.clipboard.writeText(adres).then(() => pokaz(true), () => pokaz(false));
}


function szkicWarstwy(tytul, trescHtml, { wroc = null, kopia = null } = {}) {
  return `<div class="warstwa-tresc">
    <header>
      <h2>${esc(tytul)}</h2>
      <div class="akcje-warstwy">
        ${kopia ? `<button class="chip kopiuj-link" type="button" data-kopia="${esc(kopia)}" title="Kopiuj adres tego widoku">⧉ kopiuj link</button>` : ''}
        ${wroc ? `<button class="chip" type="button" data-wroc="${esc(wroc)}">← ${esc(wroc === 'skity' ? 'Baza skitów' : 'wróć')}</button>` : ''}
        <button class="zamknij" id="zamknij-warstwe" type="button" aria-label="Zamknij">✕</button>
      </div>
    </header>
    ${trescHtml}
  </div>`;
}

function zamknijWarstwe() {
  stan.warstwa = null;
  const warstwa = $('#warstwa');
  warstwa.classList.remove('otwarta');
  warstwa.innerHTML = '';
  for (const id of ['#przycisk-skity', '#przycisk-nowosci']) warstwaTrybPrzycisku(id, false);
  if (stan.wpis) history.replaceState(null, '', `#${stan.wpis.slug}`);
  else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

function warstwaTrybPrzycisku(sel, aktywny) {
  const btn = $(sel);
  if (!btn) return;
  btn.classList.toggle('aktywny', aktywny);
  btn.setAttribute('aria-pressed', String(aktywny));
}

function otworzBazeSkitow() {
  if (stan.warstwa?.tryb === 'skity') return zamknijWarstwe();
  stan.warstwa = { tryb: 'skity' };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy('Baza Skitów — rozmowy materializacji', htmlBazySkitow(stan.indeks), { kopia: 'skity' });
  warstwa.scrollTop = 0;
  warstwaTrybPrzycisku('#przycisk-skity', true);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  if (location.hash !== '#skity') history.replaceState(null, '', '#skity');
}

function otworzNowosci() {
  if (stan.warstwa?.tryb === 'nowosci') return zamknijWarstwe();
  stan.warstwa = { tryb: 'nowosci' };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy(
    'Co nowego',
    `<p class="naprowadzenie">Każda zmiana w treści archiwum trafia tu automatycznie — z ` +
      `meta wpisów i skitów, najnowsze na górze.</p>${htmlNowosci(stan.indeks)}`,
    { kopia: 'nowosci' }
  );
  warstwa.scrollTop = 0;
  warstwaTrybPrzycisku('#przycisk-nowosci', true);
  warstwaTrybPrzycisku('#przycisk-skity', false);
  if (location.hash !== '#nowosci') history.replaceState(null, '', '#nowosci');
}

async function otworzSkit(slug, { zBazy = true } = {}) {
  stan.warstwa = { tryb: 'skit', slug };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy('SKIT', '<p class="ladowanie">Wczytywanie tekstu…</p>', zBazy ? { wroc: 'skity' } : {});
  warstwaTrybPrzycisku('#przycisk-skity', true);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  try {
    const skit = await zaladujSkit(slug);
    warstwa.innerHTML = szkicWarstwy('Baza Skitów', htmlSkitu(skit, stan.indeks), {
      wroc: zBazy ? 'skity' : null,
      kopia: `skit:${slug}`,
    });
    warstwa.scrollTop = 0;
    if (location.hash !== `#skit:${slug}`) history.replaceState(null, '', `#skit:${slug}`);
  } catch (err) {
    warstwa.innerHTML = szkicWarstwy('Baza Skitów', `<p class="blad">Nie udało się wczytać skitu: ${esc(err.message)}</p>`, { wroc: 'skity' });
  }
}

/** Wpis lub skit wskazany przez feed / sekcję VI. */
async function przejdijDo(link) {
  const tekst = String(link ?? '');
  if (tekst.startsWith('skit:')) return otworzSkit(tekst.slice(5));
  if (tekst) return otworzWpis(tekst);
}

/**
 * „Wylosuj” (tryb ekspedycji): losuje manifestację z aktualnie widocznej puli
 * (filtr + tag zawężają zbiór; brak filtra = wszystkie), pomija otwarty wpis
 * i przelatuje do niej na mapie, otwierając kartotekę. Zamyka warstwę/listę,
 * żeby los był widoczny na mapie.
 */
function losujManifestacje() {
  const widoczne = pasujace();
  const pula = widoczne ? [...widoczne] : stan.indeks.manifestacje.map((m) => m.slug);
  // Pomijamy ostatni los (a nie tylko aktualnie otwarty wpis) — po zamknięciu
  // karty Escape'em `stan.wpis` znika, więc bez tego reroll mógłby trafić w to
  // samo. Dwa kliknięcia z rzędu zawsze dają inną manifestację.
  const slug = wylosujSlug(pula, { pomin: stan.wpis?.slug ?? stan.ostatniLos });
  if (!slug) return;
  stan.ostatniLos = slug;
  if (stan.warstwa) zamknijWarstwe();
  if ($('#lista').classList.contains('otwarta')) przelaczListe();
  otworzWpis(slug, { przewin: true });
}

/** Ładuje i rysuje rzeki (kiedy użytkownik wejdzie w wymagany zoom). */
async function zaladujRzeki() {
  if (stan.zaladowane.rzeki) return;
  stan.zaladowane.rzeki = true;
  try {
    const data = await fetch(new URL('assets/map/rivers-2km5.json', document.baseURI)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    mapa.ustawRzeki(data);
  } catch {
    /* warstwa opcjonalna — mapa zostaje na państwach i pinezkach */
  }
}

/** Ładuje i rysuje jeziora (ten sam próg zoomu co rzeki). */
async function zaladujJeziora() {
  if (stan.zaladowane.jeziora) return;
  stan.zaladowane.jeziora = true;
  try {
    const data = await fetch(new URL('assets/map/lakes-2km5.json', document.baseURI)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    mapa.ustawJeziora(data);
  } catch {
    /* opcjonalna */
  }
}

/** Ładuje i rysuje miasta (punkty o populacji ≥100 tys. lub stolice). */
async function zaladujMiasta() {
  if (stan.zaladowane.miasta) return;
  stan.zaladowane.miasta = true;
  try {
    const data = await fetch(new URL('assets/map/miasta.json', document.baseURI)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    mapa.ustawMiasta(data);
  } catch {
    /* opcjonalna */
  }
}

/** LOD (ADR 0020): przy zoobie powyżej progu dojadą warstwy danych tematycznych. */
function odswiezWarstwyDane(k) {
  if (k < PROGI_WARSTW.woda || !mapa) return;
  if (stan.warstwy.rzeki && !stan.zaladowane.rzeki) zaladujRzeki();
  if (stan.warstwy.jeziora && !stan.zaladowane.jeziora) zaladujJeziora();
  if (stan.warstwy.miasta && !stan.zaladowane.miasta) zaladujMiasta();
}

/** Przełącznik panelu „warstwy” na mapie. */
function przelaczPanelWarstw() {
  const panel = $('#warstwy-panel');
  stan.panelWarstw = !stan.panelWarstw;
  panel.hidden = !stan.panelWarstw;
  $('#przycisk-warstwy').setAttribute('aria-pressed', String(stan.panelWarstw));
}

function przelaczListe() {
  const lista = $('#lista');
  const otwarta = lista.classList.toggle('otwarta');
  if (otwarta) {
    lista.innerHTML = `<div class="lista-tresc">
        <header><h2>Kartoteka manifestacji</h2><button class="zamknij" id="zamknij-liste" aria-label="Zamknij">✕</button></header>
        ${htmlListy(stan.indeks, pasujace())}
      </div>`;
  }
}

function podepnijZdarzenia() {
  $('#szukaj').addEventListener('input', (e) => {
    stan.filtr = dopasowania(stan.indeks, e.target.value);
    odswiezFiltr();
  });

  $('#tagi').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    const nastepny = stan.aktywnyTag === tag ? null : tag;
    zastosujTag(nastepny);
    // C2: filtr tagu jest adresowalny — zapisz go w hashu.
    if (nastepny) history.replaceState(null, '', `#tag:${nastepny}`);
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });

  $('#panel').addEventListener('click', (e) => {
    if (e.target.closest('#zamknij-wpis')) return zamknijWpis();
    const kopia = e.target.closest('[data-kopia]');
    if (kopia) return kopiujLink(kopia.dataset.kopia, kopia);
    const cel = e.target.closest('[data-slug], [data-skit]');
    if (cel) {
      if (cel.hasAttribute('data-skit')) otworzSkit(cel.dataset.skit);
      else otworzWpis(cel.dataset.slug);
      return;
    }
    const tag = e.target.closest('[data-tag]');
    if (tag) {
      zastosujTag(tag.dataset.tag);
      history.replaceState(null, '', `#tag:${tag.dataset.tag}`);
      zamknijWpis(false);
      return;
    }
    const kopiuj = e.target.closest('.kopiuj');
    if (kopiuj && stan.wpis) {
      const prompt = stan.wpis.wizualizacja?.prompt ?? '';
      navigator.clipboard?.writeText(prompt).then(
        () => {
          kopiuj.textContent = 'Skopiowano ✓';
          setTimeout(() => (kopiuj.textContent = 'Skopiuj prompt'), 1600);
        },
        () => {
          kopiuj.textContent = 'Zaznacz prompt ręcznie';
        }
      );
    }
  });

  $('#lista').addEventListener('click', (e) => {
    if (e.target.closest('#zamknij-liste')) return przelaczListe();
    const wiersz = e.target.closest('[data-slug]');
    if (wiersz) {
      przelaczListe();
      otworzWpis(wiersz.dataset.slug);
    }
  });

  $('#przycisk-los').addEventListener('click', losujManifestacje);
  $('#przycisk-lista').addEventListener('click', przelaczListe);
  $('#przycisk-skity').addEventListener('click', otworzBazeSkitow);
  $('#przycisk-nowosci').addEventListener('click', otworzNowosci);
  $('#przycisk-warstwy').addEventListener('click', przelaczPanelWarstw);
  for (const klucz of ['rzeki', 'jeziora', 'miasta', 'poi']) {
    const el = document.querySelector(`#warstwa-${klucz}`);
    if (!el) continue;
    el.addEventListener('change', (e) => {
      stan.warstwy[klucz] = e.target.checked;
      mapa.przelaczWidocznoscWarstwy(klucz, e.target.checked);
      if (e.target.checked) odswiezWarstwyDane(mapa.widok.k); // dojedź warstwę po włączeniu
    });
  }

  $('#warstwa').addEventListener('click', (e) => {
    if (e.target.closest('#zamknij-warstwe')) return zamknijWarstwe();
    // Jeden closest() z listą atrybutów: wygoda dla użytkownika = trafienie w
    // najbliższy element, nie w jego kontekst (chip uczestnika siedzi w <article data-skit>).
    const kopia = e.target.closest('[data-kopia]');
    if (kopia) return kopiujLink(kopia.dataset.kopia, kopia);
    const cel = e.target.closest('[data-wroc], [data-link], [data-slug], [data-skit]');
    if (!cel) return;
    if (cel.hasAttribute('data-wroc')) {
      return cel.dataset.wroc === 'skity' ? otworzBazeSkitow() : zamknijWarstwe();
    }
    if (cel.hasAttribute('data-link')) return przejdijDo(cel.dataset.link);
    if (cel.hasAttribute('data-slug')) return otworzWpis(cel.dataset.slug, { przewin: true });
    return otworzSkit(cel.dataset.skit);
  });

  $('#przycisk-motyw').addEventListener('click', () => {
    const nowy = nastepnyMotyw(stan.motyw);
    zapiszMotyw(nowy);
    zastosujMotyw(nowy);
  });

  $('#przycisk-luki').addEventListener('click', (e) => {
    stan.luki = !stan.luki;
    mapa.przelaczLuki(stan.luki);
    e.currentTarget.classList.toggle('aktywny', stan.luki);
    e.currentTarget.setAttribute('aria-pressed', String(stan.luki));
  });

  const srodek = { x: SZEROKOSC / 2, y: WYSOKOSC / 2 };
  $('#zoom-in').addEventListener('click', () => mapa.zoomDoPunktu(srodek, 1.6, true));
  $('#zoom-out').addEventListener('click', () => mapa.zoomDoPunktu(srodek, 1 / 1.6, true));
  $('#zoom-reset').addEventListener('click', () => mapa.reset());

  window.addEventListener('hashchange', () => {
    const fragment = decodeURIComponent(location.hash.replace(/^#/, ''));
    const tag = tagZFragmantu(fragment);
    if (tag) {
      // C2: deep-link do filtra tagów; nieznany tag tylko czyści filtr.
      zastosujTag(stan.indeks.tagi[tag] ? tag : null);
      return;
    }
    if (fragment.startsWith('skit:')) {
      const slug = fragment.slice(5);
      if (stan.indeks.skity?.some((s) => s.slug === slug)) otworzSkit(slug, { zBazy: true });
      return;
    }
    if (fragment === 'skity') return stan.warstwa?.tryb !== 'skity' ? otworzBazeSkitow() : undefined;
    if (fragment === 'nowosci') return stan.warstwa?.tryb !== 'nowosci' ? otworzNowosci() : undefined;
    if (fragment && fragment !== stan.wpis?.slug && stan.indeks.manifestacje.some((m) => m.slug === fragment)) {
      otworzWpis(fragment, { przewin: false });
    } else if (!fragment && stan.wpis) zamknijWpis(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (stan.warstwa) return zamknijWarstwe();
      if ($('#lista').classList.contains('otwarta')) przelaczListe();
      else if (stan.wpis) zamknijWpis();
    }
  });
}

async function start() {
  zastosujMotyw(
    motywPoczatkowy({
      zapisany: czytajMotyw(),
      woliJasny: typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches,
    })
  );
  if (location.protocol === 'file:') {
    $('#baner').innerHTML = `Otwarto plik przez <code>file://</code> — przeglądarka blokuje wczytywanie danych.
      Uruchom lokalny serwer: <code>python3 -m http.server 8000</code> i otwórz <code>http://localhost:8000</code>.
      Na GitHub Pages aplikacja działa bez serwera.`;
    $('#baner').classList.add('widoczny');
  }
  try {
    stan.indeks = await zaladujIndeks();
  } catch (err) {
    $('#blad-startowy').innerHTML = `Nie udało się wczytać <code>data/index.json</code>: ${esc(err.message)}.
      Uruchom <code>npm run build</code> i odśwież stronę.`;
    $('#blad-startowy').classList.add('widoczny');
    return;
  }
  mapa = stworzMape($('#mapa'), {
    przyZmianieZaznaczenia: (slug) => otworzWpis(slug, { przewin: false }),
    przyZmianieWidoku: (k) => odswiezWarstwyDane(k),
  });
  try {
    const topo = await fetch(new URL('assets/map/countries-50m.json', document.baseURI)).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    mapa.ustawMapeSwiata(topo);
  } catch {
    $('#blad-startowy').innerHTML = 'Nie udało się wczytać mapy świata (assets/map/countries-50m.json).';
    $('#blad-startowy').classList.add('widoczny');
  }
  mapa.ustawPinezki(stan.indeks.manifestacje);
  mapa.ustawPolaczenia(stan.indeks.manifestacje);
  const fragment = decodeURIComponent(location.hash.replace(/^#/, ''));
  const tagStartu = tagZFragmantu(fragment);
  $('#tagi').innerHTML = htmlTagow(stan.indeks, tagStartu && stan.indeks.tagi[tagStartu] ? tagStartu : null);
  stan.aktywnyTag = tagStartu && stan.indeks.tagi[tagStartu] ? tagStartu : null;
  odswiezLicznik();
  podepnijZdarzenia();
  odswiezFiltr();

  if (fragment.startsWith('skit:')) {
    const slug = fragment.slice(5);
    if (stan.indeks.skity?.some((s) => s.slug === slug)) otworzSkit(slug);
  } else if (fragment === 'skity') otworzBazeSkitow();
  else if (fragment === 'nowosci') otworzNowosci();
  else if (fragment && stan.indeks.manifestacje.some((m) => m.slug === fragment)) otworzWpis(fragment, { przewin: true });
}

start();
