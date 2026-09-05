/**
 * PRÓG — spotkanie bez walki.
 *
 * C6 (ADR 0025): trzecie narzędzie fabularne obok Kroniki i SPLOTU. Arena
 * odpowiada na pytanie „kto wygra bitwę", SPLOT na „co świat zrobi z drogą",
 * a PRÓG na pytanie, które kartoteka zadaje najczęściej: czym rozbraja się
 * strażnika, jeśli nie bronią. Bazyliszek pada od własnego odbicia, morowa
 * panna odchodzi po jednym zdaniu, psy Saramy zasypiają po wersie hymnu —
 * to nie są warianty walki, tylko osobna mechanika.
 *
 * Moduł nie zna DOM-u, nie używa Math.random ani API Node (L22). Szansa jest
 * w pełni deterministyczna; los wchodzi dopiero w `rozstrzygnijProbe`
 * (ADR 0024). Sprzężenie z Kroniką jest jednokierunkowe: PRÓG czyta stan
 * świata (oś, zasięg), ale niczego w Kronice nie zapisuje — Epoka nadal ma
 * dokładnie jedno źródło (skit XOR zrodloSplotu).
 */
import { profileKartoteki, KONTRA_MOTYWU } from './arena.js';

/**
 * Klucze progu: rodzaj gestu, motywy kartoteki, na które działa, i siła
 * bazowa. Kolejność jest stała — determinizm doboru klucza bierze się stąd,
 * a nie z kolejności tagów w rekordzie.
 */
export const KLUCZE_PROGU = Object.freeze([
  { rodzaj: 'zwierciadlo', nazwa: 'zwierciadło', gest: 'pokazać bytowi jego własne spojrzenie', motywy: ['zle-oko', 'jad'], sila: 26 },
  { rodzaj: 'odpowiedz', nazwa: 'odpowiedź', gest: 'odpowiedzieć na pytanie zadane w progu', motywy: ['zagadka', 'warunek', 'wrozba'], sila: 24 },
  { rodzaj: 'hymn', nazwa: 'hymn', gest: 'powiedzieć znany wers we właściwej porze nocy', motywy: ['przewodnik', 'pamiec'], sila: 22 },
  { rodzaj: 'czuwanie', nazwa: 'czuwanie', gest: 'nie kłaść się samemu i doczekać zmiany światła', motywy: ['ostrzezenie'], sila: 21 },
  { rodzaj: 'oplata', nazwa: 'opłata', gest: 'zapłacić z góry i nie targować się', motywy: ['oplaty', 'tkanie'], sila: 20 },
  { rodzaj: 'ogien', nazwa: 'ogień', gest: 'wnieść światło i spalić to, co zostało po zmarłym', motywy: ['oczyszczenie', 'uzdrowienie', 'klatwa'], sila: 20 },
  { rodzaj: 'imie', nazwa: 'imię', gest: 'nazwać byt jego własnym imieniem', motywy: ['przemiana', 'podstep'], sila: 18 },
  { rodzaj: 'zaslona', nazwa: 'zasłona', gest: 'zamknąć próg i nie patrzeć w stronę gościa', motywy: ['obrona', 'ratunek', 'burza', 'furia'], sila: 16 },
]);

const ogranicz = (v, min, max) => Math.max(min, Math.min(max, v));
const zaokr = (v) => Math.round(v * 10) / 10;

/**
 * Klucze pasujące do bytu, od najmocniejszego. Dobór opiera się wyłącznie na
 * motywach z profilu (czyli na tagach kanonu), więc dopisanie wpisu nie zmienia
 * kluczy pozostałych bytów. Byt bez pasującego motywu dostaje „zasłonę" —
 * zawsze zostaje wyjście: nie otwierać.
 */
export function kluczeDlaBytu(profil) {
  const motywy = new Set(profil?.staty?.motywy ?? []);
  const trafione = KLUCZE_PROGU.filter((k) => k.motywy.some((m) => motywy.has(m))).map((k) => ({
    ...k,
    dopasowanie: k.motywy.filter((m) => motywy.has(m)),
  }));
  if (trafione.length > 0) return trafione;
  const zaslona = KLUCZE_PROGU.find((k) => k.rodzaj === 'zaslona');
  return [{ ...zaslona, sila: 10, dopasowanie: [] }];
}

/**
 * Opór bytu: ile próg stawia oporu niezależnie od klucza. Filar i Pieśniarz
 * trzymają próg mocniej niż Samotnik, bo są głęboko wrośnięci w archiwum.
 */
export function oporProgu(profil) {
  const p = profil?.percentyle ?? {};
  const surowy = (p.zywotnosc ?? 0) * 0.28 + (p.rezonans ?? 0) * 0.22 + (p.moc ?? 0) * 0.1;
  return Math.round(ogranicz(surowy, 0, 60));
}

/**
 * SPRZĘŻENIE KRONIKA → PRÓG (jednokierunkowe).
 * Świat mityczny sprzyja gestom obrzędowym, świat zracjonalizowany je psuje:
 * w epoce raportów nikt już nie zna wersu. Zasięg bytu działa odwrotnie niż
 * w SPLOCIE — im szerzej byt się rozszedł, tym trudniej zamknąć go jednym
 * gestem w jednych drzwiach.
 */
export function pogodaProgu(kronika, slug) {
  const skladniki = [];
  if (!kronika?.stanPo) return { premia: 0, skladniki, os: null };
  const os = kronika.stanPo.os ?? null;
  const mit = Number(os?.mit ?? 50);
  const punktyOsi = zaokr((mit - 50) * 0.16);
  skladniki.push({ nazwa: 'oś świata', wartosc: punktyOsi, opis: `mit ${mit} / racjonalizacja ${Number(os?.racjonalizacja ?? 100 - mit)}` });
  const wpis = (kronika.stanPo.zasieg ?? []).find((z) => z.slug === slug);
  const zasieg = Number(wpis?.wielkosc ?? 0.4);
  const punktyZasiegu = zaokr((0.4 - zasieg) * 30);
  skladniki.push({ nazwa: 'zasięg bytu', wartosc: punktyZasiegu, opis: `${Math.round(zasieg * 1000) / 1000}` });
  const premia = ogranicz(zaokr(skladniki.reduce((s, x) => s + x.wartosc, 0)), -12, 12);
  return { premia, skladniki, os };
}

/** Maksymalna wartość bezwzględna wpływu świadka na szansę (punkty procentowe). */
export const MAX_SWIADEK = 8;

/**
 * ŚWIADEK PROGU (C6, obrót 7 Pętli Jakości).
 *
 * Pytanie kartoteki brzmi nie tylko „czym rozbroić strażnika”, ale też „z kim
 * tam iść”. Trzy zapisy z bazy mówią to samo z trzech stron: czerwony
 * człowieczek bierze tego, kto śpi sam, i nie zaczepia grupy; manxką syrenę
 * wypuszczono, bo cała wyspa patrzyła i bała się rachunku; hoplita pierwszego
 * szeregu trzyma tarczę dla tego, kto stoi obok. Świadek nie bije i nie
 * wykonuje gestu — zmienia tylko to, ile próg jest gotów puścić.
 *
 * Trzy reguły, wszystkie deterministyczne i policzalne z tagów kanonu:
 *  +6  świadek zna słabość gospodarza progu (jego motyw kontruje motyw bytu);
 *  +3  świadek nosi motyw „ostrzezenie” (pilnuje, żeby nikt nie został sam);
 *  −5  świadek jest z tej samej tradycji co próg (dzieli z nim motyw) —
 *      dwoje z jednej opowieści trzyma drzwi razem, nie przeciw sobie.
 *
 * Wynik jest przycięty do ±MAX_SWIADEK, więc towarzystwo nigdy nie zastępuje
 * klucza; najwyżej przesuwa próbę o kilka punktów.
 */
export function wsparcieSwiadka(profil, swiadek) {
  const powody = [];
  if (!profil?.staty?.slug || !swiadek?.staty?.slug) return { premia: 0, powody, slug: null };
  if (profil.staty.slug === swiadek.staty.slug) return { premia: 0, powody, slug: null };
  const motywyProgu = new Set(profil.staty.motywy ?? []);
  const motywySwiadka = new Set(swiadek.staty.motywy ?? []);
  let premia = 0;
  const kontrowane = [];
  for (const m of motywySwiadka) {
    for (const cel of KONTRA_MOTYWU[m] ?? []) {
      if (motywyProgu.has(cel)) kontrowane.push(`${m} → ${cel}`);
    }
  }
  if (kontrowane.length > 0) {
    premia += 6;
    powody.push({ nazwa: 'zna słabość progu', wartosc: 6, opis: kontrowane.join(', ') });
  }
  if (motywySwiadka.has('ostrzezenie')) {
    premia += 3;
    powody.push({ nazwa: 'pilnuje, by nikt nie został sam', wartosc: 3, opis: 'ostrzezenie' });
  }
  const wspolne = [...motywySwiadka].filter((m) => motywyProgu.has(m));
  if (wspolne.length > 0) {
    premia -= 5;
    powody.push({ nazwa: 'z tej samej tradycji co próg', wartosc: -5, opis: wspolne.join(', ') });
  }
  return { premia: ogranicz(premia, -MAX_SWIADEK, MAX_SWIADEK), powody, slug: swiadek.staty.slug, nazwa: swiadek.staty.nazwa ?? swiadek.staty.slug };
}

/**
 * Najlepszy możliwy świadek z kartoteki dla danego progu: ten, przy którym
 * próba zyskuje najwięcej. Remisy rozstrzyga slug, żeby widok był stabilny.
 */
export function najlepszySwiadek(profil, profile) {
  let najlepszy = null;
  for (const [slug, kandydat] of profile ?? []) {
    if (slug === profil?.staty?.slug) continue;
    const w = wsparcieSwiadka(profil, kandydat);
    if (w.premia <= 0) continue;
    if (!najlepszy || w.premia > najlepszy.premia || (w.premia === najlepszy.premia && slug.localeCompare(najlepszy.slug, 'pl') < 0)) {
      najlepszy = w;
    }
  }
  return najlepszy;
}

/**
 * Deterministyczna szansa, że gest zadziała. Los nie jest tu używany.
 * `staranie` 0–3 opisuje, ile człowiek w to włożył (przygotowanie, świadek,
 * właściwa pora) — kosztuje czas, więc nie jest darmowe w fabule.
 */
export function szansaProgu({ profil, klucz, staranie = 1, pogoda = 0, swiadek = 0 }) {
  if (!profil?.staty?.slug) throw new TypeError('PRÓG: wymagany profil bytu z app/arena.js');
  if (!klucz?.rodzaj) throw new TypeError('PRÓG: wymagany klucz progu');
  const opor = oporProgu(profil);
  const wysilek = ogranicz(Math.floor(Number(staranie) || 0), 0, 3) * 6;
  const swiat = ogranicz(Number(pogoda) || 0, -12, 12);
  const towarzystwo = ogranicz(Number(swiadek) || 0, -MAX_SWIADEK, MAX_SWIADEK);
  const surowa = 44 + Number(klucz.sila ?? 0) + wysilek + swiat + towarzystwo - opor;
  return {
    prawdopodobienstwo: Math.round(ogranicz(surowa, 5, 95)) / 100,
    opor,
    wysilek,
    pogoda: swiat,
    swiadek: towarzystwo,
    klucz: klucz.rodzaj,
  };
}

/**
 * Losowe rozstrzygnięcie przy deterministycznie wyliczonej szansie (ADR 0024).
 * Trzy wyniki, nie dwa: gest może zadziałać, zadziałać po cenie albo zawieść.
 * „Cena" to pas 12 punktów tuż nad progiem sukcesu — próg przepuszcza, ale
 * coś zatrzymuje.
 */
export function rozstrzygnijProbe(prawdopodobienstwo, los) {
  if (!Number.isFinite(prawdopodobienstwo) || prawdopodobienstwo < 0 || prawdopodobienstwo > 1) {
    throw new RangeError('PRÓG: szansa musi być w [0, 1]');
  }
  if (typeof los !== 'function') throw new TypeError('PRÓG: wymagany wstrzyknięty RNG');
  const wartoscLosowa = Number(los());
  if (!Number.isFinite(wartoscLosowa) || wartoscLosowa < 0 || wartoscLosowa >= 1) {
    throw new RangeError('PRÓG: RNG musi zwrócić wartość w [0, 1)');
  }
  const granicaCeny = Math.max(0, prawdopodobienstwo - 0.12);
  const status = wartoscLosowa < granicaCeny ? 'przejscie' : wartoscLosowa < prawdopodobienstwo ? 'cena' : 'odmowa';
  return { status, wartoscLosowa };
}

const PROZA = {
  przejscie: (nazwa, klucz) => `${klucz.gest[0].toUpperCase()}${klucz.gest.slice(1)} — i próg puszcza. ${nazwa} cofa się bez hałasu, bo gest był z tej samej tradycji, co byt.`,
  cena: (nazwa, klucz) => `Gest działa, ale nie za darmo: ${nazwa} przepuszcza i zatrzymuje sobie coś na pamiątkę. Kto próbował, wraca lżejszy o jedną rzecz, której nie planował oddać.`,
  odmowa: (nazwa, klucz) => `${nazwa} nie przyjmuje tego gestu. Klucz był z innej opowieści niż próg, a drugi raz tej samej nocy już się nie próbuje.`,
};

/** Jedno podejście do progu: klucz, szansa, los, proza i ślad dla opowieści. */
export function rozegrajProg({ profil, klucz, staranie = 1, kronika = null, swiadek = null, los }) {
  const pogoda = pogodaProgu(kronika, profil?.staty?.slug ?? '');
  const wsparcie = swiadek ? wsparcieSwiadka(profil, swiadek) : { premia: 0, powody: [], slug: null };
  const szansa = szansaProgu({ profil, klucz, staranie, pogoda: pogoda.premia, swiadek: wsparcie.premia });
  const wynik = rozstrzygnijProbe(szansa.prawdopodobienstwo, los);
  const nazwa = profil?.staty?.nazwa ?? profil?.staty?.slug ?? 'Byt';
  const dopisek = wsparcie.slug
    ? ` Obok stał ${wsparcie.nazwa} i to ${wsparcie.premia >= 0 ? 'pomogło' : 'zaszkodziło'}: ${wsparcie.powody.map((p) => p.nazwa).join(', ')}.`
    : ' Nikt nie stał obok; cały rachunek szedł na jednego.';
  return {
    slug: profil.staty.slug,
    nazwa,
    klucz,
    szansa,
    pogoda,
    swiadek: wsparcie,
    status: wynik.status,
    wartoscLosowa: wynik.wartoscLosowa,
    proza: PROZA[wynik.status](nazwa, klucz) + dopisek,
  };
}

/**
 * Zestawienie progów całej kartoteki: dla każdego bytu najmocniejszy klucz,
 * opór i szansa przy zadanym staraniu. Deterministyczne — bez losu; służy
 * jako widok „czego szukać, zanim się zapuka".
 */
export function tablicaProgow(rekordy, { kanon = null, kronika = null, staranie = 1 } = {}) {
  const profile = profileKartoteki(rekordy ?? [], kanon);
  const wiersze = [];
  for (const [slug, profil] of profile) {
    const klucze = kluczeDlaBytu(profil);
    const klucz = klucze[0];
    const pogoda = pogodaProgu(kronika, slug);
    const swiadek = najlepszySwiadek(profil, profile);
    const szansa = szansaProgu({ profil, klucz, staranie, pogoda: pogoda.premia });
    wiersze.push({
      slug,
      nazwa: profil.staty.nazwa,
      archetyp: profil.archetyp,
      klucz,
      alternatywy: klucze.slice(1),
      opor: szansa.opor,
      pogoda: pogoda.premia,
      swiadek,
      prawdopodobienstwo: szansa.prawdopodobienstwo,
    });
  }
  wiersze.sort((a, b) => b.prawdopodobienstwo - a.prawdopodobienstwo || a.slug.localeCompare(b.slug, 'pl'));
  return wiersze;
}
