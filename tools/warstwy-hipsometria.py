#!/usr/bin/env python3
"""
tools/warstwy-hipsometria.py — raster hipsometryczny NE 50m (EPSG:4326,
1/30°, "Hypsometric tints + shaded relief + water") → assets/map/hipsometria.jpg
w standardowym Web Mercatorze, dokładnie pod układ świata AME (3600×3600 j.u.).

Użycie (jednorazowo, wymaga Pillow+numpy — nie jest to runtime aplikacji):
    python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pillow numpy
    curl -L -o data/NE2_50M_SR_W.zip https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/raster/NE2_50M_SR_W.zip
    unzip -d data NE2_50M_SR_W.zip
    /tmp/venv/bin/python tools/warstwy-hipsometria.py data/NE2_50M_SR_W.tif

Źródło: Natural Earth 50m raster (public domain), plik NE2_50M_SR_W.tif.
Wyjście: kwadrat 2160×2160 px = świat 3600×3600 j.u. (Web Mercator, ±85,051°).
"""
import sys
import os

from PIL import Image
import numpy as np


def waruj(plik_wej, plik_wyj, rozmiar=2160):
    im = Image.open(plik_wej).convert('RGB')
    w, h = im.size
    print(f'źródło: {im.size}', file=sys.stderr)
    src = np.asarray(im, dtype=np.float32)

    n = rozmiar
    lon = (np.arange(n) + 0.5) / n * 360 - 180
    lat = np.degrees(np.arcsin(np.tanh(np.pi * (1 - 2 * (np.arange(n) + 0.5) / n))))
    sy = (90 - lat) * (h / 180.0)
    sx = (lon + 180) * (w / 360.0)

    x0 = np.floor(sx).astype(np.int32)
    y0 = np.floor(sy).astype(np.int32)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    fx = sx - x0
    fy = sy - y0

    out = (
        src[np.ix_(y0, x0)] * ((1 - fy) * (1 - fx))[:, None]
        + src[np.ix_(y1, x0)] * (fy * (1 - fx))[:, None]
        + src[np.ix_(y0, x1)] * ((1 - fy) * fx)[:, None]
        + src[np.ix_(y1, x1)] * (fy * fx)[:, None]
    )
    out = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGB').save(plik_wyj, quality=84, optimize=True)
    print(f'zapisano {plik_wyj} ({os.path.getsize(plik_wyj) / 1e6:.2f} MB, {n}×{n})', file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    wej = sys.argv[1]
    wyj = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'assets', 'map', 'hipsometria.jpg')
    waruj(wej, wyj)
