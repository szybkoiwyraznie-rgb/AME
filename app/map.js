/**
 * app/map.js — render mapy SVG AME + interakcje (ADR 0003).
 *
 * Pan: przeciąganie (pointer events, 1 wskaźnik). Zoom: kółko myszy do
 * kursora, pinch (2 wskaźniki), dwuklik, przyciski. Pinezki kompensują
 * skalę widoku, by zachować stały rozmiar ekranowy.
 */
import { projektuj, dekodujKraje, siatka, SZEROKOSC as SZER, WYSOKOSC as WYS } from './geo.js';

const NS = 'http://www.w3.org/2000/svg';
const K_MIN = 1;
const K_MAX = 32;

function el(nazwa, atrybuty = {}, rodzic = null) {
  const e = document.createElementNS(NS, nazwa);
  for (const [k, v] of Object.entries(atrybuty)) e.setAttribute(k, v);
  if (rodzic) rodzic.appendChild(e);
  return e;
}

function ogranicz(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function stworzMape(kontener, { przyZmianieZaznaczenia } = {}) {
  const svg = el('svg', { viewBox: `0 0 ${SZER} ${WYS}`, preserveAspectRatio: 'xMidYMid slice', class: 'mapa-svg' });
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'Mapa świata z manifestacjami eterycznymi');
  kontener.appendChild(svg);

  // Ocean — bardzo duży prostokąt, by przy przesuwaniu nigdy nie pokazało się tło.
  el('rect', { x: -SZER, y: -WYS, width: SZER * 3, height: WYS * 3, class: 'ocean' }, svg);

  const warstwa = el('g', { class: 'warstwa' }, svg);
  el('path', { d: siatka(30), class: 'siatka' }, warstwa);
  const grupaKrajow = el('g', { class: 'kraje' }, warstwa);
  const warstwaLukow = el('g', { class: 'luki', display: 'none' }, warstwa);
  const grupaPinezek = el('g', { class: 'pinezki' }, warstwa);

  const widok = { x: 0, y: 0, k: 1 };
  const pinezki = new Map(); // slug -> {el, wx, wy}
  let zaznaczony = null;
  let paryPolaczen = []; // [{a, b}]

  /** Punkt zdarzenia klienta → współrzędne viewBoxu. */
  function naSvg(zdarzenie) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(zdarzenie.clientX, zdarzenie.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function dopusc() {
    widok.k = ogranicz(widok.k, K_MIN, K_MAX);
    widok.x = ogranicz(widok.x, SZER * (1 - widok.k), 0);
    widok.y = ogranicz(widok.y, WYS * (1 - widok.k), 0);
  }

  function zastosuj(animuj = false) {
    dopusc();
    warstwa.style.transition = animuj ? 'transform .5s cubic-bezier(.22,.61,.36,1)' : 'none';
    warstwa.style.transform = `translate(${widok.x}px, ${widok.y}px) scale(${widok.k})`;
    const s = 1 / widok.k;
    for (const p of pinezki.values()) p.el.setAttribute('transform', `translate(${p.wx} ${p.wy}) scale(${s})`);
    svg.classList.toggle('przyblizona', widok.k >= 2.5); // etykiety pinezek
  }

  /** Zoom w punkt p (współrzędne viewBoxu) o czynnik f. */
  function zoomDoPunktu(p, f, animuj = false) {
    const noweK = ogranicz(widok.k * f, K_MIN, K_MAX);
    const r = noweK / widok.k;
    widok.x = p.x - (p.x - widok.x) * r;
    widok.y = p.y - (p.y - widok.y) * r;
    widok.k = noweK;
    zastosuj(animuj);
  }

  function wysrodkuj(lat, lon, k = null, animuj = true) {
    if (k !== null) widok.k = k;
    const [wx, wy] = projektuj(lat, lon);
    widok.x = SZER / 2 - wx * widok.k;
    widok.y = WYS / 2 - wy * widok.k;
    zastosuj(animuj);
  }

  function reset() {
    widok.x = 0;
    widok.y = 0;
    widok.k = 1;
    zastosuj(true);
  }

  /* ---- Gesty: przeciąganie / pinch / kółko / dwuklik ---- */
  const wskazniki = new Map(); // pointerId -> {x, y} (klient)
  let stanSzczypca = null; // {dystans, srodek}

  const dystans = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const srodek = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pinezka')) return; // kliknięcia pinezki nie przesuwają mapy
    svg.setPointerCapture(e.pointerId);
    wskazniki.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (wskazniki.size === 2) {
      const [a, b] = [...wskazniki.values()];
      stanSzczypca = { dystans: dystans(a, b), srodek: srodek(a, b) };
    }
    svg.classList.add('zlapano');
  });

  svg.addEventListener('pointermove', (e) => {
    if (!wskazniki.has(e.pointerId)) return;
    const poprzedni = wskazniki.get(e.pointerId);
    wskazniki.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (wskazniki.size === 1) {
      const teraz = naSvg(e);
      const wirtualnyPoprzedni = naSvg({ clientX: poprzedni.x, clientY: poprzedni.y });
      widok.x += teraz.x - wirtualnyPoprzedni.x;
      widok.y += teraz.y - wirtualnyPoprzedni.y;
      zastosuj();
    } else if (wskazniki.size === 2 && stanSzczypca) {
      const [a, b] = [...wskazniki.values()];
      const d = dystans(a, b);
      const m = srodek(a, b);
      if (stanSzczypca.dystans > 0) zoomDoPunktu(naSvg({ clientX: m.x, clientY: m.y }), d / stanSzczypca.dystans);
      const przesuniecie = naSvg({ clientX: m.x, clientY: m.y });
      const przed = naSvg({ clientX: stanSzczypca.srodek.x, clientY: stanSzczypca.srodek.y });
      widok.x += przesuniecie.x - przed.x;
      widok.y += przesuniecie.y - przed.y;
      stanSzczypca = { dystans: d, srodek: m };
    }
  });

  const koniecWskaznika = (e) => {
    wskazniki.delete(e.pointerId);
    if (wskazniki.size < 2) stanSzczypca = null;
    if (wskazniki.size === 0) svg.classList.remove('zlapano');
  };
  svg.addEventListener('pointerup', koniecWskaznika);
  svg.addEventListener('pointercancel', koniecWskaznika);

  svg.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomDoPunktu(naSvg(e), Math.exp(-e.deltaY * 0.0016));
    },
    { passive: false }
  );

  svg.addEventListener('dblclick', (e) => {
    if (e.target.closest('.pinezka')) return;
    zoomDoPunktu(naSvg(e), 1.8, true);
  });

  /* ---- Pinezki i łuki powiązań ---- */

  function ustawPinezki(rekordy) {
    grupaPinezek.innerHTML = '';
    pinezki.clear();
    for (const r of rekordy) {
      const [wx, wy] = projektuj(r.lat, r.lon);
      const g = el('g', { class: 'pinezka', 'data-slug': r.slug, tabindex: 0, role: 'button', 'aria-label': `Manifestacja: ${r.nazwa}`, transform: `translate(${wx} ${wy})` }, grupaPinezek);
      el('circle', { r: 11, class: 'glowa' }, g);
      el('path', { d: 'M0,8 L-6,22 L0,16 L6,22 Z', class: 'ostrze' }, g);
      const label = el('text', { y: -22, class: 'etykieta' }, g);
      label.textContent = r.nazwa;
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        przyZmianieZaznaczenia?.(r.slug);
      });
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          przyZmianieZaznaczenia?.(r.slug);
        }
      });
      pinezki.set(r.slug, { el: g, wx, wy });
    }
    zastosuj();
  }

  function ustawPolaczenia(rekordy) {
    paryPolaczen = [];
    for (const r of rekordy) for (const cel of r.powiazania ?? []) paryPolaczen.push({ a: r.slug, b: cel });
    rysujLuki();
  }

  function rysujLuki() {
    warstwaLukow.innerHTML = '';
    for (const { a, b } of paryPolaczen) {
      const pa = pinezki.get(a);
      const pb = pinezki.get(b);
      if (!pa || !pb) continue;
      const mx = (pa.wx + pb.wx) / 2;
      const my = (pa.wy + pb.wy) / 2;
      const dx = pb.wx - pa.wx;
      const dy = pb.wy - pa.wy;
      const len = Math.hypot(dx, dy) || 1;
      // punkt kontrolny uniesiony prostopadle nad środek (0.18 długości)
      const cx = mx - (dy / len) * len * 0.18;
      const cy = my + (dx / len) * len * 0.18;
      const aktywny = zaznaczony === a || zaznaczony === b;
      el('path', { d: `M${pa.wx} ${pa.wy} Q${cx} ${cy} ${pb.wx} ${pb.wy}`, class: `luk${aktywny ? ' aktywny' : ''}` }, warstwaLukow);
    }
  }

  function przelaczLuki(pokaz) {
    warstwaLukow.setAttribute('display', pokaz ? 'inherit' : 'none');
  }

  function zaznacz(slug) {
    zaznaczony = slug;
    for (const [s, p] of pinezki) p.el.classList.toggle('wybrana', s === slug);
    rysujLuki();
  }

  function podswietl(widoczne /* Set<slug> | null */) {
    for (const [s, p] of pinezki) p.el.classList.toggle('przygaszona', widoczne !== null && !widoczne.has(s));
  }

  /* ---- Kraje (asynchronicznie, po załadowaniu TopoJSON) ---- */

  function ustawMapeSwiata(topologia) {
    const kraje = dekodujKraje(topologia);
    const frag = document.createDocumentFragment();
    for (const k of kraje) {
      const p = el('path', { d: k.d, class: 'kraj' }, frag);
      if (k.nazwa) {
        const t = el('title', {}, p);
        t.textContent = k.nazwa;
      }
    }
    grupaKrajow.appendChild(frag);
  }

  return {
    svg,
    ustawMapeSwiata,
    ustawPinezki,
    ustawPolaczenia,
    zaznacz,
    podswietl,
    przelaczLuki,
    wysrodkuj,
    reset,
    zoomDoPunktu,
    get widok() {
      return { ...widok };
    },
  };
}
