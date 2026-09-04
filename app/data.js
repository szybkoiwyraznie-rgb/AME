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

/** Pełny SKIT z Bazy Skitów (skrót i tak jest w indeksie — treść dociągamy). */
export function zaladujSkit(slug) {
  return pobierz(new URL(`data/skity/${encodeURIComponent(slug)}.json`, BAZA));
}

/** Normalizacja bez diakrytyków do wyszukiwania (NFD + usunięcie znaków tonicznych). */
export function normalizuj(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Losuje slug manifestacji z podanej puli — „wylosuj manifestację” (tryb
 * ekspedycji). Cechy:
 *  • unika `pomin` (aktualnie otwarty wpis), o ile pula ma więcej niż jeden
 *    element — dwa kliknięcia z rzędu nie trafią w to samo;
 *  • deterministyczna przy wstrzykniętym `los` (RNG w [0,1)); domyślnie
 *    `Math.random`, więc kod produkcyjny losuje naprawdę, a testy — powtarzalnie;
 *  • pusta pula → `null` (nie ma czego losować).
 * Determinizm indeksu (ADR 0002) nie jest tu naruszony: losowanie dzieje się
 * w przeglądarce na życzenie użytkownika, nie przy budowie danych.
 */
export function wylosujSlug(slugi, { pomin = null, los = Math.random } = {}) {
  const pula = Array.isArray(slugi) ? slugi.filter((s) => typeof s === 'string' && s) : [];
  if (pula.length === 0) return null;
  const kandydaci = pula.length > 1 ? pula.filter((s) => s !== pomin) : pula;
  const i = Math.min(kandydaci.length - 1, Math.max(0, Math.floor(los() * kandydaci.length)));
  return kandydaci[i];
}

/**
 * „Manifestacja dnia” — deterministyczny wybór wpisu na dany dzień. Ta sama
 * data (`RRRR-MM-DD`) daje ten sam slug u wszystkich czytelników; data
 * wyznacza indeks haszem FNV-1a, więc rozkład po puli jest równomierny.
 * Pusta pula → `null`.
 */
export function slugDnia(slugi, dataISO) {
  const pula = Array.isArray(slugi) ? slugi.filter((s) => typeof s === 'string' && s) : [];
  if (pula.length === 0) return null;
  let h = 0x811c9dc5;
  for (const znak of String(dataISO ?? '')) {
    h ^= znak.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return pula[h % pula.length];
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
