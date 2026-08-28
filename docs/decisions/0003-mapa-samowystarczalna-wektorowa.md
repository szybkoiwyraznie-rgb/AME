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
  - Dekodowanie TopoJSON → geometria + projekcja **walcowa Web Mercator**
    (kula, nie elipsoida: `x = (lon+180)/360·W`,
    `y = H/2·(1 − atanh(sin φ)/π)`, szerokości przycięte do ±85,05112878°)
    odbywa się własnym kodem w `app/geo.js` — bez bibliotek. Cel: lokalne
    proporcje (np. Polska) wyglądają jak w Google Maps; świat jest kwadratowy
    3600×3600 j.u.
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
  - Linia zmiany daty i cięcie na szwie pozostają trywialne w projekcji
    walcowej; szerokości >85,051° są przycięte na krawędzi świata, więc
    Antarktyka to dolny pas mapy (standard Web Mercator, tak samo Google).
- Powiązania: 0001
