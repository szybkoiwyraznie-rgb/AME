/**
 * app/app.js — bootstrap AME: ładuje indeks, mapę świata, spina UI.
 */
import { stworzMape, PROGI_WARSTW, PODKLADY_ONLINE } from './map.js?v=c6-11';
import { zaladujIndeks, zaladujWpis, zaladujSkit, dopasowania, wylosujSlug, slugDnia } from './data.js?v=c6-11';
import {
  htmlWpisu,
  htmlWarstwyWpisu,
  htmlListy,
  htmlStronyTagu,
  htmlTagow,
  nazwaKategorii,
  htmlBazySkitow,
  htmlSkitu,
  htmlNowosci,
  htmlKronik,
  przyciskKopiowania,
  linkWidoku,
  esc,
  tagZFragmantu,
  nastepnyMotyw,
  motywPoczatkowy,
  etykietaMotywu,
  KLUCZ_MOTYWU,
  akcjeZZapytania,
  tekstDoLektora,
  htmlTrofeow,
  htmlSplotu,
  htmlProgow,
  paryRozmowySkitu,
  zB64utf8,
} from './ui.js?v=c6-11';
import { rozegrajDroge } from './splot.js?v=c6-11';
import { tablicaProgow, kluczeDlaBytu, rozegrajProg } from './prog.js?v=c6-11';
import { profileKartoteki } from './arena.js?v=c6-11';
import { SZEROKOSC, WYSOKOSC, odwroc, projektuj, serializujWidok, parsujWidokMapy } from './geo.js?v=c6-11';

const $ = (sel) => document.querySelector(sel);

const stan = {
  indeks: null,
  wpis: null, // aktualnie otwarty wpis (pełny JSON)
  skit: null, // aktualnie otwarty SKIT (pełny JSON) — źródło tekstu lektora
  filtr: null, // Set<slug> | null
  aktywnyTag: null,
  luki: false,
  motyw: 'ciemny',
  warstwa: null, // { tryb: 'skity' | 'skit' | 'nowosci', slug? }
  ostatniLos: null, // ostatnio wylosowany slug — reroll go pomija (nawet po zamknięciu karty)
  sortListy: 'az', // sortowanie kartoteki: 'az' | 'zmiana' | 'kraj'
  // Wszystkie warstwy mapy są domyślnie WYŁĄCZONE (decyzja właściciela 2026-08-30).
  warstwy: {
    rzeki: false, jeziora: false, miasta: false, poi: false,
    historia: false, hipsometria: false, podklad: null,
  },
  kronika: null, // podsumowanie Kroniki (summary.json) — ładowane raz przy otwarciu feedu
  zaladowane: {
    rzeki: false, jeziora: false, miasta: false, poi: false,
    historia: false, hipsometria: false,
  },
  panelWarstw: false,
};

/** Gdzie szukać danych warstwy i jak je narysować (ADR 0020 / M1–M3). */
/** Zapis stanu mapy (D, 2026-08-30): wybrane warstwy + ostatni widok (środek
 *  świata i powiększenie). Osobne klucze; odczyt odporny na brak/dane z innych
 *  wersji aplikacji. */
const KLUCZ_WARSTW_MAPY = 'ame:mapa:warstwy';
const KLUCZ_WIDOKU_MAPY = 'ame:mapa:widok';
let timerZapisuWidoku = null;

function zapiszWarstwyMapy() {
  try {
    localStorage.setItem(KLUCZ_WARSTW_MAPY, JSON.stringify(stan.warstwy));
  } catch {
    /* tryb prywatny / file:// — stan tylko na tę sesję */
  }
}

function zapiszWidokMapy(k, srodek) {
  if (!srodek || !Number.isFinite(k)) return;
  clearTimeout(timerZapisuWidoku);
  timerZapisuWidoku = setTimeout(() => {
    try {
      localStorage.setItem(KLUCZ_WIDOKU_MAPY, JSON.stringify({ k, wx: srodek.wx, wy: srodek.wy }));
    } catch {
      /* jak wyżej */
    }
    // C2: stan mapy w adresie — fragment `#mapa=k,lat,lon` aktualizujemy tylko
    // gdy żadna warstwa (kartoteka, tag, skit…) nie zajmuje adresu.
    if (!location.hash || location.hash.startsWith('#mapa=')) {
      const [lat, lon] = odwroc(srodek.wx, srodek.wy);
      const fragment = serializujWidok(k, lat, lon);
      if (fragment && location.hash !== `#${fragment}`) history.replaceState(null, '', `#${fragment}`);
    }
  }, 400);
}

function przywrocWarstwyMapy() {
  let zapis = null;
  try {
    zapis = JSON.parse(localStorage.getItem(KLUCZ_WARSTW_MAPY) || 'null');
  } catch {
    return;
  }
  if (!zapis || typeof zapis !== 'object') return;
  for (const klucz of Object.keys(WARSTWY_MAPY)) {
    const el = document.querySelector(`#warstwa-${klucz}`);
    if (!el) continue;
    if (zapis[klucz]) {
      el.checked = true;
      stan.warstwy[klucz] = true;
      mapa.przelaczWidocznoscWarstwy(klucz, true);
      zaladujWarstwe(klucz);
    }
  }
  const podklad = zapis.podklad;
  if (podklad && PODKLADY_ONLINE[podklad]) {
    const sel = $('#warstwa-podklad');
    if (sel) sel.value = podklad;
    stan.warstwy.podklad = podklad;
    mapa.przelaczWidocznoscWarstwy('podklad', podklad);
    odswiezAtrybucjePodkladu();
  }
}

function przywrocWidokMapy() {
  let zapis = null;
  try {
    zapis = JSON.parse(localStorage.getItem(KLUCZ_WIDOKU_MAPY) || 'null');
  } catch {
    return;
  }
  const k = Number(zapis?.k);
  const wx = Number(zapis?.wx);
  const wy = Number(zapis?.wy);
  if (!Number.isFinite(k) || !Number.isFinite(wx) || !Number.isFinite(wy) || k < 1) return;
  mapa.ustawWidok(wx, wy, k);
}

const WARSTWY_MAPY = {
  rzeki: { plik: 'rivers-2km5.json', prog: PROGI_WARSTW.woda, rysuj: 'ustawRzeki' },
  jeziora: { plik: 'lakes-2km5.json', prog: PROGI_WARSTW.woda, rysuj: 'ustawJeziora' },
  miasta: { plik: 'miasta.json', prog: PROGI_WARSTW.miastaWielkie, rysuj: 'ustawMiasta' },
  poi: { plik: 'szczyty.json', prog: PROGI_WARSTW.poi, rysuj: 'ustawSzczyty' },
  historia: { plik: 'miejsca-historyczne.json', prog: PROGI_WARSTW.historia, rysuj: 'ustawHistorie' },
  hipsometria: { plik: 'hipsometria.jpg', prog: 1, rysuj: 'ustawHipsometrie', raster: true },
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

/** Strona tagu (F2): warstwa z kategorią, opisem i listą manifestacji. */
function otworzStroneTagu(tag) {
  const istniejacy = tag && stan.indeks.tagi[tag] ? tag : null;
  if (!istniejacy) return;
  if (stan.warstwa?.tryb === 'tag' && stan.warstwa.slug === istniejacy) return;
  stan.warstwa = { tryb: 'tag', slug: istniejacy };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy(
    `Tag: ${istniejacy}`,
    htmlStronyTagu(stan.indeks, istniejacy),
    { kopia: `tag:${istniejacy}` }
  );
  warstwa.scrollTop = 0;
  warstwaTrybPrzycisku('#przycisk-skity', false);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  warstwaTrybPrzycisku('#przycisk-trofea', false);
  if (location.hash !== `#tag:${istniejacy}`) history.replaceState(null, '', `#tag:${istniejacy}`);
}

function odswiezLicznik(zbior = null) {
  const n = zbior === null ? stan.indeks.liczba : zbior.size;
  const skitow = stan.indeks.skity?.length ?? 0;
  const kategoria = stan.aktywnyTag ? ` · filtr: ${nazwaKategorii(stan.indeks, stan.indeks.tagi[stan.aktywnyTag]?.kategoria)}` : '';
  $('#status').textContent =
    `${n} ${n === 1 ? 'manifestacja' : 'manifestacji'} · ${Object.keys(stan.indeks.tagi).length} tagów · ${skitow} ${
      skitow === 1 ? 'skit' : 'skitów'
    }${kategoria}${stan.indeks.buildTime ? ` · build: ${stan.indeks.buildTime.replace("T", " ").slice(0,16)} UTC` : ``}`;
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
    // E: sekcja „Tomy i Epoki” wymaga podsumowania Kroniki — ładujemy raz,
    // a gdy się nie uda (np. brak builda), karta po prostu jej nie ma.
    let kronika = stan.kronika;
    if (!kronika) {
      try {
        kronika = await zaladujKronike();
      } catch {
        kronika = null;
      }
    }
    panel.innerHTML = htmlWarstwyWpisu(htmlWpisu(wpis, stan.indeks, kronika), { slug: wpis.slug, nazwa: wpis.nazwa });
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

/* Lektor skitu (Web Speech API, C2): „🔊 odsłuchaj” czyta dialog na głos,
 * „⏹ stop” przerywa. Bez API albo bez tekstu — przycisk grzecznie się poddaje
 * (etykieta „🔇 niedostępne”), nic nie rzuca. Głos pl-PL, jeśli przeglądarka ma. */
function przelaczLektora(przycisk) {
  const synth = window.speechSynthesis;
  if (!synth || !window.SpeechSynthesisUtterance || !stan.skit?.tekst) {
    przycisk.textContent = '🔇 niedostępne';
    return;
  }
  if (synth.speaking) {
    synth.cancel(); // onend przywróci etykietę
    return;
  }
  const wypowiedz = new SpeechSynthesisUtterance(tekstDoLektora(stan.skit.tekst));
  wypowiedz.lang = 'pl-PL';
  const glosy = synth.getVoices?.() ?? [];
  const pl = glosy.find((g) => g.lang?.toLowerCase().startsWith('pl'));
  if (pl) wypowiedz.voice = pl;
  wypowiedz.onend = wypowiedz.onerror = () => {
    przycisk.textContent = '🔊 odsłuchaj';
    przycisk.setAttribute('aria-pressed', 'false');
  };
  przycisk.textContent = '⏹ stop';
  przycisk.setAttribute('aria-pressed', 'true');
  synth.speak(wypowiedz);
}


function szkicWarstwy(tytul, trescHtml, { wroc = null, kopia = null } = {}) {
  return `<div class="warstwa-tresc">
    <header>
      <h2>${esc(tytul)}</h2>
      <div class="akcje-warstwy">
        ${kopia ? `<button class="chip kopiuj-link" type="button" data-kopia="${esc(kopia)}" title="Kopiuj adres tego widoku">⧉ kopiuj link</button>` : ''}
        ${wroc ? `<button class="chip" type="button" data-wroc="${esc(wroc)}">← ${esc(wroc === 'skity' ? 'Baza skitów' : wroc === 'kroniki' ? 'Kroniki' : 'wróć')}</button>` : ''}
        <button class="zamknij" id="zamknij-warstwe" type="button" aria-label="Zamknij">✕</button>
      </div>
    </header>
    ${trescHtml}
  </div>`;
}

function zamknijWarstwe() {
  stan.warstwa = null;
  stan.skit = null;
  window.speechSynthesis?.cancel?.(); // lektor nie czyta po zamknięciu widoku
  mapa.ukryjRozmowe(); // łuki skitu znikają z zamknięciem dialogu
  const warstwa = $('#warstwa');
  warstwa.classList.remove('otwarta');
  warstwa.innerHTML = '';
  for (const id of ['#przycisk-skity', '#przycisk-nowosci', '#przycisk-trofea', '#przycisk-splot', '#przycisk-prog']) warstwaTrybPrzycisku(id, false);
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
  // C2 (2026-09-04): wyszukiwarka bazy — filtruje wiersze po temacie,
  // tytule i uczestnikach. `data-temat` niesie temat w base64 (§8.1: temat
  // jest katalogowy, nie renderowany jako tekst) — dekodujemy go tutaj.
  warstwa.querySelector('#skity-filtr')?.addEventListener('input', (e) => {
    const fraza = e.target.value.trim().toLowerCase();
    for (const li of warstwa.querySelectorAll('.skit-lista li')) {
      const temat = li.dataset.temat ? zB64utf8(li.dataset.temat) : '';
      const haystack = `${temat} ${li.textContent}`.toLowerCase();
      li.hidden = fraza !== '' && !haystack.includes(fraza);
    }
  });
  warstwa.scrollTop = 0;
  warstwaTrybPrzycisku('#przycisk-skity', true);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  warstwaTrybPrzycisku('#przycisk-trofea', false);
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
  warstwaTrybPrzycisku('#przycisk-trofea', false);
  if (location.hash !== '#nowosci') history.replaceState(null, '', '#nowosci');
}

/** Galeria trofeów (C2, 2026-09-04): dowody eliminacji ze wszystkich kart,
 *  liczone z indeksu — bez dociągania pełnych wpisów. Deep-link `#trofea`. */
function otworzTrofea() {
  if (stan.warstwa?.tryb === 'trofea') return zamknijWarstwe();
  stan.warstwa = { tryb: 'trofea' };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy(
    'Galeria trofeów',
    `<p class="naprowadzenie">Dowody eliminacji zebrane ze wszystkich kartotek — klik w nazwę bytu otwiera jego kartę.</p>${htmlTrofeow(stan.indeks)}`,
    { kopia: 'trofea' }
  );
  warstwa.scrollTop = 0;
  warstwaTrybPrzycisku('#przycisk-trofea', true);
  warstwaTrybPrzycisku('#przycisk-skity', false);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  if (location.hash !== '#trofea') history.replaceState(null, '', '#trofea');
}

/** C5: raport jednej drogi z losowaniem przez bezpieczny adapter przeglądarki. */
async function otworzSplot(slugDrogi = null) {
  if (stan.warstwa?.tryb === 'splot' && !slugDrogi) return zamknijWarstwe();
  stan.warstwa = { tryb: 'splot' };
  const katalog = stan.indeks?.drogi ?? [];
  const wybrana = katalog.find((d) => d.slug === slugDrogi) ?? katalog[0] ?? null;
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy(wybrana ? `SPLOT — ${wybrana.tytul}` : 'SPLOT', '<p class="ladowanie">Rozstrzyganie drogi…</p>');
  warstwaTrybPrzycisku('#przycisk-splot', true);
  for (const id of ['#przycisk-skity', '#przycisk-nowosci', '#przycisk-trofea', '#przycisk-kronika', '#przycisk-prog']) warstwaTrybPrzycisku(id, false);
  try {
    const plik = wybrana?.plik ?? 'data/splot/droga-ostatni-slad-gevaudan.json';
    const road = await fetch(new URL(plik, document.baseURI)).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    // Sprzężenie Kronika → SPLOT (ADR 0025): stan świata modyfikuje szanse węzłów.
    // Brak Kroniki nie blokuje drogi — wtedy napór świata wynosi zero.
    let kronika = null;
    try { kronika = await zaladujKronike(); } catch { kronika = null; }
    const los = () => { const b = new Uint32Array(1); globalThis.crypto?.getRandomValues?.(b); return (b[0] ?? 0) / 4294967296; };
    const wynik = rozegrajDroge({ droga: road, indeks: stan.indeks, kanon: stan.indeks.kanon, kronika, los });
    warstwa.innerHTML = szkicWarstwy(road.tytul, htmlSplotu(road, wynik, stan.indeks));
    warstwa.scrollTop = 0;
    for (const przycisk of warstwa.querySelectorAll('[data-droga]')) {
      przycisk.addEventListener('click', () => otworzSplot(przycisk.dataset.droga));
    }
  } catch (err) {
    warstwa.innerHTML = szkicWarstwy('SPLOT', `<p class="blad">Nie udało się rozstrzygnąć drogi: ${esc(err.message)}</p>`);
  }
  if (location.hash !== '#splot') history.replaceState(null, '', '#splot');
}

/** C6: PRÓG — tablica kluczy kartoteki i pojedyncza próba spotkania bez walki. */
async function otworzProg() {
  if (stan.warstwa?.tryb === 'prog') return zamknijWarstwe();
  stan.warstwa = { tryb: 'prog' };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy('PRÓG — spotkanie bez walki', '<p class="ladowanie">Liczenie kluczy…</p>');
  warstwaTrybPrzycisku('#przycisk-prog', true);
  for (const id of ['#przycisk-skity', '#przycisk-nowosci', '#przycisk-trofea', '#przycisk-kronika', '#przycisk-splot']) warstwaTrybPrzycisku(id, false);
  let kronika = null;
  try { kronika = await zaladujKronike(); } catch { kronika = null; }
  const kanon = stan.indeks.kanon ?? null;
  const rysuj = (wynik = null) => {
    const wiersze = tablicaProgow(stan.indeks.manifestacje, { kanon, kronika, staranie: 1 });
    warstwa.innerHTML = szkicWarstwy('PRÓG — spotkanie bez walki', htmlProgow(wiersze, wynik), { kopia: 'prog' });
    warstwa.scrollTop = 0;
    const przycisk = warstwa.querySelector('#prog-losuj');
    if (przycisk) przycisk.addEventListener('click', () => {
      const los = () => { const b = new Uint32Array(1); globalThis.crypto?.getRandomValues?.(b); return (b[0] ?? 0) / 4294967296; };
      const kandydaci = wiersze;
      const wybor = kandydaci[Math.floor(los() * kandydaci.length)] ?? kandydaci[0];
      const profil = profileKartoteki(stan.indeks.manifestacje, kanon).get(wybor.slug);
      rysuj(rozegrajProg({ profil, klucz: kluczeDlaBytu(profil)[0], staranie: 1, kronika, los }));
    });
  };
  rysuj();
  if (location.hash !== '#prog') history.replaceState(null, '', '#prog');
}

/** Feed Kroniki (U3): wczytywane raz, karty epok z ramą narracji i filtra bytów (U1).
 *  `tom` ≠ null dociąga summary wybranego Tomu (`summary-<tom>.json` pisze
 *  build Kroniki); bez argumentu — główne summary (pierwszy Tom). */
async function zaladujKronike(tom = null) {
  if (!stan.kronika) {
    const r = await fetch(new URL('data/kronika/summary.json', document.baseURI));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    stan.kronika = await r.json();
  }
  // Build pisze summary-<tom>.json dopiero od drugiego Tomu — główna księga
  // żyje w summary.json, więc jej nie dociągamy pod drugą nazwą.
  if (!tom || tom === stan.kronika?.tom) return stan.kronika;
  stan.kronikaTomow ??= {};
  if (!stan.kronikaTomow[tom]) {
    const r = await fetch(new URL(`data/kronika/summary-${encodeURIComponent(tom)}.json`, document.baseURI));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    stan.kronikaTomow[tom] = await r.json();
  }
  return stan.kronikaTomow[tom];
}

/** Warstwa Kroniki: bez `tom` — lista Kronik (spis Tomów z summary); po wyborze
 *  Tomu (`data-tom`) — epoki tej księgi. Przycisk w topbarze działa jak toggle. */
async function otworzKronike(tom = null, { przelacz = false } = {}) {
  if (przelacz && stan.warstwa?.tryb === 'kroniki') return zamknijWarstwe();
  stan.warstwa = { tryb: 'kroniki', tom };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy('Kronika świata AME', '<p class="ladowanie">Wczytywanie Kroniki…</p>', { kopia: 'kroniki' });
  warstwaTrybPrzycisku('#przycisk-kronika', true);
  warstwaTrybPrzycisku('#przycisk-skity', false);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  warstwaTrybPrzycisku('#przycisk-trofea', false);
  try {
    const kronika = await zaladujKronike(tom);
    const tytul = tom ? `Kronika — ${kronika?.tytulTomu ?? tom}` : 'Kronika świata AME';
    warstwa.innerHTML = szkicWarstwy(tytul, htmlKronik(kronika, stan.indeks, { tom }), { kopia: 'kroniki', wroc: tom ? 'kroniki' : null });
    const filtr = warstwa.querySelector('#kronika-filtr');
    if (filtr) {
      filtr.addEventListener('change', (e) => {
        const v = e.target.value;
        for (const karta of warstwa.querySelectorAll('.kronika-karta')) {
          karta.hidden = v && !(karta.dataset.byt || '').split(' ').includes(v);
        }
      });
    }
    warstwa.scrollTop = 0;
  } catch {
    warstwa.innerHTML = szkicWarstwy('Kronika świata AME', '<p class="pusto">Nie udało się wczytać Kroniki — uruchom <code>npm run build</code>.</p>', { kopia: 'kroniki' });
  }
  if (location.hash !== '#kroniki') history.replaceState(null, '', '#kroniki');
}

async function otworzSkit(slug, { zBazy = true } = {}) {
  stan.warstwa = { tryb: 'skit', slug };
  const warstwa = $('#warstwa');
  warstwa.classList.add('otwarta');
  warstwa.innerHTML = szkicWarstwy('SKIT', '<p class="ladowanie">Wczytywanie tekstu…</p>', zBazy ? { wroc: 'skity' } : {});
  warstwaTrybPrzycisku('#przycisk-skity', true);
  warstwaTrybPrzycisku('#przycisk-nowosci', false);
  warstwaTrybPrzycisku('#przycisk-trofea', false);
  try {
    const skit = await zaladujSkit(slug);
    stan.skit = skit;
    mapa.pokazRozmowe(paryRozmowySkitu(skit.uczestnicy)); // C2: „rozmowa” na mapie
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
  if (tekst.startsWith('kronika:')) {
    // U2: deep-link do raportu epoki — strona Kroniki sama przewinie i podświetli.
    window.location.href = `docs/kronika-${tekst.slice(8)}.html#kronika:${tekst.slice(8)}`;
    return;
  }
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

/**
 * „Manifestacja dnia”: ten sam wpis dla wszystkich czytelników danego dnia
 * (deterministyczny `slugDnia` z daty lokalnej, pełna pula kartoteki).
 * Przelatuje do bytu na mapie i otwiera kartotekę.
 */
function manifestacjaDnia() {
  const pula = stan.indeks.manifestacje.map((m) => m.slug);
  const d = new Date();
  const dataISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const slug = slugDnia(pula, dataISO);
  if (!slug) return;
  stan.ostatniLos = slug;
  if (stan.warstwa) zamknijWarstwe();
  if ($('#lista').classList.contains('otwarta')) przelaczListe();
  otworzWpis(slug, { przewin: true });
}

/**
 * Ładuje dane warstwy (raz) i rysuje je. Warstwy są asynchronicznie
 * dociągane dopiero po włączeniu przełącznika lub wejściu w wymagany zoom
 * (LOD, ADR 0020) — bez sieci ani pobierania dla nieużywanych warstw.
 */
async function zaladujWarstwe(klucz) {
  if (stan.zaladowane[klucz] || !mapa) return;
  stan.zaladowane[klucz] = true;
  const def = WARSTWY_MAPY[klucz];
  if (!def) return;
  try {
    const url = new URL(`assets/map/${def.plik}`, document.baseURI);
    if (def.raster) {
      mapa[def.rysuj](url.href);
    } else {
      const data = await fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
      mapa[def.rysuj](data);
    }
  } catch {
    /* warstwa opcjonalna — mapa zostaje na państwach i pinezkach */
  }
}

/** LOD (ADR 0020): przy zoobie powyżej progu dojadą warstwy danych tematycznych. */
function odswiezWarstwyDane(k) {
  if (!mapa) return;
  for (const [klucz, def] of Object.entries(WARSTWY_MAPY)) {
    if (stan.warstwy[klucz] && k >= def.prog && !stan.zaladowane[klucz]) zaladujWarstwe(klucz);
  }
}

/** Atrybucja aktywnego podkładu online (OSM/OpenTopoMap/Esri wymagają jej na mapie). */
function odswiezAtrybucjePodkladu() {
  const def = PODKLADY_ONLINE[stan.warstwy.podklad];
  const pole = $('#atrybucja-podkladu');
  if (!pole) return;
  if (def) {
    pole.textContent = `Podkład: ${def.etykieta} — ${def.atrybucja}`;
    pole.hidden = false;
  } else {
    pole.hidden = true;
  }
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
        <header>
          <h2>Kartoteka manifestacji</h2>
          <label class="sort-listy">Sortuj:
            <select id="sort-listy" aria-label="Sortowanie kartoteki">
              <option value="az"${stan.sortListy === 'az' ? ' selected' : ''}>A–Z</option>
              <option value="zmiana"${stan.sortListy === 'zmiana' ? ' selected' : ''}>ostatnio zmienione</option>
              <option value="kraj"${stan.sortListy === 'kraj' ? ' selected' : ''}>wg kraju</option>
            </select>
          </label>
          <button class="zamknij" id="zamknij-liste" aria-label="Zamknij">✕</button>
        </header>
        <div id="lista-wyniki">${htmlListy(stan.indeks, pasujace(), { sort: stan.sortListy })}</div>
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
    // C2: filtr tagu jest adresowalny + otwiera stronę tagu (F2) z listą wpisów.
    if (nastepny) otworzStroneTagu(nastepny);
    else if (stan.warstwa?.tryb === 'tag') zamknijWarstwe();
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });

  $('#panel').addEventListener('click', (e) => {
    if (e.target.closest('#zamknij-wpis')) return zamknijWpis();
    if (e.target.closest('[data-druk]')) return window.print();
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
      otworzStroneTagu(tag.dataset.tag);
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

  $('#lista').addEventListener('change', (e) => {
    if (e.target.id !== 'sort-listy') return;
    stan.sortListy = e.target.value;
    // #lista-wyniki generuje przelaczListe — stąd dostęp przez kontener, nie globalny selektor.
    const wyniki = e.target.closest('.lista-tresc')?.querySelector('#lista-wyniki');
    if (wyniki) wyniki.innerHTML = htmlListy(stan.indeks, pasujace(), { sort: stan.sortListy });
  });

  $('#przycisk-los').addEventListener('click', losujManifestacje);
  $('#przycisk-dnia').addEventListener('click', manifestacjaDnia);
  $('#przycisk-lista').addEventListener('click', przelaczListe);
  $('#przycisk-skity').addEventListener('click', otworzBazeSkitow);
  $('#przycisk-nowosci').addEventListener('click', otworzNowosci);
  $('#przycisk-trofea').addEventListener('click', otworzTrofea);
  $('#przycisk-kronika').addEventListener('click', () => otworzKronike(null, { przelacz: true }));
  $('#przycisk-splot').addEventListener('click', otworzSplot);
  $('#przycisk-prog').addEventListener('click', otworzProg);
  $('#przycisk-warstwy').addEventListener('click', przelaczPanelWarstw);
  for (const klucz of Object.keys(WARSTWY_MAPY)) {
    const el = document.querySelector(`#warstwa-${klucz}`);
    if (!el) continue;
    el.addEventListener('change', (e) => {
      stan.warstwy[klucz] = e.target.checked;
      mapa.przelaczWidocznoscWarstwy(klucz, e.target.checked);
      if (e.target.checked) zaladujWarstwe(klucz); // dociągnij od razu po włączeniu
      zapiszWarstwyMapy(); // D: zapamiętaj wybór
    });
  }
  const podklad = $('#warstwa-podklad');
  if (podklad) {
    podklad.addEventListener('change', (e) => {
      const klucz = e.target.value || null;
      stan.warstwy.podklad = klucz;
      // Radiowa semantyka: wybranie innego podkładu wyłącza poprzedni.
      mapa.przelaczWidocznoscWarstwy('podklad', klucz);
      odswiezAtrybucjePodkladu();
      zapiszWarstwyMapy(); // D: zapamiętaj wybór (także „Wyłączony”)
    });
  }

  $('#warstwa').addEventListener('click', (e) => {
    if (e.target.closest('#zamknij-warstwe')) return zamknijWarstwe();
    const lektor = e.target.closest('[data-lektor]');
    if (lektor) return przelaczLektora(lektor);
    // Jeden closest() z listą atrybutów: wygoda dla użytkownika = trafienie w
    // najbliższy element, nie w jego kontekst (chip uczestnika siedzi w <article data-skit>).
    const kopia = e.target.closest('[data-kopia]');
    if (kopia) return kopiujLink(kopia.dataset.kopia, kopia);
    const cel = e.target.closest('[data-wroc], [data-link], [data-slug], [data-skit], [data-tom]');
    if (!cel) return;
    if (cel.hasAttribute('data-wroc')) {
      if (cel.dataset.wroc === 'skity') return otworzBazeSkitow();
      if (cel.dataset.wroc === 'kroniki') return otworzKronike();
      return zamknijWarstwe();
    }
    if (cel.hasAttribute('data-tom')) return otworzKronike(cel.dataset.tom);
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
      // C2: deep-link do filtra tagów + strony tagu (F2); nieznany tag czyści filtr.
      const istniejacy = stan.indeks.tagi[tag] ? tag : null;
      zastosujTag(istniejacy);
      if (istniejacy) otworzStroneTagu(istniejacy);
      return;
    }
    if (fragment.startsWith('skit:')) {
      const slug = fragment.slice(5);
      if (stan.indeks.skity?.some((s) => s.slug === slug)) otworzSkit(slug, { zBazy: true });
      return;
    }
    if (fragment === 'skity') return stan.warstwa?.tryb !== 'skity' ? otworzBazeSkitow() : undefined;
    if (fragment === 'nowosci') return stan.warstwa?.tryb !== 'nowosci' ? otworzNowosci() : undefined;
    if (fragment === 'trofea') return stan.warstwa?.tryb !== 'trofea' ? otworzTrofea() : undefined;
    if (fragment === 'kroniki') return stan.warstwa?.tryb !== 'kroniki' ? otworzKronike() : undefined;
    if (fragment === 'splot') return stan.warstwa?.tryb !== 'splot' ? otworzSplot() : undefined;
    if (fragment === 'prog') return stan.warstwa?.tryb !== 'prog' ? otworzProg() : undefined;
    if (fragment.startsWith('kronika:')) {
      const slug = fragment.slice(8);
      if (slug) window.location.href = `docs/kronika-${slug}.html#kronika:${slug}`;
      return;
    }
    if (fragment.startsWith('mapa=')) {
      const widok = parsujWidokMapy(fragment);
      if (widok) {
        const [wx, wy] = projektuj(widok.lat, widok.lon);
        mapa.ustawWidok(wx, wy, widok.k);
      }
      return;
    }
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

function sledzPreferencjeSystemu() {
  if (typeof matchMedia !== 'function') return;
  const pytajnik = matchMedia('(prefers-color-scheme: light)');
  pytajnik.addEventListener?.('change', (e) => {
    // podążamy za systemem tylko dopóki użytkownik sam nie wybrał motywu
    if (!czytajMotyw()) zastosujMotyw(motywPoczatkowy({ woliJasny: e.matches }));
  });
}

async function start() {
  zastosujMotyw(
    motywPoczatkowy({
      zapisany: czytajMotyw(),
      woliJasny: typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches,
    })
  );
  sledzPreferencjeSystemu();
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
    przyZmianieWidoku: (k, { srodek } = {}) => {
      odswiezWarstwyDane(k);
      zapiszWidokMapy(k, srodek); // D: debounce 400 ms — stan po resecie/odświeżeniu
    },
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
  // D: ostatnio wybrane warstwy i ostatni widok — najpierw warstwy (żeby
  // przywrócenie głębokiego zoomu miało prawidłowy sufit), potem widok.
  przywrocWarstwyMapy();
  przywrocWidokMapy();
  const fragment = decodeURIComponent(location.hash.replace(/^#/, ''));
  // C2: widok z deep-linku `#mapa=…` ma pierwszeństwo przed zapisem localStorage.
  const widokZLinku = parsujWidokMapy(fragment);
  if (widokZLinku) {
    const [wx, wy] = projektuj(widokZLinku.lat, widokZLinku.lon);
    mapa.ustawWidok(wx, wy, widokZLinku.k);
  }
  const tagStartu = tagZFragmantu(fragment);
  $('#tagi').innerHTML = htmlTagow(stan.indeks, tagStartu && stan.indeks.tagi[tagStartu] ? tagStartu : null);
  stan.aktywnyTag = tagStartu && stan.indeks.tagi[tagStartu] ? tagStartu : null;
  odswiezLicznik();
  podepnijZdarzenia();
  odswiezFiltr();

  // Uniwersalna nawigacja (PR #9): linki z Kroniki niosą ?q= i ?action=…
  // — aplikacja główna traktuje je jak wpisanie frazy albo klik w przycisk.
  const zamowienie = akcjeZZapytania(location.search);
  if (zamowienie.q) {
    $('#szukaj').value = zamowienie.q;
    stan.filtr = dopasowania(stan.indeks, zamowienie.q);
    odswiezFiltr();
  }
  if (zamowienie.action === 'powiazania') {
    stan.luki = true;
    mapa.przelaczLuki(true);
    const przycisk = $('#przycisk-luki');
    przycisk.classList.add('aktywny');
    przycisk.setAttribute('aria-pressed', 'true');
  }
  if (zamowienie.action === 'wylosuj') losujManifestacje();

  if (fragment.startsWith('skit:')) {
    const slug = fragment.slice(5);
    if (stan.indeks.skity?.some((s) => s.slug === slug)) otworzSkit(slug);
  } else if (fragment === 'skity') otworzBazeSkitow();
  else if (fragment === 'nowosci') otworzNowosci();
  else if (fragment === 'trofea') otworzTrofea();
  else if (fragment === 'kroniki') otworzKronike();
  else if (fragment === 'splot') otworzSplot();
  else if (fragment === 'prog') otworzProg();
  else if (fragment.startsWith('kronika:')) {
    const slug = fragment.slice(8);
    if (slug) location.href = `docs/kronika-${slug}.html#kronika:${slug}`;
  }
  else if (tagStartu) otworzStroneTagu(tagStartu);
  else if (fragment && stan.indeks.manifestacje.some((m) => m.slug === fragment)) otworzWpis(fragment, { przewin: true });
}

start();
