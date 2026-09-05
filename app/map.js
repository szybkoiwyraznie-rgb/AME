/**
 * app/map.js — render mapy SVG AME + interakcje (ADR 0003, ADR 0009).
 *
 * Widok mapy żyje w pikselach kontenera: viewBox = rozmiar kontenera, a grupa
 * świata skalowana jest o `skalaBazowa · k` (geo.js `dopasujWidok`). Dzięki temu
 * cały świat (2:1) mieści się w oknie bez przycinania i bez rozciągu, a zmiana
 * rozmiaru okna nie „skacze”.
 *
 * Pan: przeciąganie (pointer events, 1 wskaźnik). Zoom: kółko myszy do kursora,
 * pinch (2 wskaźniki), dwuklik, przyciski. Pinezki i ich etykiety kompensują
 * skalę widoku, więc mają stały rozmiar w pikselach CSS (ADR 0009).
 */
import { projektuj, dekodujKraje, siatka, dopasujWidok, ogranicz, K_MIN, K_MAX, SZEROKOSC as SZER, WYSOKOSC as WYS, sciezkaGeoMultiPoligon } from './geo.js?v=c6-3';

const NS = 'http://www.w3.org/2000/svg';

/** Rozmiar badge’a etykiety pinezki (jednostki = piksele CSS, patrz ADR 0009). */
const ETYKIETA = {
  rozmiarPisma: 19,
  paddingX: 11,
  paddingY: 6,
  /** Ułamkowa szerokość znaku względem stopnia pisma (Georgia/system-ui ≈ 0,52). */
  wspolczynnikZnaku: 0.52,
};

/** Odległość dolnej krawędzi badge’a od środka pinezki (px CSS). */
const ODSTEP_BADGE = 30;
/** Odległość dolnej krawędzi etykiety miasta od środka kropki (px CSS). */
const ODSTEP_MIASTA = 22;
/** Maksymalna odległość kliknięcia od kropki miasta, która pokazuje etykietę (px CSS). */
const PROMIEN_KLIK_MIASTA = 16;
/** Odległość dolnej krawędzi etykiety punktu (POI/historia) od kropki (px CSS). */
const ODSTEP_PUNKTU = 18;
/** Maksymalna odległość kliknięcia od punktu POI/historii (px CSS). */
const PROMIEN_KLIK_PUNKTU = 13;
/** Górna granica przybliżenia z włączonym podkładem online (2026-08-30).
 *  Pierwotna głębokość ze specyfikacji źródeł: docelowe serwisy kafelków
 *  sięgają z ≈ 19, więc 2^19 = 524 288× to rozdzielczość kafelków
 *  „piksel w piksel" przy typowym oknie. Twarda blokada wg liczby obrotów
 *  kółka została WYCOFANA (decyzja właściciela 2026-08-30): różne rejony
 *  świata mają różny maksymalny zoom, więc limit wyznacza specyfikacja
 *  źródeł, nie długość scrolla. Offline sufit zostaje 32× (K_MAX). */
const K_MAX_ONLINE = 2 ** 19;

/** Warstwy szczegółowości (ADR 0020): progi zoomu dla danych tematycznych. */
export const PROGI_WARSTW = {
  woda: 4,
  miastaWielkie: 4,
  miastaSrednie: 7,
  miastaDrobne: 10,
  poi: 8,
  historia: 6,
};
/**
 * Czy warstwa jest włączona (przełączniki panelu). WSZYSTKIE warstwy są
 * opcjonalne i domyślnie WYŁĄCZONE (decyzja właściciela 2026-08-30);
 * `podklad` to aktywny podkład online (klucz z PODKLADY_ONLINE albo null).
 */
const WIDOCZNE_WARSTWY = {
  rzeki: false,
  jeziora: false,
  miasta: false,
  poi: false,
  historia: false,
  hipsometria: false,
  podklad: null,
};

/** Górna granica przybliżenia (zgłoszenie C): offline 32×, z podkładem
 *  online znacznie głębiej — do rozdzielczości kafelków źródła. */
function maksymalneK() {
  return WIDOCZNE_WARSTWY.podklad ? K_MAX_ONLINE : K_MAX;
}

/** Podkłady online — tylko darmowe i bez klucza API (polityki: docs/ASSETS.md). */
export const PODKLADY_ONLINE = {
  opentopo: {
    etykieta: 'OpenTopoMap',
    atrybucja: '© OpenStreetMap contributors · © OpenTopoMap (CC-BY-SA)',
    url: (z, x, y, s) => `https://${s}.tile.opentopomap.org/${z}/${x}/${y}.png`,
    subdomeny: ['a', 'b', 'c'],
    maxZoom: 17,
  },
  osm: {
    etykieta: 'OpenStreetMap',
    atrybucja: '© OpenStreetMap contributors (ODbL)',
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    subdomeny: [''],
    maxZoom: 19,
  },
  'esri-satelita': {
    etykieta: 'Esri World Imagery',
    atrybucja: 'Powered by Esri · © Esri, Maxar, Earthstar Geographics',
    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    subdomeny: [''],
    maxZoom: 19,
  },
};

function el(nazwa, atrybuty = {}, rodzic = null) {
  const e = document.createElementNS(NS, nazwa);
  for (const [k, v] of Object.entries(atrybuty)) e.setAttribute(k, v);
  if (rodzic) rodzic.appendChild(e);
  return e;
}

/** Szacowana szerokość tekstu, gdy nie da się zmierzyć (Node, brak layoutu). */
export function szacujSzerokoscTekstu(tekst, rozmiarPisma = ETYKIETA.rozmiarPisma) {
  return String(tekst ?? '').length * rozmiarPisma * ETYKIETA.wspolczynnikZnaku;
}

/** Wymiary badge’a etykiety: zmierz tekst, a jak nie ma layoutu — oszacuj. */
export function wymiaryEtykiety(nazwa, tekst = null) {
  let szerokosc = 0;
  try {
    szerokosc = typeof tekst?.getComputedTextLength === 'function' ? tekst.getComputedTextLength() : 0;
  } catch {
    szerokosc = 0;
  }
  if (!szerokosc || !Number.isFinite(szerokosc)) szerokosc = szacujSzerokoscTekstu(nazwa);
  return {
    szer: Math.round(szerokosc + ETYKIETA.paddingX * 2),
    wys: Math.round(ETYKIETA.rozmiarPisma * 1.42 + ETYKIETA.paddingY * 2),
  };
}

export function stworzMape(kontener, { przyZmianieZaznaczenia, przyZmianieWidoku } = {}) {
  const svg = el('svg', { viewBox: `0 0 ${SZER} ${WYS}`, preserveAspectRatio: 'xMidYMid meet', class: 'mapa-svg' });
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'Mapa świata z manifestacjami eterycznymi');
  kontener.appendChild(svg);

  // Ocean — bardzo duży prostokąt, by przy przesuwaniu nigdy nie pokazało się tło.
  el('rect', { x: -SZER * 4, y: -WYS * 4, width: SZER * 9, height: WYS * 9, class: 'ocean' }, svg);

  // Uwaga na nazwę: `swiat`, nie `warstwa`. Klasa `warstwa` należy do
  // pełnoekranowej nakładki UI (ADR 0010) i jest domyślnie gaszona
  // (`display: none`) — jako nazwa grupy świata wyłączałaby całą mapę.
  // Kontrakt pilnuje `test/mapa-css.test.js` (F1 z audytu PR #2).
  const grupaSwiata = el('g', { class: 'swiat' }, svg);
  el('path', { d: siatka(30), class: 'siatka' }, grupaSwiata);
  // Podkład online (kafelki rastrowe) i hipsometria — pod krajami.
  const grupaPodklad = el('g', { class: 'podklad-online', display: 'none' }, grupaSwiata);
  const grupaHipso = el('g', { class: 'hipsometria', display: 'none' }, grupaSwiata);
  const grupaKrajow = el('g', { class: 'kraje' }, grupaSwiata);
  // Warstwy szczegółowości (ADR 0020): woda rysowana nad lądem, miasta i POI
  // w osobnych grupach punktowych — wszystkie w układzie świata.
  const grupaWarstw = el('g', { class: 'warstwy-szczegolow' }, grupaSwiata);
  const grupaRzek = el('g', { class: 'rzeki', display: 'none' }, grupaWarstw);
  const grupaJezior = el('g', { class: 'jeziora', display: 'none' }, grupaWarstw);
  const grupaMiast = el('g', { class: 'miasta', display: 'none' }, grupaWarstw);
  const grupaPOI = el('g', { class: 'poi', display: 'none' }, grupaWarstw);
  const grupaHistoria = el('g', { class: 'historia', display: 'none' }, grupaWarstw);
  let obrazHipso = null; // <image> hipsometrii
  // Punkty stałego rozmiaru ekranowego (kompensacja skali): POI i historia.
  let szczytyDane = []; // [{g, grupa, wx, wy, nazwa, opis}]
  let historiaDane = []; // [{g, grupa, wx, wy, nazwa, opis}]
  let ostatniaSkalaPunktow = null;
  // Miasta dzielimy na rangi, żeby przy zmianie zoomu sterować liczbą punktów
  // bez przebudowywania drzewa (ADR 0020 — LOD treści, nie tylko geometrii).
  const grupyMiast = {
    wielkie: el('g', { class: 'miasta-wielkie' }, grupaMiast),
    srednie: el('g', { class: 'miasta-srednie' }, grupaMiast),
    drobne: el('g', { class: 'miasta-drobne' }, grupaMiast),
  };
  const warstwaLukow = el('g', { class: 'luki', display: 'none' }, grupaSwiata);
  // Warstwa „rozmowy” (C2, 2026-09-04): łuki uczestników otwartego skitu —
  // osobna grupa, żeby nie mieszać z łukami powiązań (toggle ∞).
  const warstwaRozmowy = el('g', { class: 'rozmowa', display: 'none' }, grupaSwiata);
  const grupaPinezek = el('g', { class: 'pinezki' }, grupaSwiata);
  // A3 (M6): badge'y w osobnej grupie PO grupie pinezek — SVG maluje elementy
  // w kolejności dokumentu, więc etykieta nigdy nie chowa się pod inną pinezką.
  // Widzialność (A1) sterują klasy na samej etykiecie (widoczna/wybrana),
  // sprzęgane ze stanem pinezki zdarzeniami pointer/focus — nie zagnieżdżaniem.
  const grupaEtykiet = el('g', { class: 'etykiety' }, grupaSwiata);
  // C2: pływająca etykieta miasta (klik) — poza grupaPinezek, w stałym
  // rozmiarze ekranowym dzięki odwrotnej skali (jak badge pinezki).
  const etykietaMiasta = el('g', { class: 'etykieta-miasta' }, grupaSwiata);
  // B (2026-08-30): ta sama tabliczka dla POI i miejsc historycznych — nazwa
  // tylko podczas przytrzymania, identycznie jak u miast (C4).
  const etykietaPunktu = el('g', { class: 'etykieta-punktu' }, grupaSwiata);

  const rozmiar = { szerokosc: 0, wysokosc: 0 };
  const widok = { x: 0, y: 0, k: 1 };
  let skala = 1; // px na jednostkę świata dla bieżącego widoku
  const pinezki = new Map(); // slug -> {el, wx, wy}
  let zaznaczony = null;
  let paryPolaczen = []; // [{a, b}]
  let lukiStale = false; // warstwa ∞ włączona przyciskiem (przelaczLuki)
  let podgladSlug = null; // C2: pinezka pod wskaźnikiem/fokusem — podgląd jej powiązań
  let miastaDane = []; // [{g, wx, wy, nazwa, populacja, tier}]
  let ostatnieSkala = null; // do pomijania przebudowy transformów punktów przy samym panu
  let aktywneMiasto = null; // miasto pokazane po kliknięciu
  let aktywnyPunkt = null; // punkt POI/historii pokazany podczas przytrzymania
  let czyPrzesunieto = false; // pan/pinch nie może być mylony z kliknięciem w miasto

  /** Punkt zdarzenia klienta → współrzędne viewBoxu (= piksele kontenera). */
  function naSvg(zdarzenie) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(zdarzenie.clientX, zdarzenie.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function dopusc() {
    const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: maksymalneK() });
    widok.x = d.x;
    widok.y = d.y;
    widok.k = d.k;
    return d;
  }

  /** Pobierz rozmiar kontenera; zachowaj punkt świata pod środkiem okna. */
  function wymierz() {
    const ramka = kontener.getBoundingClientRect();
    const szerokosc = Math.max(1, Math.round(ramka.width || 0));
    const wysokosc = Math.max(1, Math.round(ramka.height || 0));
    if (szerokosc === rozmiar.szerokosc && wysokosc === rozmiar.wysokosc) return false;

    let srodek = null;
    if (rozmiar.szerokosc > 0 && rozmiar.wysokosc > 0) {
      const stare = dopasujWidok(rozmiar, widok, { min: K_MIN, max: maksymalneK() });
      srodek = {
        wx: (rozmiar.szerokosc / 2 - stare.x) / stare.s,
        wy: (rozmiar.wysokosc / 2 - stare.y) / stare.s,
      };
    }
    rozmiar.szerokosc = szerokosc;
    rozmiar.wysokosc = wysokosc;
    svg.setAttribute('viewBox', `0 0 ${szerokosc} ${wysokosc}`);
    if (srodek) {
      const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: maksymalneK() });
      widok.x = szerokosc / 2 - srodek.wx * d.s;
      widok.y = wysokosc / 2 - srodek.wy * d.s;
    }
    return true;
  }

  function zastosuj(animuj = false) {
    const d = dopusc();
    skala = d.s;
    grupaSwiata.style.transition = animuj ? 'transform .5s cubic-bezier(.22,.61,.36,1)' : 'none';
    grupaSwiata.style.transform = `translate(${d.x}px, ${d.y}px) scale(${d.s})`;
    const s = 1 / d.s;
    const transform = (p) => `translate(${p.wx} ${p.wy}) scale(${s})`;
    for (const p of pinezki.values()) {
      p.el.setAttribute('transform', transform(p));
      p.etykieta.setAttribute('transform', transform(p)); // warstwa etykiet, ten sam punkt świata (A3)
    }
    // A1 (M6): bez stałego pokazywania etykiet od progu zoomu — dawny toggle
    // klasy `przyblizona` usunięty; etykieta żyje na najechanie/fokus/wybranie.
    odswiezWidocznoscWarstw();
    przelozEtykieteMiasta();
    przelozEtykietePunktu();
    // D (2026-08-30): do zapisu widoku w localStorage app.js potrzebuje punktu
    // świata pod środkiem okna (niezależnego od rozmiaru okna) i powiększenia.
    const srodek = skala > 0
      ? {
          wx: (rozmiar.szerokosc / 2 - widok.x) / skala,
          wy: (rozmiar.wysokosc / 2 - widok.y) / skala,
        }
      : null;
    przyZmianieWidoku?.(widok.k, { skala: skala, srodek });
  }

  /** Zoom w punkt p (współrzędne viewBoxu) o czynnik f. */
  function zoomDoPunktu(p, f, animuj = false) {
    const przed = dopasujWidok(rozmiar, widok, { min: K_MIN, max: maksymalneK() });
    const noweK = ogranicz(przed.k * f, K_MIN, maksymalneK());
    const r = noweK / przed.k;
    widok.k = noweK;
    widok.x = p.x - (p.x - przed.x) * r;
    widok.y = p.y - (p.y - przed.y) * r;
    zastosuj(animuj);
  }

  function wysrodkuj(lat, lon, k = null, animuj = true) {
    if (k !== null) widok.k = k;
    const [wx, wy] = projektuj(lat, lon);
    const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: maksymalneK() });
    widok.x = rozmiar.szerokosc / 2 - wx * d.s;
    widok.y = rozmiar.wysokosc / 2 - wy * d.s;
    zastosuj(animuj);
  }

  /** Przywraca widok z zapisu (D): wycentruj na punkcie świata (wx, wy) przy k. */
  function ustawWidok(wx, wy, k = null, animuj = false) {
    if (k !== null) widok.k = k;
    const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: maksymalneK() });
    widok.x = rozmiar.szerokosc / 2 - wx * d.s;
    widok.y = rozmiar.wysokosc / 2 - wy * d.s;
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
    czyPrzesunieto = false;
    const p0 = naSvg(e);
    const miasto = miastoPodKlikiem(p0);
    if (miasto) {
      pokazEtykieteMiasta(miasto); // C4: nazwa tylko podczas przytrzymania
      ukryjEtykietePunktu();
    } else {
      const punkt = punktPodKlikiem(p0); // B: POI/historia jak miasta
      if (punkt) pokazEtykietePunktu(punkt);
    }
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
    if (Math.hypot(e.clientX - poprzedni.x, e.clientY - poprzedni.y) > 4) {
      czyPrzesunieto = true;
      ukryjEtykieteMiasta();
      ukryjEtykietePunktu();
    }

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
    ukryjEtykieteMiasta(); // C4: puszczenie przycisku zawsze chowa tabliczkę miasta
    ukryjEtykietePunktu(); // B: analogicznie dla POI i miejsc historycznych
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

  /** Badge nazwy: szerokość z realnego pomiaru tekstu (px CSS), baseline na środku. */
  function dopasujBadge(tlo, tekst, nazwa) {
    const { szer, wys } = wymiaryEtykiety(nazwa, tekst);
    tlo.setAttribute('x', (-szer / 2).toFixed(1));
    tlo.setAttribute('y', (-ODSTEP_BADGE - wys).toFixed(1));
    tlo.setAttribute('width', String(szer));
    tlo.setAttribute('height', String(wys));
    tekst.setAttribute('y', (-ODSTEP_BADGE - wys / 2).toFixed(1));
  }

  function ustawPinezki(rekordy) {
    grupaPinezek.innerHTML = '';
    grupaEtykiet.innerHTML = '';
    pinezki.clear();
    for (const r of rekordy) {
      const [wx, wy] = projektuj(r.lat, r.lon);
      const g = el('g', { class: 'pinezka', 'data-slug': r.slug, tabindex: 0, role: 'button', 'aria-label': `Manifestacja: ${r.nazwa}` }, grupaPinezek);
      el('circle', { r: 26, class: 'trafienie' }, g); // pole trafienia (A5)
      el('circle', { r: 13, class: 'glowa' }, g);
      el('circle', { r: 4.4, class: 'zrenica' }, g);
      el('path', { d: 'M0,10 L-7.5,27 L0,19.5 L7.5,27 Z', class: 'ostrze' }, g);
      const etykieta = el('g', { class: 'etykieta' }, grupaEtykiet); // warstwa nad pinezkami (A3)
      const tlo = el('rect', { class: 'tlo-etykiety', rx: 8 }, etykieta);
      const tekst = el('text', {}, etykieta);
      tekst.textContent = r.nazwa;
      dopasujBadge(tlo, tekst, r.nazwa);
      // A1 (M6): etykieta pokazuje się po najechaniu wskaźnikiem i po fokusu
      // klawiatury (pinezka jest fokusowalna, tabindex=0).
      // C2: najechanie/fokus pokazuje badge (A1) i podgląd powiązań pinezki
      g.addEventListener('pointerenter', () => {
        etykieta.classList.add('widoczna');
        podgladaj(r.slug);
      });
      g.addEventListener('pointerleave', () => {
        etykieta.classList.remove('widoczna');
        podgladaj(null);
      });
      g.addEventListener('focus', () => {
        etykieta.classList.add('widoczna');
        podgladaj(r.slug);
      });
      g.addEventListener('blur', () => {
        etykieta.classList.remove('widoczna');
        podgladaj(null);
      });
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ukryjEtykieteMiasta();
        przyZmianieZaznaczenia?.(r.slug);
      });
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          ukryjEtykieteMiasta();
          przyZmianieZaznaczenia?.(r.slug);
        }
      });
      pinezki.set(r.slug, { el: g, etykieta, wx, wy });
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
      if (podgladSlug && a !== podgladSlug && b !== podgladSlug) continue; // C2: tylko łuki dotykające wskazanej
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
      const aktywny = podgladSlug != null || zaznaczony === a || zaznaczony === b;
      el('path', { d: `M${pa.wx} ${pa.wy} Q${cx} ${cy} ${pb.wx} ${pb.wy}`, class: `luk${aktywny ? ' aktywny' : ''}` }, warstwaLukow);
    }
    // C2: sąsiedzi wskazanej pinezki dostają delikatne podświetlenie
    for (const [s, p] of pinezki) {
      const sasiad =
        podgladSlug != null &&
        s !== podgladSlug &&
        paryPolaczen.some(({ a, b }) => (a === podgladSlug && b === s) || (b === podgladSlug && a === s));
      p.el.classList.toggle('powiazana', sasiad);
    }
    odswiezLukiWidocznosc();
  }

  /** Widok „rozmowy” (C2, 2026-09-04): łuki skitu łączące pinezki uczestników
   *  w odrębnej warstwie nad łukami powiązań; `pary` = [{a, b}] sluga→sluga. */
  function pokazRozmowe(pary) {
    warstwaRozmowy.innerHTML = '';
    for (const { a, b } of pary ?? []) {
      const pa = pinezki.get(a);
      const pb = pinezki.get(b);
      if (!pa || !pb) continue;
      const mx = (pa.wx + pb.wx) / 2;
      const my = (pa.wy + pb.wy) / 2;
      const dx = pb.wx - pa.wx;
      const dy = pb.wy - pa.wy;
      const len = Math.hypot(dx, dy) || 1;
      const cx = mx - (dy / len) * len * 0.18;
      const cy = my + (dx / len) * len * 0.18;
      // pathLength=1 normalizuje jednostki kreskowania, żeby animacja
      // „przebiegnięcia” w CSS nie zależała od długości łuku.
      el('path', { d: `M${pa.wx} ${pa.wy} Q${cx} ${cy} ${pb.wx} ${pb.wy}`, class: 'luk rozmowy', pathLength: 1 }, warstwaRozmowy);
    }
    warstwaRozmowy.setAttribute('display', warstwaRozmowy.dzieci?.length ?? warstwaRozmowy.childElementCount ? 'inherit' : 'none');
  }

  function ukryjRozmowe() {
    warstwaRozmowy.innerHTML = '';
    warstwaRozmowy.setAttribute('display', 'none');
  }

  function odswiezLukiWidocznosc() {
    warstwaLukow.setAttribute('display', lukiStale || podgladSlug ? 'inherit' : 'none');
  }

  function przelaczLuki(pokaz) {
    lukiStale = !!pokaz;
    odswiezLukiWidocznosc();
  }

  /** C2: podgląd powiązań pinezki (najechanie wskaźnikiem albo fokus klawiatury). */
  function podgladaj(slug) {
    const zmiana = podgladSlug !== slug;
    podgladSlug = slug;
    if (zmiana) rysujLuki();
  }

  function zaznacz(slug) {
    zaznaczony = slug;
    for (const [s, p] of pinezki) {
      const wybrana = s === slug;
      p.el.classList.toggle('wybrana', wybrana);
      p.etykieta.classList.toggle('wybrana', wybrana); // badge wybranej pinezki zostaje (A1)
    }
    rysujLuki();
  }

  function podswietl(widoczne /* Set<slug> | null */) {
    for (const [s, p] of pinezki) {
      const przygaszona = widoczne !== null && !widoczne.has(s);
      p.el.classList.toggle('przygaszona', przygaszona);
      p.etykieta.classList.toggle('przygaszona', przygaszona); // badge przygasa razem z pinezką
    }
  }

  /* ---- Warstwy szczegółowości (ADR 0020): woda, miasta, POI ------ */

  /** Rysuje jedną warstwę wodną (rzeki albo jeziora) z GeoJSON MultiPolygon. */
  function ustawWode(grupa, geo) {
    grupa.innerHTML = '';
    for (const g of geo?.geometries ?? []) {
      if (g.type === 'MultiPolygon' || g.type === 'Polygon') {
        const coords = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
        el('path', { d: sciezkaGeoMultiPoligon(coords), class: 'szczegol' }, grupa);
      }
    }
    odswiezWidocznoscWarstw();
  }

  function ustawRzeki(geo) {
    ustawWode(grupaRzek, geo);
  }

  function ustawJeziora(geo) {
    ustawWode(grupaJezior, geo);
  }

  /** Punkty POI — szczyty i pasma (NE geography regions points). */
  function ustawSzczyty(punkty) {
    grupaPOI.innerHTML = '';
    szczytyDane = [];
    for (const f of punkty?.features ?? []) {
      const p = f.properties ?? {};
      const c = f.geometry?.coordinates ?? [];
      const lat = c[1];
      const lon = c[0];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const [wx, wy] = projektuj(lat, lon);
      const nazwa = p.n ?? '';
      const opis = `${nazwa}${p.e ? ` · ${p.e} m n.p.m.` : ''}`;
      const g = el('g', { class: 'punkt', 'aria-label': opis }, grupaPOI);
      el('circle', { r: 5, class: 'kropka' }, g);
      // B: pole trafienia — kursor strzałka i wygodne wciśnięcie (jak miasta).
      el('circle', { class: 'trafienie', r: String(PROMIEN_KLIK_PUNKTU) }, g);
      szczytyDane.push({ g, grupa: grupaPOI, wx, wy, nazwa, opis });
    }
    if (aktywnyPunkt && !szczytyDane.some((d) => d.wx === aktywnyPunkt.wx && d.wy === aktywnyPunkt.wy)) ukryjEtykietePunktu();
    odswiezWidocznoscWarstw();
  }

  /** Warstwa historyczna — starożytne miejsca (Pleiades, CC BY 3.0). */
  function ustawHistorie(punkty) {
    grupaHistoria.innerHTML = '';
    historiaDane = [];
    for (const f of punkty?.features ?? []) {
      const p = f.properties ?? {};
      const c = f.geometry?.coordinates ?? [];
      const lat = c[1];
      const lon = c[0];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const [wx, wy] = projektuj(lat, lon);
      const nazwa = p.n ?? '';
      const g = el('g', { class: 'punkt', 'aria-label': nazwa }, grupaHistoria);
      el('circle', { r: 3.5, class: 'kropka' }, g);
      // B: pole trafienia jak u miast (kursor strzałka, on-press nazwa).
      el('circle', { class: 'trafienie', r: String(PROMIEN_KLIK_PUNKTU) }, g);
      historiaDane.push({ g, grupa: grupaHistoria, wx, wy, nazwa, opis: nazwa });
    }
    if (aktywnyPunkt && !historiaDane.some((d) => d.wx === aktywnyPunkt.wx && d.wy === aktywnyPunkt.wy)) ukryjEtykietePunktu();
    odswiezWidocznoscWarstw();
  }

  /** Raster hipsometrii (Web Mercator, 3600×3600 j.u.) pod krajami. */
  function ustawHipsometrie(url) {
    if (obrazHipso) return;
    obrazHipso = el('image', {
      href: url,
      x: 0,
      y: 0,
      width: SZER,
      height: WYS,
      preserveAspectRatio: 'none',
      class: 'hipsometria-obraz',
    }, grupaHipso);
  }

  /* ---- Podkład online: kafelki Web Mercator (tylko darmowe, bez klucza) ---- */

  let ostatniaSiatkaKafelkow = '';

  /** Kafelek świata dla zoomu `z` (px × 2^z na cały → jednostki świata). */
  function rozmiarKafelka(z) {
    return SZER / 2 ** z;
  }

  function rysujPodkladOnline() {
    const klucz = WIDOCZNE_WARSTWY.podklad;
    const def = klucz && PODKLADY_ONLINE[klucz];
    if (!def) {
      grupaPodklad.setAttribute('display', 'none');
      grupaPodklad.innerHTML = '';
      ostatniaSiatkaKafelkow = '';
      return;
    }
    grupaPodklad.setAttribute('display', 'inherit');
    // skala: ile px ekranu przypada na jednostkę świata; dobierz z tak, by
    // piksel kafelka ≈ piksel ekranu (potem zaokrąglenie w dół = siatka rzadsza).
    const z = Math.max(0, Math.min(def.maxZoom ?? 18, Math.round(Math.log2((skala * SZER) / 256))));
    const size = rozmiarKafelka(z);
    // widoczny prostokąt świata: viewBox (px) → j.u. świata
    const wx0 = (0 - widok.x) / skala;
    const wy0 = (0 - widok.y) / skala;
    const wx1 = (rozmiar.szerokosc - widok.x) / skala;
    const wy1 = (rozmiar.wysokosc - widok.y) / skala;
    const tx0 = Math.max(0, Math.floor(wx0 / size));
    const ty0 = Math.max(0, Math.floor(wy0 / size));
    const tx1 = Math.min(2 ** z - 1, Math.floor(wx1 / size));
    const ty1 = Math.min(2 ** z - 1, Math.floor(wy1 / size));
    const sygnatura = `${klucz}|${z}|${tx0}:${ty0}-${tx1}:${ty1}`;
    if (sygnatura === ostatniaSiatkaKafelkow) return;
    ostatniaSiatkaKafelkow = sygnatura;
    grupaPodklad.innerHTML = '';
    const f = document.createDocumentFragment();
    // Przy wysokich zoomach rozmiar kafelka (j.u. świata) jest ułamkiem —
    // zwykłe toFixed(1) zaokrągla go do 0 i kafelki nakładają się na siebie.
    const fmt = (v) => String(Number(v.toPrecision(8)));
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const sub = def.subdomeny[(tx + ty) % Math.max(1, def.subdomeny.length)];
        el('image', {
          href: def.url(z, tx, ty, sub),
          x: fmt(tx * size),
          y: fmt(ty * size),
          width: fmt(size),
          height: fmt(size),
          class: 'kafelek',
        }, f);
      }
    }
    grupaPodklad.appendChild(f);
  }

  const formatujPopulacje = (p) => (p >= 1_000_000 ? `${(p / 1_000_000).toFixed(1)} mln` : `${(p / 1_000).toFixed(0)} tys.`);

  /** Ustawia transform etykiety miasta (stały rozmiar ekranowy, jak badge). */
  function przelozEtykieteMiasta() {
    if (!aktywneMiasto) return;
    const komp = 1 / skala;
    etykietaMiasta.setAttribute('transform', `translate(${aktywneMiasto.wx} ${aktywneMiasto.wy}) scale(${komp})`);
  }

  function ukryjEtykieteMiasta() {
    aktywneMiasto = null;
    etykietaMiasta.classList.remove('widoczna');
    etykietaMiasta.innerHTML = '';
  }

  function pokazEtykieteMiasta(m) {
    if (!m) return ukryjEtykieteMiasta();
    aktywneMiasto = m;
    etykietaMiasta.innerHTML = '';
    const tlo = el('rect', { class: 'tlo-etykiety', rx: 8 }, etykietaMiasta);
    const tekst = el('text', {}, etykietaMiasta);
    tekst.textContent = `${m.nazwa ?? ''}${m.populacja ? ` · ${formatujPopulacje(m.populacja)}` : ''}`;
    const { szer, wys } = wymiaryEtykiety(tekst.textContent, tekst);
    tlo.setAttribute('x', (-szer / 2).toFixed(1));
    tlo.setAttribute('y', (-ODSTEP_MIASTA - wys).toFixed(1));
    tlo.setAttribute('width', String(szer));
    tlo.setAttribute('height', String(wys));
    tekst.setAttribute('y', (-ODSTEP_MIASTA - wys / 2).toFixed(1));
    przelozEtykieteMiasta();
    etykietaMiasta.classList.add('widoczna');
  }

  /** Ustawia transform etykiety punktu (stały rozmiar ekranowy, jak miasta). */
  function przelozEtykietePunktu() {
    if (!aktywnyPunkt) return;
    const komp = 1 / skala;
    etykietaPunktu.setAttribute('transform', `translate(${aktywnyPunkt.wx} ${aktywnyPunkt.wy}) scale(${komp})`);
  }

  function ukryjEtykietePunktu() {
    aktywnyPunkt = null;
    etykietaPunktu.classList.remove('widoczna');
    etykietaPunktu.innerHTML = '';
  }

  function pokazEtykietePunktu(d) {
    if (!d) return ukryjEtykietePunktu();
    aktywnyPunkt = d;
    etykietaPunktu.innerHTML = '';
    const tlo = el('rect', { class: 'tlo-etykiety', rx: 8 }, etykietaPunktu);
    const tekst = el('text', {}, etykietaPunktu);
    tekst.textContent = d.opis ?? d.nazwa ?? '';
    const { szer, wys } = wymiaryEtykiety(tekst.textContent, tekst);
    tlo.setAttribute('x', (-szer / 2).toFixed(1));
    tlo.setAttribute('y', (-ODSTEP_PUNKTU - wys).toFixed(1));
    tlo.setAttribute('width', String(szer));
    tlo.setAttribute('height', String(wys));
    tekst.setAttribute('y', (-ODSTEP_PUNKTU - wys / 2).toFixed(1));
    przelozEtykietePunktu();
    etykietaPunktu.classList.add('widoczna');
  }

  /** Najbliższe widoczne miasto w promieniu kliknięcia (px ekranu). */
  function miastoPodKlikiem(p) {
    let najlepsze = null;
    let najlepszyDystans = PROMIEN_KLIK_MIASTA ** 2;
    for (const m of miastaDane) {
      if (grupyMiast[m.tier].getAttribute('display') === 'none') continue;
      const sx = widok.x + m.wx * skala;
      const sy = widok.y + m.wy * skala;
      const d2 = (sx - p.x) ** 2 + (sy - p.y) ** 2;
      if (d2 <= najlepszyDystans) {
        najlepszyDystans = d2;
        najlepsze = m;
      }
    }
    return najlepsze;
  }

  /** Najbliższy widoczny punkt POI/historii w promieniu kliknięcia (px ekranu). */
  function punktPodKlikiem(p) {
    let najlepsze = null;
    let najlepszyDystans = PROMIEN_KLIK_PUNKTU ** 2;
    for (const zbior of [szczytyDane, historiaDane]) {
      for (const d of zbior) {
        if (d.grupa.getAttribute('display') === 'none') continue;
        const sx = widok.x + d.wx * skala;
        const sy = widok.y + d.wy * skala;
        const d2 = (sx - p.x) ** 2 + (sy - p.y) ** 2;
        if (d2 <= najlepszyDystans) {
          najlepszyDystans = d2;
          najlepsze = d;
        }
      }
    }
    return najlepsze;
  }

  /** Miasta: punkty o stałym rozmiarze ekranowym, podzielone na rangi LOD. */
  function ustawMiasta(lista) {
    grupyMiast.wielkie.innerHTML = '';
    grupyMiast.srednie.innerHTML = '';
    grupyMiast.drobne.innerHTML = '';
    miastaDane = [];
    for (const m of Array.isArray(lista) ? lista : []) {
      const p = Number(m?.p) || 0;
      const tier = p >= 1_000_000 ? 'wielkie' : p >= 500_000 ? 'srednie' : 'drobne';
      const [wx, wy] = projektuj(Number(m.lat), Number(m.lon));
      const nazwa = m.n ?? m.nazwa ?? '';
      const opisDostepnosci = `${nazwa}${p ? ` · ${formatujPopulacje(p)}` : ''}`;
      const g = el('g', { class: 'miasto', 'aria-label': opisDostepnosci }, grupyMiast[tier]);
      const r = tier === 'wielkie' ? 4.5 : tier === 'srednie' ? 3.5 : 2.5;
      el('circle', { class: 'kropka', r: String(r) }, g);
      // C4: przezroczyste pole trafienia o promieniu kliku — zmienia kursor
      // na strzałkę zamiast łapki (miasto nie przesuwa mapy).
      el('circle', { class: 'trafienie', r: String(PROMIEN_KLIK_MIASTA) }, g);
      miastaDane.push({ g, wx, wy, nazwa, populacja: p, tier });
    }
    if (aktywneMiasto && !miastaDane.some((m) => m.wx === aktywneMiasto.wx && m.wy === aktywneMiasto.wy)) ukryjEtykieteMiasta();
    ostatnieSkala = null; // wymuś ustawienie transformów punktów
    odswiezWidocznoscWarstw();
  }

  /** Widoczność warstw od zoomu + odbicia punktów miast (tylko gdy skala się zmieni). */
  function odswiezMiasta() {
    const k = widok.k;
    const progi = {
      wielkie: PROGI_WARSTW.miastaWielkie,
      srednie: PROGI_WARSTW.miastaSrednie,
      drobne: PROGI_WARSTW.miastaDrobne,
    };
    const pokazuj = WIDOCZNE_WARSTWY.miasta && k >= PROGI_WARSTW.miastaWielkie;
    for (const [tier, gr] of Object.entries(grupyMiast)) {
      gr.setAttribute('display', pokazuj && k >= progi[tier] ? 'inherit' : 'none');
    }
    if (!pokazuj) {
      // Gdy miasta znikają (zoom poniżej progu albo wyłączona warstwa),
      // zniknąć musi też otwarta etykieta — inaczej „wisi” nad pustym punktem.
      ukryjEtykieteMiasta();
      return;
    }
    if (Math.abs(skala - ostatnieSkala) <= 1e-9) return;
    const komp = 1 / skala;
    for (const m of miastaDane) {
      if (grupyMiast[m.tier].getAttribute('display') === 'none') continue;
      m.g.setAttribute('transform', `translate(${m.wx} ${m.wy}) scale(${komp})`);
    }
    ostatnieSkala = skala;
  }

  /** Widoczność wszystkich warstw szczegółów — wywoływane z `zastosuj`. */
  function odswiezWidocznoscWarstw() {
    const k = widok.k;
    // Pod rastrem/kaflami kraje stają się półprzezroczyste (style w styles.css).
    svg.classList.toggle('z-hipsometria', !!WIDOCZNE_WARSTWY.hipsometria);
    svg.classList.toggle('z-podklad-online', !!WIDOCZNE_WARSTWY.podklad);
    grupaHipso.setAttribute('display', WIDOCZNE_WARSTWY.hipsometria ? 'inherit' : 'none');
    grupaRzek.setAttribute('display', WIDOCZNE_WARSTWY.rzeki && k >= PROGI_WARSTW.woda ? 'inherit' : 'none');
    grupaJezior.setAttribute('display', WIDOCZNE_WARSTWY.jeziora && k >= PROGI_WARSTW.woda ? 'inherit' : 'none');
    grupaMiast.setAttribute('display', WIDOCZNE_WARSTWY.miasta && k >= PROGI_WARSTW.miastaWielkie ? 'inherit' : 'none');
    grupaPOI.setAttribute('display', WIDOCZNE_WARSTWY.poi && k >= PROGI_WARSTW.poi ? 'inherit' : 'none');
    grupaHistoria.setAttribute('display', WIDOCZNE_WARSTWY.historia && k >= PROGI_WARSTW.historia ? 'inherit' : 'none');
    if (aktywnyPunkt && aktywnyPunkt.grupa.getAttribute('display') === 'none') ukryjEtykietePunktu();
    odswiezMiasta();
    ustawTransformyPunktow();
    rysujPodkladOnline();
  }

  /** Punkty stałego rozmiaru ekranowego (POI, historia) — tylko przy zmianie skali. */
  function ustawTransformyPunktow() {
    if (Math.abs(skala - ostatniaSkalaPunktow) <= 1e-9) return;
    ostatniaSkalaPunktow = skala;
    const komp = 1 / skala;
    for (const zbior of [szczytyDane, historiaDane]) {
      for (const p of zbior) p.g.setAttribute('transform', `translate(${p.wx} ${p.wy}) scale(${komp})`);
    }
  }

  /** Włącza/wyłącza warstwę bez przebudowywania danych (switch w UI).
   *  `podklad` przyjmuje klucz z PODKLADY_ONLINE (lub false/null = wyłączony). */
  function przelaczWidocznoscWarstwy(klucz, widoczny) {
    if (klucz === 'podklad') {
      WIDOCZNE_WARSTWY.podklad = widoczny && PODKLADY_ONLINE[widoczny] ? widoczny : null;
    } else if (klucz in WIDOCZNE_WARSTWY) {
      WIDOCZNE_WARSTWY[klucz] = !!widoczny;
    }
    // C+B: zmiana podkładu zmienia sufit przybliżenia. Przy WYŁĄCZANIU oddalamy
    // w miejscu (środek okna zostaje na tym samym punkcie świata) — sam clamp
    // x/y zostawiał widok na krawędzi świata („skok na ocean atlantycki”).
    if (klucz === 'podklad') {
      const noweMax = maksymalneK();
      if (widok.k > noweMax && skala > 0 && !WIDOCZNE_WARSTWY.podklad) {
        const wx = (rozmiar.szerokosc / 2 - widok.x) / skala;
        const wy = (rozmiar.wysokosc / 2 - widok.y) / skala;
        widok.k = noweMax;
        const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: noweMax });
        widok.x = rozmiar.szerokosc / 2 - wx * d.s;
        widok.y = rozmiar.wysokosc / 2 - wy * d.s;
      }
      zastosuj();
    } else odswiezWidocznoscWarstw();
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

  /* ---- Reagowanie na rozmiar kontenera (ADR 0009) ---- */

  function odswiezRozmiar() {
    if (wymierz()) zastosuj();
  }

  wymierz();
  zastosuj();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(odswiezRozmiar).observe(kontener);
  if (typeof window !== 'undefined') window.addEventListener('resize', odswiezRozmiar);

  return {
    svg,
    ustawMapeSwiata,
    ustawPinezki,
    ustawPolaczenia,
    ustawRzeki,
    ustawJeziora,
    ustawSzczyty,
    ustawHistorie,
    ustawHipsometrie,
    ustawMiasta,
    przelaczWidocznoscWarstwy,
    PODKLADY_ONLINE,
    zaznacz,
    podswietl,
    przelaczLuki,
    pokazRozmowe,
    ukryjRozmowe,
    wysrodkuj,
    ustawWidok,
    reset,
    zoomDoPunktu,
    odswiezRozmiar,
    get widok() {
      return { ...widok };
    },
    get rozmiar() {
      return { ...rozmiar };
    },
    get skala() {
      return skala;
    },
  };
}
