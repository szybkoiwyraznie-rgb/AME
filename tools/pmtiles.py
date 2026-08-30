#!/usr/bin/env python3
"""Minimalny czytnik PMTiles v3 + dekoder MVT (bez zależności)."""
import struct, gzip, zlib, json, sys

def read_varint(buf, pos):
    result = 0
    shift = 0
    while True:
        b = buf[pos]; pos += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, pos
        shift += 7

def parse_dir(buf):
    pos = 0
    n, pos = read_varint(buf, pos)
    ids = []
    last = 0
    for _ in range(n):
        d, pos = read_varint(buf, pos)
        last += d
        ids.append(last)
    runs = []
    for _ in range(n):
        r, pos = read_varint(buf, pos)
        runs.append(r)
    lens = []
    for _ in range(n):
        l, pos = read_varint(buf, pos)
        lens.append(l)
    # Offsets: delta-encoded + 1 (0 = poprzedni offset + poprzednia długość)
    offs = []
    for i in range(n):
        d, pos = read_varint(buf, pos)
        if i == 0:
            offs.append(d - 1)
        elif d == 0:
            offs.append(offs[-1] + lens[i - 1])
        else:
            offs.append(d - 1)
    return list(zip(ids, offs, lens, runs))

def zxy_to_tileid(z, x, y):
    """Pozycja kumulacyjna: niższe zoomy zajmują (4^z-1)/3, potem indeks Hilberta."""
    acc = 0
    for i in range(z):
        mask = 1 << (z - 1 - i)
        rx = 1 if (x & mask) else 0
        ry = 1 if (y & mask) else 0
        acc += ((3 * rx) ^ ry) * (4 ** (z - i - 1))
    return (4 ** z - 1) // 3 + acc

def zigzag(v):
    return (v >> 1) ^ -(v & 1)

class PMTiles:
    def __init__(self, path):
        self.f = open(path, 'rb')
        self.head = self.f.read(127)
        assert self.head[0:7] == b'PMTiles', self.head[0:7]
        self.ver = self.head[7]
        (self.root_off, self.root_len,
         self.meta_off, self.meta_len,
         self.leaf_off, self.leaf_len,
         self.tile_off, self.tile_len,
         self.addressed, self.tile_entries, self.tile_contents,
         self.clustered, self.internal_compression, self.tile_compression, self.tile_type,
         self.min_zoom, self.max_zoom,
         self.min_lon, self.min_lat, self.max_lon, self.max_lat) = struct.unpack_from('<QQQQQQQQQQQBBBBBBiiii', self.head, 8)
        self.entries = self._read(self.root_off, self.root_len, self.internal_compression)
        self.root = parse_dir(self.entries)
        self.meta = json.loads(self._read(self.meta_off, self.meta_len, self.internal_compression).decode('utf-8'))
        self._leaf_cache = {}

    def _read(self, off, ln, comp=None):
        """Pojedynczy obiekt: surowy wycinek; jeśli gzip — odwinięty."""
        f = self.f
        f.seek(off)
        data = f.read(ln)
        if data[:2] == b'\x1f\x8b':
            return gzip.decompress(data)
        return data

    def _leaf(self, off, ln):
        key = (off, ln)
        if key not in self._leaf_cache:
            raw = self._raw(self.leaf_off + off, ln)
            if raw[:2] == b'\x1f\x8b':
                raw = gzip.decompress(raw)
            self._leaf_cache[key] = parse_dir(raw)
        return self._leaf_cache[key]

    def _raw(self, off, ln):
        f = self.f
        f.seek(off)
        return f.read(ln)

    def tile_data_raw(self):
        if getattr(self, '_tile_raw', None) is None:
            self._tile_raw = self._raw(self.tile_off, self.tile_len)
        return self._tile_raw



    def all_entries(self):
        if getattr(self, '_all', None) is None:
            entries = [e for e in self.root if e[3] != 0]
            if self.leaf_len:
                for tid, off, ln, run in self.root:
                    if run == 0:
                        entries.extend(self._leaf(off, ln))
            entries.sort(key=lambda e: e[0])
            self._all = entries
        return self._all

    def find(self, tile_id):
        entries = self.all_entries()
        import bisect
        i = bisect.bisect_right(entries, (tile_id, 1 << 63, 0, 0)) - 1
        if i < 0:
            return None
        tid, off, ln, run = entries[i]
        if tid <= tile_id < tid + run:
            return off, ln, True
        return None

    def tile(self, z, x, y):
        tid = zxy_to_tileid(z, x, y)
        res = self.find(tid)
        if not res: return None
        off, ln, _ = res
        return self.tile_data_raw()[off:off + ln]

def parse_proto(buf):
    """Zwraca listę (field, wire_type, value) — value: int|bytes."""
    out = []
    pos = 0
    while pos < len(buf):
        key, pos = read_varint(buf, pos)
        field = key >> 3
        wt = key & 7
        if wt == 0:
            v, pos = read_varint(buf, pos); out.append((field, 0, v))
        elif wt == 1:
            v = struct.unpack_from('<Q', buf, pos)[0]; pos += 8; out.append((field, 1, v))
        elif wt == 2:
            ln, pos = read_varint(buf, pos)
            v = buf[pos:pos+ln]; pos += ln; out.append((field, 2, v))
        elif wt == 5:
            v = struct.unpack_from('<I', buf, pos)[0]; pos += 4; out.append((field, 5, v))
        else:
            raise ValueError(f'wire type {wt}')
    return out

def parse_packed(buf):
    pos = 0; out = []
    while pos < len(buf):
        v, pos = read_varint(buf, pos); out.append(v)
    return out

def decode_mvt(data):
    """Zwraca listę warstw: {name, extent, features:[{props,type,geom}]}."""
    if data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    layers = []
    for field, wt, val in parse_proto(data):
        if field == 3 and wt == 2:
            layers.append(_parse_layer(val))
    return layers

def _parse_layer(buf):
    name = None; extent = 4096; feats = []; keys = []; vals = []
    for field, wt, val in parse_proto(buf):
        if field == 1 and wt == 2: name = val.decode('utf-8')
        elif field == 2 and wt == 2: feats.append(val)
        elif field == 3 and wt == 2: keys.append(val.decode('utf-8'))
        elif field == 4 and wt == 2: vals.append(_parse_value(val))
        elif field == 5 and wt == 0: extent = val
    parsed = []
    for fb in feats:
        feature = {'props': {}, 'type': None, 'geometry': []}
        for f2, w2, v2 in parse_proto(fb):
            if f2 == 2 and w2 == 2:
                tags = parse_packed(v2)
                for i in range(0, len(tags) - 1, 2):
                    if tags[i] < len(keys) and tags[i+1] < len(vals):
                        feature['props'][keys[tags[i]]] = vals[tags[i+1]]
            elif f2 == 3 and w2 == 0: feature['type'] = v2
            elif f2 == 4 and w2 == 2: feature['geometry'] = parse_packed(v2)
        parsed.append(feature)
    return {'name': name, 'extent': extent, 'features': parsed}

def _parse_value(buf):
    for f, wt, v in parse_proto(buf):
        if f == 1 and wt == 2: return v.decode('utf-8')
        if f == 2 and wt == 5: return struct.unpack('<f', struct.pack('<I', v))[0]
        if f == 3 and wt == 1: return struct.unpack('<d', struct.pack('<Q', v))[0]
        if f == 4 and wt == 0: return v
        if f == 5 and wt == 0: return v
        if f == 6 and wt == 0: return zigzag(v)
        if f == 7 and wt == 0: return bool(v)
    return None

def tile_to_lonlat(z, x, y, px, py, extent):
    """px,py w ekstentach kafelka → (lon, lat) (Web Mercator)."""
    lon = (x + px / extent) / (2 ** z) * 360 - 180
    n = 3.141592653589793 * (1 - 2 * (y + py / extent) / (2 ** z))
    lat = 57.29577951308232 * (2 * 57.29577951308232 * 0.0 + 0.0)  # placeholder
    import math
    lat = math.degrees(math.atan(math.sinh(n)))
    return lon, lat

def decode_geometry(geom, z, x, y, extent):
    """Zwraca listę ringów/lines: [[(lon,lat),...],...] dla poligonów/lines."""
    out = []
    current = []
    cx = cy = 0
    i = 0
    while i < len(geom):
        cmd_int = geom[i]; i += 1
        cmd = cmd_int & 7; count = cmd_int >> 3
        if cmd == 1:  # MoveTo
            if current: out.append(current)
            current = []
            for _ in range(count):
                dx = zigzag(geom[i]); dy = zigzag(geom[i+1]); i += 2
                cx += dx; cy += dy
                current.append(tile_to_lonlat(z, x, y, cx, cy, extent))
        elif cmd == 2:  # LineTo
            for _ in range(count):
                dx = zigzag(geom[i]); dy = zigzag(geom[i+1]); i += 2
                cx += dx; cy += dy
                current.append(tile_to_lonlat(z, x, y, cx, cy, extent))
        elif cmd == 7:  # ClosePath
            if current and current[0] != current[-1]:
                current.append(current[0])
            out.append(current)
            current = []
    if current: out.append(current)
    return out

if __name__ == '__main__':
    p = PMTiles('/tmp/biomes.pmtiles')
    print('version', p.ver, 'zooms', p.min_zoom, p.max_zoom)
    print('tile_type', p.tile_type, 'tile_compression', p.tile_compression, 'internal', p.internal_compression)
    print('root entries', len(p.root), 'leaf_len', p.leaf_len, 'tile_len', p.tile_len)
    print('meta:', json.dumps(p.meta, indent=1)[:1200])
    for z in range(p.min_zoom, min(p.max_zoom, 3) + 1):
        n = 2 ** z
        total = 0; feats = 0; used = 0
        for x in range(n):
            for y in range(n):
                d = p.tile(z, x, y)
                total += 1
                if d is None: continue
                used += 1
                for layer in decode_mvt(d):
                    feats += len(layer['features'])
        print(f'z{z}: tiles {total}, present {used}, features {feats}')
