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
 * Deterministyczna szansa powodzenia węzła. Los nie jest tu używany.
 * Trudność 0–100 opisuje świat zewnętrzny: łowców, komisję, egzorcyzm itd.
 */
export function szansaWezla({ wezel, profile, zasoby = {}, sklad = [] }) {
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
  const surowa = srednia * 0.45 + rezonans * 0.2 + bonusZdolnosci + bonusSklad - trudnosc - karaBraku + 50;
  return {
    prawdopodobienstwo: Math.round(ogranicz(surowa, 5, 95)) / 100,
    trudnosc,
    bonusZdolnosci,
    brakZasobu,
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
export function rozegrajDroge({ droga, indeks, kanon = null, los }) {
  if (!droga?.wezly?.length) throw new TypeError('SPLOT: droga musi mieć co najmniej jeden węzeł');
  const profile = profileDrogi(droga, indeks, kanon);
  let zasoby = normalizujZasoby(droga.start?.zasoby ?? droga.start?.zasob);
  const dziennik = [];
  for (const wezel of droga.wezly) {
    const szansa = szansaWezla({ wezel, profile, zasoby, sklad: droga.sklad });
    const wynik = rozstrzygnijWezel(szansa.prawdopodobienstwo, los);
    zasoby = odejmij(zasoby, szansa.koszt);
    const nagroda = normalizujZasoby(wynik.sukces ? (wezel.nagroda ?? {}) : (wezel.porazka ?? {}));
    zasoby = dodaj(zasoby, nagroda);
    dziennik.push({ slug: wezel.slug, nazwa: wezel.nazwa, prawdopodobienstwo: szansa.prawdopodobienstwo, wartoscLosowa: wynik.wartoscLosowa, sukces: wynik.sukces, zasoby: { ...zasoby }, proza: wynik.sukces ? wezel.proza?.sukces : wezel.proza?.porazka });
    if (!wynik.sukces && wezel.koniecPoPorazce) break;
  }
  const sukcesy = dziennik.filter((w) => w.sukces).length;
  const status = sukcesy === dziennik.length ? 'ukonczona' : sukcesy === 0 ? 'przerwana' : 'rozszczepiona';
  return { slug: droga.slug, status, sklad: [...droga.sklad], zasoby, dziennik, proza: droga.proza?.[status] ?? droga.proza?.domyslna ?? '' };
}
