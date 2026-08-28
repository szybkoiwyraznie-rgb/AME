# 0020 — Warstwy tematyczne mapy (woda, miasta) i LOD treści

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Właściciel rozszerza mapę o większą granularność i szczegółowość,
  ale nie chce dokładniejszych granic państw ani etykiet państw. Potrzebuje:
  miast, rzek, POI typu szczyty, głównych dróg; opcjonalnie kompleksów leśnych
  i kolorowego zaznaczenia wysokości nad poziomem morza. Badanie pakietów
  wykazało, że w dostępnych offline źródłach (npm, bez egressu poza HTTPS
  blokującym curl/fetch poza narzędziami agenta) istnieją tylko:
  - `@geo-maps/earth-rivers-*` i `@geo-maps/earth-lakes-*` — GeoJSON
    `GeometryCollection` z jedną geometrią `MultiPolygon` (wypełnienia
    obszarów wodnych, nie linie centerline),
  - `world-cities-json` — `SimpleMaps World Cities Database` (CC BY 4.0),
    współrzędne i populacje miast.
  Nie istnieją w tych źródłach warstwy dróg, szczytów, lasów ani DEM/reliefu
  (kategorie te nie występują w katalogu `@geo-maps`, a pakiety typu
  `earth-roads-*`, `earth-peaks-*`, `earth-forests-*`, `earth-relief-*`
  zwracają E404). Mapa pozostaje statyczna i bez runtime dependencies
  (ADR 0001), więc zewnętrzne API/mapy kafelkowe nie wchodzą w zakres.
- Decyzja:
  1. **Warstwy jako grupy SVG w układzie świata.** Nad grupą `.kraje`
     powstaje `g.warstwy-szczegolow` z podgrupami `.rzeki`, `.jeziora`,
     `.miasta`, `.poi`. Woda rysowana jest nad lądem; dla rzek użyto
     wypełnienia konturowego (`fill: none; stroke:…`), dla jezior
     wypełnienia; linie i obrysy są w pikselach CSS
     (`vector-effect: non-scaling-stroke`).
  2. **LOD treści zamiast LOD tylko geometrii.** Punkty miast są dzielone na
     trzy rangi (`miasta-wielkie`, `miasta-srednie`, `miasta-drobne`), a
     pokazywanie rang zależy od `k` (powiększenia ponad dopasowanie).
     `PROGI_WARSTW` trzyma progi: `woda: 4`, `miastaWielkie: 4`,
     `miastaSrednie: 7`, `miastaDrobne: 10`, `poi: 8`. Dzięki temu przy
     oddalonym widoku DOM punktowy pozostaje mały, a przy zbliżeniu
     odsłaniają się kolejne treści bez przebudowywania drzewa.
  3. **Punkty w stałym rozmiarze ekranowym.** Miasta są grupami
     `transform="translate(wx wy) scale(1/s)"` — ten sam wzorzec co pinezki
     (ADR 0009), więc kropki nie rosną wraz z zoomem; tytuł `<title>`
     zawiera nazwę i populację.
  4. **Przełączniki widoczności w UI.** Panel `#warstwy-panel` otwierany z
     `#przycisk-warstwy` pozwala włączać/wyłączać warstwy bez ponownego
     ładowania danych. Stan przełączników żyje w `app.js`; warstwa
     niezaładowana dojeżdża asynchronicznie dopiero po przekroczeniu progu.
  5. **Vendoring assetów.** Do `assets/map/` trafiają pliki:
     `rivers-2km5.json` (z `@geo-maps/earth-rivers-2km5`), `lakes-2km5.json`
     (z `@geo-maps/earth-lakes-2km5`) i `miasta.json` (podzbiór
     `world-cities-json`: populacja ≥ 100 tys. albo stolica). Licencja i
     pochodzenie są opisane w `docs/ASSETS.md`.
- Konsekwencje:
  - W tej iteracji dostępne są **rzeki, jeziora, miasta**. Drogi, szczyty,
    lasy i relief/elevation zostają poza zakresem do czasu znalezienia
    wiarygodnego, offlineowego źródła danych — panel komunikuje to jako
    plan na kolejną iterację.
  - Dane `earth-*` są poligonami obszarów wodnych, a nie liniami rzek;
    „rzeki" są więc rysowane jako kontur obszaru, nie jako klasyczna linia
    rzeki.
  - Rozdzielczość `2km5` (zamiast `10km`) znacząco zwiększa liczbę
    szczegółów przy zachowaniu rozsądnego rozmiaru pliku (`rivers-2km5`
    ≈ 433 KB, `lakes-2km5` ≈ 1.9 MB) i bez zależności runtime; render w
    przeglądarce pozostaje poniżej ~2 s po pierwszym załadowaniu warstw.
  - Asynchroniczne ładowanie warstw jest opcjonalne — błąd pobrania nie
    psuje mapy państw i pinezek.
- Powiązania: 0001, 0003, 0009, 0010
