/**
 * app/arena.js — ZRĘBY „Areny Rezonansu" (idle battler manifestacji).
 *
 * Projekt: docs/plans/POMYSL_arena-rezonansu-idle-battler.md
 * Status: FUNDAMENT do akceptacji właściciela (ADR 0007) — czyste funkcje,
 * BEZ wpięcia do UI i bez zmian w index.html. Tu żyje tylko rdzeń, który da
 * się przetestować jednostkowo (test/arena.test.js).
 *
 * Zasady nienegocjowalne:
 *  • statystyki są WYPROWADZANE z rekordu indeksu (nie wpisywane ręcznie) —
 *    zmiana treści wpisu automatycznie zmienia siłę bytu (ADR 0002: determinizm,
 *    ADR 0006: warstwa wiki jako źródło powiązań/backlinków);
 *  • żadnego Math.random w rdzeniu — losowość tylko przez wstrzykiwany RNG
 *    (jak wylosujSlug z M7), więc „liga dnia" jest identyczna dla wszystkich.
 */

/**
 * Waga motywów w walce (lore → liczba). Motyw ofensywny podbija MOC, defensywny
 * dokłada do ŻYWOTNOŚCI. Słownik żyje w kodzie (warstwa gry), nie w danych —
 * dane opisują byt, nie jego „punkty". Klucze = tagi kategorii `motyw` z kanonu.
 */
// Klucze = tagi kategorii `motyw` z data/kanon-tagow.json (wszystkie 7 pokryte;
// test kontraktowy pilnuje, by żaden motyw kanonu nie został bez wagi).
export const WAGA_MOTYWU = {
  'zle-oko': { atak: 6, obrona: 0 },
  warunek: { atak: 2, obrona: 4 },
  oplaty: { atak: 1, obrona: 5 },
  pamiec: { atak: 2, obrona: 3 },
  przemiana: { atak: 3, obrona: 2 },
  burza: { atak: 5, obrona: 1 },
  furia: { atak: 6, obrona: 1 },
  obrona: { atak: 0, obrona: 6 },
  przewodnik: { atak: 1, obrona: 5 },
  zagadka: { atak: 3, obrona: 4 },
  ratunek: { atak: 1, obrona: 6 },
  uzdrowienie: { atak: 0, obrona: 6 },
  oczyszczenie: { atak: 4, obrona: 3 },
  tkanie: { atak: 2, obrona: 4 },
  podstep: { atak: 4, obrona: 2 },
  jad: { atak: 7, obrona: 0 },
  klatwa: { atak: 5, obrona: 2 },
};

/** Kontry motywów: motyw klucza tłumi siłę motywu z listy (mnożnik ataku). */
export const KONTRA_MOTYWU = {
  // „kto zna warunek", ten tnie skuteczność złego oka (Balor ginie od warunku)
  warunek: ['zle-oko'],
  // opłata rozbraja furię (gość, który płaci, nie wpada w burdę)
  oplaty: ['furia'],
  // fortel obchodzi straż: kto pilnuje bramy, ten nie patrzy pod nogi
  podstep: ['obrona'],
  // uzdrowienie neutralizuje jad: kto zna odtrutkę, temu trucizna schodzi do rzemiosła
  uzdrowienie: ['jad'],
  // oczyszczenie znosi klątwę: popiół zakopany z dala od dróg kończy sprawę
  oczyszczenie: ['klatwa'],
};

const BAZA = { zywotnosc: 40, moc: 8, spryt: 6, rezonans: 10 };

const dl = (v) => (Array.isArray(v) ? v.length : 0);

/**
 * Statystyki bojowe wyprowadzone z rekordu indeksu manifestacji.
 * Wejście: rekord z data/index.json (slug, tagi, powiazania, backlinki,
 * skity, nazwy_alternatywne). Wyjście: {slug, nazwa, zywotnosc, moc, spryt,
 * rezonans, motywy}. Wszystkie wartości całkowite → wynik deterministyczny.
 */
export function statyManifestacji(rekord, kanon = null) {
  if (!rekord || typeof rekord.slug !== 'string') {
    throw new TypeError('statyManifestacji: wymagany rekord manifestacji ze slugiem');
  }
  const tagi = rekord.tagi ?? [];
  const motywy = motywyZTagow(tagi, kanon);
  let atakMotywu = 0;
  let obronaMotywu = 0;
  for (const m of motywy) {
    const w = WAGA_MOTYWU[m];
    if (w) {
      atakMotywu += w.atak;
      obronaMotywu += w.obrona;
    }
  }
  return {
    slug: rekord.slug,
    nazwa: rekord.nazwa ?? rekord.slug,
    zywotnosc: BAZA.zywotnosc + dl(rekord.backlinki) * 6 + dl(rekord.skity) * 4 + obronaMotywu * 3,
    moc: BAZA.moc + dl(rekord.nazwy_alternatywne) * 3 + atakMotywu,
    spryt: BAZA.spryt + dl(rekord.powiazania) * 4,
    rezonans: Math.min(90, BAZA.rezonans + dl(rekord.skity) * 3 + dl(tagi) * 2),
    motywy,
  };
}

/**
 * Wyłuskuje tagi kategorii `motyw`. Gdy podano kanon (data/kanon-tagow.json),
 * bierze tylko tagi kategorii `motyw`; bez kanonu — heurystyka: tagi znane w
 * WAGA_MOTYWU (na potrzeby testów jednostkowych bez ładowania kanonu).
 */
export function motywyZTagow(tagi, kanon = null) {
  const lista = Array.isArray(tagi) ? tagi : [];
  if (kanon?.tagi) {
    const motyw = new Set(kanon.tagi.filter((t) => t.kategoria === 'motyw').map((t) => t.tag));
    return lista.filter((t) => motyw.has(t));
  }
  return lista.filter((t) => t in WAGA_MOTYWU);
}

/**
 * Mnożnik ataku po uwzględnieniu kontry motywów: jeśli obrońca ma motyw, który
 * kontruje któryś motyw atakującego, atak jest przycięty (0.6× za każdą kontrę,
 * nie niżej niż 0.3×). Deterministyczne.
 */
export function mnoznikKontry(atakujacy, obronca) {
  let mn = 1;
  for (const mObr of obronca.motywy ?? []) {
    const kontrowane = KONTRA_MOTYWU[mObr] ?? [];
    for (const mAtk of atakujacy.motywy ?? []) {
      if (kontrowane.includes(mAtk)) mn *= 0.6;
    }
  }
  return Math.max(0.3, mn);
}

/**
 * Jedna runda: atakujący uderza obrońcę. Zwraca zadane obrażenia (całkowite,
 * min. 1). „Rozbłysk rezonansu" (los < rezonans/100) wzmacnia cios 1.5×.
 * `los` = wstrzyknięty RNG w [0,1) — bez niego brak losowości (rozbłysk off).
 */
export function obrazeniaRundy(atakujacy, obronca, los = null) {
  const obrona = Math.floor(obronca.zywotnosc / 12);
  let cios = atakujacy.moc * mnoznikKontry(atakujacy, obronca) - obrona;
  if (typeof los === 'function' && los() < atakujacy.rezonans / 100) cios *= 1.5;
  return Math.max(1, Math.round(cios));
}

/**
 * Kto ma inicjatywę: wyższy SPRYT; remis rozstrzyga slug alfabetycznie
 * (deterministycznie). Zwraca [pierwszy, drugi].
 */
export function kolejnosc(a, b) {
  if (a.spryt !== b.spryt) return a.spryt > b.spryt ? [a, b] : [b, a];
  return a.slug <= b.slug ? [a, b] : [b, a];
}

/* ------------------------------------------------------------------ *
 * NORMALIZACJA I ARCHETYPY (fundament pod kierunki A/B — sesja M9, C2)
 *
 * Problem: staty liczone z „gęstości" rekordu premiują wpisy stare i mocno
 * rozbudowane — nowy byt zawsze przegrywa. Rozwiązanie: liczby czytamy jako
 * PERCENTYL w obrębie aktualnej kartoteki (0–100), więc siła jest względna, a
 * dopisanie wpisu nie deklasuje reszty. Archetyp wyprowadzamy z KSZTAŁTU
 * profilu (co dany byt ma ponadprzeciętnie), nie z sumy — czytelna, wierna
 * lore etykieta. Wszystko deterministyczne: bez RNG, bez sieci.
 * ------------------------------------------------------------------ */

const OSIE = ['zywotnosc', 'moc', 'spryt', 'rezonans'];

/**
 * Percentyl wartości `v` w posortowanej tablicy `wartosci` metodą „rank"
 * (udział elementów < v + połowa równych), skala 0–100, zaokrąglony.
 * Deterministyczny; dla jednoelementowej kartoteki zwraca 50 (środek).
 */
export function percentyl(v, wartosci) {
  const n = wartosci.length;
  if (n === 0) return 0;
  if (n === 1) return 50;
  let mniej = 0;
  let rowne = 0;
  for (const x of wartosci) {
    if (x < v) mniej++;
    else if (x === v) rowne++;
  }
  return Math.round(((mniej + rowne / 2) / n) * 100);
}

/**
 * Profil kartoteki: dla każdego rekordu zwraca staty surowe + znormalizowane
 * (percentyl każdej osi w obrębie całej kartoteki) + archetyp. Wejście: tablica
 * rekordów indeksu. Wyjście: Map slug → {staty, percentyle, archetyp}.
 * Deterministyczne (sortowanie po slugu jak w indeksie, ADR 0002).
 */
export function profileKartoteki(rekordy, kanon = null) {
  const lista = (Array.isArray(rekordy) ? rekordy : []).map((r) => statyManifestacji(r, kanon));
  const kolumny = Object.fromEntries(OSIE.map((o) => [o, lista.map((s) => s[o])]));
  const wynik = new Map();
  for (const s of lista) {
    const percentyle = Object.fromEntries(OSIE.map((o) => [o, percentyl(s[o], kolumny[o])]));
    wynik.set(s.slug, { staty: s, percentyle, archetyp: archetypBytu(percentyle, s) });
  }
  return wynik;
}

/**
 * Archetyp z KSZTAŁTU profilu (percentyle 0–100): bierze oś, na której byt jest
 * najsilniejszy względem kartoteki, i tłumaczy ją na etykietę wierną lore.
 * Remisy rozstrzyga stała kolejność osi (deterministycznie). „Samotnik" =
 * profil wyrównany i niski (nic nie wystaje ponad próg).
 */
export function archetypBytu(percentyle, staty = null) {
  const ETYKIETY = {
    zywotnosc: 'Filar', // trzyma sieć: dużo backlinków i skitów
    moc: 'Drapieżnik', // groźne imiona i motywy ofensywne
    spryt: 'Splotca', // dużo własnych powiązań — pierwszy nawiązuje
    rezonans: 'Pieśniarz', // żywy w rozmowach i wielu tradycjach
  };
  let najlepsza = null;
  let max = -1;
  for (const o of OSIE) {
    const v = percentyle[o] ?? 0;
    if (v > max) {
      max = v;
      najlepsza = o;
    }
  }
  // Jeśli nic nie wystaje ponad środek — profil wyrównany/niski = „Samotnik".
  if (max <= 50) return 'Samotnik';
  return ETYKIETY[najlepsza];
}

