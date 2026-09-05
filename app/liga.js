/**
 * app/liga.js — LIGA REZONANSU: sezon Areny rozpisany na kalendarz.
 *
 * Backlog („Arena Rezonansu”, pozycja otwarta): „tryb idle (liga tocząca się
 * w tle) i turniej Epoki — wymagają decyzji, gdzie zapisywać stan między
 * sesjami”. Ta decyzja brzmi: NIGDZIE. Sezon jest funkcją kalendarza, nie
 * zapisanego postępu — tabelę na dowolny dzień da się policzyć od zera, więc
 * dwoje czytelników otwierających archiwum tego samego dnia widzi identyczne
 * wyniki, a czyszczenie pamięci przeglądarki niczego nie kasuje.
 *
 * Zasady (ADR 0002 determinizm, ADR 0003 brak sieci, L22 zero API Node):
 *  • terminarz to systemowy round-robin (metoda karuzeli) po slugach
 *    posortowanych alfabetycznie — kolejność bytów w indeksie nie ma wpływu;
 *  • jedna kolejka na dobę; sezon kończy się, gdy każdy zagrał z każdym,
 *    i natychmiast zaczyna się następny (z inną rotacją par w kolejkach);
 *  • wynik meczu liczy `rozegrajSpor` z arena.js z ziarnem złożonym z sezonu,
 *    numeru kolejki i obu slugów — ten sam mecz zawsze kończy się tak samo;
 *  • przy nieparzystej liczbie bytów jeden ma w kolejce pauzę (bez punktów).
 */

import { generatorZZiarna, haszTekstu, rozegrajSpor } from './arena.js';

/** Pierwszy dzień pierwszego sezonu (data ISO). Wcześniej ligi po prostu nie ma. */
export const DZIEN_ZERO = '2026-09-06';

/** Punktacja kolejki: zwycięstwo, remis, przegrana. */
export const PUNKTY = { wygrana: 3, remis: 1, przegrana: 0 };

const DOBA = 86400000;

/** Liczba dni od `DZIEN_ZERO` do `data` (obie ISO `YYYY-MM-DD`); może być ujemna. */
export function numerDnia(data, dzienZero = DZIEN_ZERO) {
  const doTs = (d) => Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`);
  const a = doTs(dzienZero);
  const b = doTs(data);
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new TypeError('numerDnia: wymagana data ISO YYYY-MM-DD');
  return Math.round((b - a) / DOBA);
}

/**
 * Terminarz jednego sezonu: metoda karuzeli. Zwraca tablicę kolejek, każda to
 * lista par slugów `[gospodarz, gosc]`. Dla n bytów kolejek jest n−1 (n parzyste)
 * albo n (n nieparzyste — wtedy w każdej kolejce ktoś pauzuje).
 */
export function terminarzSezonu(slugi) {
  const lista = [...new Set((slugi ?? []).filter((s) => typeof s === 'string'))].sort();
  if (lista.length < 2) throw new RangeError('terminarzSezonu: potrzebne co najmniej dwa byty');
  const pauza = '\u0000pauza';
  const gracze = lista.length % 2 === 0 ? lista : [...lista, pauza];
  const n = gracze.length;
  const kolejki = [];
  let obrot = gracze.slice(1);
  for (let k = 0; k < n - 1; k++) {
    const rzad = [gracze[0], ...obrot];
    const pary = [];
    for (let i = 0; i < n / 2; i++) {
      const x = rzad[i];
      const y = rzad[n - 1 - i];
      if (x === pauza || y === pauza) continue;
      // co druga kolejka zamienia stronami, żeby „pierwszy w rzędzie” nie był
      // zawsze tym samym bytem — inicjatywę w sporze i tak rozstrzyga SPRYT
      pary.push(k % 2 === 0 ? [x, y] : [y, x]);
    }
    kolejki.push(pary);
    obrot = [obrot[obrot.length - 1], ...obrot.slice(0, -1)];
  }
  return kolejki;
}

/** Ile kolejek liczy sezon przy tej liczbie bytów. */
export function dlugoscSezonu(slugi) {
  return terminarzSezonu(slugi).length;
}

/**
 * Który sezon i która kolejka wypada danego dnia. Sezony numerujemy od 1;
 * przed `DZIEN_ZERO` liga nie istnieje (`{sezon: 0, kolejka: 0}`).
 * Kolejność kolejek w sezonie przestawia się co sezon (rotacja terminarza),
 * więc druga runda ligi nie jest kalką pierwszej.
 */
export function kalendarzDnia(slugi, data, dzienZero = DZIEN_ZERO) {
  const kolejki = terminarzSezonu(slugi);
  const dzien = numerDnia(data, dzienZero);
  if (dzien < 0) return { sezon: 0, kolejka: 0, dlugosc: kolejki.length, dzien };
  const sezon = Math.floor(dzien / kolejki.length) + 1;
  const kolejka = (dzien % kolejki.length) + 1;
  return { sezon, kolejka, dlugosc: kolejki.length, dzien };
}

/** Pary rozgrywane w danej kolejce danego sezonu (rotacja terminarza co sezon). */
export function paryKolejki(slugi, sezon, kolejka) {
  const kolejki = terminarzSezonu(slugi);
  if (sezon < 1 || kolejka < 1 || kolejka > kolejki.length) return [];
  const przesuniecie = (sezon - 1) % kolejki.length;
  return kolejki[(kolejka - 1 + przesuniecie) % kolejki.length];
}

/**
 * Rozegranie jednej kolejki. `profile` to Map slug → staty (`statyManifestacji`
 * albo `profileKartoteki(...).get(slug).staty`). Zwraca listę meczów z wynikiem
 * i liczbą rund. `rozegraj` daje się podmienić w testach.
 */
export function rozegrajKolejke(profile, slugi, sezon, kolejka, { rozegraj = rozegrajSpor } = {}) {
  return paryKolejki(slugi, sezon, kolejka)
    .map(([a, b]) => {
      const profilA = profile.get?.(a);
      const profilB = profile.get?.(b);
      if (!profilA || !profilB) return null;
      const los = generatorZZiarna(haszTekstu(`liga:${sezon}:${kolejka}:${a}|${b}`));
      const wynik = rozegraj({ a: profilA, b: profilB, los });
      return { sezon, kolejka, a, b, wynik };
    })
    .filter(Boolean);
}

/**
 * Tabela sezonu do wskazanego dnia włącznie: wszystkie kolejki od początku
 * bieżącego sezonu po dziś. Zero zapisanego stanu — pełny przelicz za każdym
 * razem (31 bytów × 31 kolejek to ~465 sporów, poniżej 50 ms).
 *
 * Wiersz: {slug, mecze, wygrane, remisy, przegrane, punkty, przewaga, forma}.
 * `przewaga` = suma pozostałej wytrzymałości minus suma pozostałej wytrzymałości
 * przeciwników; rozstrzyga remisy punktowe przed kolejnością alfabetyczną.
 * `forma` to ciąg ostatnich wyników od najstarszego: 'W' | 'R' | 'P' | '·' (pauza).
 */
export function tabelaLigi(profile, slugi, data, { rozegraj = rozegrajSpor, dzienZero = DZIEN_ZERO } = {}) {
  const kal = kalendarzDnia(slugi, data, dzienZero);
  const lista = [...new Set((slugi ?? []).filter((s) => typeof s === 'string'))].sort();
  const wiersze = new Map(
    lista.map((slug) => [slug, { slug, mecze: 0, wygrane: 0, remisy: 0, przegrane: 0, punkty: 0, przewaga: 0, forma: [] }])
  );
  const kolejki = [];
  for (let k = 1; k <= kal.kolejka; k++) {
    const mecze = rozegrajKolejke(profile, lista, kal.sezon, k, { rozegraj });
    kolejki.push({ numer: k, mecze });
    const grali = new Set();
    for (const m of mecze) {
      const wa = wiersze.get(m.a);
      const wb = wiersze.get(m.b);
      if (!wa || !wb) continue;
      grali.add(m.a);
      grali.add(m.b);
      wa.mecze += 1;
      wb.mecze += 1;
      const stanA = m.wynik.stan?.[m.a] ?? 0;
      const stanB = m.wynik.stan?.[m.b] ?? 0;
      wa.przewaga += stanA - stanB;
      wb.przewaga += stanB - stanA;
      if (m.wynik.remis) {
        wa.remisy += 1;
        wb.remisy += 1;
        wa.punkty += PUNKTY.remis;
        wb.punkty += PUNKTY.remis;
        wa.forma.push('R');
        wb.forma.push('R');
      } else {
        const zw = m.wynik.zwyciezca === m.a ? wa : wb;
        const pr = m.wynik.zwyciezca === m.a ? wb : wa;
        zw.wygrane += 1;
        pr.przegrane += 1;
        zw.punkty += PUNKTY.wygrana;
        pr.punkty += PUNKTY.przegrana;
        zw.forma.push('W');
        pr.forma.push('P');
      }
    }
    for (const slug of lista) if (!grali.has(slug)) wiersze.get(slug).forma.push('·');
  }
  const tabela = [...wiersze.values()].sort(
    (x, y) => y.punkty - x.punkty || y.przewaga - x.przewaga || y.wygrane - x.wygrane || x.slug.localeCompare(y.slug)
  );
  tabela.forEach((w, i) => {
    w.pozycja = i + 1;
    w.forma = w.forma.slice(-5).join('');
  });
  return {
    sezon: kal.sezon,
    kolejka: kal.kolejka,
    dlugosc: kal.dlugosc,
    data: String(data).slice(0, 10),
    tabela,
    ostatnia: kolejki.at(-1) ?? { numer: 0, mecze: [] },
    nastepna: kal.kolejka < kal.dlugosc
      ? { numer: kal.kolejka + 1, pary: paryKolejki(lista, kal.sezon, kal.kolejka + 1) }
      : { numer: 1, pary: paryKolejki(lista, kal.sezon + 1, 1), nowySezon: true },
  };
}

/** Jedno zdanie o stanie sezonu — bez żargonu gry, do nagłówka widoku. */
export function opisSezonu(liga, nazwy = {}) {
  if (!liga || liga.sezon < 1) return 'Sezon jeszcze się nie zaczął — pierwsza kolejka czeka na swój dzień.';
  const lider = liga.tabela?.[0];
  const imie = (slug) => nazwy[slug] ?? slug;
  const start = `Sezon ${liga.sezon}, kolejka ${liga.kolejka} z ${liga.dlugosc}.`;
  if (!lider || !lider.mecze) return `${start} Rozstrzygnięć jeszcze nie ma.`;
  const drugi = liga.tabela[1];
  if (drugi && drugi.punkty === lider.punkty) {
    return `${start} Na czele po ${lider.punkty} pkt idą razem ${imie(lider.slug)} i ${imie(drugi.slug)} — o kolejności decyduje bilans starć.`;
  }
  return `${start} Prowadzi ${imie(lider.slug)} z dorobkiem ${lider.punkty} pkt z ${lider.mecze} starć.`;
}
