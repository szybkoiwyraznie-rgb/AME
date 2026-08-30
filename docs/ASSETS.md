# ASSETS — licencje zasobów zewnętrznych

Każdy asset zewnętrzny dodany do repozytorium musi mieć tu wpis.

| Plik | Pochodzenie | Licencja | Uwagi |
|---|---|---|---|
| `assets/map/countries-50m.json` | pakiet npm `world-atlas` v2.0.2 (dane Natural Earth) | dane: domena publiczna (Natural Earth); pakiet: ISC | skopiowany plik kopia `countries-50m.json`; licencja pakietu w `assets/map/LICENSE.world-atlas` |
| `assets/map/rivers-2km5.json` | pakiet npm `@geo-maps/earth-rivers-2km5` v0.6.0 (dane OpenStreetMap, projekt `github.com/simonepri/geo-maps`) | MIT (pakiet); dane: OpenStreetMap / ODbL | GeoJSON `GeometryCollection` z jedną geometrią `MultiPolygon`; skopiowany plik `map.geo.json` bez modyfikacji |
| `assets/map/lakes-2km5.json` | pakiet npm `@geo-maps/earth-lakes-2km5` v0.6.0 (dane OpenStreetMap, projekt `github.com/simonepri/geo-maps`) | MIT (pakiet); dane: OpenStreetMap / ODbL | GeoJSON `GeometryCollection` z jedną geometrią `MultiPolygon`; skopiowany plik `map.geo.json` bez modyfikacji |
| `assets/map/miasta.json` | pakiet npm `world-cities-json` v1.0.1 (SimpleMaps World Cities Database) | CC BY 4.0 | podzbiór: miasta o populacji ≥ 100 000 albo stolica (`capital = primary`), spłaszczony do `{n, lat, lon, p, c}` |
| `assets/wizualizacje/*.jpg` | generowane narzędziem AI z promptów wpisów | wygenerowane na potrzeby projektu | proporcje 21:9, ≤ 2 MB; prompt w polu `wizualizacja.prompt` wpisu |
| `assets/map/szczyty.json` | Natural Earth 10m `geography_regions_elevation_points` + `geography_regions_points` | domena publiczna (Natural Earth) | punkty `{n, e, lat, lon}`; budujesz `tools/warstwy-mapy.mjs` |
| `assets/map/miejsca-historyczne.json` | Pleiades datasets 4.1 (`places.csv`, `places_place_types.csv`) — regiony śródziemnomorskie i okolice | CC BY 3.0 (The Pleiades Project, `pleiades.stoa.org`); autorzy w `provenance` CSV | punkty `{n, t, lat, lon}`; filtrowane: `location_precision = precise` i typy miejsc (osady, świątynie, forty, akwedukty, mosty…); `tools/warstwy-mapy.mjs` |
| `assets/map/hipsometria.jpg` | Natural Earth 50m raster `HYP_50M_SR_W.tif` (hypsometric tints + shaded relief + water) | domena publiczna (Natural Earth) | reprojekcja do Web Mercator (kwadrat 2160×2160, `tools/warstwy-hipsometria.py`); źródło w `assets/map/vendor/` (NIEdokowane) |

Warstwy „lasy” (WWF), „obszary zurbanizowane” i „morza i oceany” (Natural Earth)
zostały **usunięte decyzją właściciela 2026-08-30** (zgłoszenie A — na tej mapie
nie wnosiły czytelnej informacji); usunięte też ich pliki i narzędzia
(`tools/warstwy-lasy-pmtiles.py`, `tools/pmtiles.py`).
Podkład **Esri „świat fizyczny”** (`esri-teren`) również usunięty po recenzji
(A2) — nie wnosił informacji ponad OpenTopoMap/OSM; zostają OpenTopoMap, OSM
i Esri World Imagery. Zoom online zablokowany na **×45 252** — tyle daje
**67 obrotów kółka** myszy (każdy ×e^0.16 ≈ 1,1735); 68. obrót (≈×53 104)
i głębiej to już puste bloki. Wartość w kodzie: `K_MAX_ONLINE =
Math.round(Math.exp(0.0016·100·67))`.

### Podkłady online (opcjonalne, włączane ręcznie, bez klucza)

Podkłady nie są pakowane do repo — przeglądarka pobiera kafelki z sieci **wyłącznie**
po włączeniu przełącznika. Wszystkie mają własne polityki ograniczonego użycia —
warstwa ma charakter „podglądu” (ADR 0001/0003, decyzja właściciela 2026-08-30).

| Klucz | Usługa | URL | Atrybucja (pokazywana na mapie) | Polityka |
|---|---|---|---|---|
| `opentopo` | OpenTopoMap | `https://{a,b,c}.tile.opentopomap.org/{z}/{x}/{y}.png` | © OpenStreetMap contributors · © OpenTopoMap (CC-BY-SA) | [opentopomap.org/credits](https://opentopomap.org/credits): używaj oszczędnie, nie do komercyjnych serwisów bez zgody |
| `osm` | OpenStreetMap standard | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | © OpenStreetMap contributors (ODbL) | [operations.osmfoundation.org/policies/tiles](https://operations.osmfoundation.org/policies/tiles/): lekkie użycie, atrybucja, bez dużych aplikacji |
| `esri-satelita` | Esri World Imagery | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Powered by Esri · © Esri, Maxar, Earthstar Geographics | j.w. |

Serwery wybrane bez klucza API i bez kosztów; przełącznik `<select>` w panelu warstw.
Atrybucja podkładu jest stale widoczna pod mapą (`#atrybucja-podkladu`) — jak
wymagają polityki OSM/OpenTopoMap/Esri.
