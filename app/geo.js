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
