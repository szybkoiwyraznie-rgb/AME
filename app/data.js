/**
 * app/data.js — ładowanie indeksu i wpisów + filtrowanie.
 */
const BAZA = typeof document !== 'undefined' ? document.baseURI : '';

async function pobierz(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie udało się pobrać ${url} (HTTP ${res.status})`);
  return res.json();
}

export function zaladujIndeks() {
  return pobierz(new URL('data/index.json', BAZA));
}

export function zaladujWpis(slug) {
  return pobierz(new URL(`data/manifestations/${encodeURIComponent(slug)}.json`, BAZA));
}

/** Normalizacja bez diakrytyków do wyszukiwania (NFD + usunięcie znaków tonicznych). */
export function normalizuj(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Zwraca Set<slug> wpisów pasujących do frazy (nazwa, nazwy alternatywne,
 * tagi, kraj, miejscowość, nazwa karty). null = brak filtra (wszystkie).
 */
export function dopasowania(indeks, fraza) {
  const q = normalizuj(fraza).trim();
  if (!q) return null;
  const zbior = new Set();
  for (const m of indeks.manifestacje) {
    const pole = [
      m.nazwa,
      ...(m.nazwy_alternatywne ?? []),
      ...(m.tagi ?? []),
      m.kraj,
      m.miejscowosc,
      m.karta,
      m.slug,
    ];
    if (pole.some((v) => normalizuj(v).includes(q))) zbior.add(m.slug);
  }
  return zbior;
}
