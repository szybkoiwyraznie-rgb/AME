/**
 * app/kregi.js — WARSTWA KRĘGÓW KULTUROWYCH (backlog: „otoczki/halo grupujące
 * wpisy jednej tradycji”). Czysty rachunek geometryczny: żadnego DOM, żadnej
 * sieci, żadnego API Node (ADR 0003, L22). Rysowaniem zajmuje się app/map.js.
 *
 * Krąg to grupa kultur kanonu, nie pojedynczy tag: „nordycko-wyspiarski”
 * obejmuje Islandię, północną Szkocję i wyspę Man, bo to jedna tradycja
 * rozpisana w kartotece na kilka kultur źródłowych (PROTOKÓŁ §2 zabrania
 * mieszanek synkretycznych w obrębie wpisu — grupowanie na mapie to co innego).
 * Definicje żyją w `data/kregi-kulturowe.json`, żeby nowy byt nie wymagał
 * zmiany w kodzie.
 */

/** Domyślny margines otoczki w jednostkach świata (SZEROKOSC = 3600). */
export const MARGINES_KREGU = 46;

/** Środek ciężkości chmury punktów. */
export function centroid(punkty) {
  const n = punkty.length || 1;
  return {
    x: punkty.reduce((s, p) => s + p.x, 0) / n,
    y: punkty.reduce((s, p) => s + p.y, 0) / n,
  };
}

/**
 * Otoczka wypukła (monotone chain Andrew). Zwraca wierzchołki przeciwnie do
 * ruchu wskazówek zegara w układzie ekranowym; dla 1–2 punktów oddaje wejście.
 */
export function otoczkaWypukla(punkty) {
  const p = [...punkty].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const krzyz = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const dol = [];
  for (const q of p) {
    while (dol.length >= 2 && krzyz(dol[dol.length - 2], dol[dol.length - 1], q) <= 0) dol.pop();
    dol.push(q);
  }
  const gora = [];
  for (const q of [...p].reverse()) {
    while (gora.length >= 2 && krzyz(gora[gora.length - 2], gora[gora.length - 1], q) <= 0) gora.pop();
    gora.push(q);
  }
  dol.pop();
  gora.pop();
  return dol.concat(gora);
}

/**
 * Ścieżka SVG halo wokół punktów: otoczka rozsunięta o `margines` od środka
 * ciężkości i wygładzona krzywymi kwadratowymi (wierzchołki stają się punktami
 * kontrolnymi, więc kontur jest miękki, a nie kanciasty). Jeden punkt = koło,
 * dwa punkty = wydłużony owal opisany na obu.
 */
export function sciezkaKregu(punkty, margines = MARGINES_KREGU) {
  if (!punkty?.length) return '';
  const s = centroid(punkty);
  if (punkty.length === 1) {
    const r = margines;
    return `M${s.x - r} ${s.y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  }
  const hull = otoczkaWypukla(punkty);
  const rozsuniete = hull.map((p) => {
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * margines, y: p.y + (dy / d) * margines };
  });
  if (rozsuniete.length === 2) {
    // dwa byty: owal opisany na odcinku (prostopadłe punkty kontrolne)
    const [a, b] = rozsuniete;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = (-dy / d) * margines;
    const ny = (dx / d) * margines;
    return `M${a.x} ${a.y}Q${(a.x + b.x) / 2 + nx} ${(a.y + b.y) / 2 + ny} ${b.x} ${b.y}Q${(a.x + b.x) / 2 - nx} ${(a.y + b.y) / 2 - ny} ${a.x} ${a.y}Z`;
  }
  const srodek = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const start = srodek(rozsuniete[rozsuniete.length - 1], rozsuniete[0]);
  let d = `M${zaokr(start.x)} ${zaokr(start.y)}`;
  for (let i = 0; i < rozsuniete.length; i++) {
    const biezacy = rozsuniete[i];
    const nastepny = rozsuniete[(i + 1) % rozsuniete.length];
    const koniec = srodek(biezacy, nastepny);
    d += `Q${zaokr(biezacy.x)} ${zaokr(biezacy.y)} ${zaokr(koniec.x)} ${zaokr(koniec.y)}`;
  }
  return `${d}Z`;
}

const zaokr = (v) => Math.round(v * 100) / 100;

/**
 * Grupowanie rekordów indeksu w kręgi. `rekordy` muszą mieć `slug`, `tagi`
 * i współrzędne już zrzutowane na płaszczyznę (`x`, `y`). Zwraca tylko kręgi,
 * które mają co najmniej jeden byt — kolejność jak w definicjach, żeby render
 * był deterministyczny.
 */
export function grupujWKregi(rekordy, definicje) {
  const kregi = definicje?.kregi ?? [];
  const wynik = [];
  for (const krag of kregi) {
    const kultury = new Set(krag.kultury ?? []);
    const punkty = rekordy
      .filter((r) => (r.tagi ?? []).some((t) => kultury.has(t)))
      .map((r) => ({ slug: r.slug, x: r.x, y: r.y }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a, b) => a.slug.localeCompare(b.slug));
    if (!punkty.length) continue;
    wynik.push({ id: krag.id, nazwa: krag.nazwa, opis: krag.opis ?? '', kultury: [...kultury], punkty, srodek: centroid(punkty) });
  }
  return wynik;
}

/** Które kultury kanonu nie trafiły do żadnego kręgu (kontrola kompletności). */
export function kulturyBezKregu(kanon, definicje) {
  const wKregach = new Set((definicje?.kregi ?? []).flatMap((k) => k.kultury ?? []));
  return (kanon?.tagi ?? [])
    .filter((t) => t.kategoria === 'kultura' && !wKregach.has(t.tag))
    .map((t) => t.tag)
    .sort();
}

/** Podpis kręgu na mapie: nazwa i liczba bytów, bez żargonu gry. */
export function podpisKregu(krag) {
  const n = krag.punkty.length;
  const slowo = n === 1 ? 'byt' : n < 5 ? 'byty' : 'bytów';
  return `${krag.nazwa} · ${n} ${slowo}`;
}
