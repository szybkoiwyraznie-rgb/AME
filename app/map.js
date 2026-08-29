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
import { projektuj, dekodujKraje, siatka, dopasujWidok, ogranicz, K_MIN, K_MAX, SZEROKOSC as SZER, WYSOKOSC as WYS, sciezkaGeoMultiPoligon } from './geo.js?v=mercator-1';

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

/** Warstwy szczegółowości (ADR 0020): progi zoomu dla danych tematycznych. */
export const PROGI_WARSTW = {
  woda: 4,
  miastaWielkie: 4,
  miastaSrednie: 7,
  miastaDrobne: 10,
  poi: 8,
};
/** Czy warstwa jest włączona użytkownikowi (domyślnie wszystkie dostępne). */
const WIDOCZNE_WARSTWY = { rzeki: true, jeziora: true, miasta: true, poi: false };

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
  const grupaKrajow = el('g', { class: 'kraje' }, grupaSwiata);
  // Warstwy szczegółowości (ADR 0020): woda rysowana nad lądem, miasta i POI
  // w osobnych grupach punktowych — wszystkie w układzie świata.
  const grupaWarstw = el('g', { class: 'warstwy-szczegolow' }, grupaSwiata);
  const grupaRzek = el('g', { class: 'rzeki', display: 'none' }, grupaWarstw);
  const grupaJezior = el('g', { class: 'jeziora', display: 'none' }, grupaWarstw);
  const grupaMiast = el('g', { class: 'miasta', display: 'none' }, grupaWarstw);
  const grupaPOI = el('g', { class: 'poi', display: 'none' }, grupaWarstw);
  // Miasta dzielimy na rangi, żeby przy zmianie zoomu sterować liczbą punktów
  // bez przebudowywania drzewa (ADR 0020 — LOD treści, nie tylko geometrii).
  const grupyMiast = {
    wielkie: el('g', { class: 'miasta-wielkie' }, grupaMiast),
    srednie: el('g', { class: 'miasta-srednie' }, grupaMiast),
    drobne: el('g', { class: 'miasta-drobne' }, grupaMiast),
  };
  const warstwaLukow = el('g', { class: 'luki', display: 'none' }, grupaSwiata);
  const grupaPinezek = el('g', { class: 'pinezki' }, grupaSwiata);
  // A3 (M6): badge'y w osobnej grupie PO grupie pinezek — SVG maluje elementy
  // w kolejności dokumentu, więc etykieta nigdy nie chowa się pod inną pinezką.
  // Widzialność (A1) sterują klasy na samej etykiecie (widoczna/wybrana),
  // sprzęgane ze stanem pinezki zdarzeniami pointer/focus — nie zagnieżdżaniem.
  const grupaEtykiet = el('g', { class: 'etykiety' }, grupaSwiata);
  // C2: pływająca etykieta miasta (klik) — poza grupaPinezek, w stałym
  // rozmiarze ekranowym dzięki odwrotnej skali (jak badge pinezki).
  const etykietaMiasta = el('g', { class: 'etykieta-miasta' }, grupaSwiata);

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
  let przypieteMiasto = null; // miasto przypięte klikiem — hover go nie nadpisuje
  let czyPrzesunieto = false; // pan/pinch nie może być mylony z kliknięciem w miasto

  /** Punkt zdarzenia klienta → współrzędne viewBoxu (= piksele kontenera). */
  function naSvg(zdarzenie) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(zdarzenie.clientX, zdarzenie.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function dopusc() {
    const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: K_MAX });
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
      const stare = dopasujWidok(rozmiar, widok, { min: K_MIN, max: K_MAX });
      srodek = {
        wx: (rozmiar.szerokosc / 2 - stare.x) / stare.s,
        wy: (rozmiar.wysokosc / 2 - stare.y) / stare.s,
      };
    }
    rozmiar.szerokosc = szerokosc;
    rozmiar.wysokosc = wysokosc;
    svg.setAttribute('viewBox', `0 0 ${szerokosc} ${wysokosc}`);
    if (srodek) {
      const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: K_MAX });
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
    przyZmianieWidoku?.(widok.k, { skala: skala });
  }

  /** Zoom w punkt p (współrzędne viewBoxu) o czynnik f. */
  function zoomDoPunktu(p, f, animuj = false) {
    const przed = dopasujWidok(rozmiar, widok, { min: K_MIN, max: K_MAX });
    const noweK = ogranicz(przed.k * f, K_MIN, K_MAX);
    const r = noweK / przed.k;
    widok.k = noweK;
    widok.x = p.x - (p.x - przed.x) * r;
    widok.y = p.y - (p.y - przed.y) * r;
    zastosuj(animuj);
  }

  function wysrodkuj(lat, lon, k = null, animuj = true) {
    if (k !== null) widok.k = k;
    const [wx, wy] = projektuj(lat, lon);
    const d = dopasujWidok(rozmiar, widok, { min: K_MIN, max: K_MAX });
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
      ukryjEtykieteMiasta(true); // przeciągnięcie odprzypina
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

  svg.addEventListener('click', (e) => {
    if (e.target.closest('.pinezka')) return; // pinezka obsługuje się sama
    if (czyPrzesunieto) return; // drag/pinch nie jest kliknięciem
    const m = miastoPodKlikiem(naSvg(e));
    if (m) pokazEtykieteMiasta(m, { przypnij: true });
    else ukryjEtykieteMiasta(true); // klik w tło odprzypina
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

  const formatujPopulacje = (p) => (p >= 1_000_000 ? `${(p / 1_000_000).toFixed(1)} mln` : `${(p / 1_000).toFixed(0)} tys.`);

  /** Ustawia transform etykiety miasta (stały rozmiar ekranowy, jak badge). */
  function przelozEtykieteMiasta() {
    if (!aktywneMiasto) return;
    const komp = 1 / skala;
    etykietaMiasta.setAttribute('transform', `translate(${aktywneMiasto.wx} ${aktywneMiasto.wy}) scale(${komp})`);
  }

  function ukryjEtykieteMiasta(czyscPrzypiecie = false) {
    if (czyscPrzypiecie) przypieteMiasto = null;
    if (przypieteMiasto) return; // przypięte klikiem zostaje do kliknięcia w tło
    aktywneMiasto = null;
    etykietaMiasta.classList.remove('widoczna');
    etykietaMiasta.innerHTML = '';
  }

  function pokazEtykieteMiasta(m, { przypnij = false } = {}) {
    if (!m) return ukryjEtykieteMiasta(przypnij);
    if (przypnij) przypieteMiasto = m;
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
      const g = el('g', { class: 'miasto' }, grupyMiast[tier]);
      const r = tier === 'wielkie' ? 4.5 : tier === 'srednie' ? 3.5 : 2.5;
      const kropka = el('circle', { class: 'kropka', r: String(r) }, g);
      const t = el('title', {}, kropka);
      const nazwa = m.n ?? m.nazwa ?? '';
      t.textContent = `${nazwa}${p ? ` · ${formatujPopulacje(p)}` : ''}`;
      const rekordMiasta = { g, wx, wy, nazwa, populacja: p, tier };
      // C2: nazwa miasta po najechaniu (bez przypinania); klik przypina.
      g.addEventListener('pointerenter', () => {
        if (przypieteMiasto !== rekordMiasta) pokazEtykieteMiasta(rekordMiasta);
      });
      g.addEventListener('pointerleave', () => {
        if (przypieteMiasto !== rekordMiasta) ukryjEtykieteMiasta();
      });
      miastaDane.push(rekordMiasta);
    }
    if (aktywneMiasto && !miastaDane.some((m) => m.wx === aktywneMiasto.wx && m.wy === aktywneMiasto.wy)) ukryjEtykieteMiasta(true);
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
      // C2: gdy miasta znikają (zoom poniżej progu albo wyłączona warstwa),
      // zniknąć musi też otwarta etykieta — inaczej „wisi” nad pustym punktem.
      ukryjEtykieteMiasta(true);
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
    grupaRzek.setAttribute('display', WIDOCZNE_WARSTWY.rzeki && k >= PROGI_WARSTW.woda ? 'inherit' : 'none');
    grupaJezior.setAttribute('display', WIDOCZNE_WARSTWY.jeziora && k >= PROGI_WARSTW.woda ? 'inherit' : 'none');
    grupaMiast.setAttribute('display', WIDOCZNE_WARSTWY.miasta && k >= PROGI_WARSTW.miastaWielkie ? 'inherit' : 'none');
    grupaPOI.setAttribute('display', WIDOCZNE_WARSTWY.poi && k >= PROGI_WARSTW.poi ? 'inherit' : 'none');
    odswiezMiasta();
  }

  /** Włącza/wyłącza warstwę bez przebudowywania danych (switch w UI). */
  function przelaczWidocznoscWarstwy(klucz, widoczny) {
    if (klucz in WIDOCZNE_WARSTWY) WIDOCZNE_WARSTWY[klucz] = !!widoczny;
    odswiezWidocznoscWarstw();
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
    ustawMiasta,
    przelaczWidocznoscWarstwy,
    zaznacz,
    podswietl,
    przelaczLuki,
    wysrodkuj,
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
