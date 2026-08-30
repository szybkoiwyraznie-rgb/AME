#!/usr/bin/env node
/**
 * tools/kronika.mjs — mechanika Kroniki: budżet paliwa + konsekwencje epok Tomu + generator raportów.
 *
 *   node tools/kronika.mjs           # przelicz wszystkie epoki Tomu I i zapisz summary + raporty
 *   node tools/kronika.mjs --check   # przelicz bez zapisu; porównaj z istniejącymi plikami
 *
 * Zasady (docs/KRONIKA_tryb.md §20–§21, ADR 0021):
 *  - Udział epoki KOSZTUJE; samo „bycie w skicie” nie dodaje paliwa.
 *  - Paliwo pasywne = pamięć archiwum: 2×backlinki + tagi kanonu + sieć powiązań (max 3).
 *  - Zwrot jest możliwy tylko za realną, dodatnią zmianę świata (zasięg/delty).
 *  - Oś „rząd dusz” jest zamknięta: mit + racjonalizacja = zawsze 100; delty sumują się do 0.
 *  - „Wykorzystanie słabości” NIE jest flagą mechaniczną — to ocena narratora
 *    (narrator.ocena[].stopien + komentarz), która nie nakłada kosztu.
 *  - Epoki Tomu liczą się sekwencyjnie: stanPo poprzedniej staje się stanem wejściowym.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as geo from '../app/geo.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const KATALOG_KRONIKA = join(ROOT, 'data', 'kronika');
export const PLIK_TOM_1 = join(KATALOG_KRONIKA, 'tom-1.json');
export const PLIK_EPOKA_1 = join(KATALOG_KRONIKA, 'epoka-1.json');
export const PLIK_EPOKA_2 = join(KATALOG_KRONIKA, 'epoka-2.json');
export const PLIK_PODSUMOWANIA = join(KATALOG_KRONIKA, 'summary.json');
export const PLIK_INDEKSU = join(ROOT, 'data', 'index.json');
export const PLIK_KANONU = join(ROOT, 'data', 'kanon-tagow.json');
export const PLIK_TOPO_KRAJE = join(ROOT, 'assets', 'map', 'countries-50m.json');
export const KATALOG_MANIFESTACJI = join(ROOT, 'data', 'manifestations');

/** Ścieżka raportu HTML dla danej epoki: docs/kronika-<slug>.html */
export function plikRaportu(slug) {
  return join(ROOT, 'docs', `kronika-${slug}.html`);
}

export const PLIK_RAPORTU_TOMU = join(ROOT, 'docs', 'kronika-tom-1.html');

const STATUSY = new Set([
  'wzmocniony',
  'odporny',
  'zraniony',
  'zmarginalizowany',
  'przemieniony',
  'wyjasniony',
]);
const STANY_WATKU = new Set(['otwarty', 'zamkniety']);

/**
 * Zwraca pierwszy tag-kulturę bytu z kanonu (np. „grecja”, „joruba”).
 * Gdy brak — „inna”.
 */
export function kulturaBytu(entry, kanon) {
  const kulturowe = new Set(
    (kanon?.tagi || []).filter((t) => t.kategoria === 'kultura').map((t) => t.tag)
  );
  const tag = (entry?.tagi || []).find((t) => kulturowe.has(t));
  return tag || 'inna';
}

/**
 * Kalibruje seedowe wartości świata na podstawie faktycznej kartoteki.
 *  - obecność bytu = 2×backlinki + tagi kanonu + 2×skity + min(3, powiązania),
 *  - zasięg = 0.10 + 0.40 × (obecność / max obecność) (0.10–0.50),
 *  - oś „rząd dusz” = średni zasięg → mit%, racjonalizacja = 100 − mit%.
 * Determinystyczna — te same dane dają ten sam seed.
 */
export function kalibrujStanStart(indeks, kanon) {
  const skityPerSlug = new Map();
  for (const s of indeks.skity || []) {
    for (const u of s.uczestnicy || []) {
      const slug = typeof u === 'string' ? u : u.slug;
      skityPerSlug.set(slug, (skityPerSlug.get(slug) || 0) + 1);
    }
  }

  const obecnosci = [];
  for (const m of indeks.manifestacje || []) {
    const backlinki = m.backlinki?.length || 0;
    const powiazania = m.powiazania?.length || 0;
    const tagi = (m.tagi || []).filter((t) =>
      new Set((kanon?.tagi || []).map((k) => k.tag)).has(t)
    ).length;
    const skity = skityPerSlug.get(m.slug) || 0;
    const obecnosc = 2 * backlinki + tagi + 2 * skity + Math.min(3, powiazania);
    obecnosci.push({ slug: m.slug, obecnosc });
  }
  const maxObecnosc = Math.max(...obecnosci.map((o) => o.obecnosc), 1);

  const zasieg = obecnosci.map((o) => ({
    slug: o.slug,
    wielkosc: Math.round((0.1 + 0.4 * (o.obecnosc / maxObecnosc)) * 1000) / 1000,
  }));

  const dominacje = zasieg.map((z) => {
    const m = (indeks.manifestacje || []).find((x) => x.slug === z.slug);
    return { kultura: kulturaBytu(m, kanon), kult: z.slug, wielkosc: z.wielkosc };
  });

  const srednia = zasieg.reduce((a, z) => a + z.wielkosc, 0) / (zasieg.length || 1);
  const mit = Math.round(100 * srednia);
  const racjonalizacja = 100 - mit;

  return {
    os: { mit, racjonalizacja },
    zasieg,
    dominacje,
  };
}

/** Paliwo pasywne = to, co o bycie mówi archiwum. Deterministyczne, build-time. */
export function paliwoPasywne(entry, kanon) {
  if (!entry) return 0;
  const kanonTagi = new Set((kanon?.tagi || []).map((t) => t.tag));
  const backlinki = Array.isArray(entry.backlinki) ? entry.backlinki : [];
  const tagi = Array.isArray(entry.tagi) ? entry.tagi : [];
  const kanonTra = tagi.filter((t) => kanonTagi.has(t));
  const powiazania = Array.isArray(entry.powiazania) ? entry.powiazania.length : 0;
  return 2 * backlinki.length + kanonTra.length + Math.min(3, powiazania);
}

function blad(lista, msg) {
  lista.push(msg);
}

function klonuj(wartosc) {
  return JSON.parse(JSON.stringify(wartosc));
}

function wielkoscZasiegu(stan, slug) {
  const row = (stan?.zasieg || []).find((z) => z.slug === slug);
  return row ? row.wielkosc : null;
}

function wielkoscDominacji(stan, kultura, kult) {
  const row = (stan?.dominacje || []).find((d) => d.kultura === kultura && d.kult === kult);
  return row ? row.wielkosc : null;
}

function walidujOs(os, bledy, skad) {
  if (!os || typeof os.mit !== 'number' || typeof os.racjonalizacja !== 'number') {
    blad(bledy, `${skad}: os wymaga mit i racjonalizacja`);
    return;
  }
  const suma = os.mit + os.racjonalizacja;
  if (Math.abs(suma - 100) > 1e-9) {
    blad(bledy, `${skad}: mit+racjonalizacja = ${suma} (musi być 100)`);
  }
  if (os.mit < 0 || os.racjonalizacja < 0) {
    blad(bledy, `${skad}: os nie może być ujemna`);
  }
}

/**
 * Sprawdza ciągłość wątków: wątek otwarty wcześniej musi być w tej epoce
 * przeniesiony (otwarty) albo domknięty; wątek zamknięty nie może się otworzyć.
 * `watkiPoprzednie`: Map id -> { stan, epoka }.
 */
export function walidujCiągłośćWątków(watkiBiezace, watkiPoprzednie, bledy) {
  const biezace = new Map(watkiBiezace.map((w) => [w.id, w]));
  for (const [id, prev] of watkiPoprzednie) {
    const teraz = biezace.get(id);
    if (prev.stan === 'otwarty' && !teraz) {
      blad(bledy, `watki: otwarty wątek „${id}” z epoki „${prev.epoka}” zaginął (przenieś albo domknij)`);
    } else if (teraz && prev.stan === 'zamkniety' && teraz.stan === 'otwarty') {
      blad(bledy, `watki: zamknięty wątek „${id}” z epoki „${prev.epoka}” nie może się otworzyć`);
    }
  }
}

/** Przelicza jedną epokę względem bieżącego stanu świata. */
export function przeliczEpoke({ tom, epoka, indeks, kanon, stan, watkiPoprzednie }) {
  const bledy = [];
  const stanBiezacy = stan || tom.stanStart;

  if (epoka.tom !== tom.slug) blad(bledy, `epoka: „${epoka.tom}” != tom „${tom.slug}”`);
  if (!Array.isArray(epoka.uczestnicy) || epoka.uczestnicy.length < 2) {
    blad(bledy, 'uczestnicy: minimum 2 byty');
  }

  const skit = (indeks.skity || []).find((s) => s.slug === epoka.skit);
  if (!skit) blad(bledy, `skit „${epoka.skit}” nie istnieje w indeksie`);

  const skitSlug = [
    ...new Set(
      (skit?.uczestnicy || []).map((u) => (typeof u === 'string' ? u : u.slug))
    ),
  ].sort();
  const epokaSlug = [...new Set((epoka.uczestnicy || []).map((u) => u.slug))].sort();
  if (skit && JSON.stringify(skitSlug) !== JSON.stringify(epokaSlug)) {
    blad(bledy, `uczestnicy epoki nie są równi uczestnikom skitu (skit: ${skitSlug.join(', ')})`);
  }

  const paliwoWyjscie = klonuj(stanBiezacy.paliwo || {});
  const uczestnicy = epoka.uczestnicy.map((u) => {
    const entry = (indeks.manifestacje || []).find((m) => m.slug === u.slug);
    if (!entry) {
      blad(bledy, `uczestnik „${u.slug}” nie istnieje w indeksie`);
      return null;
    }
    const pasywne = paliwoPasywne(entry, kanon);
    const saldoPrzed = paliwoWyjscie[u.slug] ?? pasywne;
    const koszt = (u.kosztUdzialu || 0) + (u.kosztKlucza || 0) + (u.boost || 0);
    const zwrot = u.zwrot || 0;
    if (zwrot < 0) blad(bledy, `${u.slug}: zwrot nie może być ujemny`);
    if (saldoPrzed < koszt) {
      blad(bledy, `${u.slug}: paliwo przed epoką ${saldoPrzed} < koszt wejścia ${koszt}`);
    }
    const saldoPo = saldoPrzed - koszt + zwrot;
    paliwoWyjscie[u.slug] = saldoPo;
    return {
      slug: u.slug,
      nazwa: entry.nazwa,
      rola: u.rola || '',
      pasywne,
      saldoPrzed,
      kosztUdzialu: u.kosztUdzialu || 0,
      kosztKlucza: u.kosztKlucza || 0,
      boost: u.boost || 0,
      zwrot,
      saldoPo,
    };
  });

  if (uczestnicy.some((u) => u && u.saldoPo < 0)) {
    blad(bledy, 'ledger: saldo po epokę nie może być ujemne');
  }

  walidujOs(stanBiezacy.os, bledy, 'stanWejsciowy');

  const konsekwencje = epoka.konsekwencje || {};

  const deltaMit = konsekwencje.os?.mit || 0;
  const deltaRac = konsekwencje.os?.racjonalizacja || 0;
  if (Math.abs(deltaMit + deltaRac) > 1e-9) {
    blad(bledy, `oś: delty mit (${deltaMit}) + racjonalizacja (${deltaRac}) = ${deltaMit + deltaRac} (muszą sumować się do 0)`);
  }

  const stanPo = {
    os: {
      mit: stanBiezacy.os.mit + deltaMit,
      racjonalizacja: stanBiezacy.os.racjonalizacja + deltaRac,
    },
    zasieg: (stanBiezacy.zasieg || []).map((z) => ({ ...z })),
    dominacje: (stanBiezacy.dominacje || []).map((d) => ({ ...d })),
    paliwo: paliwoWyjscie,
  };
  walidujOs(stanPo.os, bledy, 'stanPo');

  const zasiegWyliczone = (konsekwencje.zasieg || []).map((row) => {
    const przed = wielkoscZasiegu(stanBiezacy, row.slug);
    if (przed === null) blad(bledy, `zasięg: brak „${row.slug}” w stanie bieżącym`);
    if (typeof row.delta !== 'number' || Number.isNaN(row.delta)) {
      blad(bledy, `zasięg: „${row.slug}” wymaga liczbowego pola delta`);
    }
    if (row.po < 0) blad(bledy, `zasięg: „${row.slug}” po < 0`);
    const po = przed === null ? null : Math.round((przed + (row.delta || 0)) * 1000) / 1000;
    const cel = stanPo.zasieg.find((z) => z.slug === row.slug);
    if (cel && po !== null) cel.wielkosc = po;
    return {
      slug: row.slug,
      przed,
      po,
      delta: row.delta || 0,
      opis: row.opis || '',
    };
  });

  const dominacjeWyliczone = (konsekwencje.dominacje || []).map((row) => {
    const przed = wielkoscDominacji(stanBiezacy, row.kultura, row.kult);
    if (przed === null) blad(bledy, `dominacja: brak „${row.kultura}/${row.kult}” w stanie bieżącym`);
    if (typeof row.delta !== 'number' || Number.isNaN(row.delta)) {
      blad(bledy, `dominacja: „${row.kultura}/${row.kult}” wymaga liczbowego pola delta`);
    }
    const po = przed === null ? null : Math.round((przed + (row.delta || 0)) * 1000) / 1000;
    const cel = stanPo.dominacje.find((d) => d.kultura === row.kultura && d.kult === row.kult);
    if (cel && po !== null) cel.wielkosc = po;
    return {
      kultura: row.kultura,
      kult: row.kult,
      przed,
      po,
      delta: row.delta || 0,
    };
  });

  const konsekwencjeWyliczone = {
    ...konsekwencje,
    zasieg: zasiegWyliczone,
    dominacje: dominacjeWyliczone,
  };

  for (const u of uczestnicy) {
    if (!u) continue;
    const delta = (() => {
      const row = (konsekwencje.zasieg || []).find((r) => r.slug === u.slug);
      return row ? row.delta || 0 : 0;
    })();
    if (u.zwrot > 0) {
      if (delta <= 0) {
        blad(bledy, `${u.slug}: zwrot ${u.zwrot} bez dodatniej zmiany zasięgu (delta ${delta})`);
      }
      const cap = Math.floor(2 * delta * 100) + 3;
      if (u.zwrot > cap) {
        blad(bledy, `${u.slug}: zwrot ${u.zwrot} > cap ${cap} dla zmiany zasięgu +${delta}`);
      }
    }
  }

  for (const p of konsekwencje.pozycje || []) {
    if (!STATUSY.has(p.status)) {
      blad(bledy, `pozycje: „${p.slug}” ma nieznany status „${p.status}”`);
    }
    if (!epokaSlug.includes(p.slug)) {
      blad(bledy, `pozycje: „${p.slug}” nie jest uczestnikiem epoki`);
    }
  }

  const widy = new Set();
  for (const w of konsekwencje.watki || []) {
    if (!STANY_WATKU.has(w.stan)) blad(bledy, `watki: „${w.id}” ma nieznany stan „${w.stan}”`);
    if (widy.has(w.id)) blad(bledy, `watki: duplikat „${w.id}”`);
    widy.add(w.id);
  }
  if (watkiPoprzednie instanceof Map) {
    walidujCiągłośćWątków(konsekwencje.watki || [], watkiPoprzednie, bledy);
  }

  const oceny = (epoka.narrator || {}).ocena || [];
  for (const o of oceny) {
    if (!Number.isInteger(o.stopien) || o.stopien < 0 || o.stopien > 3) {
      blad(bledy, `narrator: stopień „${o.stopien}” poza 0–3`);
    }
    if (!epokaSlug.includes(o.kto) || !epokaSlug.includes(o.kogo)) {
      blad(bledy, `narrator: „${o.kto}→${o.kogo}” wykracza poza uczestników`);
    }
  }

  return {
    ok: bledy.length === 0,
    bledy,
    uczestnicy,
    stanPo,
    konsekwencje: konsekwencjeWyliczone,
    narrator: epoka.narrator || null,
    skit: skit ? skit.slug : null,
  };
}

/** Przelicza wszystkie epoki Tomu sekwencyjnie: stanPo poprzedniej → stan wejściowy. */
export function przeliczTom({ tom, epoki, indeks, kanon }) {
  let stan = klonuj(tom.stanStart);
  let watkiPoprzednie = new Map();
  const wyniki = [];
  const bledy = [];
  for (const epoka of epoki) {
    const w = przeliczEpoke({ tom, epoka, indeks, kanon, stan, watkiPoprzednie });
    wyniki.push({ ...w, slug: epoka.slug, tytul: epoka.tytul });
    if (!w.ok) {
      for (const b of w.bledy) blad(bledy, `${epoka.slug}: ${b}`);
    } else {
      stan = w.stanPo;
      watkiPoprzednie = new Map(
        (epoka.konsekwencje?.watki || []).map((x) => [
          x.id,
          { stan: x.stan, epoka: epoka.slug },
        ])
      );
    }
  }
  return { ok: bledy.length === 0, bledy, wyniki, stan };
}

/** Buduje podsumowanie całego Tomu I (summary.json). */
export function zbudujPodsumowanieTomu({ tom, epoki, indeks, kanon }) {
  const wynikTomu = przeliczTom({ tom, epoki, indeks, kanon });
  return {
    wersja: 2,
    tom: tom.slug,
    tytulTomu: tom.tytul,
    epoki: wynikTomu.wyniki.map((w) => ({
      slug: w.slug,
      tytul: w.tytul,
      skit: w.skit,
      walidacja: w.ok,
      bledy: w.bledy,
      uczestnicy: w.uczestnicy,
      stanPo: w.stanPo,
      konsekwencje: w.konsekwencje,
      narrator: w.narrator,
    })),
    stanPo: wynikTomu.stan,
    walidacja: wynikTomu.ok,
    bledy: wynikTomu.bledy,
    metryka: {
      tryb: 'tools/kronika.mjs',
      paliwoPasywne: '2×backlinki + tagi kanonu + sieć powiązań (max 3)',
      wykorzystanieSlabosci: 'ocena narratora (stopień 0–3), nie koszt',
      osZamknieta: 'mit + racjonalizacja = 100; delty sumują się do 0',
      utworzono: '2026-08-29',
    },
  };
}

const RZYMSKIE = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function rzymskie(n) {
  return RZYMSKIE[(n || 1) - 1] || String(n);
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function pct(x) {
  return `${Math.round((x ?? 0) * 100)}%`;
}

/** Słownik awatarów / symboli dla poszczególnych manifestacji */
const EMOJI_BYTU = {
  'agni': '🔥',
  'balor': '👁️',
  'barbarossa-kyffhaeuser': '👑',
  'ben-varrey': '🧜‍♀️',
  'drangue-shala': '⚡',
  'egungun': '🎭',
  'empusa-korynt': '🕷️',
  'indra': '🌩️',
  'kannon-hase': '🕊️',
  'kentaur-pelion': '🐎',
  'lincoln-imp': '😈',
  'nessos': '🏹',
  'selkie-sule-skerry': '🦭',
  'sfinks-teby': '🦁',
  'talos-kreta': '🗿',
  'knecht-z-koptos': '🪵',
  'pandora': '🏺',
  'protostates': '🛡️',
  'syama-i-sarvara': '🐕',
  'morowa-panna': '🧣',
};

function getEmoji(slug) {
  return EMOJI_BYTU[slug] || '✨';
}

/** Pre-kalkulacja uproszczonych ścieżek kontynentów dla szybkiego SVG */
let cachedLandD = null;
async function pobierzSciezkeLadow() {
  if (cachedLandD) return cachedLandD;
  try {
    const raw = await readFile(PLIK_TOPO_KRAJE, 'utf8');
    const top = JSON.parse(raw);
    const luki = geo.dekodujLuki(top);
    const geometrie = top.objects?.countries?.geometries ?? [];
    let pathD = '';
    for (const g of geometrie) {
      let rings = [];
      if (g.type === 'Polygon') rings = g.arcs.map((r) => geo.poskladajPierscien(luki, r));
      else if (g.type === 'MultiPolygon') rings = g.arcs.flat().map((r) => geo.poskladajPierscien(luki, r));
      const cut = geo.potnijPierscienie(rings);
      for (const r of cut) {
        if (r.length < 8) continue;
        const step = Math.max(1, Math.floor(r.length / 18));
        let p = '';
        for (let i = 0; i < r.length; i += step) {
          const [x, y] = geo.projektuj(r[i][1], r[i][0]);
          p += (p === '' ? 'M' : 'L') + Math.round(x) + ' ' + Math.round(y);
        }
        p += 'Z';
        pathD += p;
      }
    }
    cachedLandD = pathD;
    return pathD;
  } catch (err) {
    console.warn('Ostrzeżenie: nie udało się wczytać mapy kontynentów:', err.message);
    return '';
  }
}

/**
 * Generuje wektorową mapę SVG (rzut Equirectangular wg ADR 0009 / app/geo.js).
 */
export function generujMapeSVG({
  manifestacje,
  uczestnicySlugi = [],
  zasiegi = [],
  landD = '',
  viewBox = null,
  tytul = 'Geografia epoki',
  tylkoUczestnicy = false,
}) {
  const uczestnicySet = new Set(uczestnicySlugi);
  const mapaBytow = new Map((manifestacje || []).map((m) => [m.slug, m]));
  const mapaZasiegu = new Map((zasiegi || []).map((z) => [z.slug, z.wielkosc ?? z.po ?? 0.3]));

  // Punkty uczestników lub wszystkich bytów
  const punkty = [];
  for (const m of manifestacje || []) {
    if (typeof m.lat === 'number' && typeof m.lon === 'number') {
      const jestUczestnikiem = uczestnicySet.has(m.slug);
      if (tylkoUczestnicy && !jestUczestnikiem) continue;
      const [x, y] = geo.projektuj(m.lat, m.lon);
      punkty.push({
        slug: m.slug,
        nazwa: m.nazwa,
        kraj: m.kraj || '',
        lat: m.lat,
        lon: m.lon,
        x: Math.round(x),
        y: Math.round(y),
        jestUczestnikiem,
        zasieg: mapaZasiegu.get(m.slug) || 0.3,
        emoji: getEmoji(m.slug),
      });
    }
  }

  // Ustal viewBox
  let finalViewBox = viewBox;
  if (!finalViewBox) {
    if (uczestnicySlugi.length > 0) {
      const uPunkty = punkty.filter((p) => p.jestUczestnikiem);
      if (uPunkty.length > 0) {
        const xs = uPunkty.map((p) => p.x);
        const ys = uPunkty.map((p) => p.y);
        const minX = Math.min(...xs) - 240;
        const maxX = Math.max(...xs) + 240;
        const minY = Math.min(...ys) - 180;
        const maxY = Math.max(...ys) + 180;
        const w = Math.max(800, maxX - minX);
        const h = Math.max(480, maxY - minY);
        finalViewBox = `${minX} ${minY} ${w} ${h}`;
      }
    }
    if (!finalViewBox) {
      // Domyślny kadr na Eurazję / Afrykę / świat aktywnych bytów
      finalViewBox = '1400 900 1850 950';
    }
  }

  // Linie łączące uczestników
  const lukiSvg = [];
  const uPunkty = punkty.filter((p) => p.jestUczestnikiem);
  for (let i = 0; i < uPunkty.length; i++) {
    for (let j = i + 1; j < uPunkty.length; j++) {
      const p1 = uPunkty[i];
      const p2 = uPunkty[j];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 - Math.min(60, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.15);
      lukiSvg.push(`
        <path class="arc-glow" d="M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}" />
        <path class="arc-line" d="M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}" />
      `);
    }
  }

  // Halosy i pinezki
  const elementySvg = punkty
    .sort((a, b) => (a.jestUczestnikiem === b.jestUczestnikiem ? 0 : a.jestUczestnikiem ? 1 : -1))
    .map((p) => {
      const rHalo = Math.round(24 + p.zasieg * 120);
      const cls = p.jestUczestnikiem ? 'node active' : 'node passive';
      return `
      <g class="${cls}" data-slug="${esc(p.slug)}" transform="translate(${p.x},${p.y})">
        <circle class="halo" r="${rHalo}" />
        <a href="#${esc(p.slug)}" class="otworz-kartoteke" data-slug="${esc(p.slug)}" title="${esc(p.nazwa)} (${esc(p.kraj)}) — otwórz kartotekę">
          <circle class="pin-bg" r="${p.jestUczestnikiem ? 15 : 10}" />
          <text class="pin-icon" dy="${p.jestUczestnikiem ? '4' : '3'}">${p.emoji}</text>
          <text class="pin-label" x="${p.jestUczestnikiem ? 18 : 14}" y="4">${esc(p.nazwa.split('—')[0].trim())}</text>
        </a>
      </g>`;
    })
    .join('');

  return `
  <div class="map-container">
    <div class="map-header">
      <span class="map-title">📍 ${esc(tytul)}</span>
      <span class="map-hint">Kliknij węzeł bytu, aby otworzyć jego kartotekę</span>
    </div>
    <svg class="kronika-map" viewBox="${finalViewBox}" preserveAspectRatio="xMidYMid meet" aria-label="Mapa geopolityczna epoki">
      <defs>
        <radialGradient id="grad-active" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#b4682c" stop-opacity="0.55"/>
          <stop offset="70%" stop-color="#7a4a22" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#7a4a22" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="grad-passive" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#51689a" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#51689a" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Tło oceanu -->
      <rect class="ocean" x="-5000" y="-3000" width="12000" height="8000" fill="#ede7db" />
      
      <!-- Siatka współrzędnych -->
      <g class="graticule" stroke="#dfd7c7" stroke-width="1" stroke-dasharray="3,4">
        <line x1="-5000" y1="900" x2="6000" y2="900" />
        <line x1="-5000" y1="1200" x2="6000" y2="1200" />
        <line x1="-5000" y1="1500" x2="6000" y2="1500" />
        <line x1="1500" y1="-3000" x2="1500" y2="5000" />
        <line x1="1800" y1="-3000" x2="1800" y2="5000" />
        <line x1="2100" y1="-3000" x2="2100" y2="5000" />
        <line x1="2400" y1="-3000" x2="2400" y2="5000" />
        <line x1="2700" y1="-3000" x2="2700" y2="5000" />
        <line x1="3000" y1="-3000" x2="3000" y2="5000" />
      </g>
      
      <!-- Lądy kontynentów -->
      ${landD ? `<path class="land" d="${landD}" fill="#dfd6c4" stroke="#c8beaa" stroke-width="1.2" />` : ''}
      
      <!-- Łuki interakcji między uczestnikami -->
      <g class="arcs">
        ${lukiSvg.join('')}
      </g>
      
      <!-- Węzły i halos bytów -->
      <g class="nodes">
        ${elementySvg}
      </g>
    </svg>
  </div>`;
}

/**
 * Formatuje tekst SKITu w elegancki, pełny zapis dialogu.
 */
export function formatujDialogHTML(tekst) {
  if (!tekst) return '<p class="muted">Brak zapisu dialogu.</p>';
  const akapity = tekst.split('\n\n').filter(Boolean);
  const rows = akapity.map((akapit) => {
    // Rozpoznaj mówcę: "**Imię:** [didaskalia] kwestia"
    const m = akapit.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    if (!m) {
      return `<div class="speech-block narracja"><div class="speech-bubble">${esc(akapit)}</div></div>`;
    }
    const imie = m[1].trim();
    let reszta = m[2].trim();

    // Wydziel didaskalia w nawiasach kwadratowych
    let didaskalia = '';
    const didM = reszta.match(/^(\[[^\]]+\])\s*(.*)$/s);
    if (didM) {
      didaskalia = didM[1];
      reszta = didM[2];
    }

    const initial = imie.charAt(0).toUpperCase();

    return `
    <div class="speech-row">
      <div class="speaker-avatar" title="${esc(imie)}">${initial}</div>
      <div class="speech-content">
        <div class="speaker-name">${esc(imie)}</div>
        ${didaskalia ? `<div class="speech-didaskalia">${esc(didaskalia)}</div>` : ''}
        <div class="speech-bubble">${esc(reszta)}</div>
      </div>
    </div>`;
  });

  return `<div class="skit-dialog">${rows.join('')}</div>`;
}

/** Wspólny pasek nawigacji aplikacji Kroniki */
export function generujTopbarHTML(aktywny = 'kronika') {
  return `  <header class="gora">
    <div class="tytul">
      <h1><a href="../index.html" style="text-decoration:none;color:inherit">AME</a></h1>
      <p>Archiwum Manifestacji Eterycznych</p>
    </div>
    <input id="szukaj" type="search" placeholder="Szukaj: nazwa, karta, tag, kraj…" autocomplete="off" aria-label="Szukaj manifestacji" onkeypress="if(event.key === 'Enter') window.location.href='../index.html?q='+encodeURIComponent(this.value)">
    <div class="akcje">
      <a id="przycisk-los" class="przycisk" href="../index.html?action=wylosuj" title="Wylosuj manifestację i przeleć do niej na mapie">🎲 wylosuj</a>
      <a id="przycisk-luki" class="przycisk" href="../index.html?action=powiazania" title="Pokaż powiązania na mapie">∞ powiązania</a>
      <a id="przycisk-lista" class="przycisk" href="../index.html#lista" title="Lista wszystkich manifestacji">☰ kartoteka</a>
      <a id="przycisk-skity" class="przycisk" href="../index.html#skity" title="Baza Skitów — rozmowy materializacji">✎ skity</a>
      <a id="przycisk-nowosci" class="przycisk" href="../index.html#nowosci" title="Co nowego — aktualizacje archiwum">✚ nowości</a>
      <a id="przycisk-kronika" class="przycisk ${aktywny === 'tom-1' ? 'aktywny' : ''}" href="kronika-tom-1.html" title="Kronika świata AME — tocząca się opowieść epok">📜 kronika</a>
      <button id="przycisk-motyw" class="przycisk przycisk-motyw" type="button" aria-pressed="false" title="Przełącz tryb ciemny/jasny" onclick="const m = document.documentElement.dataset.motyw === 'jasny' ? 'ciemny' : 'jasny'; document.documentElement.dataset.motyw = m; localStorage.setItem('ame:motyw', m); this.innerHTML = m === 'jasny' ? '☀ jasny' : '☾ ciemny'; this.setAttribute('aria-pressed', String(m === 'jasny'));">☾ motyw</button>
    </div>
  </header>
  <script>
    (function() {
      const m = localStorage.getItem('ame:motyw') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ciemny' : 'jasny');
      document.documentElement.dataset.motyw = m;
      const btn = document.getElementById('przycisk-motyw');
      if (btn) { btn.innerHTML = m === 'jasny' ? '☀ jasny' : '☾ ciemny'; btn.setAttribute('aria-pressed', String(m === 'jasny')); }
    })();
  </script>`;
}

/** Wspólne style CSS dla wszystkich stron Kroniki */
const KRONIKA_CSS = `
:root {
  --bg: #f5f0e6;
  --bg-subtle: #ede7db;
  --fg: #1d1916;
  --muted: #696257;
  --line: #dbd2c0;
  --card: #fffefb;
  --card-alt: #f8f4ec;
  --accent: #7a4a22;
  --accent-light: #9c6232;
  --accent-glow: rgba(122, 74, 34, 0.15);
  --mit: #347a4d;
  --mit-bg: #e5efe8;
  --rac: #435b8e;
  --rac-bg: #e5ebf7;
  --up: #347a4d;
  --down: #a83d29;
  --code: #efe9dc;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 16px/1.65 Georgia, "Times New Roman", serif;
  -webkit-font-smoothing: antialiased;
}
.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}
/* TOPBAR */
html[data-motyw="ciemny"] {
  --bg: #0d1015;
  --bg-subtle: #141922;
  --fg: #d8d2c4;
  --muted: #8b877c;
  --line: #2a3140;
  --card: #1b2230;
  --card-alt: #232c3c;
  --accent: #c9a86a;
  --accent-light: #e0ca9a;
  --accent-glow: rgba(201, 168, 106, 0.15);
  --mit: #5ab57a;
  --mit-bg: #22382c;
  --rac: #6ea3c2;
  --rac-bg: #23344a;
  --code: #161b24;
}

/* Zastąpione klasy .topbar z głównego menu */
.gora {
  display: flex; align-items: center; gap: 14px; padding: 10px 16px;
  background: var(--bg-subtle); border-bottom: 1px solid var(--line);
  margin: -24px -20px 40px -20px;
  flex-wrap: wrap;
}
.tytul { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; }
.tytul h1 { margin: 0; font-family: inherit; font-size: 22px; letter-spacing: 0.12em; color: var(--accent); }
.tytul h1 a { text-decoration: none; color: inherit; }
.tytul p { margin: 0; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted); }
#szukaj {
  flex: 1; min-width: 120px; max-width: 520px; padding: 8px 14px;
  border-radius: 999px; border: 1px solid var(--line);
  background: var(--card); color: var(--fg); font-size: 14px;
}
.akcje { display: flex; gap: 8px; flex-wrap: wrap; }
.przycisk {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 7px 12px; border-radius: 8px; border: 1px solid var(--line);
  background: var(--card); color: var(--fg); font-size: 13px;
  cursor: pointer; text-decoration: none;
}
.przycisk:hover { background: var(--card-alt); border-color: var(--accent-light); }
.przycisk.aktywny { border-color: var(--accent); color: var(--accent); }

@media (max-width: 900px) {
  .gora { flex-wrap: wrap; margin: -20px -20px 20px -20px; }
  #szukaj { order: 3; flex-basis: 100%; max-width: none; }
  .tytul p { display: none; }
}

/* HERO */
.hero {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 24px 28px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
}
.hero h1 {
  margin: 8px 0 8px;
  font-size: 30px;
  line-height: 1.25;
  color: var(--fg);
}
.hero .sub {
  color: var(--muted);
  font-size: 15px;
  margin: 0 0 16px;
  max-width: 840px;
}
.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--code);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--muted);
}
.badge.tom {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  font-weight: 600;
}
.badge.ok {
  color: var(--mit);
  border-color: rgba(52, 122, 77, 0.4);
  background: var(--mit-bg);
  font-weight: 600;
}

/* GAUGE */
.gauge-wrap {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}
.gauge-header {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 600;
  margin-bottom: 6px;
}
.gauge-header .g-mit { color: var(--mit); }
.gauge-header .g-rac { color: var(--rac); }
.gauge {
  position: relative;
  height: 16px;
  border-radius: 999px;
  background: #dbe3f0;
  border: 1px solid var(--line);
  overflow: hidden;
}
.gauge .mit-bar {
  height: 100%;
  background: linear-gradient(90deg, #2d6b43, #438f5d);
  transition: width .4s ease;
}

/* MAP CONTAINER */
.map-container {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
}
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  background: var(--card-alt);
  border-bottom: 1px solid var(--line);
  font-size: 12.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.map-title {
  font-weight: 600;
  color: var(--accent);
}
.map-hint {
  color: var(--muted);
}
.kronika-map {
  display: block;
  width: 100%;
  height: auto;
  max-height: 460px;
  background: #ede7db;
}
.kronika-map .land {
  fill: #ded6c4;
  stroke: #c5bba7;
  stroke-width: 1;
}
.kronika-map .arc-glow {
  fill: none;
  stroke: #c27c3a;
  stroke-width: 5;
  stroke-opacity: 0.35;
}
.kronika-map .arc-line {
  fill: none;
  stroke: #8d4f1f;
  stroke-width: 2;
  stroke-dasharray: 6,4;
}
.kronika-map .node {
  cursor: pointer;
}
.kronika-map .node .halo {
  fill: url(#grad-passive);
  pointer-events: none;
}
.kronika-map .node.active .halo {
  fill: url(#grad-active);
  animation: pulse-halo 3s infinite ease-in-out;
}
@keyframes pulse-halo {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
.kronika-map .pin-bg {
  fill: #fffdf8;
  stroke: #7a4a22;
  stroke-width: 2;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
  transition: r .2s ease;
}
.kronika-map .node.active .pin-bg {
  fill: #7a4a22;
  stroke: #fff;
}
.kronika-map .pin-icon {
  font-size: 13px;
  text-anchor: middle;
  dominant-baseline: central;
}
.kronika-map .pin-label {
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 600;
  fill: #1d1916;
  paint-order: stroke;
  stroke: #fffdf8;
  stroke-width: 3.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kronika-map .node:hover .pin-bg {
  stroke-width: 3;
}
.kronika-map .node:hover .pin-label {
  fill: var(--accent);
}

/* GRID & CARDS */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
@media(max-width: 860px) {
  .grid { grid-template-columns: 1fr; }
}
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px 22px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.card h2 {
  margin: 0 0 12px;
  font-size: 19px;
  border-left: 4px solid var(--accent);
  padding-left: 10px;
  color: var(--fg);
}
.card-sub {
  color: var(--muted);
  font-size: 13px;
  margin: -6px 0 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* PARTICIPANTS LIST */
.participants-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.part-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--card-alt);
  text-decoration: none;
  color: inherit;
  transition: all .15s ease;
}

.part-card:hover {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 3px 10px rgba(0,0,0,0.04);
}
.part-avatar {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--line);
}
.part-info {
  flex: 1;
}
.part-name {
  font-weight: 700;
  font-size: 15px;
  color: var(--fg);
}
.part-meta {
  font-size: 12px;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.part-fuel {
  font-size: 12.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 600;
  color: var(--accent);
  text-align: right;
}

/* DIALOG SKIT */
.skit-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.speech-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.speaker-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.speech-content {
  flex: 1;
}
.speaker-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 2px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.speech-didaskalia {
  font-size: 13px;
  font-style: italic;
  color: var(--muted);
  margin-bottom: 4px;
}
.speech-bubble {
  background: var(--card-alt);
  border: 1px solid var(--line);
  border-radius: 8px 12px 12px 12px;
  padding: 10px 14px;
  font-size: 15px;
  line-height: 1.55;
}
.verdict-box {
  background: #fdfaf3;
  border: 1px solid #d9c7a5;
  border-left: 4px solid #b87930;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 16px;
  font-size: 14.5px;
  line-height: 1.6;
}
.verdict-box b {
  color: #824f18;
  font-size: 12.5px;
  letter-spacing: 0.5px;
}

/* TABLES */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th, td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
th {
  font-size: 12px;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.num {
  font-variant-numeric: tabular-nums;
  text-align: right;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* CHIPS */
.chip {
  border: 1px solid var(--line);
  background: var(--code);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: inline-block;
  white-space: nowrap;
}
.chip.up { color: var(--up); border-color: rgba(52, 122, 77, 0.4); background: var(--mit-bg); font-weight: 600; }
.chip.down { color: var(--down); border-color: rgba(168, 61, 41, 0.4); background: #fbeae7; font-weight: 600; }
.chip.neutral { color: var(--muted); }

/* EPOKA CARDS (TOM) */
.epoka-card {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 14px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--card);
  color: inherit;
  text-decoration: none;
  margin-bottom: 12px;
  transition: all .15s ease;
}
.epoka-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
  transform: translateY(-1px);
}
.epoka-nr {
  font-weight: 700;
  color: var(--accent);
  font-size: 16px;
  text-align: center;
  border-right: 1px solid var(--line);
  padding-right: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.epoka-ttl {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 3px;
}
.epoka-meta {
  font-size: 12.5px;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.epoka-delta {
  font-size: 12px;
  margin-top: 6px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.epoka-go {
  font-size: 13px;
  color: var(--accent);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 600;
}

/* LISTS & HELPERS */
ul { margin: 0; padding-left: 20px; }
li { margin: 8px 0; }
.muted { color: var(--muted); font-size: 12.5px; }

/* PAGER */
.epoka-pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-top: 24px;
  border-top: 1px solid var(--line);
}
.pager-btn {
  color: var(--accent);
  text-decoration: none;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--card);
  transition: all .15s ease;
}
.pager-btn:hover {
  background: var(--code);
  border-color: var(--accent);
}

/* MODAL KARTOTEKI */
.panel {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(26, 23, 20, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 36px 16px 64px;
}
.panel.otwarty {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  animation: modal-fade-in 0.2s ease-out;
}
@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.warstwa-wpisu {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  max-width: 880px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  position: relative;
  overflow: hidden;
  animation: modal-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modal-slide-up {
  from { transform: translateY(24px) scale(0.98); }
  to { transform: translateY(0) scale(1); }
}
.akcje-kartoteki {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255, 254, 251, 0.94);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
  z-index: 20;
}
.tytul-modal-top {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.zamknij {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--card-alt);
  color: var(--fg);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s ease;
}
.zamknij:hover {
  background: #fbeae7;
  color: var(--down);
  border-color: var(--down);
}
.wpis {
  padding: 24px 28px 48px;
}
.naglowek-wpisu h2 {
  font-size: 30px;
  color: var(--accent);
  margin: 4px 0 6px;
}
.karta-inspiracja {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
}
.lokalizacja, .pochodzenie {
  font-size: 13.5px;
  color: var(--muted);
  margin: 4px 0;
}
.alt {
  font-style: italic;
  color: var(--muted);
  font-size: 13.5px;
  margin: 2px 0 8px;
}
.chipy {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}
.sekcja {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.sekcja h3 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin: 0 0 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.sekcja .numer {
  color: var(--accent);
  font-weight: 700;
}
.wpis img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line);
  display: block;
}
.natura dt, .trofea dt {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin-top: 12px;
  font-weight: 700;
}
.natura dd, .trofea dd {
  margin: 3px 0 0;
  font-size: 14.5px;
  line-height: 1.55;
}
.dokumentacja {
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.6;
}
.tabela-translacji {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  margin-top: 12px;
}
.tabela-translacji th, .tabela-translacji td {
  padding: 8px 10px;
  border: 1px solid var(--line);
  text-align: left;
}
.tabela-translacji th {
  background: var(--code);
  font-size: 11.5px;
}
.meta-wpisu {
  margin-top: 28px;
  font-size: 12px;
  color: var(--muted);
  border-top: 1px dashed var(--line);
  padding-top: 12px;
  text-align: right;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* FOOTER */
.foot {
  margin-top: 36px;
  font-size: 12.5px;
  color: var(--muted);
  border-top: 1px solid var(--line);
  padding-top: 16px;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`;

function generujSkryptKartoteki(manifestacjePelne, indeks) {
  const jsonManifestacje = JSON.stringify(manifestacjePelne || {});
  const jsonIndeks = JSON.stringify({
    manifestacje: indeks?.manifestacje || [],
    kanon: indeks?.kanon || {},
  });

  return `
<div id="panel-kartoteki" class="panel" role="dialog" aria-modal="true" tabindex="-1">
  <div class="warstwa-wpisu">
    <div class="akcje-kartoteki">
      <span class="tytul-modal-top">Kartoteka Manifestacji</span>
      <button class="zamknij" id="zamknij-kartoteke" type="button" aria-label="Zamknij (Esc)">✕</button>
    </div>
    <div id="tresc-kartoteki"></div>
  </div>
</div>

<script>
(function() {
  const BAZA = ${jsonManifestacje};
  const INDEKS = ${jsonIndeks};

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderWpis(w) {
    const alt = (w.nazwy_alternatywne && w.nazwy_alternatywne.length)
      ? '<p class="alt">znany też jako: ' + esc(w.nazwy_alternatywne.join(', ')) + '</p>'
      : '';
    const tagiKanonu = (INDEKS.kanon && INDEKS.kanon.tagi) ? INDEKS.kanon.tagi : [];
    const tagiHtml = (w.tagi || []).map(function(t) {
      const info = tagiKanonu.find(function(k) { return k.tag === t; });
      return '<span class="chip" title="' + esc(info ? info.opis : '') + '">#' + esc(t) + '</span>';
    }).join(' ');

    const naglowek = '<header class="naglowek-wpisu">' +
      '<p class="karta-inspiracja">inspiracja kartą <strong>' + esc((w.karta && w.karta.nazwa) || '?') + '</strong>' +
      (w.karta && w.karta.rok ? ' (' + esc(w.karta.rok) + ')' : '') + '</p>' +
      '<h2>' + esc(w.nazwa) + '</h2>' +
      alt +
      '<p class="lokalizacja">📍 ' + esc(w.lokalizacja.miejscowosc) + ', ' + esc(w.lokalizacja.kraj) +
      ' · ' + (w.lokalizacja.lat ? w.lokalizacja.lat.toFixed(2) : '') + '°, ' +
      (w.lokalizacja.lon ? w.lokalizacja.lon.toFixed(2) : '') + '°</p>' +
      '<p class="pochodzenie">' + esc(w.pochodzenie_i_kultura) + '</p>' +
      '<div class="chipy">' + tagiHtml + '</div>' +
      '</header>';

    const tabela = '<table class="tabela-translacji">' +
      '<thead><tr><th>Element karty</th><th>Translacja na byt</th></tr></thead>' +
      '<tbody>' + ((w.rezonans && w.rezonans.tabela) || []).map(function(r) {
        return '<tr><td>' + esc(r.element) + '</td><td>' + esc(r.translacja) + '</td></tr>';
      }).join('') + '</tbody></table>';

    const sekcjaV = '<section class="sekcja"><h3><span class="numer">V.</span> Rezonans i tożsamość</h3>' +
      '<p>' + esc((w.rezonans && w.rezonans.klucz_przywolania) || '') + '</p>' + tabela + '</section>';

    const sekcjaII = '<section class="sekcja"><h3><span class="numer">II.</span> Charakterystyka i natura</h3>' +
      '<dl class="natura">' +
      '<dt>Wygląd i aura</dt><dd>' + esc((w.natura && w.natura.wyglad_i_aura) || '') + '</dd>' +
      '<dt>Charakter i motywacje</dt><dd>' + esc((w.natura && w.natura.charakter_i_motywacje) || '') + '</dd>' +
      '<dt>Zdolności</dt><dd>' + esc((w.natura && w.natura.zdolnosci) || '') + '</dd>' +
      '<dt>Słabości i metody pokonania</dt><dd>' + esc((w.natura && w.natura.slabosci_i_metody_pokonania) || '') + '</dd>' +
      '<dt>Preferencje</dt><dd>' + esc((w.natura && w.natura.preferencje) || '') + '</dd>' +
      '</dl></section>';

    const typyDok = {
      zrodlo_pierwotne: 'źródło pierwotne',
      opracowanie_naukowe: 'opracowanie naukowe',
      katalog_muzealny: 'katalog muzealny',
      zrodlo_etnograficzne: 'źródło etnograficzne',
      zrodlo_archeologiczne: 'źródło archeologiczne',
      komentarz_filologiczny: 'komentarz filologiczny'
    };

    const dokList = ((w.dokumentacja) || []).map(function(d) {
      const t = typyDok[d.typ] || d.typ;
      const link = d.url ? ' <a href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">↗ źródło</a>' : '';
      return '<li><span class="typ" style="color:var(--muted)">' + esc(t) + '</span> — ' + esc(d.pozycja) + link + '</li>';
    }).join('');

    const sekcjaIII = '<section class="sekcja"><h3><span class="numer">III.</span> Dokumentacja (The Source Stack)</h3>' +
      '<ul class="dokumentacja">' + dokList + '</ul></section>';

    let obrazUrl = '';
    if (w.wizualizacja && w.wizualizacja.obraz) {
      obrazUrl = w.wizualizacja.obraz;
      if (!obrazUrl.startsWith('http') && !obrazUrl.startsWith('../')) {
        obrazUrl = '../' + obrazUrl;
      }
    }
    const obrazHtml = obrazUrl
      ? '<img src="' + esc(obrazUrl) + '" alt="Wizualizacja: ' + esc(w.nazwa) + '" loading="lazy">'
      : '<div class="brak-wizualizacji"><p>Wizualizacja nieodtworzona.</p></div>';

    const sekcjaI = '<section class="sekcja"><h3><span class="numer">I.</span> Wizualizacja</h3>' +
      obrazHtml +
      '<details class="prompt" style="margin-top:10px;background:var(--code);padding:10px 14px;border-radius:6px;border:1px solid var(--line);font-size:12.5px">' +
      '<summary style="cursor:pointer;font-weight:600;color:var(--accent)">Prompt generatora (21:9)</summary>' +
      '<pre style="white-space:pre-wrap;margin-top:8px;font-family:monospace;font-size:12px;color:var(--fg)">' + esc((w.wizualizacja && w.wizualizacja.prompt) || '') + '</pre>' +
      '</details></section>';

    const sekcjaIV = '<section class="sekcja"><h3><span class="numer">IV.</span> Trofea i dowody eliminacji</h3>' +
      '<dl class="trofea">' +
      '<dt>Trofeum pierwotne</dt><dd>' + esc((w.trofea && w.trofea.pierwotne) || '') + '</dd>' +
      ((w.trofea && w.trofea.wtorne) ? '<dt>Trofeum wtórne</dt><dd>' + esc(w.trofea.wtorne) + '</dd>' : '') +
      '</dl></section>';

    const metaHtml = w.meta ? '<div class="meta-wpisu">Protokół MFM v' + esc(w.meta.wersja_protokolu || '1.4') + ' · Rejestracja: ' + esc(w.meta.utworzono || '') + ' · Hash: ' + esc(w.meta.kod_weryfikacyjny || '') + '</div>' : '';

    return '<div class="wpis">' + naglowek + sekcjaI + sekcjaII + sekcjaIII + sekcjaIV + sekcjaV + metaHtml + '</div>';
  }

  function otworz(slug) {
    const m = BAZA[slug];
    if (!m) return;
    const panel = document.getElementById('panel-kartoteki');
    const tresc = document.getElementById('tresc-kartoteki');
    if (!panel || !tresc) return;
    tresc.innerHTML = renderWpis(m);
    panel.classList.add('otwarty');
    document.body.style.overflow = 'hidden';
  }

  function zamknij() {
    const panel = document.getElementById('panel-kartoteki');
    if (!panel) return;
    panel.classList.remove('otwarty');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a, [data-slug], .node, .otworz-kartoteke, .part-card');
    if (link) {
      const slug = link.getAttribute('data-slug') || (link.getAttribute('href') || '').replace(/^.*#/, '');
      if (slug && BAZA[slug]) {
        e.preventDefault();
        otworz(slug);
        return;
      }
    }
    if (e.target.id === 'zamknij-kartoteke' || e.target.closest('#zamknij-kartoteke') || e.target.id === 'panel-kartoteki') {
      e.preventDefault();
      zamknij();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') zamknij();
  });

  window.addEventListener('DOMContentLoaded', function() {
    const h = (window.location.hash || '').replace('#', '');
    if (h && BAZA[h]) {
      otworz(h);
    }
  });
})();
</script>`;
}

/** Statyczny raport pojedynczej epoki — generowany z danych, nie mockup. */
export function generujRaportHTML(dane) {
  const mit = dane.stanPo.os.mit;
  const rac = dane.stanPo.os.racjonalizacja;
  const razem = mit + rac;
  const width = razem ? Math.round((mit / razem) * 100) : 50;

  const uczestnicySlugi = dane.uczestnicy.map((u) => u.slug);

  // Karty uczestników z linkami do kartoteki
  const uczestnicyKarty = dane.uczestnicy
    .map((u) => {
      const emoji = getEmoji(u.slug);
      return `
      <a class="part-card otworz-kartoteke" href="#${esc(u.slug)}" data-slug="${esc(u.slug)}" title="Otwórz kartotekę bytu ${esc(u.nazwa)}">
        <div class="part-avatar">${emoji}</div>
        <div class="part-info">
          <div class="part-name">${esc(u.nazwa)}</div>
          <div class="part-meta">Rola: <b>${esc(u.rola || 'Uczestnik')}</b> · Paliwo: <b>${u.saldoPrzed} → ${u.saldoPo}</b></div>
        </div>
        <div class="part-fuel">
          ${u.zwrot ? `<span class="chip up">+${u.zwrot} zwrotu</span>` : `<span class="chip neutral">−${u.kosztUdzialu + u.kosztKlucza + u.boost}</span>`}
        </div>
      </a>`;
    })
    .join('');

  // Tabela bilansu paliwa
  const rows = dane.uczestnicy
    .map((u) => {
      const koszt = u.kosztUdzialu + u.kosztKlucza + u.boost;
      return `<tr>
        <td><strong><a href="#${esc(u.slug)}" class="otworz-kartoteke" data-slug="${esc(u.slug)}" style="color:inherit;text-decoration:none">${esc(u.nazwa)}</a></strong><br><span class="muted">${esc(u.slug)}</span></td>
        <td class="num">${u.pasywne}</td>
        <td class="num">${u.saldoPrzed}</td>
        <td class="num">−${koszt}</td>
        <td class="num">${u.zwrot ? `+${u.zwrot}` : '0'}</td>
        <td class="num"><b>${u.saldoPo}</b></td>
      </tr>`;
    })
    .join('');

  // Zasięgi
  const zasieg = (dane.konsekwencje.zasieg || [])
    .map((z) => {
      const delta = Math.round((z.po - z.przed) * 100);
      const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
      return `<li><strong><a href="#${esc(z.slug)}" class="otworz-kartoteke" data-slug="${esc(z.slug)}" style="color:inherit">${esc(z.slug)}</a></strong> — ${pct(z.przed)} → ${pct(z.po)}
        <span class="chip ${cls}">${delta > 0 ? '+' : ''}${delta} pp</span><br>
        <span class="muted">${esc(z.opis)}</span></li>`;
    })
    .join('');

  // Pozycje bytów
  const pozycje = (dane.konsekwencje.pozycje || [])
    .map(
      (p) =>
        `<li><strong><a href="#${esc(p.slug)}" class="otworz-kartoteke" data-slug="${esc(p.slug)}" style="color:inherit">${esc(p.slug)}</a></strong> — <em>${esc(p.status)}</em>.<br><span class="muted">${esc(p.opis)}</span></li>`
    )
    .join('');

  // Wątki
  const watki = (dane.konsekwencje.watki || [])
    .map(
      (w) =>
        `<li><strong>${esc(w.id)}</strong> <span class="chip ${w.stan === 'otwarty' ? 'up' : ''}">${w.stan}</span> — ${esc(w.opis)}</li>`
    )
    .join('');

  // Ocena narratora
  const oceny = (dane.narrator?.ocena || [])
    .map(
      (o) =>
        `<li><strong>${esc(o.kto)}</strong> → <strong>${esc(o.kogo)}</strong> ·
        <span class="chip">${o.stopien}/3</span> <em>${esc(o.kontekst)}</em><br>
        <span class="muted">${esc(o.komentarz)}</span></li>`
    )
    .join('');

  // Mapa SVG (tylko uczestnicy dla czystszego widoku)
  const mapaSvg = generujMapeSVG({
    manifestacje: dane.wszystkieManifestacje || [],
    uczestnicySlugi,
    zasiegi: dane.konsekwencje.zasieg || [],
    landD: dane.landD || '',
    tytul: `Teatr działań: ${dane.tytulEpoki}`,
    tylkoUczestnicy: true,
  });

  // Dialog SKITu
  const dialogHtml = formatujDialogHTML(dane.skitTekst);

  // Nawigacja między epokami
  const epokaNr = parseInt(dane.slug.replace('epoka-', ''), 10) || 1;
  const liczbaEpok = dane.liczbaEpok || 5;
  const prevEpoka = epokaNr > 1 ? `kronika-epoka-${epokaNr - 1}.html` : null;
  const nextEpoka = epokaNr < liczbaEpok ? `kronika-epoka-${epokaNr + 1}.html` : null;

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kronika — ${esc(dane.tytulEpoki)}</title>
<style>${KRONIKA_CSS}</style>
</head>
<body><div class="wrap">
${generujTopbarHTML('kronika')}

<div class="hero">
  <div class="badges">
    <span class="badge tom">Tom I: Trzy Stoły</span>
    <span class="badge">Raport: ${esc(dane.slug)}</span>
    <span class="badge ok">Kanon zarejestrowany</span>
    <span class="badge">Skit: ${esc(dane.skit)}</span>
  </div>
  <h1>${esc(dane.tytulEpoki)}</h1>
  <p class="sub">${esc(dane.tytulTomu)} — spotkanie i przesunięcie wpływów zapisane w archiwum.</p>
  
  <div class="gauge-wrap">
    <div class="gauge-header">
      <span class="g-mit">MIT ${mit}%</span>
      <span class="g-rac">RACJONALIZACJA ${rac}%</span>
    </div>
    <div class="gauge">
      <div class="mit-bar" style="width:${width}%"></div>
    </div>
  </div>
</div>

<!-- MAPA WEKTOROWA EPOKI -->
${mapaSvg}

<div class="grid">
  <div class="col">
    <!-- UCZESTNICY -->
    <div class="card">
      <h2>Uczestnicy epoki</h2>
      <div class="card-sub">Byty wciągnięte w wir wydarzeń i ich role dramatyczne.</div>
      <div class="participants-grid">
        ${uczestnicyKarty}
      </div>
    </div>

    <!-- ZAPIS DIALOGU -->
    <div class="card">
      <h2>Zapis rozmowy: ${esc(dane.skitTytul || dane.tytulEpoki)}</h2>
      <div class="card-sub">Baza Skitów: <b>${esc(dane.skit)}</b> · Oficjalny zapis dialogu zarejestrowany w archiwum.</div>
      ${dialogHtml}
      ${dane.narrator?.podsumowanie ? `<div class="verdict-box"><b>WERDYKT KRONIKARZA:</b> ${esc(dane.narrator.podsumowanie)}</div>` : ''}
    </div>

    <!-- BILANS ZASOBÓW -->
    <div class="card">
      <h2>Bilans zasobów i pamięci</h2>
      <div class="card-sub">Udział w epoce wymaga nakładu energii; bilans zostaje wyrównany przez realną ekspansję wpływów.</div>
      <table>
        <thead>
          <tr>
            <th>Byt</th>
            <th class="num">Pasywne</th>
            <th class="num">Start</th>
            <th class="num">Koszt</th>
            <th class="num">Zwrot</th>
            <th class="num">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="col">
    <!-- KONSEKWENCJE DLA ŚWIATA -->
    <div class="card">
      <h2>Konsekwencje dla świata</h2>
      <div class="card-sub">Przesunięcia wierzeń i zasięgów kulturowych w wyniku epoki.</div>
      <ul>${zasieg}</ul>
    </div>

    <!-- POZYCJE I STATUSY -->
    <div class="card">
      <h2>Stan i statusy bytów</h2>
      <div class="card-sub">Zmiany kondycji ontologicznej uczestników.</div>
      <ul>${pozycje}</ul>
    </div>

    <!-- WĄTKI FABULARNE -->
    <div class="card">
      <h2>Wątki fabularne</h2>
      <div class="card-sub">Wątki otwarte zasilają kolejne epoki; zamknięte pieczętują losy.</div>
      <ul>${watki}</ul>
    </div>

    <!-- OCENA NARRATORA -->
    <div class="card">
      <h2>Retoryka i słabości</h2>
      <div class="card-sub">Kto i jak wykorzystał prastare pęknięcia w naturze rywala.</div>
      <ul>${oceny}</ul>
    </div>
  </div>
</div>

<div class="epoka-pager">
  ${prevEpoka ? `<a class="pager-btn" href="${prevEpoka}">← Poprzednia epoka</a>` : `<span></span>`}
  <a class="pager-btn" href="kronika-tom-1.html">📜 Spis Tomu I</a>
  ${nextEpoka ? `<a class="pager-btn" href="${nextEpoka}">Następna epoka →</a>` : `<span></span>`}
</div>

<div class="foot">
  Archiwum Manifestacji Eterycznych · Kronika Tomu I · Rekordy zsynchronizowane
</div>

</div>

${generujSkryptKartoteki(dane.manifestacjePelne, dane.indeks)}

</body></html>
`;
}

/** Raport strony głównej Tomu — generowany z summary, nie mockup. */
export function generujRaportTomuHTML(podsumowanie, indeks, landD = '', manifestacjePelne = {}) {
  const s = podsumowanie;
  const mit = s.stanPo.os.mit;
  const rac = s.stanPo.os.racjonalizacja;
  const width = Math.round((mit / (mit + rac)) * 100);

  const nazwy = new Map();
  const epoki = new Map();
  for (const e of s.epoki) {
    epoki.set(e.slug, e);
    for (const u of e.uczestnicy || []) nazwy.set(u.slug, u.nazwa);
  }

  const manifestacje = indeks?.manifestacje || [];

  // Karty poszczególnych epok
  const kartyEpok = s.epoki
    .map((e) => {
      const nrRzymski = rzymskie(parseInt(e.slug.replace('epoka-', ''), 10) || 1);
      const delty = (e.konsekwencje.zasieg || [])
        .map((z) => {
          const d = Math.round((z.po - z.przed) * 100);
          const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'neutral';
          return `<span class="chip ${cls}">${esc(z.slug)} ${d > 0 ? '+' : ''}${d} pp</span>`;
        })
        .join(' ');

      const uczestnicyIkony = (e.uczestnicy || []).map((u) => getEmoji(u.slug)).join(' ');

      return `
      <a class="epoka-card" href="kronika-${e.slug}.html">
        <div class="epoka-nr">Epoka<br>${nrRzymski}</div>
        <div>
          <div class="epoka-ttl">${esc(e.tytul)} <span class="chip ${e.walidacja ? 'up' : 'down'}">${e.walidacja ? 'OK' : 'Błąd'}</span></div>
          <div class="epoka-meta">Uczestnicy: ${uczestnicyIkony} · Oś: MIT ${e.stanPo.os.mit}% / RAC ${e.stanPo.os.racjonalizacja}%</div>
          <div class="epoka-delta">${delty}</div>
        </div>
        <div class="epoka-go">Raport ↗</div>
      </a>`;
    })
    .join('');

  const watkiStan = new Map();
  for (const e of s.epoki) {
    for (const w of e.konsekwencje?.watki || []) watkiStan.set(w.id, { ...w, epoka: e.slug });
  }
  const otwarte = [...watkiStan.values()]
    .filter((w) => w.stan === 'otwarty')
    .map((w) => `<li><span class="chip up">Otwarte</span> <strong>${esc(w.id)}</strong> — ${esc(w.opis)} <span class="muted">[${esc(w.epoka)}]</span></li>`)
    .join('');
  const zamkniete = [...watkiStan.values()]
    .filter((w) => w.stan === 'zamkniety')
    .map((w) => `<li><span class="chip neutral">Zamknięte</span> <strong>${esc(w.id)}</strong> — ${esc(w.opis)} <span class="muted">[${esc(w.epoka)}]</span></li>`)
    .join('');

  // Byty i zasoby
  const byty = [...nazwy.keys()].map((slug) => {
    const zas = (s.stanPo.zasieg || []).find((z) => z.slug === slug);
    const paliwo = s.stanPo.paliwo?.[slug];
    const dominacja = (s.stanPo.dominacje || []).find((d) => d.kult === slug);
    const emoji = getEmoji(slug);
    return `<li>
      <strong>${emoji} <a href="#${esc(slug)}" class="otworz-kartoteke" data-slug="${esc(slug)}" style="color:inherit">${esc(nazwy.get(slug))}</a></strong> <span class="muted">[${slug}]</span> —
      paliwo <b>${paliwo ?? '—'}</b> · zasięg <b>${pct(zas?.wielkosc)}</b>${dominacja ? ` · dominacja kulturowa ${pct(dominacja.wielkosc)}` : ''}
    </li>`;
  }).join('');

  // Tabela podsumowania epok
  const ledger = s.epoki
    .map(
      (e) =>
        `<tr>
          <td><a href="kronika-${e.slug}.html" style="color:var(--accent);font-weight:600">${esc(e.slug.toUpperCase())}</a></td>
          <td>${esc(e.tytul)}</td>
          <td class="num">${(e.uczestnicy || []).map((u) => `${esc(u.slug)} <b>${u.saldoPo}</b>`).join(', ')}</td>
        </tr>`
    )
    .join('');

  // Globalna mapa SVG Tomu (tylko byty biorące udział w Tomie I)
  const mapaSvg = generujMapeSVG({
    manifestacje,
    uczestnicySlugi: [...nazwy.keys()],
    zasiegi: s.stanPo.zasieg || [],
    landD,
    tytul: 'Globalna sieć wpływów po Tomie I (Teatr działań)',
    tylkoUczestnicy: true,
  });

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kronika — ${esc(s.tytulTomu)}</title>
<style>${KRONIKA_CSS}</style>
</head>
<body><div class="wrap">
${generujTopbarHTML('tom-1')}

<div class="hero">
  <div class="badges">
    <span class="badge tom">Tom I</span>
    <span class="badge ok">${s.epoki.length} epok zamkniętych</span>
    <span class="badge">Oś stabilna: MIT ${mit}% / RAC ${rac}%</span>
  </div>
  <h1>${esc(s.tytulTomu)}</h1>
  <p class="sub">Oficjalna księga Tomu I Kroniki. Zapis starć, układów gościnności i przesunięć granicy między mitem a racjonalizacją.</p>
  
  <div class="gauge-wrap">
    <div class="gauge-header">
      <span class="g-mit">MIT ${mit}%</span>
      <span class="g-rac">RACJONALIZACJA ${rac}%</span>
    </div>
    <div class="gauge">
      <div class="mit-bar" style="width:${width}%"></div>
    </div>
  </div>
</div>

<!-- GLOBALNA MAPA TOMU I -->
${mapaSvg}

<div class="grid">
  <div class="col">
    <!-- CHRONOLOGIA EPOK -->
    <div class="card">
      <h2>Chronologia epok</h2>
      <div class="card-sub">Raporty kolejnych spotkań bytów i ich skutki dla świata.</div>
      ${kartyEpok}
    </div>

    <!-- WĄTKI FABULARNE -->
    <div class="card">
      <h2>Stan wątków fabularnych</h2>
      <div class="card-sub">Otwarte iskry na przyszłość oraz wątki domknięte w Tomie I.</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:0">
        <div>
          <h3 style="font-size:15px;margin:0 0 8px;color:var(--up)">Otwarte</h3>
          <ul>${otwarte || '<li class="muted">Brak otwartych wątków</li>'}</ul>
        </div>
        <div>
          <h3 style="font-size:15px;margin:0 0 8px;color:var(--muted)">Zamknięte</h3>
          <ul>${zamkniete || '<li class="muted">Brak</li>'}</ul>
        </div>
      </div>
    </div>
  </div>

  <div class="col">
    <!-- BYTY I PALIWO -->
    <div class="card">
      <h2>Uczestnicy i stan pamięci</h2>
      <div class="card-sub">Paliwo zgromadzone w archiwum oraz zasięg wpływów po ${s.epoki.length} epokach.</div>
      <ul>${byty}</ul>
    </div>

    <!-- BILANS ZASOBÓW CAŁEGO TOMU -->
    <div class="card">
      <h2>Bilans zasobów i pamięci epok</h2>
      <div class="card-sub">Bilans punktów paliwa na zakończenie poszczególnych epok.</div>
      <table>
        <thead>
          <tr>
            <th>Epoka</th>
            <th>Tytuł</th>
            <th class="num">Salda końcowe</th>
          </tr>
        </thead>
        <tbody>
          ${ledger}
        </tbody>
      </table>
    </div>
  </div>
</div>

<div class="foot">
  Archiwum Manifestacji Eterycznych · Tom I: Kronika Trzech Stołów · System zsynchronizowany
</div>

</div>

${generujSkryptKartoteki(manifestacjePelne, indeks)}

</body></html>
`;
}

async function wczytajJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function wczytajEpoki() {
  const pliki = (await readdir(KATALOG_KRONIKA)).filter((f) => /^epoka-\d+\.json$/.test(f)).sort();
  return Promise.all(pliki.map((f) => wczytajJson(join(KATALOG_KRONIKA, f))));
}

async function main() {
  if (process.argv.includes('--seed')) {
    const [tom, indeks, kanon] = await Promise.all([
      wczytajJson(PLIK_TOM_1),
      wczytajJson(PLIK_INDEKSU),
      wczytajJson(PLIK_KANONU),
    ]);
    const stanStart = kalibrujStanStart(indeks, kanon);
    const nowyTom = {
      ...tom,
      stanStart,
      metryka: {
        ...(tom.metryka || {}),
        seedKalibracja: 'tools/kronika.mjs --seed',
        seedWzor:
          'obecnosc = 2*backlinki + tagi_kanonu + 2*skity + min(3,powiazania); ' +
          'zasieg = 0.10 + 0.40*(obecnosc/max); os = srednia(zasiegow) → mit%',
      },
    };
    await writeFile(PLIK_TOM_1, JSON.stringify(nowyTom, null, 2) + '\n');
    console.log(
      `Kalibracja seedów OK: os mit ${stanStart.os.mit} / rac ${stanStart.os.racjonalizacja}, bytów ${stanStart.zasieg.length}.`
    );
    return;
  }

  const check = process.argv.includes('--check');
  const [tom, epoki, indeks, kanon, landD] = await Promise.all([
    wczytajJson(PLIK_TOM_1),
    wczytajEpoki(),
    wczytajJson(PLIK_INDEKSU),
    wczytajJson(PLIK_KANONU),
    pobierzSciezkeLadow(),
  ]);

  if (epoki.length === 0) {
    console.error('Kronika: brak epok w data/kronika — epoka-1.json...');
    process.exit(1);
  }

  // Wczytaj pełne teksty i tytuły skitów
  const skityMap = new Map();
  for (const e of epoki) {
    if (e.skit) {
      try {
        const skitData = await wczytajJson(join(ROOT, 'data', 'skity', `${e.skit}.json`));
        skityMap.set(e.skit, {
          tekst: skitData.tekst || '',
          tytul: skitData.tytul || '',
        });
      } catch (err) {
        skityMap.set(e.skit, { tekst: '', tytul: '' });
      }
    }
  }

  // Wczytaj pełne pliki kartotek manifestacji
  const manifestacjePelne = {};
  try {
    const plikiManifestacji = (await readdir(KATALOG_MANIFESTACJI)).filter((f) => f.endsWith('.json'));
    plikiManifestacji.sort();
    for (const f of plikiManifestacji) {
      const slug = f.replace('.json', '');
      try {
        const mData = await wczytajJson(join(KATALOG_MANIFESTACJI, f));
        manifestacjePelne[slug] = mData;
      } catch (err) {
        // ignore
      }
    }
  } catch (err) {
    // ignore
  }

  const podsumowanie = zbudujPodsumowanieTomu({ tom, epoki, indeks, kanon });
  const raportTomu = generujRaportTomuHTML(podsumowanie, indeks, landD, manifestacjePelne);
  const raporty = podsumowanie.epoki.map((e) => {
    const skitInfo = skityMap.get(e.skit) || { tekst: '', tytul: '' };
    return {
      slug: e.slug,
      html: generujRaportHTML({
        tom: podsumowanie.tom,
        tytulTomu: podsumowanie.tytulTomu,
        slug: e.slug,
        tytulEpoki: e.tytul,
        skit: e.skit,
        skitTekst: skitInfo.tekst,
        skitTytul: skitInfo.tytul,
        uczestnicy: e.uczestnicy,
        stanPo: e.stanPo,
        konsekwencje: e.konsekwencje,
        narrator: e.narrator,
        wszystkieManifestacje: indeks.manifestacje || [],
        landD,
        manifestacjePelne,
        indeks,
        liczbaEpok: podsumowanie.epoki.length,
      }),
    };
  });

  if (check) {
    const istniejacy = await readFile(PLIK_PODSUMOWANIA, 'utf8').catch(() => null);
    const oczekiwany = JSON.stringify(podsumowanie, null, 2) + '\n';
    if (!istniejacy) {
      console.error('Kronika: brak data/kronika/summary.json — uruchom npm run kronika.');
      process.exit(1);
    }
    if (istniejacy !== oczekiwany) {
      console.error('Kronika: summary.json jest nieaktualny — uruchom npm run kronika.');
      process.exit(1);
    }
    for (const r of raporty) {
      const istniejacyRaport = await readFile(plikRaportu(r.slug), 'utf8').catch(() => null);
      if (!istniejacyRaport) {
        console.error(`Kronika: brak docs/kronika-${r.slug}.html — uruchom npm run kronika.`);
        process.exit(1);
      }
      if (istniejacyRaport !== r.html) {
        console.error(`Kronika: docs/kronika-${r.slug}.html jest nieaktualny — uruchom npm run kronika.`);
        process.exit(1);
      }
    }
    const istniejacyTom = await readFile(PLIK_RAPORTU_TOMU, 'utf8').catch(() => null);
    if (!istniejacyTom) {
      console.error('Kronika: brak docs/kronika-tom-1.html — uruchom npm run kronika.');
      process.exit(1);
    }
    if (istniejacyTom !== raportTomu) {
      console.error('Kronika: docs/kronika-tom-1.html jest nieaktualny — uruchom npm run kronika.');
      process.exit(1);
    }
  } else {
    await Promise.all([
      writeFile(PLIK_PODSUMOWANIA, JSON.stringify(podsumowanie, null, 2) + '\n'),
      writeFile(PLIK_RAPORTU_TOMU, raportTomu),
      ...raporty.map((r) => writeFile(plikRaportu(r.slug), r.html)),
    ]);
  }

  if (!podsumowanie.walidacja) {
    console.error('Kronika: walidacja NIEPRZESZŁA');
    for (const b of podsumowanie.bledy) console.error('  -', b);
    process.exit(1);
  }

  console.log(`Kronika OK: ${podsumowanie.tytulTomu}`);
  console.log(`  osy: MIT ${podsumowanie.stanPo.os.mit} / RACJONALIZACJA ${podsumowanie.stanPo.os.racjonalizacja} (razem ${podsumowanie.stanPo.os.mit + podsumowanie.stanPo.os.racjonalizacja})`);
  for (const e of podsumowanie.epoki) {
    console.log(`  ${e.slug}: ${e.tytul}  →  mit ${e.stanPo.os.mit} / rac ${e.stanPo.os.racjonalizacja}`);
    for (const u of e.uczestnicy) {
      console.log(
        `      ${String(u.slug).padEnd(28)} ${String(u.saldoPrzed).padStart(4)} -> koszt ${String(
          u.kosztUdzialu + u.kosztKlucza + u.boost
        ).padStart(3)} (+${u.zwrot}) -> ${String(u.saldoPo).padStart(4)}`
      );
    }
  }
  if (check) console.log('  (tryb --check, bez zapisu)');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  });
}
