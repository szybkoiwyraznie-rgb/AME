/**
 * SPLOT — deterministyczna szansa + losowe rozstrzygnięcie drogi.
 *
 * C5: fabuła, zasoby i konflikt świata zewnętrznego z bytami. Moduł nie zna
 * DOM-u, nie używa Math.random i może być użyty przez UI, runnera oraz testy.
 * Statystyki pochodzą z app/arena.js i rekordu data/index.json.
 */
import { profileKartoteki } from './arena.js';

const ZASOBY = ['pamiec', 'przejscie', 'dlug', 'slad'];
const ogranicz = (v, min, max) => Math.max(min, Math.min(max, v));

export const zasobySplotu = Object.freeze(ZASOBY);

/** Zasoby wejściowe drogi — brakujące wartości stają się zerem. */
export function normalizujZasoby(zasoby = {}) {
  return Object.fromEntries(ZASOBY.map((nazwa) => [nazwa, Math.max(0, Math.floor(Number(zasoby[nazwa] ?? 0)))]));
}

/**
 * Buduje profile uczestników i nie pozwala użyć slugu spoza indeksu.
 * Profil jest aktualny względem treści archiwum, nie względem ręcznej karty.
 */
export function profileDrogi(droga, indeks, kanon = null) {
  const bySlug = new Map((indeks?.manifestacje ?? []).map((r) => [r.slug, r]));
  const profile = profileKartoteki(indeks?.manifestacje ?? [], kanon);
  const slugi = droga.sklad ?? [];
  const wynik = slugi.map((slug) => {
    const rekord = bySlug.get(slug);
    if (!rekord) throw new Error(`SPLOT: nieznany uczestnik „${slug}”`);
    return profile.get(slug);
  });
  if (new Set(slugi).size !== slugi.length) throw new Error('SPLOT: skład drogi nie może powtarzać bytu');
  if (wynik.length < 2 || wynik.length > 4) throw new Error('SPLOT: droga wymaga 2–4 uczestników');
  return wynik;
}

/**
 * SPRZĘŻENIE KRONIKA → SPLOT (ADR 0021 + 0025).
 * Stan świata z podsumowania Tomu modyfikuje szansę węzłów drogi. Wszystko
 * jest deterministyczne — los wchodzi dopiero w `rozstrzygnijWezel` (ADR 0024).
 *
 * Składniki (w punktach tej samej skali, co `szansaWezla`):
 *  - oś mit/racjonalizacja: świat mityczny sprzyja bytom, zracjonalizowany je dusi,
 *  - średni zasięg składu wobec progu 0.4,
 *  - średnie paliwo składu wobec progu 12,
 *  - otwarte wątki dotykające składu: rozpędzona sprawa pomaga (po 2 pkt, max 6).
 */
export function naporSwiata(kronika, droga) {
  const sklad = droga?.sklad ?? [];
  const skladniki = [];
  if (!kronika?.stanPo || sklad.length === 0) {
    return { premia: 0, skladniki, os: null };
  }
  const os = kronika.stanPo.os ?? null;
  const mit = Number(os?.mit ?? 50);
  const punktyOsi = Math.round((mit - 50) * 0.2 * 10) / 10;
  skladniki.push({ nazwa: 'oś świata', wartosc: punktyOsi, opis: `mit ${mit} / racjonalizacja ${Number(os?.racjonalizacja ?? 100 - mit)}` });

  const zasieg = new Map((kronika.stanPo.zasieg ?? []).map((z) => [z.slug, Number(z.wielkosc) || 0]));
  const sredniZasieg = sklad.reduce((suma, slug) => suma + (zasieg.get(slug) ?? 0), 0) / sklad.length;
  const punktyZasiegu = Math.round((sredniZasieg - 0.4) * 60 * 10) / 10;
  skladniki.push({ nazwa: 'zasięg składu', wartosc: punktyZasiegu, opis: `średnio ${Math.round(sredniZasieg * 1000) / 1000}` });

  const paliwo = kronika.stanPo.paliwo ?? {};
  const sredniePaliwo = sklad.reduce((suma, slug) => suma + (Number(paliwo[slug]) || 0), 0) / sklad.length;
  const punktyPaliwa = Math.round((sredniePaliwo - 12) * 0.5 * 10) / 10;
  skladniki.push({ nazwa: 'paliwo składu', wartosc: punktyPaliwa, opis: `średnio ${Math.round(sredniePaliwo * 10) / 10}` });

  const ostatnia = (kronika.epoki ?? []).at(-1);
  const otwarte = (ostatnia?.konsekwencje?.watki ?? []).filter(
    (w) => w.stan === 'otwarty' && (w.byty ?? []).some((slug) => sklad.includes(slug))
  );
  const punktyWatkow = Math.min(6, otwarte.length * 2);
  skladniki.push({ nazwa: 'otwarte wątki', wartosc: punktyWatkow, opis: otwarte.map((w) => w.id).join(', ') || 'brak' });

  const premia = ogranicz(Math.round(skladniki.reduce((suma, s) => suma + s.wartosc, 0) * 10) / 10, -15, 15);
  return { premia, skladniki, os };
}

/**
 * SPRZĘŻENIE SPLOT → KRONIKA (ADR 0021 + 0025).
 * Zamienia wynik drogi w propozycję konsekwencji dla Kroniki: przesunięcie osi,
 * zmiany zasięgu uczestników i wątek, który Epoka może przenieść albo domknąć.
 * Funkcja niczego nie zapisuje — Epoka przyjmuje ślad świadomie, przez pole
 * `zrodloSplotu`, a walidator Kroniki sprawdza zgodność kierunku.
 */
export function echoDrogi(droga, wynik) {
  const status = wynik?.status ?? 'przerwana';
  const sklad = wynik?.sklad ?? droga?.sklad ?? [];
  const kierunek = status === 'ukonczona' ? 1 : status === 'przerwana' ? -1 : 0;
  const deltaZasiegu = status === 'ukonczona' ? 0.008 : status === 'przerwana' ? -0.004 : 0.004;
  const udane = (wynik?.dziennik ?? []).filter((w) => w.sukces).length;
  return {
    droga: droga?.slug ?? wynik?.slug ?? '',
    status,
    os: { mit: kierunek, racjonalizacja: -kierunek },
    zasieg: sklad.map((slug) => ({ slug, delta: deltaZasiegu })),
    watek: {
      id: `slad-${droga?.slug ?? wynik?.slug ?? 'drogi'}`,
      stan: status === 'ukonczona' ? 'zamkniety' : 'otwarty',
      byty: [...sklad],
      pytanie:
        status === 'ukonczona'
          ? 'Droga została przejęta przez opowieść: co świat zrobi z faktem, że przegrał w swoim własnym lesie?'
          : status === 'przerwana'
            ? 'Świat zamknął drogę: czy ślad, którego nie udało się przenieść, zostanie kiedyś odnaleziony?'
            : 'Część drogi ocalała, część zapadła się pod raportem: kto wróci po tę drugą połowę?',
    },
    metryka: { wezly: (wynik?.dziennik ?? []).length, udane },
  };
}

/**
 * Deterministyczna szansa powodzenia węzła. Los nie jest tu używany.
 * Trudność 0–100 opisuje świat zewnętrzny: łowców, komisję, egzorcyzm itd.
 */
export function szansaWezla({ wezel, profile, zasoby = {}, sklad = [], naporSwiata: napor = 0 }) {
  if (!wezel || !Array.isArray(profile) || profile.length === 0) throw new TypeError('SPLOT: brak węzła lub profilu');
  const trudnosc = ogranicz(Number(wezel.trudnosc ?? 50), 0, 100);
  const srednia = profile.reduce((s, p) => s + (p.percentyle?.zywotnosc ?? 0) + (p.percentyle?.spryt ?? 0), 0) / (profile.length * 2);
  const rezonans = profile.reduce((s, p) => s + (p.percentyle?.rezonans ?? 0), 0) / profile.length;
  const motywy = new Set(profile.flatMap((p) => p.staty?.motywy ?? []));
  const bonusZdolnosci = (wezel.zdolnosc && motywy.has(wezel.zdolnosc)) ? 12 : 0;
  const bonusSklad = Math.max(0, sklad.length - 2) * 3;
  const koszt = normalizujZasoby(wezel.koszt ?? {});
  const stan = normalizujZasoby(zasoby);
  const brakZasobu = ZASOBY.some((nazwa) => stan[nazwa] < koszt[nazwa]);
  const karaBraku = brakZasobu ? 20 : 0;
  const swiat = Number.isFinite(Number(napor)) ? ogranicz(Number(napor), -15, 15) : 0;
  const surowa = srednia * 0.45 + rezonans * 0.2 + bonusZdolnosci + bonusSklad - trudnosc - karaBraku + swiat + 50;
  return {
    prawdopodobienstwo: Math.round(ogranicz(surowa, 5, 95)) / 100,
    trudnosc,
    bonusZdolnosci,
    brakZasobu,
    naporSwiata: swiat,
    koszt,
  };
}

/** Losowe rozstrzygnięcie przy deterministycznie wyliczonej szansie. */
export function rozstrzygnijWezel(prawdopodobienstwo, los) {
  if (!Number.isFinite(prawdopodobienstwo) || prawdopodobienstwo < 0 || prawdopodobienstwo > 1) throw new RangeError('SPLOT: szansa musi być w [0, 1]');
  if (typeof los !== 'function') throw new TypeError('SPLOT: wymagany wstrzyknięty RNG');
  const wartoscLosowa = Number(los());
  if (!Number.isFinite(wartoscLosowa) || wartoscLosowa < 0 || wartoscLosowa >= 1) throw new RangeError('SPLOT: RNG musi zwrócić wartość w [0, 1)');
  return { sukces: wartoscLosowa < prawdopodobienstwo, wartoscLosowa };
}

function odejmij(a, b) {
  const out = { ...a };
  for (const n of ZASOBY) out[n] = Math.max(0, out[n] - b[n]);
  return out;
}

function dodaj(a, b) {
  const out = { ...a };
  for (const n of ZASOBY) out[n] += b[n];
  return out;
}

/** Rozgrywa całą drogę; każde wezwanie los() odpowiada jednemu węzłowi. */
export function rozegrajDroge({ droga, indeks, kanon = null, kronika = null, los }) {
  if (!droga?.wezly?.length) throw new TypeError('SPLOT: droga musi mieć co najmniej jeden węzeł');
  const profile = profileDrogi(droga, indeks, kanon);
  const swiat = naporSwiata(kronika, droga);
  let zasoby = normalizujZasoby(droga.start?.zasoby ?? droga.start?.zasob);
  const dziennik = [];
  for (const wezel of droga.wezly) {
    const szansa = szansaWezla({ wezel, profile, zasoby, sklad: droga.sklad, naporSwiata: swiat.premia });
    const wynik = rozstrzygnijWezel(szansa.prawdopodobienstwo, los);
    zasoby = odejmij(zasoby, szansa.koszt);
    const nagroda = normalizujZasoby(wynik.sukces ? (wezel.nagroda ?? {}) : (wezel.porazka ?? {}));
    zasoby = dodaj(zasoby, nagroda);
    dziennik.push({ slug: wezel.slug, nazwa: wezel.nazwa, prawdopodobienstwo: szansa.prawdopodobienstwo, wartoscLosowa: wynik.wartoscLosowa, sukces: wynik.sukces, zasoby: { ...zasoby }, proza: wynik.sukces ? wezel.proza?.sukces : wezel.proza?.porazka });
    if (!wynik.sukces && wezel.koniecPoPorazce) break;
  }
  const sukcesy = dziennik.filter((w) => w.sukces).length;
  const status = sukcesy === dziennik.length ? 'ukonczona' : sukcesy === 0 ? 'przerwana' : 'rozszczepiona';
  const wynik = { slug: droga.slug, status, sklad: [...droga.sklad], zasoby, dziennik, swiat, proza: droga.proza?.[status] ?? droga.proza?.domyslna ?? '' };
  return { ...wynik, echo: echoDrogi(droga, wynik) };
}
