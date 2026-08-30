#!/usr/bin/env python3
"""Eksport biomów leśnych (1-6) z biomes.pmtiles do GeoJSON (lon/lat).

Użycie: python3 tools/warstwy-lasy-pmtiles.py [zoom] [wyjscie.geojson]
Domyślnie: zoom=2, wyjście assets/map/vendor/lasy-z2.geojson; źródło
assets/map/vendor/biomes.pmtiles (oba katalogi gitignorowane — patrz ASSETS.md).
"""
import sys, json, hashlib, os
from pathlib import Path
from pmtiles import PMTiles, decode_mvt, decode_geometry

FOREST = {1, 2, 3, 4, 5, 6}

def area_ring(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]; x2, y2 = ring[i + 1]
        s += x1 * y2 - x2 * y1
    return s / 2

def to_polygons(rings):
    """Pierścienie -> poligony. W geo (y w górę) exteriors mają area<0 (MVT: CW w tile), holes >0."""
    polys = []
    cur = None
    for r in rings:
        a = area_ring(r)
        if a < 0:
            if cur:
                polys.append(cur)
            cur = [r]
        elif cur is not None:
            cur.append(r)
        else:
            cur = [r]
    if cur:
        polys.append(cur)
    return polys

def collect(z, p=None):
    if p is None:
        p = PMTiles('/tmp/biomes.pmtiles')
    seen = {}
    nfeat = 0
    ntiles = 0
    for x in range(2 ** z):
        for y in range(2 ** z):
            raw = p.tile(z, x, y)
            if raw is None:
                continue
            ntiles += 1
            for layer in decode_mvt(raw):
                for f in layer['features']:
                    if f['type'] not in (3, 4):
                        continue
                    try:
                        b = int(f['props'].get('biome'))
                    except Exception:
                        continue
                    nfeat += 1
                    rings = decode_geometry(f['geometry'], z, x, y, layer['extent'])
                    key_rings = [[round(float(p[0]), 4), round(float(p[1]), 4)] for ring in rings for p in ring]
                    h = hashlib.sha1(json.dumps(key_rings, separators=(',', ':')).encode()).hexdigest()
                    if h not in seen:
                        seen[h] = {'biome': b, 'rings': rings}
    return p, seen, ntiles, nfeat

def main():
    repo = Path(__file__).resolve().parent.parent
    src = repo / 'assets' / 'map' / 'vendor' / 'biomes.pmtiles'
    z = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else repo / 'assets' / 'map' / 'vendor' / f'lasy-z{z}.geojson'
    if not src.exists():
        print(f'Brak zrodla: {src} — pobierz je przez tools/pobierz-zrodla-warstw.sh', file=sys.stderr)
        sys.exit(1)
    p, seen, ntiles, nfeat = collect(z, p=PMTiles(str(src)))
    feats = []
    counts = {}
    for e in seen.values():
        if e['biome'] not in FOREST:
            continue
        counts[e['biome']] = counts.get(e['biome'], 0) + 1
        polys = to_polygons(e['rings'])
        feats.append({'type': 'Feature', 'properties': {'biome': e['biome']},
                      'geometry': {'type': 'MultiPolygon', 'coordinates': polys}})
    gj = {'type': 'FeatureCollection', 'features': feats}
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w') as f:
        json.dump(gj, f, separators=(',', ':'))
    npts = sum(len(r) for e in seen.values() if e['biome'] in FOREST for r in e['rings'])
    print(f'z{z}: tiles={ntiles} features_total={nfeat} unique={len(seen)} forests={len(feats)} forest_points={npts} per_biome={counts}')
    print('out size MB:', out.stat().st_size / 1e6)

if __name__ == '__main__':
    main()
