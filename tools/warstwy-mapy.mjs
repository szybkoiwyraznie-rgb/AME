#!/usr/bin/env node
/**
 * tools/warstwy-mapy.mjs — buduje warstwy tematyczne mapy AME (ADR 0020)
 * z danych źródłowych w assets/map/vendor/ (pobiera je
 * `bash tools/pobierz-zrodla-warstw.sh`). Determinystyczne — te same wejścia
 * dają te same wyjścia; tryb `--check` porównuje z plikami w repo.
 *
 *   node tools/warstwy-mapy.mjs          # zapis do assets/map/
 *   node tools/warstwy-mapy.mjs --check  # weryfikacja (używane przez npm run check)
 *
 * Warstwy: lasy (WWF Ecoregions 2017, biomy 1–6), szczyty (NE 10m),
 * obszary zurbanizowane (NE 10m), morza (NE 10m marine), miejsca historyczne
 * (Pleiades 4.1). Raster hipsometrii: tools/warstwy-hipsometria.py.
 * Licencje i atrybucje: docs/ASSETS.md.
 */
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(ROOT, 'assets', 'map', 'vendor');
const OUT = join(ROOT, 'assets', 'map');

const esc = (s) => String(s ?? '');
const zaokr = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

/* ---- Douglas–Peucker (stopnie; proste, deterministyczne) ---- */

function odleglosc(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function uproscPiercien(pkt, tol) {
  if (pkt.length < 4) return pkt;
  const keep = new Uint8Array(pkt.length);
  keep[0] = keep[pkt.length - 1] = 1;
  const stack = [[0, pkt.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let dist = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = odleglosc(pkt[i], pkt[a], pkt[b]);
      if (d > dist) { dist = d; idx = i; }
    }
    if (dist > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out = [];
  for (let i = 0; i < pkt.length; i++) if (keep[i]) out.push(pkt[i]);
  return out;
}

function uproscPoligon(rings, tol) {
  return rings.map((r) => uproscPiercien(r, tol)).filter((r) => r.length >= 4);
}

function uproscMulti(coords, tol) {
  const out = coords.map((rings) => uproscPoligon(rings, tol)).filter((r) => r.length);
  return out.length ? out : null;
}

function doMulti(geom) {
  if (geom?.type === 'Polygon') return [geom.coordinates];
  if (geom?.type === 'MultiPolygon') return geom.coordinates;
  return null;
}

async function czytajJson(rel) {
  return JSON.parse(await readFile(join(VENDOR, rel), 'utf8'));
}

/* ---- CSV (Pleiades; bez zależności) ---- */

function parsujCsv(tekst) {
  const lines = tekst.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    const r = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
        } else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { r.push(cur); cur = ''; }
      else cur += c;
    }
    r.push(cur);
    rows.push(r);
  }
  return rows;
}

async function csv(rel) {
  const rows = parsujCsv(await readFile(join(VENDOR, rel), 'utf8'));
  const head = rows[0].map((h) => h.replace(/^\uFEFF/, ''));
  const idx = Object.fromEntries(head.map((h, i) => [h, i]));
  return { head, idx, rows: rows.slice(1) };
}

function punkt(id, n, lat, lon, dodatkowe = {}) {
  return { type: 'Feature', properties: { id, n, ...dodatkowe }, geometry: { type: 'Point', coordinates: [zaokr(lon), zaokr(lat)] } };
}

/* ---- Warstwy ---- */

/** Lasy: biomowe kompleksy leśne 1–6 (RESOLVE Ecoregions 2017 przez PMTiles). */
async function warstwaLasy() {
  const d = await czytajJson('lasy-z2.geojson');
  const features = [];
  for (const f of d.features ?? []) {
    const biome = Number(f.properties?.biome);
    const multi = doMulti(f.geometry);
    if (!multi || !(biome >= 1 && biome <= 6)) continue;
    const uproszczone = uproscMulti(multi, 0.08);
    if (!uproszczone) continue;
    features.push({
      type: 'Feature',
      properties: { b: biome },
      geometry: {
        type: 'MultiPolygon',
        coordinates: uproszczone.map((rings) => rings.map((r) => r.map(([x, y]) => [zaokr(x), zaokr(y)]))),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Szczyty i pasma: NE 10m geography regions (elevation points + named points). */
async function warstwaSzczyty() {
  const zrodla = [
    ['ne_10m_geography_regions_elevation_points.geojson', true],
    ['ne_10m_geography_regions_points.geojson', false],
  ];
  const features = [];
  for (const [rel, zElevacja] of zrodla) {
    const d = await czytajJson(rel);
    for (const f of d.features ?? []) {
      const p = f.properties ?? {};
      const lat = Number(p.latitude ?? p.lat_y);
      const lon = Number(p.longitude ?? p.long_x);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const e = p.elevation != null && p.elevation !== '' ? Number(p.elevation) : undefined;
      features.push(punkt(p.region ?? p.name ?? '', p.name_pl || p.name || '', lat, lon, zElevacja ? { e } : {}));
    }
  }
  return { type: 'FeatureCollection', features };
}

/** Obszary zurbanizowane (NE 10m urban areas), uproszczone; pomijamy drobnice < 50 km². */
async function warstwaUrban() {
  const d = await czytajJson('ne_10m_urban_areas.geojson');
  const features = [];
  for (const f of d.features ?? []) {
    const km2 = Math.round(Number(f.properties?.area_sqkm) || 0);
    if (km2 < 50) continue;
    const multi = doMulti(f.geometry);
    if (!multi) continue;
    const uproszczone = uproscMulti(multi, 0.015);
    if (!uproszczone) continue;
    features.push({
      type: 'Feature',
      properties: { km2 },
      geometry: { type: 'MultiPolygon', coordinates: uproszczone.map((rings) => rings.map((r) => r.map(([x, y]) => [zaokr(x), zaokr(y)])) ) },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Morza i oceany: etykiety (NE 10m marine polys). */
async function warstwaMorza() {
  const d = await czytajJson('ne_10m_geography_marine_polys.geojson');
  const features = [];
  for (const f of d.features ?? []) {
    const p = f.properties ?? {};
    const nazwa = p.name_pl || p.name || p.name_en || '';
    if (!nazwa || Number(p.scalerank) > 5) continue;
    const multi = doMulti(f.geometry);
    if (!multi) continue;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const rings of multi) for (const r of rings) for (const [x, y] of r) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX)) continue;
    features.push(punkt(null, nazwa, (minY + maxY) / 2, (minX + maxX) / 2, { k: p.featurecla ?? 'ocean' }));
  }
  return { type: 'FeatureCollection', features };
}

/** Miejsca historyczne (Pleiades 4.1, CC BY 3.0) — precyzyjne punkty. */
async function warstwaHistoria() {
  const { idx, rows } = await csv('pleiades/places.csv');
  const czytaj = (r, nazwa) => r[idx[nazwa]] ?? '';
  const typy = new Map();
  try {
    const t = await csv('pleiades/places_place_types.csv');
    for (const r of t.rows) {
      if (!r[0] || !r[1]) continue;
      if (!typy.has(r[0])) typy.set(r[0], new Set());
      typy.get(r[0]).add(r[1]);
    }
  } catch { /* brak pliku — pomiń typy */ }

  const DOBRE = new Set([
    'settlement', 'settlement-modern', 'temple', 'temple-2', 'fort', 'fort-2', 'sanctuary', 'villa',
    'bridge', 'station', 'cemetery', 'harbor', 'aqueduct', 'theater', 'bath', 'archaeological-site',
    'catacomb', 'dolmen', 'tumulus', 'road', 'walls', 'city', 'city-modern',
  ]);
  const features = [];
  for (const r of rows) {
    if (czytaj(r, 'location_precision') !== 'precise') continue;
    const id = czytaj(r, 'id');
    if (!id) continue;
    const typyM = typy.get(id);
    if (typyM && ![...typyM].some((t) => DOBRE.has(t))) continue;
    const lat = Number(czytaj(r, 'representative_latitude'));
    const lon = Number(czytaj(r, 'representative_longitude'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    features.push(punkt(id, czytaj(r, 'title'), lat, lon, { t: typyM ? [...typyM].find((t) => DOBRE.has(t)) : '' }));
  }
  return { type: 'FeatureCollection', features };
}

/* ---- Zapisywanie ---- */

const PLIKI = [
  ['las.json', warstwaLasy],
  ['szczyty.json', warstwaSzczyty],
  ['urban.json', warstwaUrban],
  ['morza.json', warstwaMorza],
  ['miejsca-historyczne.json', warstwaHistoria],
];

async function main() {
  const check = process.argv.includes('--check');
  let ok = true;
  for (const [plik, fn] of PLIKI) {
    const dane = await fn();
    const tekst = JSON.stringify(dane) + '\n';
    const cel = join(OUT, plik);
    if (check) {
      const stary = await readFile(cel, 'utf8').catch(() => null);
      if (stary !== tekst) {
        console.error(`warstwy-mapy: ${plik} NIEAKTUALNY — uruchom node tools/warstwy-mapy.mjs`);
        ok = false;
      } else console.log(`  OK ${plik}`);
    } else {
      await writeFile(cel, tekst);
      const s = await stat(cel);
      console.log(`  ${plik} (${(s.size / 1e6).toFixed(2)} MB)`);
    }
  }
  const hipso = await stat(join(OUT, 'hipsometria.jpg')).catch(() => null);
  if (!hipso) {
    console.error('warstwy-mapy: brak assets/map/hipsometria.jpg — uruchom tools/warstwy-hipsometria.py');
    ok = false;
  } else if (check) console.log('  OK hipsometria.jpg');
  if (!ok) process.exit(1);
  console.log(check ? 'warstwy-mapy: zgodne' : 'warstwy-mapy: zapisano');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
