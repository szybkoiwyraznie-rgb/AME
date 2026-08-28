/**
 * app/geo.js — geometria mapy AME (czyste funkcje, testowalne w Node).
 *
 * Mapa świata w projekcji walcowej równoodległej (equirectangular):
 * układ światów = prostokąt 3600×1800 j.u.; (0,0) w lewym górnym rogu.
 * Dekoder TopoJSON (Natural Earth) bez zależności. ADR 0003.
 */

export const SZEROKOSC = 3600;
export const WYSOKOSC = 1800;

/** [lat, lon] (stopnie dziesiętne) → [x, y] w jednostkach świata. */
export function projektuj(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new RangeError(`Nieprawidłowe współrzędne: ${lat}, ${lon}`);
  return [((lon + 180) / 360) * SZEROKOSC, ((90 - lat) / 180) * WYSOKOSC];
}

/** Odwrotnie: [x, y] → [lat, lon] (przydatne np. dla kliknięcia w mapę). */
export function odwroc(x, y) {
  return [90 - (y / WYSOKOSC) * 180, (x / SZEROKOSC) * 360 - 180];
}

/** Dekoduje kwantyzowane łuki TopoJSON na współrzędne absolutne [lon, lat]. */
export function dekodujLuki(topologia) {
  const { transform } = topologia;
  if (!transform) throw new Error('Topologia bez pola transform (współrzędne niekwantyzowane nie są wspierane)');
  return topologia.arcs.map((luk) => {
    let x = 0;
    let y = 0;
    return luk.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]];
    });
  });
}

/** Punkty pojedynczego łuku; ujemny indeks = łuk odwrotny (konwencja TopoJSON). */
export function punktyLuku(luki, i) {
  const pkt = i < 0 ? luki[~i] : luki[i];
  if (!pkt) throw new RangeError(`Łuk ${i} nie istnieje w topologii`);
  return i < 0 ? [...pkt].reverse() : pkt;
}

/** Skleja łańcuch łuków w domknięty pierścień punktów [lon, lat]. */
export function poskladajPierscien(luki, indeksy) {
  const pkt = [];
  for (const i of indeksy) {
    const p = punktyLuku(luki, i);
    for (let j = 0; j < p.length - 1; j++) pkt.push(p[j]); // ostatni punkt łuku = pierwszy następnego
  }
  if (pkt.length === 0) return pkt;
  pkt.push(pkt[0]); // domknięcie pierścienia
  return pkt;
}

/* ---- Widok mapy: dopasowanie do kontenera (ADR 0009) ---------------------
 * Dawniej: stały viewBox 3600×1800 z `preserveAspectRatio="…slice"`, przez co
 * świat był „wciskany” w okno — przy proporcjach innych niż 2:1 rama ucinała
 * bieguny albo długości, a otwarcie panelu (który zmieniał szerokość kontenera)
 * powodowało skok skali. Teraz kontener dyktuje viewBox (w pikselach CSS), a
 * `dopasujWidok` dobiera skalę bazową tak, aby cały świat mieścił się w oknie:
 * 1° długości geograficznej = 1° szerokości na ekranie, zawsze.
 */

export const K_MIN = 1;
export const K_MAX = 32;

/** Ograniczenie wartości do przedziału (odporność na min > max). */
export function ogranicz(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Czyste dopasowanie widoku: kontener (px) + widok {x, y, k} → {x, y, k, s, baza, …}.
 * `s` to skala świata (px na jednostkę świata = 0,1 px na stopień),
 * `k` — powiększenie ponad dopasowanie (1 = cały świat). Przesunięcia są
 * dociśnięte tak, by nie pokazywać nic poza światem, a przy małym powiększeniu
 * (gdy świat jest mniejszy od okna) wyśrodkowane.
 */
export function dopasujWidok(kontener, widok, { min = K_MIN, max = K_MAX } = {}) {
  const szerokosc = Math.max(1, kontener?.szerokosc || 1);
  const wysokosc = Math.max(1, kontener?.wysokosc || 1);
  const k = ogranicz(Number.isFinite(widok?.k) ? widok.k : min, min, max);
  const baza = Math.min(szerokosc / SZEROKOSC, wysokosc / WYSOKOSC);
  const s = baza * k;
  const szer = SZEROKOSC * s;
  const wys = WYSOKOSC * s;
  return {
    x: szer <= szerokosc ? (szerokosc - szer) / 2 : ogranicz(widok?.x ?? 0, szerokosc - szer, 0),
    y: wys <= wysokosc ? (wysokosc - wys) / 2 : ogranicz(widok?.y ?? 0, wysokosc - wys, 0),
    k,
    s,
    baza,
    szerokosc: szer,
    wysokosc: wys,
  };
}

/* ---- Antypołudnik (±180°) — ADR 0009, LESSONS L7 -------------------------
 * Geometrie Natural Earth (Rosja, Fidżi, Antarktyda) potrafią mieć pierścień,
 * który przechodzi przez antypołudnik: kolejna para punktów ma wtedy skok
 * długości ~360°. W projekcji walcowej taka krawędź zamieniłaby się w cięciwę
 * przez całą szerokość mapy — to właśnie „rozlewająca się Rosja” i „gruby
 * równoleżnik” na wysokości Madagaskaru (sliver Fidżi na -16,45°).
 * Rozcinamy więc pierścień na kawałki po jednej stronie ±180° i domykamy każdy
 * wzdłuż szwu (antypołudnika = krawędzi mapy, więc cięcia nie widać).
 */

const ANTYPOLUDNIK = 180;

/**
 * Czy krawędź a→b (punkty [lon, lat], shortest-path) przechodzi przez
 * antypołudnik? Zwraca { lat, brzegA, brzegB } — szerokość przecięcia oraz
 * długości brzegowe po stronie punktu a i punktu b; null, gdy krawędź nie
 * przecina. Krok „180° → -180°” na tej samej szerokości to przejście po szwie
 * (ten sam punkt globu): traktujemy je jako przecięcie w szerokości punktu a.
 */
export function przeciecieAntypoludnika(a, b) {
  const dlon = b[0] - a[0];
  if (Math.abs(dlon) <= ANTYPOLUDNIK) return null;
  const brzegA = a[0] > 0 ? ANTYPOLUDNIK : -ANTYPOLUDNIK;
  const bOdwiniete = dlon > 0 ? b[0] - 360 : b[0] + 360; // krótsza droga wokół kuli
  const rozpietosc = bOdwiniete - a[0];
  if (Math.abs(rozpietosc) < 1e-9) return { lat: a[1], brzegA, brzegB: -brzegA };
  const t = (brzegA - a[0]) / rozpietosc;
  return { lat: a[1] + t * (b[1] - a[1]), brzegA, brzegB: -brzegA };
}

/**
 * Rozcina domknięty pierścień [lon, lat] na antypołudniku. Zwraca tablicę
 * pierścieni (każdy domknięty, długości w [-180, 180]). Pierścień
 * nieprzekraczający szwu wraca bez zmian — tak ma się rzecz dla ~240 krajów.
 *
 * Pierścienie z NIEPARZYSTĄ liczbą przecięć to dane rozcięte na szwie (tak
 * Natural Earth zapisuje Antarktydę): ich ostatni kawałek domykamy wzdłuż
 * bieguna, zamiast ciąć cięciwą przez mapę.
 */
export function potnijPierscien(pierscien) {
  const pkt = pierscien.slice();
  if (pkt.length > 1) {
    const a = pkt[0];
    const b = pkt[pkt.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) pkt.pop(); // zdjąć duplikat domknięcia
  }
  const n = pkt.length;
  if (n < 3) return [pierscien];

  const skoki = [];
  for (let i = 0; i < n; i++) {
    const p = przeciecieAntypoludnika(pkt[i], pkt[(i + 1) % n]);
    if (p) skoki.push({ i, p });
  }
  if (skoki.length === 0) return [pierscien];

  const start = (skoki[0].i + 1) % n; // wchodzimy tuż za pierwszym przecięciem
  const kawalki = [];
  let biezacy = [[skoki[0].p.brzegB, skoki[0].p.lat]];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const a = pkt[i];
    const b = pkt[(i + 1) % n];
    biezacy.push(a);
    const p = przeciecieAntypoludnika(a, b);
    if (!p) continue;
    biezacy.push([p.brzegA, p.lat]);
    kawalki.push(biezacy);
    biezacy = [[p.brzegB, p.lat]];
  }

  const sredniaLat = pkt.reduce((s, q) => s + q[1], 0) / n;
  const biegunka = 90 * Math.sign(sredniaLat || -1);
  const wynik = [];
  for (const kr of kawalki) {
    const czysty = [];
    for (const q of kr) {
      const ogon = czysty[czysty.length - 1];
      if (ogon && Math.abs(ogon[0] - q[0]) < 1e-9 && Math.abs(ogon[1] - q[1]) < 1e-9) continue;
      czysty.push(q);
    }
    if (czysty.length < 3) continue; // kawałek bez pola
    const glowica = czysty[0];
    const ogon = czysty[czysty.length - 1];
    if (Math.abs(glowica[0] - ogon[0]) > 1e-9) {
      // końce po przeciwnych stronach szwu: domknięcie wzdłuż bieguna
      czysty.push([ogon[0], biegunka]);
      czysty.push([glowica[0], biegunka]);
    }
    czysty.push([glowica[0], glowica[1]]);
    wynik.push(czysty);
  }
  return wynik.length > 0 ? wynik : [pierscien];
}

/** Wszystkie pierścienie kraju rozcięte na antypołudniku (spłaszczone). */
export function potnijPierscienie(pierscienie) {
  return pierscienie.flatMap((p) => potnijPierscien(p));
}

/** Pierścienie [lon, lat] → jeden ciąg "d" dla SVG (wielokrotne podścieżki). */
export function sciezka(pierscienie) {
  let d = '';
  for (const p of pierscienie) {
    for (let i = 0; i < p.length; i++) {
      const [x, y] = projektuj(p[i][1], p[i][0]);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    d += 'Z';
  }
  return d;
}

/** GeoJSON Polygon (tablica pierścieni [lon, lat]) → ścieżka SVG z cięciem
 * na antypołudniku (ADR 0009 — ta sama obróbka co kraje). */
export function sciezkaGeoPoligon(pierscienie) {
  return sciezka(potnijPierscienie(pierscienie));
}

/** GeoJSON MultiPolygon → połączone ścieżki SVG. */
export function sciezkaGeoMultiPoligon(coords) {
  let d = '';
  for (const poly of coords ?? []) d += sciezkaGeoPoligon(poly);
  return d;
}

/** Geometrie obiektu "countries" → [{ id, nazwa, d }] do wyrenderowania. */
export function dekodujKraje(topologia) {
  const luki = dekodujLuki(topologia);
  const geometrie = topologia.objects?.countries?.geometries ?? [];
  const kraje = [];
  for (const g of geometrie) {
    let pierscienie = null;
    if (g.type === 'Polygon') pierscienie = g.arcs.map((r) => poskladajPierscien(luki, r));
    else if (g.type === 'MultiPolygon') pierscienie = g.arcs.flat().map((r) => poskladajPierscien(luki, r));
    else continue;
    pierscienie = potnijPierscienie(pierscienie); // ADR 0009: cięcie na ±180°
    kraje.push({ id: g.id ?? null, nazwa: g.properties?.name ?? '', d: sciezka(pierscienie) });
  }
  return kraje;
}

/** Siatka geograficzna (południki/równoleżniki co `krok` stopni) jako ciąg "d". */
export function siatka(krok = 30) {
  let d = '';
  for (let lon = -180 + krok; lon < 180; lon += krok) {
    const [x1, y1] = projektuj(90, lon);
    const [x2, y2] = projektuj(-90, lon);
    d += `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  for (let lat = -90 + krok; lat < 90; lat += krok) {
    const [x1, y1] = projektuj(lat, -180);
    const [x2, y2] = projektuj(lat, 180);
    d += `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return d;
}
