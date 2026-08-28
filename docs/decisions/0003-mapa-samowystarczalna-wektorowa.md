# 0003 — Samowystarczalna wektorowa mapa świata (Natural Earth / TopoJSON)

- Status: Zaakceptowana
- Data: 2026-08-27
- Kontekst: Właściciel chce mapę świata ze zoomem (scroll myszki, pinch na
  telefonie) w aplikacji, która działa na Pages **i lokalnie**. Zewnętrzne
  kafelki (OSM/Leaflet) wymagają internetu w chwili oglądania i dodają
  zależność; rastrowe odwzorowania świata są ciężkie i rozmywają się przy
  zoomie. Sandbox ma zablokowany swobodny egress, ale rejestr npm działa.
- Decyzja:
  - Bazą mapy jest plik `assets/map/countries-50m.json` — TopoJSON z pakietu
    npm `world-atlas` (dane Natural Earth, domena publiczna; licencja pakietu
    ISC w `assets/map/LICENSE.world-atlas`), zvendoryzowany do repozytorium.
  - Dekodowanie TopoJSON → geometria + projekcja **walcowa równoodległa**
    (equirectangular: `x = (lon+180)/360·W`, `y = (90−lat)/180·H`) odbywa się
    własnym kodem w `app/geo.js` — bez bibliotek.
  - Render: SVG. Pan (przeciąganie), zoom do kursora (kółko myszy), pinch
    (dotyk), dwuklik, przyciski +/−/reset. Pinezki żyją w tym samym układzie
    współrzędnych świata, a ich rozmiar jest kompensowany odwrotnie do
    skali widoku (stały rozmiar ekranowy).
  - Dokładność 50m wystarcza do umieszczania pinezek na poziomie regionu;
    współrzędne wpisów są pełnoprawnymi danymi dziesiętnymi i mogą być
    używane w przyszłości z dokładniejszą mapą.
- Konsekwencje:
  - Mapa działa w 100% offline i na Pages, bez zewnętrznych żądań; rozmiar
    assetu ~0,75 MB (jeden plik, cache'owany przez przeglądarkę).
  - Skrajne zoomy nie pokażą szczegółów ulic — świadomy kompromis na rzecz
    samowystarczalności; dokładniejsza siatka (10m) lub warstwa kafelków
    może przyjść później jako opcja (patrz `docs/BACKLOG.md`).
  - Linia zmiany daty i bieguny są trywialne w projekcji walcowej — brak
    special-case'ów, ale Antarktyka wygląda rozciągnięta (akceptowalne).
- Powiązania: 0001
