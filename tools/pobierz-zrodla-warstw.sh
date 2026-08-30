#!/usr/bin/env bash
# Pobiera (przez GitHub API — jedyne dostępne źródło z tego środowiska) dane
# źródłowe warstw mapy do assets/map/vendor/ (katalog NIEdokowany do gita).
# Użycie: bash tools/pobierz-zrodla-warstw.sh
# Wyniki przetwarza: node tools/warstwy-mapy.mjs (+ python dla rastra).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/assets/map/vendor"
mkdir -p "$DEST/ecoregions" "$DEST/pleiades"
ok() { echo "OK   $1"; }
skip() { echo "JUŻ $1"; }
fail() { echo "BRAK $1"; }

gh() { # gh <ścieżka w repo> <plik docelowy>
  local path="$1" out="$2"
  [ -s "$out" ] && skip "$(basename "$out")" && return 0
  for i in 1 2 3 4 5; do
    if curl -sS --max-time 120 -L -H "Accept: application/vnd.github.raw" \
        "https://api.github.com/repos/$path" -o "$out" && [ -s "$out" ]; then
      # API błędu zwraca JSON z "message" — odrzuć
      if head -c 200 "$out" | grep -q '"message"' && [ "$(wc -c < "$out")" -lt 500 ]; then
        sleep 8; continue
      fi
      ok "$(basename "$out") ($(wc -c < "$out") B)"; return 0
    fi
    sleep 10
  done
  fail "$(basename "$out")"; rm -f "$out"; return 1
}

# --- WWF Ecoregions 2017 (mirror gentopia/ecoregions-geojson) -------------
# Pliki biome'ów leśnych (1–6) per realm; format: data/<REALM>/<BIOME>/<REALM>.<BIOME>.json
ECOG="gentopia/ecoregions-geojson/contents/data"
REALMS=(AF AN AU IN NA NE NO OC PA)
BIOMES=(01 02 03 04 05 06)
for r in "${REALMS[@]}"; do
  for b in "${BIOMES[@]}"; do
    gh "$ECOG/$r/$b/$r.$b.json" "$DEST/ecoregions/${r}.${b}.json" || true
  done
done

# --- Natural Earth wektor (10m) — kompletny mirror nvkelso/natural-earth-vector ----
NE="nvkelso/natural-earth-vector/contents/geojson"
gh "$NE/ne_10m_geography_regions_elevation_points.geojson" "$DEST/ne_10m_geography_regions_elevation_points.geojson"
gh "$NE/ne_10m_geography_regions_points.geojson" "$DEST/ne_10m_geography_regions_points.geojson"
gh "$NE/ne_10m_urban_areas.geojson" "$DEST/ne_10m_urban_areas.geojson"
gh "$NE/ne_10m_geography_marine_polys.geojson" "$DEST/ne_10m_geography_marine_polys.geojson"
gh "$NE/ne_50m_geography_regions_elevation_points.geojson" "$DEST/ne_50m_geography_regions_elevation_points.geojson"

# --- Raster hipsometrii (public domain) — wire przez git (raw jest zablokowane) ----
if [ ! -s "$DEST/HYP_50M_SR_W.tif" ]; then
  echo "- raster NE (git sparse, ~175 MB)..."
  TMP=$(mktemp -d)
  (cd "$TMP" && git clone --quiet --filter=blob:none --no-checkout https://github.com/nvkelso/natural-earth-raster.git r >/dev/null 2>&1 &&
   cd r && git sparse-checkout init --cone >/dev/null 2>&1 &&
   git sparse-checkout set 50m_rasters/HYP_50M_SR_W >/dev/null 2>&1 &&
   git checkout --quiet master) && cp "$TMP/r/50m_rasters/HYP_50M_SR_W/HYP_50M_SR_W.tif" "$DEST/" && ok "HYP_50M_SR_W.tif" || fail "HYP_50M_SR_W.tif"
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
echo "Gotowe: $(du -sh "$DEST" 2>/dev/null | cut -f1)"
