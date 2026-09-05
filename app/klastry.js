/**
 * Klastrowanie pinezek (BACKLOG „Klastrowanie pinezek”, C2+5 obrotu 4 Pętli
 * Jakości). Przy oddalonym widoku kilkanaście bytów z jednego regionu (Grecja,
 * Egipt, Wyspy Brytyjskie) zlewa się w jedną plamę: pola trafienia zachodzą na
 * siebie, a etykiety zasłaniają sąsiadów. Zamiast tego rysujemy jeden znacznik
 * z liczbą — klik przybliża do gniazda i klaster sam się rozpada.
 *
 * Moduł jest czystym rachunkiem geometrycznym: bez DOM, bez API Node (L22),
 * bez losowości. Wejście to punkty w układzie świata, wyjście — podział na
 * klastry i punkty samotne. Ta sama lista i ta sama skala zawsze dają ten sam
 * wynik (ADR 0002), również co do kolejności — grupy sortujemy po pierwszym
 * slugu, a slugi wewnątrz grupy alfabetycznie.
 *
 * Metoda: grid-clustering w przestrzeni EKRANU. Bok komórki to `2 × promien`
 * pikseli, przeliczony na jednostki świata przez bieżącą skalę, więc przy
 * przybliżaniu komórki maleją i klastry rozpadają się same. Sąsiedztwo liczymy
 * po komórce, nie po odległości — to kosztuje O(n) i przy kilkuset pinezkach
 * jest niezauważalne, a artefakt „dwa punkty tuż przy granicy komórek nie
 * połączyły się” jest w praktyce niewidoczny (znaczniki i tak stoją obok).
 */

/** Promień znacznika klastra w pikselach ekranowych (= połowa boku komórki). */
export const PROMIEN_KLASTRA = 30;

/** Mniej niż tyle punktów w komórce = zostają osobnymi pinezkami. */
export const MIN_W_KLASTRZE = 2;

/** Powiększenie po kliknięciu w klaster — tyle wystarczy, by komórka pękła. */
export const ZOOM_KLASTRA = 2.5;

/**
 * Powyżej tego powiększenia gniazd nie ma w ogóle. Sufit zoomu offline to 32×
 * (`K_MAX`), a dwa byty odległe o pół stopnia (Empusa i Nessos) mieszczą się
 * w jednej komórce nawet tam — bez tego progu użytkownik nie mógłby dojść do
 * pinezki, bo gniazdo nigdy by nie pękło. Od 6× pokazujemy więc wszystkie
 * pinezki: przy takim przybliżeniu region jest już rozciągnięty na cały ekran,
 * a nakładki rozstrzyga badge z nazwą na najechaniu.
 */
export const PROG_KLASTROWANIA = 6;

/** Czy przy danym powiększeniu (`widok.k`) w ogóle klastrujemy. */
export function czyKlastrowac(k) {
  const wartosc = Number(k);
  return Number.isFinite(wartosc) && wartosc < PROG_KLASTROWANIA;
}

const porownajSlugi = (a, b) => String(a).localeCompare(String(b), 'pl');

/**
 * Dzieli punkty na klastry i samotne.
 *
 * @param {Array<{slug: string, wx: number, wy: number}>} punkty
 * @param {{skala: number, promien?: number, minimum?: number}} opcje
 *   `skala` = piksele na jednostkę świata (mapa.skala).
 * @returns {{klastry: Array<{id: string, wx: number, wy: number, slugi: string[],
 *   bbox: {minWx: number, minWy: number, maxWx: number, maxWy: number}}>,
 *   samotne: string[], bokKomorki: number}}
 */
export function grupujPunkty(punkty, { skala, promien = PROMIEN_KLASTRA, minimum = MIN_W_KLASTRZE } = {}) {
  if (!Array.isArray(punkty)) throw new TypeError('klastry: punkty muszą być tablicą');
  const s = Number(skala);
  if (!Number.isFinite(s) || s <= 0) throw new RangeError('klastry: skala musi być liczbą dodatnią');
  const r = Number(promien);
  if (!Number.isFinite(r) || r <= 0) throw new RangeError('klastry: promień musi być liczbą dodatnią');
  const prog = Math.max(2, Math.trunc(minimum) || MIN_W_KLASTRZE);

  const bokKomorki = (2 * r) / s;
  const komorki = new Map();
  for (const p of punkty) {
    if (!p || typeof p.slug !== 'string') continue;
    const wx = Number(p.wx);
    const wy = Number(p.wy);
    if (!Number.isFinite(wx) || !Number.isFinite(wy)) continue;
    const klucz = `${Math.floor(wx / bokKomorki)}:${Math.floor(wy / bokKomorki)}`;
    if (!komorki.has(klucz)) komorki.set(klucz, []);
    komorki.get(klucz).push({ slug: p.slug, wx, wy });
  }

  const klastry = [];
  const samotne = [];
  for (const grupa of komorki.values()) {
    if (grupa.length < prog) {
      for (const p of grupa) samotne.push(p.slug);
      continue;
    }
    grupa.sort((a, b) => porownajSlugi(a.slug, b.slug));
    const suma = grupa.reduce((acc, p) => ({ wx: acc.wx + p.wx, wy: acc.wy + p.wy }), { wx: 0, wy: 0 });
    klastry.push({
      id: `klaster-${grupa[0].slug}`,
      wx: suma.wx / grupa.length,
      wy: suma.wy / grupa.length,
      slugi: grupa.map((p) => p.slug),
      bbox: {
        minWx: Math.min(...grupa.map((p) => p.wx)),
        minWy: Math.min(...grupa.map((p) => p.wy)),
        maxWx: Math.max(...grupa.map((p) => p.wx)),
        maxWy: Math.max(...grupa.map((p) => p.wy)),
      },
    });
  }

  klastry.sort((a, b) => porownajSlugi(a.slugi[0], b.slugi[0]));
  samotne.sort(porownajSlugi);
  return { klastry, samotne, bokKomorki };
}

/**
 * Etykieta znacznika: liczba pinezek w klastrze. Powyżej 99 skracamy, żeby
 * cyfry nie wychodziły poza krążek.
 */
export function podpisKlastra(ile) {
  const n = Math.trunc(Number(ile) || 0);
  if (n > 99) return '99+';
  return String(n);
}

/** Tekst dla czytnika ekranu — bez skrótów i bez listy slugów. */
export function opisKlastra(ile) {
  const n = Math.trunc(Number(ile) || 0);
  const forma = n === 1 ? 'manifestacja' : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? 'manifestacje' : 'manifestacji';
  return `Skupisko: ${n} ${forma} — przybliż, żeby rozdzielić`;
}
