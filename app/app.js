/**
 * app/app.js — bootstrap AME: ładuje indeks, mapę świata, spina UI.
 */
import { stworzMape } from './map.js';
import { zaladujIndeks, zaladujWpis, dopasowania } from './data.js';
import { htmlWpisu, htmlWarstwyWpisu, htmlListy, htmlTagow, esc, nastepnyMotyw, motywPoczatkowy, etykietaMotywu, KLUCZ_MOTYWU } from './ui.js';
import { SZEROKOSC, WYSOKOSC } from './geo.js';

const $ = (sel) => document.querySelector(sel);

const stan = {
  indeks: null,
  wpis: null, // aktualnie otwarty wpis (pełny JSON)
  filtr: null, // Set<slug> | null
  aktywnyTag: null,
  luki: false,
  motyw: 'ciemny',
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
    const zTagu = new Set(stan.indeks.tagi[stan.aktywnyTag] ?? []);
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

function odswiezLicznik(zbior = null) {
  const n = zbior === null ? stan.indeks.liczba : zbior.size;
  $('#status').textContent = `${n} ${n === 1 ? 'manifestacja' : 'manifestacji'} · ${Object.keys(stan.indeks.tagi).length} tagów`;
}

let punktPowrotu = null; // element, który otworzył kartotekę (fokus po zamknięciu)

async function otworzWpis(slug, { przewin = true } = {}) {
  const panel = $('#panel');
  const rekord = stan.indeks.manifestacje.find((m) => m.slug === slug);
  if (!rekord) return;
  if (!stan.wpis) punktPowrotu = document.activeElement;
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
    stan.aktywnyTag = stan.aktywnyTag === tag ? null : tag;
    $('#tagi').innerHTML = htmlTagow(stan.indeks, stan.aktywnyTag);
    odswiezFiltr();
  });

  $('#panel').addEventListener('click', (e) => {
    if (e.target.closest('#zamknij-wpis')) return zamknijWpis();
    const link = e.target.closest('[data-slug]');
    if (link) {
      otworzWpis(link.dataset.slug);
      return;
    }
    const tag = e.target.closest('[data-tag]');
    if (tag) {
      stan.aktywnyTag = tag.dataset.tag;
      $('#tagi').innerHTML = htmlTagow(stan.indeks, stan.aktywnyTag);
      odswiezFiltr();
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

  $('#przycisk-lista').addEventListener('click', przelaczListe);

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
    const slug = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (slug && slug !== stan.wpis?.slug && stan.indeks.manifestacje.some((m) => m.slug === slug)) otworzWpis(slug, { przewin: false });
    else if (!slug && stan.wpis) zamknijWpis(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
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
  mapa = stworzMape($('#mapa'), { przyZmianieZaznaczenia: (slug) => otworzWpis(slug, { przewin: false }) });
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
  $('#tagi').innerHTML = htmlTagow(stan.indeks, null);
  odswiezLicznik();
  podepnijZdarzenia();

  const slug = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (slug && stan.indeks.manifestacje.some((m) => m.slug === slug)) otworzWpis(slug, { przewin: true });
}

start();
