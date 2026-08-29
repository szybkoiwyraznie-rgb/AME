#!/usr/bin/env node
/**
 * tools/kronika.mjs — mechanika Kroniki: budżet paliwa + konsekwencje epok Tomu.
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
import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const KATALOG_KRONIKA = join(ROOT, 'data', 'kronika');
export const PLIK_TOM_1 = join(KATALOG_KRONIKA, 'tom-1.json');
export const PLIK_EPOKA_1 = join(KATALOG_KRONIKA, 'epoka-1.json');
export const PLIK_EPOKA_2 = join(KATALOG_KRONIKA, 'epoka-2.json');
export const PLIK_PODSUMOWANIA = join(KATALOG_KRONIKA, 'summary.json');
export const PLIK_INDEKSU = join(ROOT, 'data', 'index.json');
export const PLIK_KANONU = join(ROOT, 'data', 'kanon-tagow.json');

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

/** Przelicza jedną epokę względem bieżącego stanu świata. */
export function przeliczEpoke({ tom, epoka, indeks, kanon, stan }) {
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

  const uzyteSlugi = new Set();
  for (const row of konsekwencje.zasieg || []) {
    uzyteSlugi.add(row.slug);
    const przed = wielkoscZasiegu(stanBiezacy, row.slug);
    if (przed === null) blad(bledy, `zasięg: brak „${row.slug}” w stanie bieżącym`);
    else if (Math.abs((przed ?? 0) - row.przed) > 1e-9) {
      blad(bledy, `zasięg: „${row.slug}” przed ${row.przed} != stan ${przed}`);
    }
    if (row.po < 0) blad(bledy, `zasięg: „${row.slug}” po < 0`);
    const cel = stanPo.zasieg.find((z) => z.slug === row.slug);
    if (cel) cel.wielkosc = row.po;
  }

  for (const row of konsekwencje.dominacje || []) {
    const przed = wielkoscDominacji(stanBiezacy, row.kultura, row.kult);
    if (przed === null) blad(bledy, `dominacja: brak „${row.kultura}/${row.kult}” w stanie bieżącym`);
    else if (Math.abs((przed ?? 0) - row.przed) > 1e-9) {
      blad(bledy, `dominacja: „${row.kultura}/${row.kult}” przed ${row.przed} != stan ${przed}`);
    }
    if (row.po < 0) blad(bledy, `dominacja: „${row.kultura}/${row.kult}” po < 0`);
    const cel = stanPo.dominacje.find((d) => d.kultura === row.kultura && d.kult === row.kult);
    if (cel) cel.wielkosc = row.po;
  }

  for (const u of uczestnicy) {
    if (!u) continue;
    const delta = (() => {
      const row = (konsekwencje.zasieg || []).find((r) => r.slug === u.slug);
      return row ? row.po - row.przed : 0;
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
    konsekwencje,
    narrator: epoka.narrator || null,
    skit: skit ? skit.slug : null,
  };
}

/** Przelicza wszystkie epoki Tomu sekwencyjnie: stanPo poprzedniej → stan wejściowy. */
export function przeliczTom({ tom, epoki, indeks, kanon }) {
  let stan = klonuj(tom.stanStart);
  const wyniki = [];
  const bledy = [];
  for (const epoka of epoki) {
    const w = przeliczEpoke({ tom, epoka, indeks, kanon, stan });
    wyniki.push({ ...w, slug: epoka.slug, tytul: epoka.tytul });
    if (!w.ok) {
      for (const b of w.bledy) blad(bledy, `${epoka.slug}: ${b}`);
    } else {
      stan = w.stanPo;
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

/** Statyczny raport pojedynczej epoki — generowany z danych, nie mockup. */
export function generujRaportHTML(dane) {
  const mit = dane.stanPo.os.mit;
  const rac = dane.stanPo.os.racjonalizacja;
  const razem = mit + rac;
  const rows = dane.uczestnicy
    .map((u) => {
      const koszt = u.kosztUdzialu + u.kosztKlucza + u.boost;
      return `<tr>
        <td><strong>${esc(u.nazwa)}</strong><br><span class="muted">${esc(u.slug)}</span></td>
        <td class="num">${u.pasywne}</td>
        <td class="num">${u.saldoPrzed}</td>
        <td class="num">−${koszt}</td>
        <td class="num">${u.zwrot ? `+${u.zwrot}` : '0'}</td>
        <td class="num"><b>${u.saldoPo}</b></td>
      </tr>`;
    })
    .join('');

  const zasieg = (dane.konsekwencje.zasieg || [])
    .map((z) => {
      const delta = Math.round((z.po - z.przed) * 100);
      const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
      return `<li><strong>${esc(z.slug)}</strong> — ${pct(z.przed)} → ${pct(z.po)}
        <span class="chip ${cls}">${delta > 0 ? '+' : ''}${delta} pp</span><br>
        <span class="muted">${esc(z.opis)}</span></li>`;
    })
    .join('');

  const pozycje = (dane.konsekwencje.pozycje || [])
    .map(
      (p) =>
        `<li><strong>${esc(p.slug)}</strong> — <em>${esc(p.status)}</em>.<br><span class="muted">${esc(p.opis)}</span></li>`
    )
    .join('');

  const watki = (dane.konsekwencje.watki || [])
    .map(
      (w) =>
        `<li><strong>${esc(w.id)}</strong> <span class="chip ${w.stan === 'otwarty' ? 'up' : ''}">${w.stan}</span> — ${esc(w.opis)}</li>`
    )
    .join('');

  const oceny = (dane.narrator?.ocena || [])
    .map(
      (o) =>
        `<li><strong>${esc(o.kto)}</strong> → <strong>${esc(o.kogo)}</strong> ·
        <span class="chip">${o.stopien}/3</span> <em>${esc(o.kontekst)}</em><br>
        <span class="muted">${esc(o.komentarz)}</span></li>`
    )
    .join('');

  const width = razem ? Math.round((mit / razem) * 100) : 50;

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kronika — ${esc(dane.tytulEpoki)} (wynik działania mechanizmu)</title>
<style>
:root{--bg:#f7f3ea;--fg:#1e1a16;--muted:#6b655c;--line:#ded4c2;--card:#fffdf8;--accent:#7a4a22;--accent2:#a5652f;--mit:#3e7d54;--rac:#51689a;--up:#3e7d54;--down:#a3442e;--code:#f1eadc}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Georgia,serif}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 80px}.topbar{display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--accent);padding-bottom:12px;margin-bottom:18px}
.brand{font-weight:700;font-size:19px}.brand .dot{color:var(--accent)}.topbar a{color:var(--accent);margin-left:auto;font-size:13px}
.hero{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 24px;margin-bottom:22px}
.hero h1{margin:0 0 6px;font-size:28px}.hero .sub{color:var(--muted);font-size:14px}.badges{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.badge{font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--code)}
.badge.tom{background:var(--accent);color:#fff;border-color:var(--accent)}.badge.ok{color:#3e7d54;border-color:#3e7d54}
.gauge{position:relative;height:18px;border-radius:999px;background:linear-gradient(90deg,#cfe0d2,#f0f0f0,#ccd4e8);border:1px solid var(--line);overflow:hidden;margin-top:8px}
.gauge .mit{height:100%;background:linear-gradient(90deg,#3e7d54,#6fae85)}
.gauge .l{position:absolute;top:0;font-size:11px;color:#fff;text-shadow:0 1px 2px #0007}.gauge .lm{left:10px}.gauge .lr{right:10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.col{display:flex;flex-direction:column;gap:20px}@media(max-width:800px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
.card h2{margin:0 0 12px;font-size:18px;border-left:4px solid var(--accent);padding-left:10px}
.note{color:var(--muted);font-size:13px;margin:0 0 12px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:7px 9px;text-align:left;border-bottom:1px solid var(--line)}
th{font-size:12px;color:var(--muted)}.num{font-variant-numeric:tabular-nums;text-align:right}
.chip{border:1px solid var(--line);background:var(--code);border-radius:999px;padding:1px 8px;font-size:12px}
.chip.up{color:#3e7d54;border-color:#3e7d54}.chip.down{color:#a3442e;border-color:#a3442e}.chip.neutral{color:#6b655c}
.muted{color:var(--muted);font-size:12px}.up{color:#3e7d54}.down{color:#a3442e}ul{margin:0;padding-left:20px}li{margin:7px 0}
.foot{margin-top:22px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px}
code{background:var(--code);padding:1px 6px;border-radius:5px}
</style>
</head>
<body><div class="wrap">
<header class="topbar"><div class="brand">AME<span class="dot">.</span> KRONIKA</div><a href="kronika-glowna-podglad.html">← strona główna Tomu (mockup)</a></header>

<div class="hero">
  <div class="badges"><span class="badge tom">${esc(dane.tom)}</span><span class="badge">epoka: ${esc(dane.slug)}</span><span class="badge ok">mechanizm: OK</span><span class="badge">skit: ${esc(dane.skit)}</span></div>
  <h1>${esc(dane.tytulEpoki)}</h1>
  <p class="sub">${esc(dane.tytulTomu)} — epoka uruchomiona na działającym mechanizmie Kroniki.</p>
  <div class="gauge"><div class="mit" style="width:${width}%"></div><span class="l lm">MIT ${mit}</span><span class="l lr">RACJONALIZACJA ${rac}</span></div>
</div>

<div class="grid">
  <div class="col">
    <div class="card"><h2>Ledger paliwa</h2><p class="note">Udział kosztuje; zwrot tylko za realną zmianę zasięgu.</p>
      <table><tr><th>Byty</th><th class="num">pasywne</th><th class="num">start</th><th class="num">koszt</th><th class="num">zwrot</th><th class="num">saldo</th></tr>${rows}</table>
    </div>
    <div class="card"><h2>Pozycje bytów</h2><p class="note">Stan po epoce.</p><ul>${pozycje}</ul></div>
    <div class="card"><h2>Wątki</h2><p class="note">Zamknięte domykają linię; otwarte dają paliwo kolejnym epokom.</p><ul>${watki}</ul></div>
  </div>
  <div class="col">
    <div class="card"><h2>Konsekwencje dla świata</h2><p class="note">Zasięg wierzeń; oś dusz pozostaje zamknięta (mit + racjonalizacja = 100).</p><ul>${zasieg}</ul></div>
    <div class="card"><h2>Ocena narratora (bez mechanicznego „exploitu”)</h2><p class="note">Stopień 0–3 mówi, jak bardzo działania/słowa jednego bytu wykorzystywały w retoryce słabości drugiego.</p><ul>${oceny}</ul>
      <p class="note" style="margin-top:10px">${esc(dane.narrator?.podsumowanie || '')}</p>
    </div>
  </div>
</div>

<div class="foot">Wygenerowano z <code>data/kronika/summary.json</code> przez <code>npm run kronika</code> · mechanizm: <code>tools/kronika.mjs</code> · P12–P17 wg <code>docs/KRONIKA_tryb.md</code> §20–§21 · Rozstaje pozostają pomysłem.</div>
</div></body></html>
`;
}

/** Raport strony głównej Tomu — generowany z summary, nie mockup. */
export function generujRaportTomuHTML(podsumowanie) {
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

  const dominacje = (s.stanPo.dominacje || [])
    .map((d) => `${d.kultura}/${d.kult} ${pct(d.wielkosc)}`)
    .join(' · ');

  const kartyEpok = s.epoki
    .map((e) => {
      const delty = (e.konsekwencje.zasieg || [])
        .map((z) => {
          const d = Math.round((z.po - z.przed) * 100);
          const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'neutral';
          return `<span class="chip ${cls}">${esc(z.slug)} ${d > 0 ? '+' : ''}${d} pp</span>`;
        })
        .join(' ');
      return `<a class="epoka" href="kronika-${e.slug}.html">
        <div class="nr">${esc(e.slug.replace('epoka-', '').toUpperCase())}</div>
        <div>
          <div class="ttl">${esc(e.tytul)} <span class="chip ${e.walidacja ? 'up' : 'down'}">${e.walidacja ? 'ok' : 'błąd'}</span></div>
          <div class="meta">skit: ${esc(e.skit)} · mit ${e.stanPo.os.mit} / rac ${e.stanPo.os.racjonalizacja}</div>
          <div class="delta">${delty}</div>
        </div>
        <span class="go">raport ↗</span>
      </a>`;
    })
    .join('');

  const watkiStan = new Map();
  for (const e of s.epoki) {
    for (const w of e.konsekwencje?.watki || []) watkiStan.set(w.id, { ...w, epoka: e.slug });
  }
  const otwarte = [...watkiStan.values()]
    .filter((w) => w.stan === 'otwarty')
    .map((w) => `<li><span class="st ot">otw</span> <strong>${esc(w.id)}</strong> — ${esc(w.opis)} <span class="muted">[${esc(w.epoka)}]</span></li>`)
    .join('');
  const zamkniete = [...watkiStan.values()]
    .filter((w) => w.stan === 'zamkniety')
    .map((w) => `<li><span class="st zam">zam</span> <strong>${esc(w.id)}</strong> — ${esc(w.opis)} <span class="muted">[${esc(w.epoka)}]</span></li>`)
    .join('');

  const byty = [...nazwy.keys()].map((slug) => {
    const zas = (s.stanPo.zasieg || []).find((z) => z.slug === slug);
    const paliwo = s.stanPo.paliwo?.[slug];
    const dominacja = (s.stanPo.dominacje || []).find((d) => d.kult === slug);
    return `<li><strong>${esc(nazwy.get(slug))}</strong> <span class="muted">[${slug}]</span> —
      paliwo <b>${paliwo ?? '—'}</b> · zasięg ${pct(zas?.wielkosc)}${dominacja ? ` · dom. ${pct(dominacja.wielkosc)}` : ''}</li>`;
  }).join('');

  const ledger = s.epoki
    .map(
      (e) =>
        `<tr><td><a href="kronika-${e.slug}.html">${esc(e.slug)}</a></td><td>${esc(e.tytul)}</td><td class="num">${e.uczestnicy
          .map((u) => `${u.slug} ${u.saldoPo}`)
          .join(', ')}</td></tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kronika — ${esc(s.tytulTomu)} (wynik działania mechanizmu)</title>
<style>
:root{--bg:#f7f3ea;--fg:#1e1a16;--muted:#6b655c;--line:#ded4c2;--card:#fffdf8;--accent:#7a4a22;--accent2:#a5652f;--mit:#3e7d54;--rac:#51689a;--up:#3e7d54;--down:#a3442e;--code:#f1eadc}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Georgia,serif}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 80px}.topbar{display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--accent);padding-bottom:12px;margin-bottom:18px}
.brand{font-weight:700;font-size:19px}.brand .dot{color:var(--accent)}.topbar a{color:var(--accent);margin-left:auto;font-size:13px}
.hero{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 24px;margin-bottom:20px}
.hero h1{margin:0 0 6px;font-size:28px}.hero .sub{color:var(--muted);font-size:14px}.badges{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.badge{font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--code)}.badge.ok{color:#3e7d54;border-color:#3e7d54}
.gauge{position:relative;height:18px;border-radius:999px;background:linear-gradient(90deg,#cfe0d2,#f0f0f0,#ccd4e8);border:1px solid var(--line);overflow:hidden;margin-top:8px}
.gauge .mit{height:100%;background:linear-gradient(90deg,#3e7d54,#6fae85)}.gauge .l{position:absolute;top:0;font-size:11px;color:#fff;text-shadow:0 1px 2px #0007}.gauge .lm{left:10px}.gauge .lr{right:10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.col{display:flex;flex-direction:column;gap:20px}@media(max-width:800px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px}.card h2{margin:0 0 12px;font-size:18px;border-left:4px solid var(--accent);padding-left:10px}
.note{color:var(--muted);font-size:13px;margin:0 0 12px}
.epoka{display:grid;grid-template-columns:72px 1fr auto;gap:14px;align-items:start;border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--card);color:inherit;text-decoration:none;margin-bottom:10px;transition:border-color .15s, box-shadow .15s}
.epoka:hover{border-color:var(--accent2);box-shadow:0 4px 12px #0002}.epoka .nr{font-weight:700;color:var(--accent);font-size:14px;text-align:center;border-right:1px solid var(--line)}
.epoka .ttl{font-weight:700}.epoka .meta{font-size:12px;color:var(--muted)}.epoka .delta{font-size:12px;margin-top:5px;display:flex;gap:8px;flex-wrap:wrap}.epoka .go{font-size:12px;color:var(--accent);white-space:nowrap}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:7px 9px;text-align:left;border-bottom:1px solid var(--line)}th{font-size:12px;color:var(--muted)}.num{font-variant-numeric:tabular-nums;text-align:right}
.chip{border:1px solid var(--line);background:var(--code);border-radius:999px;padding:1px 8px;font-size:12px}.chip.up{color:#3e7d54;border-color:#3e7d54}.chip.down{color:#a3442e;border-color:#a3442e}.chip.neutral{color:#6b655c}
.muted{color:var(--muted);font-size:12px}.up{color:#3e7d54}.down{color:#a3442e}ul{margin:0;padding-left:20px}li{margin:6px 0}.st{font-size:11px;padding:1px 7px;border-radius:999px}
.st.ot{background:#e5efe4;color:#3e7d54}.st.zam{background:#ece7dc;color:#6b655c}.foot{margin-top:22px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px}
code{background:var(--code);padding:1px 6px;border-radius:5px}
</style>
</head>
<body><div class="wrap">
<header class="topbar"><div class="brand">AME<span class="dot">.</span> KRONIKA</div><a href="../index.html">← mapa / kartoteka</a></header>

<div class="hero">
  <div class="badges"><span class="badge ok">mechanizm: OK</span><span class="badge">epoki: ${s.epoki.length}</span><span class="badge">skity: ${s.epoki.map((e) => e.skit).join(', ')}</span></div>
  <h1>${esc(s.tytulTomu)}</h1>
  <p class="sub">${esc(s.tom)} — prawdziwa strona główna Tomu, zasilona z <code>data/kronika/summary.json</code>.</p>
  <div class="gauge"><div class="mit" style="width:${width}%"></div><span class="l lm">MIT ${mit}</span><span class="l lr">RACJONALIZACJA ${rac}</span></div>
  <p class="note" style="margin-top:8px">Oś zamknięta: ${mit}+${rac}=100 · dominacje: ${esc(dominacje)}</p>
</div>

<div class="grid">
  <div class="col">
    <div class="card"><h2>Chronologia epok</h2><p class="note">Klikalne raporty kolejnych epok Tomu.</p>${kartyEpok}</div>
    <div class="card"><h2>Wątki — zamknięte i otwarte</h2><p class="note">Zebrane z kolejnych epok; ten sam wątek nadpisuje swój stan.</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px">
        <div><h3 style="font-size:15px;margin:0 0 8px">Zamknięte</h3><ul>${zamkniete || '<li class="muted">brak</li>'}</ul></div>
        <div><h3 style="font-size:15px;margin:0 0 8px">Otwarte</h3><ul>${otwarte || '<li class="muted">brak</li>'}</ul></div>
      </div>
    </div>
  </div>
  <div class="col">
    <div class="card"><h2>Uczestnicy i paliwo po Tomie</h2><p class="note">Bieżące salda z ledgera po wszystkich epokach.</p><ul>${byty}</ul></div>
    <div class="card"><h2>Ledger epok</h2><p class="note">Kto ile zarobił (lub stracił) w całym Tomie.</p>
      <table><tr><th>Epoka</th><th>Tytuł</th><th>salda po</th></tr>${ledger}</table>
    </div>
  </div>
</div>

<div class="foot">Wygenerowano przez <code>npm run kronika</code> z <code>data/kronika/summary.json</code> · mechanizm: <code>tools/kronika.mjs</code> · seedowe wartości osi/zasięgu w <code>data/kronika/tom-1.json</code> (kalibracja przy wzroście kartoteki) · Rozstaje pozostają pomysłem.</div>
</div></body></html>
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
  const check = process.argv.includes('--check');
  const [tom, epoki, indeks, kanon] = await Promise.all([
    wczytajJson(PLIK_TOM_1),
    wczytajEpoki(),
    wczytajJson(PLIK_INDEKSU),
    wczytajJson(PLIK_KANONU),
  ]);

  if (epoki.length === 0) {
    console.error('Kronika: brak epok w data/kronika — epoka-1.json...');
    process.exit(1);
  }

  const podsumowanie = zbudujPodsumowanieTomu({ tom, epoki, indeks, kanon });
  const raportTomu = generujRaportTomuHTML(podsumowanie);
  const raporty = podsumowanie.epoki.map((e) => ({
    slug: e.slug,
    html: generujRaportHTML({
      tom: podsumowanie.tom,
      tytulTomu: podsumowanie.tytulTomu,
      slug: e.slug,
      tytulEpoki: e.tytul,
      skit: e.skit,
      uczestnicy: e.uczestnicy,
      stanPo: e.stanPo,
      konsekwencje: e.konsekwencje,
      narrator: e.narrator,
    }),
  }));

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
