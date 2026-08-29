# 0009 — Adaptacyjny widok mapy w pikselach kontenera i cięcie geometrii na szwie (±180°)

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Testy właściciela (2026-08-28) wykazały dwa defekty renderu mapy
  (ADR 0003). (1) „Mapa jest jakby rozciągnięta w poziomie … sztywne wciśnięcie
  całej mapy w wolny obszar”: viewBox był stały (3600×1800) z
  `preserveAspectRatio="xMidYMid slice"`, a `dopusc()` spinał przesunięcia do
  zera przy k=1 — przy proporcjach okna innych niż 2:1 rama ucinała bieguny
  (okna szerokie) albo długości geograficzne (okna wąskie), a otwarcie panelu
  jako kolumny 42 vw zmieniało kontener, więc skala podskakiwała. (2) „Obszar
  Rosji rozlewa się na dwa poziome prostokąty … jeden równoleżnik jest
  nienaturalnie gruby”: zmierzone w `assets/map/countries-50m.json` — pierścień
  lądowy Rosji (4894 pkt) ma dwa przeskok i ~359,9° przez szew, Fidżi ma
  10-punktowy pierścień na -16,45° (pozorny „gruby równoleżnik” na wysokości
  Madagaskaru), Antarktyda jest rozcięta na szwie. Natural Earth zapisuje takie
  geometrie z przeskokiem; linearna projekcja walcowa zmienia każdy przeskok w
  cięciwę przez całą szerokość mapy.
- Decyzja:
  1. **Widok liczony z kontenera.** viewBox = rozmiar kontenera w pikselach CSS;
     grupa świata skalowana o `skalaBazowa · k`, gdzie
     `skalaBazowa = min(szer/3600, wys/3600)` (contain, nie slice; świat
     Merkatora jest kwadratowy). Funkcja `dopasujWidok` w `app/geo.js` jest
     czysta i testowana: utrzymuje jednostajną skalę w obu osiach (bez
     rozciągu), docina przesunięcia do brzegów świata, a gdy świat jest
     mniejszy od okna — wyśrodkowuje go.
  2. **Reagowanie na rozmiar.** `ResizeObserver` na kontenerze + `window.resize`;
     przy zmianie rozmiaru zachowywany jest punkt świata pod środkiem okna, więc
     kartoteka otwierana jako warstwa (ADR 0010) nie „porusza” mapą.
  3. **Cięcie na antypołudniku w dekodowaniu.** `potnijPierscien` (w `geo.js`)
     rozcina każdy pierścień z przecięciem ±180° na kawałki po jednej stronie
     szwu i domyka je wzdłuż antypołudnika (= krawędź mapy, niewidoczna);
     pierścienie rozcięte na szwie nieparzyście (Antarktyda) domykane są wzdłuż
     bieguna. Krawędzie leżące dokładnie na szwie (180° ↔ -180° na tej samej
     szerokości) traktujemy jako przejście po szwie, nie jako cięciwę.
     Pierścienie bez przecięcia wracają bez zmian — ścieżka najkrótsza.
  4. **Jednostki UI mapy.** Rozmiary pinezek, etykiet i obrysów są w pikselach
     CSS (grupa pinezki kompensuje skalę widoku; obrysy przez
     `vector-effect: non-scaling-stroke`).
  5. Globalne niezmienniki renderu pilnują testy na prawdziwym TopoJSON: brak
     punktów poza prostokątem świata, brak odcinka dłuższego niż połowa
     szerokości mapy (wyjątek: odcinki leżące na ramach), obecność Rosji przy
     obu krawędziach, siatka w tym samym układzie co lądy.
- Konsekwencje:
  - Przy bardzo szerokich oknach po bokach widać tło (marginesy) zamiast
    rozciągniętego lądu — świadoma cena uczciwej projekcji; wypełnia je ocean.
  - Antarktyda i Rosja po cięciu mają „obcięte” brzegi przy ±180° — tak samo
    rysuje je każda płaska mapa świata; ADR 0003 określa projekcję
    (Mercator) i samowystarczalność, ten ADR dotyczy widoku i obróbki
    geometrii na szwie. Szerokości >85,051° są przycięte do krawędzi świata.
  - Render jest deterministyczny i nadal bez zależności (ADR 0001); koszt —
    dodatkowy przebieg po pierścieniach przy starcie (0 ms na 241 krajach).
- Powiązania: 0001, 0003, 0010
