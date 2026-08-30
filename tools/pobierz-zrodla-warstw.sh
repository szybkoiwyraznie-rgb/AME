#!/usr/bin/env bash
# Pobiera (przez GitHub API — jedyne dostępne źródło z tego środowiska) dane
# źródłowe warstw mapy do assets/map/vendor/ (katalog NIEdokowany do gita).
# Użycie: bash tools/pobierz-zrodla-warstw.sh
# Wyniki przetwarza: node tools/warstwy-mapy.mjs (+ python dla rastra).
#
# Źródła:
#  - Natural Earth 10m/50m wektor  — mirror nvkelso/natural-earth-vector
#  - raster hipsometrii            — mirror nvkelso/natural-earth-raster (git sparse)
#  - Pleiades 4.1 (CC BY 3.0)      — tarball isawnyu/pleiades.datasets (codeload)
#  - biomes.pmtiles (WWF Ecoregions 2017, CC BY 4.0, Dinerstein et al. 2017)
#    NIE JEST w tym skrypcie: pochodzi z mapy interaktywnej ecoregions.world i
#    bywa niedostępny programowo — jeśli go brak, pobierz ręcznie i wrzuć do
#    assets/map/vendor/ (albo zostaw: las.json jest już wyprowadzony w repo).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/assets/map/vendor"
mkdir -p "$DEST/pleiades"
ok() { echo "OK   $1"; }
skip() { echo "JUŻ $1"; }
fail() { echo "BRAK $1"; }

# gh <ścieżka w repo> <plik docelowy> — z limitem powtórzeń i przerwaniem
# po 3 kolejnych błędach (API ma limit 60 req/h; brak sensu wisieć w pętli).
BLOKI=0
gh() {
  local path="$1" out="$2"
  [ -s "$out" ] && skip "$(basename "$out")" && return 0
  for i in 1 2 3; do
    if curl -sS --max-time 120 -L -H "Accept: application/vnd.github.raw" \
        "https://api.github.com/repos/$path" -o "$out" && [ -s "$out" ]; then
      # API błędu zwraca JSON z "message" — odrzuć (404/rate limit...)
      if head -c 300 "$out" | grep -q '"message"'; then
        if grep -q "rate limit" "$out"; then
          echo "!! API GitHub: limit wyczerpany — PRZERWANE (dociągnij $path później)"
          rm -f "$out"; exit 1
        fi
        sleep 4; continue
      fi
      BLOKI=0
      ok "$(basename "$out") ($(wc -c < "$out") B)"
      return 0
    fi
    sleep 4
  done
  BLOKI=$((BLOKI + 1))
  fail "$(basename "$out")"; rm -f "$out"
  if [ "$BLOKI" -ge 3 ]; then
    echo "!! 3 kolejne pliki niedostępne — PRZERWANE (sieć/limit API?)"
    exit 1
  fi
  return 1
}

# --- Natural Earth wektor (10m/50m) — kompletny mirror nvkelso/natural-earth-vector ----
NE="nvkelso/natural-earth-vector/contents/geojson"
gh "$NE/ne_10m_geography_regions_elevation_points.geojson" "$DEST/ne_10m_geography_regions_elevation_points.geojson"
gh "$NE/ne_10m_geography_regions_points.geojson" "$DEST/ne_10m_geography_regions_points.geojson"
gh "$NE/ne_10m_urban_areas.geojson" "$DEST/ne_10m_urban_areas.geojson"
gh "$NE/ne_10m_geography_marine_polys.geojson" "$DEST/ne_10m_geography_marine_polys.geojson"
gh "$NE/ne_50m_geography_regions_elevation_points.geojson" "$DEST/ne_50m_geography_regions_elevation_points.geojson"
gh "$NE/ne_50m_urban_areas.geojson" "$DEST/ne_50m_urban_areas.geojson"

# --- Raster hipsometrii (public domain) — wire przez git (raw jest zablokowane) ----
if [ ! -s "$DEST/HYP_50M_SR_W.tif" ]; then
  echo "- raster NE (git sparse, ~175 MB, max 10 min)..."
  TMP=$(mktemp -d)
  if (cd "$TMP" && timeout 600 git clone --quiet --filter=blob:none --no-checkout \
        https://github.com/nvkelso/natural-earth-raster.git r >/dev/null 2>&1 &&
      cd r && git sparse-checkout init --cone >/dev/null 2>&1 &&
      git sparse-checkout set 50m_rasters/HYP_50M_SR_W >/dev/null 2>&1 &&
      git checkout --quiet master >/dev/null 2>&1 &&
      cp 50m_rasters/HYP_50M_SR_W/HYP_50M_SR_W.tif "$DEST/"); then
    ok "HYP_50M_SR_W.tif"
  else
    fail "HYP_50M_SR_W.tif"
  fi
  rm -rf "$TMP"
fi

# --- Pleiades 4.1 (CC BY 3.0): dane GIS w data/gis/*.csv ------------------------------------ #
if [ ! -s "$DEST/pleiades/places.csv" ]; then
  if [ ! -s "$DEST/pleiades.tar.gz" ]; then
    echo "- Pleiades 4.1 (tarball, ~200 MB)..."
    curl -sS --max-time 1800 -L "https://codeload.github.com/isawnyu/pleiades.datasets/tar.gz/refs/tags/v4.1" -o "$DEST/pleiades.tar.gz"
  fi
  if [ -s "$DEST/pleiades.tar.gz" ]; then
    mkdir -p "$DEST/pleiades-src"
    tar -xzf "$DEST/pleiades.tar.gz" -C "$DEST/pleiades-src" --wildcards "*/data/gis/*.csv" 2>/dev/null || tar -xzf "$DEST/pleiades.tar.gz" -C "$DEST/pleiades-src"
    for f in places.csv places_place_types.csv location_linestrings.csv; do
      p=$(find "$DEST/pleiades-src" -path "*data/gis/$f" | head -1)
      [ -n "$p" ] && cp "$p" "$DEST/pleiades/$f" && ok "pleiades/$f"
    done
    rm -rf "$DEST/pleiades-src" "$DEST/pleiades.tar.gz"
  fi
fi
[ -s "$DEST/pleiades/places.csv" ] || fail "pleiades/places.csv"

# --- WWF Ecoregions 2017 (las.json/PMTiles) — patrz komentarz na górze ----
if [ -s "$DEST/biomes.pmtiles" ]; then skip "biomes.pmtiles"
else fail "biomes.pmtiles (pobierz ręcznie z ecoregions.world, CC BY 4.0)"
fi

echo "Gotowe: $(du -sh "$DEST" 2>/dev/null | cut -f1)"
