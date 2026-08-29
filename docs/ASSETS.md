# ASSETS — licencje zasobów zewnętrznych

Każdy asset zewnętrzny dodany do repozytorium musi mieć tu wpis.

| Plik | Pochodzenie | Licencja | Uwagi |
|---|---|---|---|
| `assets/map/countries-50m.json` | pakiet npm `world-atlas` v2.0.2 (dane Natural Earth) | dane: domena publiczna (Natural Earth); pakiet: ISC | skopiowany plik kopia `countries-50m.json`; licencja pakietu w `assets/map/LICENSE.world-atlas` |
| `assets/map/rivers-2km5.json` | pakiet npm `@geo-maps/earth-rivers-2km5` v0.6.0 (dane OpenStreetMap, projekt `github.com/simonepri/geo-maps`) | MIT (pakiet); dane: OpenStreetMap / ODbL | GeoJSON `GeometryCollection` z jedną geometrią `MultiPolygon`; skopiowany plik `map.geo.json` bez modyfikacji |
| `assets/map/lakes-2km5.json` | pakiet npm `@geo-maps/earth-lakes-2km5` v0.6.0 (dane OpenStreetMap, projekt `github.com/simonepri/geo-maps`) | MIT (pakiet); dane: OpenStreetMap / ODbL | GeoJSON `GeometryCollection` z jedną geometrią `MultiPolygon`; skopiowany plik `map.geo.json` bez modyfikacji |
| `assets/map/miasta.json` | pakiet npm `world-cities-json` v1.0.1 (SimpleMaps World Cities Database) | CC BY 4.0 | podzbiór: miasta o populacji ≥ 100 000 albo stolica (`capital = primary`), spłaszczony do `{n, lat, lon, p, c}` |
| `assets/wizualizacje/*.jpg` | generowane narzędziem AI z promptów wpisów | wygenerowane na potrzeby projektu | proporcje 21:9, ≤ 2 MB; prompt w polu `wizualizacja.prompt` wpisu |
