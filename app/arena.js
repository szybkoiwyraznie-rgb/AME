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
  // przestroga nie zadaje ciosów: chroni tego, kto zdążył jej wysłuchać
  ostrzezenie: { atak: 1, obrona: 5 },
  // znak nie bije: wiąże ręce temu, kto go źle odczyta
  wrozba: { atak: 2, obrona: 4 },
};

/** Kontry motywów: motyw klucza tłumi siłę motywu z listy (mnożnik ataku). */
export const KONTRA_MOTYWU = {
  // „kto zna warunek", ten tnie skuteczność złego oka (Balor ginie od warunku)
  warunek: ['zle-oko'],
  // opłata rozbraja furię (gość, który płaci, nie wpada w burdę)
  oplaty: ['furia'],
  // fortel obchodzi straż: kto pilnuje bramy, ten nie patrzy pod nogi
  podstep: ['obrona'],
  // przestroga psuje fortel: kto wie, czego się wystrzegać, nie da się podejść
  ostrzezenie: ['podstep'],
  // wróżba tnie zagadkę: kto zna zapowiedź, ten zna odpowiedź, zanim padnie pytanie
  wrozba: ['zagadka'],
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


/* ------------------------------------------------------------------ *
 * SPÓR REZONANSU (C2+5, obrót 5) — rundowe rozstrzygnięcie dwóch bytów.
 *
 * To nadal nie jest „walka na HP”: dwa byty spierają się o to, czyja wersja
 * świata obowiązuje w danym miejscu, a „żywotność” jest miarą tego, jak długo
 * dana tradycja trzyma się w opowieści. Wszystko deterministyczne: bez
 * Math.random, bez sieci, bez dat systemowych w rdzeniu (ADR 0002, ADR 0003).
 * ------------------------------------------------------------------ */

/** Deterministyczny hash tekstu (FNV-1a 32 bit) — ziarno bez zależności. */
export function haszTekstu(tekst) {
  let h = 0x811c9dc5;
  for (const znak of String(tekst)) {
    h ^= znak.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Generator [0,1) z ziarna (mulberry32). Ta sama liczba = ta sama seria. */
export function generatorZZiarna(ziarno) {
  let a = (Number(ziarno) >>> 0) || 1;
  return function los() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Spór dnia: para slugów wybrana deterministycznie z daty (YYYY-MM-DD).
 * Ta sama data = ta sama para dla każdego czytelnika (jak `slugDnia` z M7).
 */
export function paraDnia(slugi, data) {
  const lista = [...(slugi ?? [])].filter((s) => typeof s === 'string').sort();
  if (lista.length < 2) throw new RangeError('paraDnia: potrzebne co najmniej dwa byty');
  const los = generatorZZiarna(haszTekstu(`spor:${data}`));
  const i = Math.floor(los() * lista.length);
  let j = Math.floor(los() * (lista.length - 1));
  if (j >= i) j += 1;
  return [lista[i], lista[j]];
}

/** Ile rund maksymalnie — spór, który się nie rozstrzyga, kończy się remisem. */
export const MAX_RUND = 12;

/**
 * Ile „wytrzymałości sporu” daje jeden punkt żywotności. Kalibracja na
 * kartotece z 28 bytów: 1.5 → spór trwa średnio 6–7 rund, a remisem kończy
 * się ~5% par. Wyższa wartość zamienia widok w tabelę remisów, niższa
 * rozstrzyga wszystko w dwóch ruchach.
 */
export const WYTRZYMALOSC = 1.5;

/**
 * Rozegranie sporu dwóch profili (`statyManifestacji`). Zwraca dziennik rund,
 * stan „wytrzymałości” obu stron i rozstrzygnięcie. `los` to wstrzyknięty RNG;
 * bez niego spór jest w pełni deterministyczny (bez rozbłysków rezonansu).
 */
export function rozegrajSpor({ a, b, los = null, maxRund = MAX_RUND }) {
  if (!a?.slug || !b?.slug) throw new TypeError('rozegrajSpor: wymagane dwa profile ze slugiem');
  if (a.slug === b.slug) throw new RangeError('rozegrajSpor: byt nie spiera się sam ze sobą');
  const [pierwszy, drugi] = kolejnosc(a, b);
  const wytrzymalosc = (p) => Math.round(p.zywotnosc * WYTRZYMALOSC);
  const start = { [pierwszy.slug]: wytrzymalosc(pierwszy), [drugi.slug]: wytrzymalosc(drugi) };
  const stan = { ...start };
  const dziennik = [];
  let zwyciezca = null;
  for (let runda = 1; runda <= maxRund && !zwyciezca; runda++) {
    for (const [atk, obr] of [[pierwszy, drugi], [drugi, pierwszy]]) {
      if (zwyciezca) break;
      const obrazenia = obrazeniaRundy(atk, obr, los);
      stan[obr.slug] = Math.max(0, stan[obr.slug] - obrazenia);
      dziennik.push({
        runda,
        atakujacy: atk.slug,
        broniacy: obr.slug,
        obrazenia,
        kontra: Number(mnoznikKontry(atk, obr).toFixed(2)),
        pozostalo: stan[obr.slug],
      });
      if (stan[obr.slug] === 0) zwyciezca = atk.slug;
    }
  }
  return {
    zwyciezca,
    remis: zwyciezca === null,
    rundy: dziennik.length ? dziennik[dziennik.length - 1].runda : 0,
    stan,
    start,
    kolejnosc: [pierwszy.slug, drugi.slug],
    dziennik,
  };
}

/**
 * Jednozdaniowe podsumowanie sporu w rejestrze archiwum (bez żargonu gry).
 * Używane przez UI; trzymane w rdzeniu, żeby dało się je przetestować.
 */
export function opisRozstrzygniecia(wynik, nazwy = {}) {
  const imie = (slug) => nazwy[slug] ?? slug;
  if (wynik.remis) {
    const [x, y] = wynik.kolejnosc;
    return `Po ${wynik.rundy} rundach żadna wersja nie ustąpiła: ${imie(x)} i ${imie(y)} zostają w archiwum obok siebie.`;
  }
  const przegrany = wynik.kolejnosc.find((s) => s !== wynik.zwyciezca);
  return `Po ${wynik.rundy} rundach w tym miejscu obowiązuje wersja, którą niesie ${imie(wynik.zwyciezca)}; opowieść o ${imie(przegrany)} cichnie, ale nie znika.`;
}
