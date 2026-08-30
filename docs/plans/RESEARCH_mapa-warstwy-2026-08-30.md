# Research: wzbogacenie mapy głównej AME (2026-08-30)

> Zlecenie właściciela: „Research jak można wzbogacić jeszcze mapę główną
> (głównie offline ale może też bezpłatny online przy wybraniu odpowiedniej
> warstwy opcjonalnej mapy) → POI? kolorowe wypełnienie wg wysokości?
> kompleksy leśne? jakieś historyczne warstwy?”
> Wynik: rekomendacje + tabele źródeł. **Bez wdrażania** — decyzja właściciela.
> **Aktualizacja 2026-08-30 (po wdrożeniu i recenzji):** zewnętrze
> warstwy „lasy” (WWF), „urban” i „morza” zostały **usunięte** (zgłoszenie A);
> zostają POI/szczyty, miejsca historyczne i hipsometria (B/C — patrz
> `docs/PROJECT_HISTORY.md`).

## 0. Stan obecny

- Mapa: wektor SVG, rzut Equirectangular (`app/geo.js`, ADR 0009),
  samowystarczalna, bez runtime zależności (ADR 0001/0003).
- Już jest (ADR 0020, M14): `assets/map/` — `countries-50m.json`,
  `rivers-2km5.json`, `lakes-2km5.json`, `miasta.json`; panel warstw
  (rzeki/jeziora/miasta/POI), LOD od zoomu (`PROGI_WARSTW`).
- Nie ma: **dróg, szczytów, lasów, wysokości n.p.m. (hipsometria),
  warstw historycznych**. Backlog M14 notował, że pakiety
  `@geo-maps/earth-roads|peaks|forests|relief-*` — E404. **To research
  wskazuje realne zamienniki.**

## 1. Warstwy OFFLINE (vendor do `assets/map/`, zero runtime) — rekomendowane

| Warstwa | Źródło | Format | Rozmiar (szac. po uproszczeniu/simplifikacji) | Licencja | Wysiłek | Uwagi |
|---|---|---|---|---|---|---|
| **Hipsometria** (kolorowe wypełnienie wg wysokości) | **Natural Earth 10m physical** — `geography_regions_elevation` (poligony hipsometryczne, klasy 0–8600 m; wektor, nie raster) [naturalearthdata.com/downloads/10m-physical-vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) | Shapefile → TopoJSON/GeoJSON | kilka MB po simpl. (półglob) | **public domain** | niski | Idealne pod nasze SVG: `path` z `fill` wg klasy. Alternatywa rastrowa: NE „Cross-blended Hypso” 51–83 MB (za duże na repo — tylko do podglądu). |
| **POI — szczyty** | **GeoNames** (feature code `MT`/`P`, z polem elevation) [geonames.org/export](https://www.geonames.org/export/) | CSV/TSV → GeoJSON | 100–500 KB (filtrowane: elewacja ≥ próg albo tylko regiony bytów) | **CC BY 4.0** (atrybucja) | niski | Dump allCountries = 344 MB (pobrać raz, wyciągnąć tylko szczyty, usunąć). |
| **POI — nazwane szczyty (bardzo lekkie)** | **Natural Earth 10m** — `geography_regions_points` (nazwane szczyty/regiony, public domain) | Shapefile → GeoJSON | ~50–200 KB | **public domain** | niski | Mniej dokładne niż GeoNames, zero licencji. |
| **Kompleksy leśne** | **WWF Terrestrial Ecoregions 2017** [ecoregions.world](https://ecoregions.world/) (Dinerstein et al.) | Shapefile (150 MB zip) → wyciąg bioma lasów + simpl. | 1–3 MB | **CC BY 4.0** | średni | Klasy bioma (tropical/subtropical/temperate/boreal forests) → „kompleksy leśne” bez rastra. |
| **Kompleksy leśne (dokładniej, lokalnie)** | **OSM** `landuse=forest`/`natural=wood` przez **Overpass API** [overpass-turbo.eu](https://overpass-turbo.eu/) / [overpass-api.de](https://overpass-api.de/api/interpreter) | GeoJSON (zapytanie raz, vendor) | zależy od regionu (Polska/Europa ~ kilka MB) | **ODbL** (atrybucja OpenStreetMap + share-alike) | średni | Najdokładniejsze; jednorazowy vendor, potem offline. |
| **Lasy (alternatywa rastrowa)** | Global Forest Watch / Hansen tree cover | raster (GeoTIFF) | bardzo duże | CC BY 4.0 (sprawdzić wersję) | wysoki | Do poligonizacji — odradzane na start. |
| **Obszary zurbanizowane** | **Natural Earth 10m** — `urban_areas` | wektor | ~1 MB | public domain | niski | Ładne tło „gdzie ludzie”, pasuje do LOD. |
| **Etykiety mórz/oceanów** | **Natural Earth 10m** — `geography_marine_polys` + `physical_label_points` | wektor | ~0,2 MB | public domain | niski | Mało, duża czytelność. |
| **Historyczne — miejsca** | **Pleiades** (starożytne miejsca, JSON-LD per obiekt) [pleiades.stoa.org](https://pleiades.stoa.org/) ; **DARE** (miejsca rzymskie, gazetteer RDF 1,5 MB) [dare.ht.lu.se](https://dare.ht.lu.se/) | JSON/GeoJSON | ~1–2 MB | **CC BY 3.0** (Pleiades), **CC BY-SA 3.0** (DARE) | średni | Warstwa „antiquitas” — świetna dla bytów greckich/rzymskich (Korynt, Kreta, Teby…). |
| **Historyczne — drogi rzymskie** | **DARE tiles / AWMC Antiquity À-la-carte** (drogi, akwedukty) [imperium.ahlfeldt.se](https://imperium.ahlfeldt.se/) | tiles/vector (eksport do sprawdzenia) | ~1 MB | CC BY-SA (awmc) / CC BY-SA 3.0 (DARE) | średni | Najbardziej „historyczna warstwa” — drogi łączące byty antyczne. |

**Rekomendacja offline (etapy):**
- **M1 (najpierw):** hipsometria NE 10m (poligony) + `geography_regions_points`
  (szczyty) + `urban_areas` + etykiety mórz. Wszystko **public domain**,
  zero konfliktów licencyjnych; wypełnienie wg wysokości robi się samo
  (jeden `path` na klasę). Rozmiar łącznie < ~3 MB po simplifikacji.
- **M2 (POI + lasy):** GeoNames peaks (CC BY 4.0 — dopisać atrybucję
  do `docs/ASSETS.md` i stopki) + lasy: **WWF Ecoregions 2017** albo
  **OSM/Overpass** (wybór: szybciej → WWF; dokładniej → OSM).
- **M3 (historyczne):** Pleiades (miejsca) + DARE (drogi rzymskie) jako
  przełącznik „antiquitas” — z atrybucją i uwagą o share-alike.

## 2. Warstwy ONLINE (opcjonalne, domyślnie wyłączone) — z zastrzeżeniem

To **wymaga decyzji właściciela + rozszerzenia ADR 0001/0003** (pojawia się
runtime zależność sieciowa; aplikacja przestaje być w 100% offline).
Jeśli dopuścimy — najlepiej jako **opcjonalny podkład** włączany przez
człowieka, z wyraźnym „online” i atrybucją.

| Źródło | Co daje | Dostępność / koszt | Atrybucja | Uwagi |
|---|---|---|---|---|
| **OSM raster tiles** (tile.openstreetmap.org) | klasyczna mapa OSM | free, bez klucza; **polityka użycia** — bez bulk downloadu, atrybucja; przy małym ruchu OK | „© OpenStreetMap contributors” | najprostsze; zgodność z OSMF |
| **OpenTopoMap** [opentopomap.org](https://opentopomap.org/) | topo + hipsometria + cieniowanie | free, atrybucja, polityka „light use” | „© OpenTopoMap (CC-BY-SA)” | najlepszy „relief” bez własnych danych |
| **Natural Earth II / Shaded Relief raster** (NACIS, shadedrelief.com) | gradienty wysokości, cieniowanie | raster 20–90 MB do vendoru albo online | public domain + atrybucja NE | offline = tylko vendor |
| **Esri basemaps** (ArcGIS Static Basemap Tiles / World Imagery, World Hillshade) | zdjęcia satelitarne, hillshade | free z atrybucją (term: atrybucja + warunki Esri; komercyjnie ograniczenia) | „Powered by Esri…” | jako warstwa „terrain” |
| **CARTO basemaps** (positron/dark) | ładne minimalne podkłady | **free 5 mln req/mies.**, klucz API (bez konta), atrybucja | „© CARTO © OpenStreetMap” | klucz = artefakt w repo (do rozważenia) |
| **Stadia / Mapbox** | dowolne style | **wymaga klucza/API-key** | — | odpada jako „bezpłatny bez rejestracji” |

**Technicznie w naszym SVG:** kafelki to `tileX = floor((lon+180)/360 * 2^z)`,
`tileY = ...` (Web Mercator) — da się wyliczyć w `app/map.js` i wstawić
`<image>`/`<g>` pod warstwą bytów. Złożoność średnia; największe ryzyko to
polityka serwera i utrata 100%-offline. **Rekomendacja: nie robić w tej
iteracji; wpisać do BACKLOG jako „pomysł zależny od decyzji/ADR”.**

## 3. Rekomendacja ogólna

1. **M1 → M2 (offline)** robimy bez nowego ADR (vendor + `docs/ASSETS.md`),
   zgodnie z wzorcem ADR 0020. Największy efekt wizualny: **hipsometria**
   (kolor wg wysokości) + szczyty + lasy.
2. **POI** konkretne dla bytów już mamy (współrzędne w kartotece); POI
   „tła” (szczyty/regiony) robią mapę czytelną przy zbliżeniu.
3. **Historyczne warstwy** (Pleiades/DARE) — ładny, spójny temat:
   „drogi i miejsca, po których wędrowały byty”; wskazane do M3.
4. **Online** — tylko za zgodą (ADR) i najlepiej jako przełącznik
   „podgląd”, nie domyślny podkład.

## 4. Ryzyka / uwagi

- **Licencje share-alike:** OSM/ODbL, Damien? DARE CC BY-SA — dane
  dołącza się do repo z atrybucją i informacją o licencji; treść AME
  pozostaje własna, warstwa danych ma własny license header (wzorzec:
  `docs/ASSETS.md`).
- **Rozmiar repo:** 10m globalne po simplifikacji powinno zmieścić się
  w ~1–5 MB; jeśli nie — tylko regiony bytów + Europa.
- **GeoNames:** atrybucja wymagana (CC BY 4.0); w stopce mapy dodać
  „Data: GeoNames (CC BY 4.0)”.
- **Overpass:** jednorazowe zapytanie (vendor), nie API w runtime.
- **Martwe linki:** kontrola żywości adresów (BACKLOG) — np. znaleziony
  łącze Theoi w kartotece `talos-kreta` („HephaestusWorks”) zwraca 404;
  do poprawy w osobnej iteracji.

## 5. Źródła (linki do pobrania)

- Natural Earth: [10m physical vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/), [10m raster hypso](https://www.naturalearthdata.com/downloads/10m-raster-data/10m-cross-blend-hypso/), [repo GitHub (public domain)](https://github.com/nvkelso/natural-earth-vector)
- GeoNames: [export](https://www.geonames.org/export/) (CC BY 4.0)
- WWF Ecoregions 2017: [ecoregions.world](https://ecoregions.world/) (CC BY 4.0)
- OSM / Overpass: [overpass-turbo.eu](https://overpass-turbo.eu/), [overpass-api.de](https://overpass-api.de/api/interpreter) (ODbL)
- Pleiades: [pleiades.stoa.org](https://pleiades.stoa.org/) (CC BY 3.0)
- DARE: [imperium.ahlfeldt.se](https://imperium.ahlfeldt.se/) (CC BY-SA 3.0)
- OpenTopoMap: [opentopomap.org](https://opentopomap.org/) · Esri: [Static Basemap Tiles](https://developers.arcgis.com/rest/static-basemap-tiles/) · CARTO: [basemaps](https://carto.com/basemaps/)
