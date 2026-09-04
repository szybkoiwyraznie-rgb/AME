# BACKLOG — pomysły rozpoznane, ale niezobowiązujące

> **To NIE jest lista zadań.** Zadania przydziela właściciela w czacie.
> Backlog przechowuje rozpoznanie pomysłów (żeby nikt nie robił go drugi raz).
> Pomysły agentów są mile widziane — dopisuj sekcjami z datą i autorem.

## Aplikacja / UX

- **„Arena Rezonansu” (idle battler)** — grywalizacja na zlecenie właściciela
  (M8, C2). Staty bytu WYPROWADZANE z rekordu indeksu (backlinki, powiązania,
  skity, epitety, motywy) — determinizm ADR 0002, losowość tylko ze
  wstrzykniętego RNG. Projekt: `docs/plans/POMYSL_arena-rezonansu-idle-battler.md`.
  Zręby: `app/arena.js` (`statyManifestacji`, runda) + `test/arena.test.js`.
  **Do decyzji właściciela: zakres widoku (osobny `#arena` vs profil bojowy w
  kartotece) i ton (Rezonans/spór tradycji, nie „krew i HP”).** Wpięcie do UI
  dopiero po akceptacji.

- **Deep-linki** `#/slug`: adresowalne wpisy + stan mapy w URL (kandydat do
  F2). Podstawa: `location.hash`, brak zależności.
- **Klastrowanie pinezek**: przy > 50 wpisach mapa zrobi się ciasna; prosty
  grid-clustering w przestrzeni ekranu wystarczy na start.
- **Miniatury na pinezkach** przy wysokim zoomie (obraz 21:9 małpowany w marker).
- ~~**Strona tagu**~~ — **WDROŻONE (2026-08-30, PR #10, C2 pętla jakości):** klik
  w tag → filtr mapy + warstwa `#tag:<slug>` z kategorią, opisem i listą
  manifestacji (klik → kartoteka), adresowalna i z przyciskiem „kopiuj link”.
- ~~**Tryb „wylosuj manifestację”**~~ — zrealizowane w M7 (PR #6, C2): przycisk
  „🎲 wylosuj” losuje z widocznej puli (filtr/tag zawężają), pomija ostatni los
  i przelatuje do bytu na mapie; `wylosujSlug` deterministyczna przy
  wstrzykniętym RNG (opcja seeda z daty pozostaje otwarta). Do akceptacji
  właściciela przed live.
- **Warstwa kręgów kulturowych**: otoczki/halo grupujące wpisy jednej tradycji
  (słowiańska, algonkińska, nordycka…) — wymaga tagu-kręgu jako konwencji.
- ~~**Mapa tematyczna — rozszerzenia (ADR 0020, M14)**~~ — **WDROŻONE (2026-08-30, PR #10):** M1 hipsometria raster, M2 szczyty/POI (NE 10m), M3 Pleiades (miejsca historyczne) + podkłady online (opentopo/osm/esri World Imagery, bez klucza, ręcznie włączane). Wszystkie warstwy domyślnie **wyłączone** (100% offline bez zgody na sieć). **Zmiany po recenzji (2026-08-30):** warstwy „lasy” (WWF), „urban” i „morza” **usunięte** (A), Esri „świat fizyczny” **usunięty** (A2), zoom online do technicznego maksimum źródeł ×524 288 (kafelki z≈19; blokada wg 67 obrotów kółka wycofana po uwadze, że różne rejony mają różny maksymalny zoom — A); POI/miejsca historyczne — nazwa on-press (B) i przy wyłączeniu podkładu widok oddala się w miejscu (B2); warstwa nazwana „Szczyty” (C); zapamiętywanie warstw i widoku w localStorage (D); sekcja „Tomy i Epoki” w karcie bytu (E).
- **Mapa tematyczna — dalsze kierunki (po M3):** GeoNames szczyty (CC BY 4.0) i DARE/AWMC drogi rzymskie (CC BY-SA 3.0) — wete na rzecz NE/Pleiades w M3; katalog źródeł w `docs/ASSETS.md`.
  drogi główne, POI typu szczyty, kompleksy leśne i kolorowa wysokość n.p.m.
  Research (patrz `docs/plans/RESEARCH_mapa-warstwy-2026-08-30.md`)
  znalazł realne źródła offline: **Natural Earth 10m physical** —
  `geography_regions_elevation` (poligony hipsometryczne = kolorowe
  wypełnienie wg wysokości, public domain), `geography_regions_points`
  (nazwane szczyty), `urban_areas`, `glaciated_areas`, `marine_polys`;
  **GeoNames** (szczyty, CC BY 4.0, atrybucja); **WWF Ecoregions 2017**
  (biomy leśne = „kompleksy leśne”, CC BY 4.0, 150 MB → wyciąg + simpl.);
  **OSM/Overpass** `landuse=forest` (ODbL, jednorazowy vendor);
  **Pleiades** (miejsca antyczne, CC BY 3.0) i **DARE/AWMC** (drogi rzymskie,
  CC BY-SA). **Pakiety `earth-roads|peaks|forests|relief-*` — nadal E404.**
  Warstwy online (opcjonalne, wymagają zgody na ADR 0001/0003 + atrybucja):
  OSM tiles, OpenTopoMap, Esri static basemaps, CARTO (free 5M req/mc,
  klucz API). **Rekomendacja: M1 = NE 10m (public domain, ~<3 MB),**
  M2 = GeoNames + lasy, M3 = historyczne Pleiades/DARE.
- **Oś czasu manifestacji**: sortowanie po epoce pierwszego odnotowania;
  wymaga pola `data_pierwszego_odnotowania` w schemacie (migracja indeksu).
- **Wersja EN wpisów**: pole `nazwa_en` / dwujęzyczne sekcje — dopiero po
  decyzji właściciela (podwaja koszt utrzymania treści).
- **PWA / offline**: service worker cache'ujący assety; wymaga HTTPS (Pages OK)
  i ADR (zmienia charakter aplikacji statycznej).
- **Import metadanych kart**: narzędzie sesji (nie przeglądarka!) pobierające
  dane karty (nazwa, set, artysta, flavor) do pola `karta` wpisu (metadane, nie lore);
  egress sandboxa jest zablokowany, więc przez `fetch_page`/`web_search`.

## Treść / protokół

- ~~**Kanon tagów**~~ — zrealizowane w M4 (ADR 0016): kategorie z limitami w
  `data/kanon-tagow.json`, walidator i prezentacja pasmami. Kandydaci dalej
  otwarci: kategoria „pora aktywności” (noc/dzień/sezons) i „język źródła”.
- ~~**Wzór „Trophy Room”**~~ — **WDROŻONE (2026-09-04, PR #13, C2 pętli
  jakości):** przycisk „🏆 trofea” w topbarze → warstwa z galerią dowodów
  eliminacji (pierwotne + wtórne) ze wszystkich kart; rekord indeksu niesie
  `trofea`, więc widok nie dociąga pełnych wpisów; nazwa bytu otwiera jego
  kartotekę; deep-link `#trofea` (cache-bust `c5-11`). Do akceptacji
  właściciela przed live.
- **Zasady citowania w aplikacji**: sekcja III jako przypisy z linkami
  do repozytoriów cyfrowych (archive.org itp.) — sprawdzać dostępność linków.

## Infrastruktura

- ~~**Test budżetu dokumentacji**~~ — **WDROŻONE (2026-09-04, PR #17, C2 pętli
  jakości):** `tools/budzet-lektury.mjs` mierzy zbiór lektury startowej §0
  (AGENTS, PROTOKÓŁ, rejestr + wszystkie ADR-y, LESSONS, ENVIRONMENT) i szacuje
  tokeny heurystyką 1 tok ≈ 4 znaki; `test/budzet.test.js` pilnuje progu
  40 tys. tokenów (dziś ~29,5 tys. = 74%) oraz kompletności listy. Do
  akceptacji właściciela przed live.
- ~~**Lint stylu wpisów**~~ — **WDROŻONE (2026-09-04, PR #17, C2 pętli
  jakości):** `tools/lint-stylu.mjs` wykrywa żargon kart (haste, trample,
  mana, żeton, talia…; granice słów unicode, bez fałszywych trafień typu
  „mano”) w sekcji II wpisów i dialogach SKITów (PROTOKÓŁ §8.4, ADR 0005);
  spięty z `npm run check` i testami w `test/lint-stylu.test.js`; cały
  korpus (20 wpisów, 31 skitów) przechodzi.
## Kronika — propozycje rozwoju wizualizacji (2026-08-30)

- **Analiza:** `docs/plans/ANALIZA_kronika-rozwoj-2026-08-30.md` (co
  niewidoczne w raportach, S1–S3, D1–D3).
- ~~**S1**~~ — **WDROŻONE (2026-08-30, PR #10):** W1 ramka epoki
  (`iskra`/`pytanie`/`przebieg` — w summary i raporcie), W2 wykres osi
  mit/rac, W3 słupki zasięgów przed→po, W4 linie paliwa, W5 słupki
  dominacji, W6 diagram relacji (łuki), W7 oś czasu wątków, W8 „dziennik
  zmiany”, W9 heatmap byt×epoka, W10 łuki relacji na mapie epoki.
- ~~**S2**~~ — **WDROŻONE (2026-08-30, PR #10):** feed epok w aplikacji
  głównej (przycisk „📜 kronika” + `#kroniki`), filtr bytów na stronie
  Tomu i w feedzie, deep-link `#kronika:<slug>`. (Karty multimedialne —
  S2-propozycja w ANALIZIE — wciąż do decyzji właściciela.)
- ~~**S3**~~ — **WDROŻONE (2026-08-30, PR #10):** graf epok z odwołaniami
  `meta.poprzednik`/`meta.kontynuacja` + rozgałęzienia, `docs/kronika.html`
  (spis Tomów) i obsługa wielu Tomów w generatorze. Indeks tematów skitów —
  zostaje w kolejce.
- **Uwaga techniczna:** `zielone` pozycje z §10 (feed epok, karta epoki,
  oś czasu, filtr) są teraz **w aplikacji głównej i na stronach Kroniki.**


## Zrealizowane w M3 (2026-08-28)

- Baza Skitów + sekcja VI + `#skit:<slug>` (ADR 0013) i feed „Co nowego"
  (ADR 0014) — pomysły z tego rejestru weszły do kodu; patrz `docs/ROADMAP.md`.

## Rozpoznane w sesji M3 (2026-08-28) — po poprawkach z testów

- ~~**Reakcja na zmianę preferencji systemu**~~ — **WDROŻONE (2026-09-04, PR
  #17, C2 pętli jakości):** `sledzPreferencjeSystemu()` w `app/app.js`
  nasłuchuje `change` na `prefers-color-scheme` i przełącza motyw tylko
  dopóki użytkownik nie zapisał własnego wyboru w `localStorage`.
- ~~**Miniatura wizualizacji w wierszu kartoteki i w liście**~~ — **WDROŻONE
  (2026-09-04, PR #13, C2 pętli jakości):** wiersz listy manifestacji z polem
  `obraz` dostaje miniaturę 21:9 (`<img loading="lazy">`, klasa
  `wiersz ma-miniature`, kadr po lewej, tekst w kolumnie); brak obrazu = układ
  bez zmian (cache-bust `c5-10`). Do akceptacji właściciela przed live.
- ~~**Kopiuj link do wpisu**~~ — zrealizowane w M4 (C2): `ui.linkWidoku` +
  `ui.przyciskKopiowania`, przycisk „⧉ kopiuj link" w kartotece (obok ✕) i w
  warstwie skitu; test pilnuje, że handlerzy obu warstw obsługują `[data-kopia]`.
- **Kontrola żywości adresów źródłowych** — skrypt sesji (narzędzia agenta), NIE
  CI: egress sandboxa jest ograniczony (L3), a linki bywają przenoszone.
  Wymagałby decyzji: martwy link = ostrzeżenie czy błąd walidatora.
  **Przypadek rozstrzygnięty:** Theoi „HephaestusWorks” w kartotece
  `talos-kreta` padał z 404 („File not found”) 2026-08-30; przy pogłębianiu
  wpisu 2026-09-04 strona znów odpowiada 200 i zawiera passus o Talosie
  (adres zostaje). Lekcja: jednorazowy 404 Theoi bywa przejściowy —
  przed wymianą linku sprawdzić ponownie po czasie.
- ~~**Widok druku (media print) dla warstwy wpisu**~~ — **WDROŻONE (2026-08-30, PR #12, C2 pętla jakości):** przycisk „🖨 drukuj” w kartotece → `window.print()`; arkusz `@media print` chowa topbar/mapę/listę i pokazuje otwartą kartotekę na białym tle z ciemnym tekstem (cache-bust `c5-8`). Do akceptacji właściciela przed live.
- **Znacznik „źródło bez adresu” w UI** — pozycje bez `url` (papier) warto
  oznaczać inną kursywą, żeby czytelnik wiedział, czego nie da się kliknąć.
- **Aspekt motywu w testach** — trzymać kontrakt tokenów (lista zmiennych
  wymaganych w obu paletach) jako test danych, gdy paleta urośnie.

## SKITy — rozpoznane kierunki dalszej pracy (M3)

- ~~**Indeks tematów skitów**~~ — **WDROŻONE (2026-09-04, PR #15, C2 pętli
  jakości):** wyszukiwarka w Bazie Skitów (`#skity-filtr`) filtruje wiersze po
  temacie, tytule i uczestnikach; `temat` pozostaje katalogowe (§8.1 — nie
  renderowane jako tekst), więc trafia do atrybutu `data-temat` w base64
  (cache-bust `c5-13`). Do akceptacji właściciela przed live.
- ~~**Widok „rozmowy” na mapie**~~ — **WDROŻONE (2026-09-04, PR #14, C2
  pętli jakości):** otwarcie skitu rysuje łuki między pinezkami uczestników
  (osobna warstwa `.rozmowa` nad łukami powiązań; czysta `paryRozmowySkitu`
  liczy pełne spójne pary; zamknięcie warstwy czyści mapę). Bez animacji —
  statyczne łuki; animowane „przebiegnięcie” rozmowy zostaje pomysłem
  (cache-bust `c5-12`). Do akceptacji właściciela przed live.
- ~~**Walidator opisów `meta.modyfikacje`**~~ — **WDROŻONE (2026-09-04,
  PR #14, C2 pętli jakości):** `bladOpisuMeta` w `tools/rebuild-index.mjs`
  odrzuca oznaczenia wewnętrzne (`C1`/`C2`/`C3`, `M<n>`, `B<n>`,
  „Pętla Jakości", „PROTOKÓŁ") w `meta.modyfikacje[].opis` wpisów i skitów;
  cała baza przechodzi (0 fałszywych trafień), testy kontraktowe w
  `test/schema.test.js` i `test/skit.test.js`.
- **Walidator spójności faktograficznej** — heurystyka ostrzegająca, gdy skit
  przywołuje zwyczaj/nazwę własną nieobecną w kartach uczestników (twarda
  egzekucja wymaga NLP — poza zakresem ADR 0001).
- ~~**Nagrania/lektor**~~ — **WDROŻONE (2026-08-30, PR #12, C2 pętla jakości):** przycisk „🔊 odsłuchaj” w widoku skitu czyta dialog na głos (Web Speech API, głos `pl-PL`, jeśli dostępny), „⏹ stop” przerywa; brak API = przycisk grzecznie się poddaje (cache-bust `c5-9`). Do akceptacji właściciela przed live.
