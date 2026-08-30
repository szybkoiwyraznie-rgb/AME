# ROADMAP — Archiwum Manifestacji Eterycznych

> Plan faz; status aktualizowany na końcu każdej sesji (ostatnio: 2026-08-29,
> sesja po PR #9: audyt + Pętla Jakości C1→C3→C2). Szczegóły bieżącego zadania żyją w
> `docs/plans/PLAN_*.md`.
> Nowe pomysły → `docs/BACKLOG.md`.

## F0 — Fundament (SESJA 2026-08-27) — ✅ UKOŃCZONA

- [x] Struktura repozytorium i zasady: `AGENTS.md`, `docs/PROTOKOL.md`,
      rejestr ADR (0001–0006), `docs/setup/ENVIRONMENT.md`, LESSONS,
      ROADMAP, BACKLOG, ARCHITECTURE, WORKFLOW, PROJECT_HISTORY.
- [x] Narzędzia: `tools/rebuild-index.mjs` (walidacja schematu wpisów, rama
      promptu 21:9, spójność powiązań) + testy node --test.
- [x] Aplikacja v1: samowystarczalna mapa SVG (pan/zoom: drag, kółko myszy,
      pinch, dwuklik, przyciski), pinezki, panel wpisu (sekcje I–V, tagi,
      powiązania + backlinki), filtry/szukanie, lista wpisów, warstwa łuków
      powiązań, tryb `file://` z instrukcją.
- [x] Dwa wpisy przykładowe: `wendigo` (Tarmogoyf), `zmora` (Nightmare)
      — pełne kartoteki wg protokołu, wzajemnie powiązane.
- [x] Wizualizacje 21:9 dla obu wpisów (`assets/wizualizacje/`).
- [x] CI (GitHub Actions: `npm test` + build) — przepis w `docs/setup/ci-workflow.yml`
      do wklejenia przez właściciela (token agenta bez uprawnień `workflows`);
      instrukcja włączenia Pages.

## PĘTLA JAKOŚCI — domyślna praca sesji (ADR 0007)

Gdy po audycie (B) brak zaległości, brak zlecenia właściciela i brak otwartych
zadań w planie sesji, sesja pracuje rekurencyjnie **do wyczerpania budżetu
sesji**:

- **C1 — treść (wiki):** przegląd wpisów (priorytet: ostatnio dodane),
  research w źródłach www (obowiązkowy — ADR 0008), uzupełnianie informacji
  i źródeł, powiązania między manifestacjami, grupowanie tagów, rozwój
  przeklikiwalnej sieci na wzór Wikipedii.
- **C2 — featury:** wymyślenie pasującej funkcji AME (bank pomysłów:
  F2–F4, `docs/BACKLOG.md`), zakodowanie z testami, zaprezentowanie
  właścicielowi w PR **do akceptacji przed uruchomieniem live**.

**Polerowanie dokumentacji NIE jest częścią Pętli Jakości** — wykonuje się
je wyłącznie na wyraźne zlecenie właściciela w sesji. Od tego odróżniamy
**faktyczny zapis tego, co przyniósł commit/sesja** (ROADMAP, PROJECT_HISTORY):
to część dziennika pracy, nie kosmetyka tekstu — robimy go przy każdej
zmianie, niezależnie od „polerowania”.

## Pętla Jakości (po M15) — C1 → C3 → C2 — ✅ w PR #7 (C2 do akceptacji)

- [x] **C1 — domknięcie sieci:** `indra ↔ drangue-shala` (dwaj herosi burzy
      uwalniający wodę) oraz `nessos ↔ selkie-sule-skerry` (oby dwaj na granicy
      wody, zdrada przez zaufanie). Żaden wpis nie zostaje bez backlinku.
- [x] **C3 — nowy SKIT:** `data/skity/znak-burzy.json`, „Znak burzy” —
      trio Indra × Drangue × Barbarossa (unikalny skład, 221 słów), temat
      „kto ma prawo wrócić, gdy nadejdzie grzmot”.
- [x] **C2 — deep-link do filtra tagów:** `#tag:<tag>` otwiera mapę z aktywnym
      filtrem, chip aktualizuje URL przez `history.replaceState`, tag
      walidowany względem kanonu; helper `tagZFragmantu` + testy.
- [x] Weryfikacja: `npm test` **150/150**, build 10 wpisów / 14 SKITów /
      38 feed / 27 tagów, commit `f8265c0`.

## Pętla Jakości (po M15) — twórczy rozwój idei KRONIKI

- [x] **Zamiast nowej featurki:** pierwsza **konkretna próbka** modelu
      `SKIT + skutek` — `docs/plans/PROTOTYP_kroniki-epoka-1.md`.
- [x] Epoka 1 „Znak burzy” zbudowana na istniejącym SKICIE (Indra × Drangue ×
      Barbarossa), role z `profileKartoteki` (Drapieżnik/Pieśniarz/Filar).
- [x] Rekord `data/kronika/epoka-1-*.json` jako szkic: `skit`, `iskra`,
      `uczestnicy`, `przebieg`, `skutek`, `meta`; narratorski „Kronikarz
      zapisuje” + następna iskra z długu po epoce 1.
- [x] Wkład do `KONCEPCJA_metagra_pytania-otwarte.md` §6: wstępne odpowiedzi
      na **P3** (wydarzenie = SKIT + skutek), **P7** (minimalny format epoki),
      **P9** (epoka jako opcjonalna warstwa narratorska) — do decyzji właściciela.
- [x] Stan: prototyp koncepcyjny, bez kodu i bez walidatora (zgodnie z M13).

## Poprawka mapy: Web Mercator + klikalne nazwy miast (uwagi właściciela)

- [x] **A — proporcje mapy:** projekcja równoodległa rozciągała Polskę
      ~1,7× w poziomie (1° dł. = 1° szer. na ekranie to błąd dla średnich
      szerokości). Zamiana na **Web Mercator** (±85,051°): świat kwadratowy
      3600×3600, lokalne kształty jak w Google Maps; test „Polska ≈ 1,06:1”.
- [x] **B — etykiety miast:** klik w kropkę miasta (promień 16 px) pokazuje
      pływającą tabliczkę z nazwą i populacją; drag/pinch nie wywołuje etykiety,
      klik w pinezkę ją chowa. Podpowiedź w UI zaktualizowana.
- [x] Weryfikacja: `npm test` **150/150**, `npm run build` zielony, ADR 0003/0009
      i ARCHITECTURE/README zaktualizowane.

## Pętla Jakości po poprawkach mapy (audyt przed sprawdzeniem właściciela)

- [x] **Audyt B:** znaleziony defekt — otwarta etykieta miasta wisiała nad
      pustym punktem po wyłączeniu warstwy „Miasta” albo zoombie poniżej progu
      4 (kropki znikały, tabliczka zostawała).
- [x] **Poprawka:** `odswiezMiasta()` przy `!pokazuj` chowa otwartą etykietę
      (`ukryjEtykieteMiasta()`); dodatkowo `ustawMiasta()` czyści etykietę, gdy
      aktywne miasto zniknęło z danych.
- [x] **Test:** rozszerzony `mapa: klik w miasto…` — ponowne kliknięcie,
      wyłączenie warstwy i `reset()` (zoom poniżej progu) chowają tabliczkę;
      test symuluje klik po `getScreenCTM`/`DOMPoint`.
- [x] **Cache-busting:** podbijana wersja `?v=c4-1` w `index.html` i importach
      modułów — przy zmianie JS/CSS trzeba podnieść wersję, inaczej przeglądarka
      poda stare pliki (typowy objaw „mapa bez zmian”). Reguła opisana jako
      komentarz w `index.html`; działa na HTTP (lokalny serwer i GitHub Pages).
- [x] Weryfikacja: `npm test` **151/151**, `npm run check`/`build` zielone.

## F1 — Proces treściowy NA ZLECENIE (karty od właściciela — priorytet nad pętlą)

- [ ] Właściciel dostarcza kartę (nazwa+set albo grafika) → sesja tworzy
      pełny wpis MFM wg `docs/PROTOKOL.md` (analiza translacji → identyfikacja
      bytu → kartoteka → build → testy → commit).
- [ ] Rozbudowa istniejących opisów (pogłębienie sekcji II, nowe źródła w III).
      (M3: zrobione dla egungun i lincoln-imp; powtarzać przy każdej sesji C1.)
- [ ] SKITy dla nowych składów — odblokowują się wraz z przyrostem kartoteki (C3).
- [ ] Tagowanie we wspólne grupy i porządkowanie słownika tagów.
- [ ] Powiązywanie wpisów (uzasadnione `opis`-em), obserwacja spójności sieci.
- [ ] Odtwarzanie wizualizacji dla wpisów bez obrazu (rama 21:9, ≤ 2 MB).

### F1 — 2026-08-29: pięć materializacji na zlecenie (komplet)

- [x] **Dreams of Steel and Oil (BRO #92)** → `talos-kreta` — spiżowy
      automat z Krety: jedna żyła ichoru, gwóźdź w kostce.
- [x] **Coralhelm Guide (BFZ #74)** → `ben-varrey` — manxka syrena
      z Wyspy Man, przewodniczka znająca każde wybrzeże.
- [x] **Jwar Isle Avenger (OGW #58)** → `sfinks-teby` — skrzydlata lwica
      z góry Fikion, strażniczka przejścia przez zagadkę.
- [x] **Aerith Rescue Mission (FIN #5)** → `kannon-hase` — bodhisattwa
      miłosierdzia z Hasedery, wybawicielka z pielgrzymki 33 Kannon.
- [x] **Wrap in Flames (MM2 #136)** → `agni` — wedyjski bóg ognia
      ofiarnego, który rozprasza ciemność i obezwładnia przeciwników.
- [x] Każdy wpis: pełne sekcje I–V, ≥3 źródła z adresami https, tagi
      z kanonu (dopisane `man`, `japonia` i kategorie bytów/motywów/form),
      powiązania zwrotne do sieci, wizualizacja 21:9 (≤ 2 MB).
- [x] Sieć domknięta: nowe byty weszły w powiązania z
      nessos/kentaur/empusa/egungun/indra/barbarossa; kultury 8 → 10.

## M3 (2026-08-28) — poprawki z testów właściciela — ✅ KOŃCZONA (czeka na scalenie PR #2)

- [x] **A1** proporcje mapy: widok liczony z kontenera (contain), brak
      rozciągu i podcinania biegunów, brak skoku przy otwarciu kartoteki (ADR 0009).
- [x] **A2** motyw jasny/ciemny: przełącznik w prawym górnym rogu, tokeny CSS,
      `localStorage`, start od `prefers-color-scheme` (ADR 0010).
- [x] **A3** cięcie geometrii na antypołudniku: koniec „rozlanej Rosji” i
      pozornego grubego równoleżnika (Fidżi) — ADR 0009, lekcja L7.
- [x] **A4/A5** pinezka większa + pole trafienia, badge nazwy 19 px z pleckami.
- [x] **B1** kolejność sekcji jako standard: UI, przykłady, manual (ADR 0011);
      uściślenie właściciela (2026-08-28): numeracja idzie za kolejnością —
      I Wizualizacja … V SKITy (od v1.8 bez „Rezonansu” — ADR 0022),
      układu v1.3-1.7 pilnował ADR 0012.
- [x] **B2** kartoteka jako pełnoekranowa warstwa, wizualizacja na całą
      szerokość opisu (ADR 0010).
- [x] **B3** `dokumentacja[].url` w schemacie i walidatorze, linki w UI,
      adresy zweryfikowane w sieci (ADR 0011).
- [x] Uściślenie B1: numeracja sekcji idzie za kolejnością (v1.3, ADR 0012).
- [x] Audyt PR #1 + naprawa **przepisu** CI w repo (`docs/setup/ci-workflow.yml`);
      plik `.github/workflows/ci.yml` na `main` się nie parsuje (spuścizna przepisu
      F0) — stan zapisany jako znany i zamknięty: agent nie ma uprawnień `workflows`,
      czynność właściciela była jednorazowa i wykonana, więc wątku nie odnawiamy (L12).

## M3b (2026-08-28) — zlecenia: Baza Skitów i „Co nowego" — ✅ KOŃCZONA (w PR #2)

- [x] **SKITy** (ADR 0013, PROTOKÓŁ §8): format danych `data/skity/`,
      walidator (2–4 uczestników, unikalny skład, 60–300 słów, zakaz żargonu
      gry), indeks v2, Baza Skitów w UI (przycisk „✎ skity"), sekcja V pod
      kartą bytu (od v1.8; wcześniej VI), deep-link `#skit:<slug>`; pierwszy
      SKIT „PŁÓTNO I KAMIEŃ".
- [x] **C3 w Pętli Jakości** (nad C2): dopisywanie SKITa o nowym składzie.
- [x] **„Co nowego"** (ADR 0014): feed `aktualizacje[]` liczony z `meta`
      (powstania i zmiany wpisów oraz skitów), najnowsze na górze, przycisk
      „✚ nowości", linki do treści; rygor opisywania zmian w `meta.modyfikacje`.

## M3c (2026-08-28) — materializacje na zlecenie: Balor i Wielki Selkie — ✅ w PR #2

- [x] `balor` ← *Weftblade Enhancer* (EOE 44, 2025): pełny wpis v1.3, Tory Island
      (55.26, −8.22), 6 źródeł z adresami, wizualizacja 21:9.
- [x] `selkie-sule-skerry` ← *Kulrath Mystic* (ECL 56, 2026): pełny wpis v1.3,
      Sule Skerry, Orkney (59.08, −4.41), 4 źródła z adresami, wizualizacja 21:9.
- [x] Sieć: balor ↔ selkie (wypowiedziany termin), balor → lincoln-imp (złe
      spojrzenie), selkie → egungun (władza w rzeczy okrywającej ciało); backlinki
      z indeksu.
- [x] C3: SKIT „ZNAK I LICZBA” (unikalny skład balor + selkie-sule-skerry, 248
      słów) → sekcja V obu kart (od v1.8) i pozycja w feedzie.
- [x] Stan bramy: `.github/workflows/ci.yml` na `main` naprawiony przez
      właściciela (PR #3) i włączony do gałęzi sesji merge’em; w repo została receptura + test
      „przepis CI jest wklejalny” pilnują formy (L9, L12).

## M4 (2026-08-28) — rygor 300 słów + pierwszy pełny obieg pętli — ✅ w PR #2

- [x] Limit SKITa 250 → 300 słów (ADR 0015, PROTOKÓŁ v1.4) + test kontraktowy
      spójności liczby w kodzie i dokumentach.
- [x] Audyt PR #3 (naprawa CI) + lustro receptury z testem rozjazdu; dokumenty
      przestały głosić nieaktualnego „martwego CI”.
- [x] C1: pogłębienie `selkie-sule-skerry` (Dennison, Hibbert, Marwick, sea-kist,
      siedem łez), +2 źródła z adresami, opis w meta → feed.
- [x] C3: SKIT „HOŁD ORAZ ŚWIATŁO” (276 słów, trio balor × egungun × lincoln-imp).
- [x] C2: „⧉ kopiuj link” w kartotece i w warstwie skitu + test kontraktowy
      handlerów (featura czeka na akceptację właściciela).
- [x] C2 (drugie): kanon tagów — `data/kanon-tagow.json`, `walidujKanon` +
      `walidujTagi`, indeks v3, pasek pasmami kategorii, chipy ze skrótem
      kategorii w karcie; migracja tagów wszystkich sześciu wpisów (ADR 0016).

## M6 (2026-08-28) — badge pinezek A1–A3 + godzina w „Co nowego” (B) — ✅ w PR #5

- [x] **A1** badge nazwy tylko po najechaniu / fokusu klawiatury i na
      zaznaczonej pinezce — stałe pokazywanie od progu zoomu (klasa
      `przyblizona`) zniesione.
- [x] **A2** przeciąganie mapy nie zaznacza napisów badge'ów:
      `user-select: none` na `.mapa-svg`.
- [x] **A3** napisy nad pinezkami: grupa `.etykiety` w DOM za `.pinezki`
      (kolejność malowania SVG); zweryfikowane pikselowo w headless Chromium.
- [x] **B** „Co nowego” podaje datę i godzinę zdarzenia (ADR 0017, protokół
      v1.5): `meta` przyjmuje `RRRR-MM-DD GG:MM`, sort dat po znakach
      (deterministyczny), feed renderuje `datetime` z godziną.

## M6b (2026-08-28) — Pętla Jakości sesji M6: C1 → C3 → C2 — ✅ w PR #5 (C2 do akceptacji)

- [x] **C1** `drangue-shala`: relacja terenowa Edith Durham (obserwacje 1908,
      druk 1910, JRAI XL; odbitka na Internet Archive) + powiązanie z Balorem —
      zwycięstwo rzutem kamienia z ręki bohatera.
- [x] **C1** `barbarossa-kyffhaeuser`: pełny tekst wiersza Rückerta
      (Volksliederarchiv; powstanie 1815, pierwszy druk „Kranz der Zeit" 1817,
      melodia Gersbacha 1824) + powiązanie z Egungun — przodek, który wraca
      rytuałem.
- [x] **C3** SKIT „Godzina otwarcia" (Balor × Drangue — skład unikalny,
      239 słów); test porządku feedu uaktualniony do semantyki godzin
      (ADR 0017).
- [x] **C2** podgląd powiązań na najechanie/fokus: hover na pinezkę zwęża
      warstwę łuków do jej połączeń i podświetla sąsiadów (`.powiazana`),
      odlot przywraca stan; zweryfikowane w headless Chromium (zwężenie 11→5
      łuków). **Do akceptacji właściciela przed live** (ADR 0007).

## M6c (2026-08-28) — zlecenie: ton SKITów (humor i codzienność) — ✅ w PR #5

- [x] **PROTOKÓŁ v1.6 (ADR 0018):** §8 wprost sugeruje rejestr luźny — humor,
      codzienność, rozmowa „przy ognisku” o prostych sprawach; elegia to jeden
      z rejestrów, nie jedyny (po serii poważnych następna lekka). Sugestia
      autorska — rygory twarde (in-character, faktografia, unikalność składu)
      bez zmian, walidator nie mierzy „śmieszności”.
- [x] **SKIT demonstracyjny** „Kurz i pióra” (Drangue × Imp — skład unikalny,
      241 słów): ptaki pod dachem, kurz, pranie skrzydeł i „przeciąg wysokiej
      jakości” po oknach wybitych przez ima.

## M6d (2026-08-28) — zlecenie: dwie materializacje (F1) — ✅ w PR #5

- [x] **Empusa z Koryntu** — karta *Illusory Demon* (ARB #21, 2009): fantom
      Hekaty z jedną nogą z miedzi; czar trwa, dopóki niczego nowego nie
      rzucono — „When you cast a spell, sacrifice this creature” jako reguła
      koryńska. Źródła: Theoi (Suda, Filostrat VA 2.4/4.25, Eusebiusz),
      Wikipedia, pełny tekst „Żab” (MIT). Wizualizacja 21:9.
- [x] **Kentaur z Pelionu** — karta *Savage Surge* (THS #176, 2013): wino
      na weselu Pejrytoosa jako +2/+2 „do końca tury”, flavor „A centaur has
      two backs!” jako untap. Źródła: Theoi Kentauroi, Owidiusz Met. XII
      (Kline), Wikipedia Lapiths. Wizualizacja 21:9.
- [x] Kanon +4 tagi (`grecja`, `fantom`, `kentaur`, `furia`); kontrakty danych
      uaktualnione: 7 kultur źródłowych, ≥3 źródła na wpis, proza bez
      cyrylicy/CJK (transliteracje), chronologia feedu dosłowna (ADR 0017).

## M7 (2026-08-28) — audyt PR #5 + Pętla Jakości (C1 → C3 → C2) — ✅ w PR #6 (C2 do akceptacji)

- [x] **Audyt PR #5** (M6: badge A1–A3 + godzina B/ADR 0017 + pętla). Brama
      lokalna zielona, indeks deterministyczny, bez zaległości.
- [x] **C1** `egungun`: research www (Bolaji Campbell „Fabric of Immortality”,
      Wikipedia, Muzeum Snite) — „moce ukryte”, narastanie warstw płócien,
      nieludzki głos, wir jako przejście, role Alagby/kapłanki/śpiewaczek oríkì;
      +3 źródła z adresami, odwzajemnione powiązania (selkie, empusa,
      barbarossa). Naprawa root-cause: stopka karty pokazuje sam dzień, godzina
      tylko w feedzie (ADR 0017, PROTOKÓŁ §8.1).
- [x] **C3** SKIT „DWA ZEPSUTE WESELA” (Empusa × Kentaur z Pelionu — skład
      unikalny, 240 słów, rejestr lekki v1.6).
- [x] **C2** „🎲 wylosuj” (tryb ekspedycji): losuje z widocznej puli (filtr/tag
      zawężają), pomija ostatni los, przelatuje do bytu na mapie. Czysta
      `wylosujSlug` + 5 testów; zweryfikowane headless (8/8 osiągalnych, 0
      powtórzeń pod rząd, filtr respektowany). **Do akceptacji przed live (ADR 0007).**

## M8 (2026-08-28) — zlecenia A/B/C + Pętla Jakości — ✅ w PR #6 (C2 do akceptacji)

- [x] **A — SKITy 3–4 osobowe preferowane** (ADR 0019, PROTOKÓŁ v1.7 §8.2):
      stała `SKIT_ZALECANE_UCZESTNIKOW=3`, `podpowiedzSkladySkitow` + niełamiąca
      podpowiedź w buildzie. Minimum 2 zostaje (duety legalne).
- [x] **B — opis powiązania jako zdanie** (ADR 0019, §6.2): walidator odrzuca
      opis <12 słów i goły link (`POWIAZANIE_MIN_SLOW`). Istniejące (43–78 słów)
      przechodzą.
- [x] **C1** `lincoln-imp`: research www (dwaj impowie, anioł z hymnału, ucieczka
      do Grimsby, wiatr krążący za bliźniakiem) + 2 źródła + obustronne
      powiązania (balor, drangue).
- [x] **C3** SKIT „KALENDARZ POWROTÓW” — trio Barbarossa × Egungun × Selkie
      (demonstracja A; skład 3-osobowy, 252 słowa).
- [x] **C2** „Arena Rezonansu” (idle battler, zlecenie C): projekt
      (`docs/plans/POMYSL_arena-rezonansu-idle-battler.md`) + zręby `app/arena.js`
      (staty z rekordu, deterministycznie) + testy. **Do akceptacji właściciela:
      zakres widoku i wpięcie do UI.**

## M9 (2026-08-28) — luźne pomysły + Pętla Jakości (C1 → C3 → C2) — ✅ w PR #6

- [x] **Zlecenie właściciela:** `docs/LUZNE_POMYSLY_NA_PRZYSZLOSC.md` — 10
      kierunków (modele/zdolności, ekonomia, generator obrazów, kombinacje/fabuła,
      panowanie nad regionami, koalicje, mapa granularna, mapa+obrazy, quizy z
      modelami AI, modele AI zarządzające) + wątki przekrojowe i ryzyka
      (klucze API tylko w pamięci sesji). Arena Rezonansu (walka 1:1) wstrzymana.
- [x] **C1** `empusa-korynt`: recepcja literacka sceny korynckiej (Filostrat
      IV.25 → Burton 1621 → Keats „Lamia” 1820 → Goethe), +3 źródła z adresami.
- [x] **C3** SKIT „DWIE SKÓRY” — kwartet Drangue × Kentaur × Selkie × Empusa
      (pierwszy 4-osobowy skład; motyw podwójnej natury i „szwu”).
- [x] **C2** analiza 10 kierunków grywalizacji
      (`docs/plans/POMYSL_kierunki-grywalizacji-analiza.md`) + fundament bez żalu:
      `app/arena.js` — normalizacja percentylowa staty i archetypy
      (Filar/Drapieżnik/Splotca/Pieśniarz/Samotnik). **Wybór kierunku i wpięcie
      do UI — do decyzji właściciela.**

## M10 (2026-08-28) — pogłębienie koncepcji (SPLOT/KRONIKA) + treść — ✅ w PR #6

- [x] **Namysł (zlecenie właściciela):** `docs/plans/POMYSL_splot-i-kronika-koncepcja.md`
      — unifikacja A (SPLOT — świat, który się zmienia) + B (KRONIKA — wcielone
      spotkania przez **subagentów-postacie** z własnym dossier). Dwie
      architektury AI (rekomendacja 3b: rozgrywka jako dane w repo popychane
      przez kolejnych agentów Areny, bez kluczy w runtime), model danych Kroniki,
      ilustracje pregenerowane, przykład dossier (Balor). Bez kodu gry.
- [x] **C1** `kentaur-pelion`: metopy Partenonu jako świadectwo materialne
      kentauromachii, +2 źródła (Muzeum Akropolu, Wikipedia).
- [x] **C3** SKIT „NIEPROSZENI GOŚCIE” (trio Imp × Kentaur × Empusa) — metoda
      embodimentu (prototyp KRONIKI), rejestr lekki.

## M11 (2026-08-28) — rola obserwatora + uczciwe realia AI + treść — ✅ w PR #6

- [x] **Sprostowanie o AI (§1a koncepcji):** agent Areny to jeden proces w turze,
      nie powołuje niezależnych subagentów; „subagenci-postacie" to metafora metody.
      Trzy uczciwe opcje: symulowany wielogłos „blind-draft" (dziś), izolacja przez
      kolejne sesje (wolna), prawdziwa izolacja = 3a (klucze, osobny ADR).
- [x] **Rola gracza = OBSERWATOR** (decyzja właściciela): tryb domyślny SPLOTU;
      sprawiedliwość na systemie i bytach, nie na graczu.
- [x] **Pomysł (11)** do `LUZNE_POMYSLY`: fabuła jako niezależne timeline'y
      (rozszczepienie/dead-end/krzyżowanie) — Kronika jako graf wątków.
- [x] **C1** `balor`: oś proroctwa (Ethniu/Tor Mór/Loch na Súl), +1 źródło,
      obustronne powiązania z barbarossa i drangue (sieć balora domknięta).
- [x] **C3** SKIT „TRZY ZEGARY” (trio Barbarossa × Balor × Drangue) — blind-draft.

## M12 (2026-08-28) — przenośność platformy budowy (Meta.ai) + treść — ✅ w PR #6

- [x] **Analiza (zlecenie właściciela):** `docs/plans/POMYSL_platforma-budowy-przenosnosc.md`
      — rozróżnienie build-time (kto buduje: wymienny, granica = git PR) vs
      run-time (artefakt zostaje vanilla static, ADR 0001–0003). Meta.ai/„agent
      swarm" rozwiązuje INNY problem niż subagenci w grze: daje prawdziwą izolację
      przy GENEROWANIU Kroniki, bez kluczy w artefakcie. Rekomendacja: dodatkowa
      platforma, nie zamiennik reguł; pilot = jedna epoka Kroniki.
- [x] **C1** `selkie-sule-skerry`: „Lady Odivere", melodia Sinclaira/Anderssona,
      dedup źródła; domknięcie sieci (→ empusa, → kentaur).
- [x] **C3** SKIT „TRZY STOŁY” (trio Egungun × Barbarossa × Kentaur) — blind-draft.

## M13 (2026-08-28) — zawężenie: metagra w opracowaniu; reguła przenośności — ✅ w PR #6

- [x] **Stop pilotowi Meta.ai jako przedwczesnemu** (brak zaakceptowanej
      koncepcji metagry → nie ma czego testować). Brief pilota wycofany.
- [x] **Trwałe reguły** (`POMYSL_platforma-budowy-przenosnosc.md` §9): (1) projekt
      może prowadzić runner inny niż Arena (granica = git PR, brama w repo);
      (2) „głos pojedynczego bytu" wykonują odizolowani subagenci (swarm,
      priorytet) ALBO symulowani przez jednego agenta (blind-draft) — koncepcja
      uniwersalna, niezależna od platformy.
- [x] **Status metagry: NIEZAAKCEPTOWANA / W OPRACOWANIU.** Bez pilotów i kodu gry
      do czasu spójnej, zaakceptowanej koncepcji. Praca = tropy + Pętla Jakości.
- [x] **Konsolidacja koncepcji:** `KONCEPCJA_metagra_pytania-otwarte.md` — mapa
      11 otwartych pytań (pętla, świat, format Kroniki, skala) + co już ustalone;
      reguła: sesja myślenia odpowiada na pytania, nie mnoży wizji.
- [x] **C1** `kentaur-pelion`: Chejron jako kontrapunkt + jaskinia Pholosa,
      +1 źródło, powiązanie z empusą (drugi backlink kentaura).
- [x] **C3** SKIT „KOMU WOLNO PATRZEĆ” (trio Balor × Empusa × Imp) — blind-draft.

## M15 (2026-08-28) — materializacje: Thunderstaff (DST) i Savage Surge (THS) — C1+C3

- [x] **C1** `indra` — Indra (żywy bóg gromu, wadżra z kości Dadhichiego jako atrybut); 5 źródeł,
      nowy tag `indie` (typ: heros-burzy), lokalizacja Naimisharanya.
- [x] **C1** `nessos` — kentaur-przewoźnik z rzeki Euenos; 5 źródeł, powiązania
      z Chejronem i Empusą, lokalizacja Évinos.
- [x] **C3** SKIT „DWA GRZBIETY” — Nessos × Chejron × Indra (trio, unikalny).
- [x] Wizualizacje 21:9 dla obu wpisów + aktualizacja testu (8 kultur).
- [x] Indeks: 10 wpisów, 13 SKITów, 35 feed, 28 tagów; `npm test` 149/149.

## M14 (2026-08-28) — mapa granularna: warstwy tematyczne (ADR 0020) — ✅ w PR #7

- [x] **Zlecenie właściciela:** mapa o większej granularności bez etykiet
      państw; przedmiot: miasta, rzeki, POI typu szczyty, główne drogi,
      opcjonalnie lasy i wysokość n.p.m.
- [x] **Badanie źródeł:** dostępne offline to `@geo-maps/earth-rivers-*` i
      `@geo-maps/earth-lakes-*` (obszary OSM, MIT/ODbL) oraz
      `world-cities-json` (CC BY 4.0). Brak pakietów roads/peaks/forests/
      relief (`E404`), brak DEM w `@freetiler/nasa-bluemarble` (sam raster).
- [x] **Wdrożenie:** warstwy `.rzeki`, `.jeziora`, `.miasta`, `.poi` w `map.js`,
      LOD treści (`woda: 4`, miasta `4/7/10`), asynchroniczne `fetch` w `app.js`,
      panel `#przycisk-warstwy`, style CSS dla obu motywów, assety
      `rivers-2km5.json`, `lakes-2km5.json`, `miasta.json`, testy przed i po.
- [x] **Obecny zakres:** rzeki + jeziora + miasta (+ M1–M3 z 2026-08-30:
      szczyty/POI, miejsca historyczne, hipsometria, podkłady online).
      Drogi i wysokość n.p.m. w wektorze wymagają źródła offline — opisane
      jako plan w `docs/ASSETS.md` i ADR 0020. Warstwy „lasy/urban/morza”
      zrecenzowane i usunięte (2026-08-30).
- [ ] Drogi, POI/szczyty, kompleksy leśne i kolorowa wysokość n.p.m.
      (po znalezieniu wiarygodnego źródła danych offline).

## F2 — Jakość i ergonomia mapy

- [x] Deep-linki (`#<slug>` — stan mapy i otwartego wpisu; działa od M1, tu
      dopiero odnotowane zgodnie z audytem PR #1).
- [x] Pełny przegląd na małych ekranach — kartoteka jako pełnoekranowa warstwa
      zamiast bottom sheetu (M3).
- [ ] Klastrowanie pinezek przy niskim zoomie / deryterowanie etykiet.
- [ ] Miniatury wizualizacji na pinezkach przy wysokim zoomie.
- [x] Tryb „🎲 wylosuj” — losowanie manifestacji z widocznej puli i przelot do
      niej na mapie (M7, PR #6; do akceptacji właściciela przed live).
- [x] Czytelny kanon tagów i ich prezentacja (ADR 0016): słownik w danych,
      limity kategorii w walidatorze, pasek w pasmach z licznikami i opisami.
- [x] Strona tagu — filtr mapy + lista wpisów (C2 pętla 2026-08-30, PR #10).
- [ ] Eksport PDF kartoteki (media print).

## F3 — Publikacja

- [ ] Włączenie GitHub Pages przez właściciela (branch `main`, katalog `/`).
- [ ] Weryfikacja produkcji: mapy, wpisy, wizualizacje, cache.
- [ ] Ewentualnie: wersja offline (PWA/service worker) — wymaga ADR.

## F4 — Pomysły otwarte

Patrz `docs/BACKLOG.md` (tryb ekspedycji/„polowania”, warstwy kręgów
kulturowych, oś czasu manifestacji, wersja EN, import metadanych kart…).

## Pętla Jakości — C1 → C3 → C2 (pełny obieg po poprawkach mapy)

- [x] **C1 — domknięcie sieci:** najsłabsze punkty (`indra` 1 backlink,
      `nessos` 1) dostały odwzajemnienia: `barbarossa ↔ indra` (warunkowa
      potęga czeka na znak), `kentaur ↔ nessos` (lustrzane kentaury).
      Po C1: indra 2, nessos 2, żaden wpis <2 backlinków.
- [x] **C3 — nowy SKIT:** `data/skity/cena-znaku.json`, „Cena znaku” —
      trio Indra × Barbarossa × Nessos (unikalny skład, 211 słów), temat
      „kto płaci za to, że moc wraca na wezwanie”.
- [x] **C2 — mała funkcja:** etykiety miast — nazwa i populacja **po kliknięciu**
      (świadoma decyzja właściciela: bez hoveru). Klik w tło / przeciągnięcie /
      ukrycie warstwy chowa tabliczkę.
      Uzupełnia klikalne etykiety z poprzedniej iteracji.
- [x] Weryfikacja: `npm test` **152/152**, build 10 wpisów / 15 SKITów /
      39 feed / 27 tagów, `npm run check` OK.

## Kronika — konsolidacja dokumentacji trybu

- [x] **Jeden czytelny plik trybu:** `docs/KRONIKA_tryb.md` — pełna,
      samodzielna dokumentacja Kroniki (fundamenty, decyzje, model danych
      `data/kronika/`, reguły, granice, propozycje P1–P11).
- [x] **Rozwinięcie koncepcji:** słownik zmian `relacje[].zmiana`, przykład
      epoki 2 na SKICIE „Cena znaku”, kolejność wdrożenia (ADR → walidator →
      widok `#kronika`).
- [x] Zgodnie z M13: **bez kodu gry** — dokumentacja koncepcyjna, nie dane.

## Kronika — rozszerzenie koncepcji po przemyśleniach właściciela (2026-08-29)

Właściciel przeczytał dokumentację i zgłosił 6 obszarów. Opracowane w
`docs/KRONIKA_tryb.md` §18–§19 + wizualny mockup:

- [x] **18.1 Podgląd strony Epoki** — `docs/kronika-epoka-podglad.html`
      (statyczny mockup): nagłówek, iskra/pytanie, karty uczestników,
      przebieg, panel konsekwencji (oś „rząd dusz”, mapa wpływów, wykres
      zasięgu, tabela relacji), ledger paliwa, słabość/exploit, wątki.
- [x] **18.2 Napęd + budżet „paliwa”** — paliwo z backlinków/SKITów/wzmianek
      kroniki; koszt epoki; brak paliwa = brak wpływu na świat; odbudowa przez
      pracę treściową (C1/C3). Propozycje P12–P13.
- [x] **18.3 Konsekwencje + prezentacja** — model `skutek.konsekwencje`
      (oś, kultury, zasięg, pozycje, wątki) + 5 widgetów wizualnych. P14–P15.
- [x] **18.4 Słabości/wrażliwości** — jako exploitable leverage
      (marginalizacja / zranienie / przemiana / odporność). P16.
- [x] **18.5 Cel ostateczny** — stany końcowe per tom (mgła / odczarowanie /
      równowaga / pętla); cel mierzony osią „rząd dusz”.
- [x] **18.6 Oś „cywilizacja kontra byty”** — główna oś + meta-napięcie
      (archiwizacja daje bytom paliwo, choć ją odczarowuje). P17.
- [x] **18.7 Nowe propozycje** P12–P17 + **§19 pytania** do właściciela.
- [x] Czytelnia linkuje do mockupu z nagłówka.

### Szlif po odpowiedziach właściciela (2026-08-29)

Właściciel polubił mockup i odpowiedział na `$19`. Opracowane w
`docs/KRONIKA_tryb.md` §20 + drugi mockup:

- [x] **Korekta paliwa (P12/P13)** — usunięte automatyczne `+3/udział w skicie`;
      udział kosztuje, paliwo pasywne z archiwum (`2×backlinki+1×tagi+bonus`),
      zwrot tylko z realnej zmiany świata; skit = koszt, nie źródło.
- [x] **Paliwo = bramka i waluta** (P12) — udział płaci, skutek boostuje
      zmianę na plus/minus (20.1).
- [x] **Osie poboczne** — potwierdzona oś „cywilizacja kontra byty” + `dominacje`
      kultur/kultów z tagów (20.2).
- [x] **Strona główna Tomu (pkt 9)** — `docs/kronika-glowna-podglad.html`:
      stan świata, chronologia epok, wątki zamknięte/otwarte, uczestnicy,
      skity, strefy wpływów, ledger paliwa, rozstaje (20.3).
- [x] **Klikalni uczestnicy (pkt 6)** — karty linkują do `#slug` kartoteki
      (mockup przekierowuje z 8001 na mapę 8000) (20.4).
- [x] **P14/P15** zaakceptowane (konsekwencje + warstwa wizualna w MVP).
- [x] **§20.5/§20.6** — status P12–P17 i następny krok: doszlifowanie
      mechanizmu (bilans, walidator, 1–2 epoki kontrolne) przed ADR/planem.

### Kronika: działający mechanizm + pierwsza epoka (2026-08-29)

Po doprecyzowaniu P16 („wykorzystanie słabości” = ocena narratora, nie
przycisk) i poleceniu „Rozstaje zostawmy w pomysłach” zbudowano realny silnik:

- [x] **`data/kronika/tom-1.json`** — Tom I „Kronika trzech stołów” + `stanStart`.
- [x] **`data/kronika/epoka-1.json`** — Epoka I „Trzy stoły: przodek, gospodarz
      i gość” (skit `trzy-stoly`, uczestnicy zgodni).
- [x] **`data/kronika/epoka-2.json`** — Epoka II „Nieproszeni goście: psuj,
      zaproszony i zaproszenie” (skit `nieproszeni-goscie`; kontynuacja `stanPo`,
      Kentaur startuje z 14).
- [x] **`tools/kronika.mjs`** — paliwo pasywne (2×backlinki + tagi kanonu +
      sieć powiązań), gate na bieżącym saldzie, ledger z ciągłością, zwrot tylko
      za realną zmianę zasięgu, walidator `konsekwencje` + `narrator.ocena[]`.
- [x] **Oś zamknięta** — `mit + racjonalizacja = 100`; walidator odrzuca 101
      (delty muszą sumować się do 0). Poprawka po zgłoszeniu właściciela.
- [x] **Wynik Tomu** — Epoka I: Egungun 18→21, Barbarossa 17→15, Kentaur 16→14;
      Epoka II: Imp 12→10, Kentaur 14→12, Empusa 17→19; oś 37/63 → 33/67;
      zasięg Egungun 44.7→47.7%, Empusa 43.3→45.3%, Kentaur 44.7→40.7%.
- [x] **Raporty** — `docs/kronika-tom-1.html` (strona główna Tomu),
      `docs/kronika-epoka-1.html`, `docs/kronika-epoka-2.html`.
- [x] **Kalibracja seedów** — `npm run kronika:seed` wylicza stanStart
      deterministycznie z kartoteki (obecność bytu → zasięg, średnia → oś;
      15 bytów); test pilnuje zgodności.
- [x] **Npm/testy** — `npm run kronika`, `npm run kronika:check`,
      `npm run kronika:seed`, `test/kronika.test.js` (9 testów).
- [x] **ADR 0021** + §21 w `docs/KRONIKA_tryb.md`.

\(poprzednie podpunkty nadal obowiązują\)

### Kronika: pętla jakości C1–C3 + Epoka III (2026-08-29)

Pętla jakości wokół Kroniki + dalsza implementacja:

- [x] **C1** — research pod wątek „odźwierni” (Balor — Cath Maige Tuired,
      powieka podnoszona przez czterech; Egungun — wejście przez pieśń/oríkì;
      Empusa — rozpoznanie/nazwanie z *Life of Apollonius*).
- [x] **C3** — nowy SKIT `data/skity/odzwierni.json` (Egungun × Balor × Empusa,
      unikalny skład, 3 głosy, 201 słów).
- [x] **Reseed** — nowy SKIT wpływa na kalibrację (`2×skity`), więc seedy i
      epoki I–II przeliczone (Egungun 47.3→50.3%, Empusa 46→48%).
- [x] **C2 / Epoka III** — `data/kronika/epoka-3.json` na skicie `odzwierni`;
      III epoka Tomu: Egungun 21→24, Balor 15→13, Empusa 19→17; oś 31/69.
- [x] **Ciągłość wątków** — `walidujCiągłośćWątków` w `tools/kronika.mjs`
      (otwarty wątek musi być przeniesiony albo domknięty; zamknięty nie może
      się otworzyć). Wykryła realny brak: Epoka II gubiła `czwarty-stol`
      i `warunek-barbarossy` — naprawione.
- [x] **Raport** — `docs/kronika-epoka-3.html` + zaktualizowana strona Tomu.
#### Pętla jakości: Epoka IV + automatyczny raport (2026-08-29)

- [x] **C3** — nowy SKIT `data/skity/imie-na-progu.json` (Egungun × Selkie ×
      Indra, unikalny skład) kontynuujący wątek `imie-na-progu`.
- [x] **C2 / Epoka IV** — `data/kronika/epoka-4.json` (Egungun 24→27, Selkie
      24→22, Indra 13→11; oś 29/71; domknięty `imie-na-progu`, otwarty
      `kres-indry`).
- [x] **Wzorzec delta** — epoki zapisują `delta` zasięgu/dominacji, nie
      `przed/po`; dodanie SKITu nie wymaga ręcznego re-basowania starszych
      epok. Auto-rebase po reseedzie.
- [x] **Automatyczny raport** — `npm run build` = rebuild-index + kronika
      --seed + kronika (generuje `summary.json` i wszystkie raporty HTML);
      `npm run check` pilnuje ich aktualności.
- [x] **Testy** — 10 testów w `test/kronika.test.js` (4 epoki, delta,
      ciągłość, oś) + całość 163/163.

## C4 — nazwa miasta na czas przytrzymania + kursor strzałka (nadpisuje C2 UX)

- [x] **Etykieta miasta tylko podczas przytrzymania:** `pointerdown` pokazuje
      tabliczkę „nazwa · populacja”, `pointerup`/`pointercancel` ją chowa.
      Klik-przełącznik z C2 zniesiony — po puszczeniu nic nie „wisi”.
- [x] **Kursor nad miastem = strzałka, nie łapka:** przezroczyste pole
      trafienia r=16 px + `cursor: default` (`PROMIEN_KLIK_MIASTA`), więc
      widać, że miasto nie przesuwa mapy.
- [x] **Bez nazwy na hover:** usunięty `<title>` z kropki; dostępność przez
      `aria-label` na grupie miasta. Testy pilnują braku
      `pointerenter/pointerleave`.
- [x] Czytelnia Kronik na osobnym porcie (katalog `docs`, `/` = dokument),
      mapa działa dalej na porcie głównym aplikacji.

## Pętla Jakości — sesja 2026-08-29 (po scaleniu PR #9) — ✅ PR #10

- [x] **Audyt B** PR #9 (nawigacja + daty w stopkach + buildTime) i rzut oka na
      PR #8: zieloność bramy, zgodność z ADR, znalezione defekty (patrz niżej).
- [x] **Naprawa audytowa:** backfill `meta.modyfikacje` po PR #8 (17 skitów +
      14 wpisów zmienionych bez wpisu w meta — feed „Co nowego” ich nie
      pokazywał); nieaktualny komentarz w `app/ui.js` doprowadzony do stanu.
- [x] **C1** `agni`: trzy poziomy obecności (ziemia/błyskawica/słońce), siedem
      języków obrzędowych i imiona (Pāvaka, Havyavāhana, Dhumaketu), świadek
      saptapadi; źródła 3 → 6 (Rigweda 1.1 Griffith, Wikipedia, Agni Purana).
- [x] **C1** `sfinks-teby`: wariant Pausaniasza (nieślubna córka Lajosa i
      wyrocznia Kadmosa; piratka z Anthedonu), zagadka od Muz (Apollodor 3.5.8);
      źródła 3 → 4 (Pauzaniasz 9.26.2, Perseus).
- [x] **C3** SKIT „DZIEŃ WOLNEGO” (`data/skity/dzien-wolnego.json`) — trio
      Agni × Ben-Varrey × Kannon (unikalny skład, 269 słów, rejestr lekki v1.6);
      trzy byty bez żadnego skitu dostały debiut.
- [x] **C2** obsługa parametrów zapytania w aplikacji: `?q=`, `?action=wylosuj`,
      `?action=powiazania` (czysta `akcjeZZapytania` w `app/ui.js` + testy +
      wpięcie w `start()`); naprawia martwe linki z paska Kroniki (PR #9).
      Dodatkowo `aria-pressed` przycisku motywu w `tools/kronika.mjs`.
- [x] Weryfikacja: `npm test` **164/164**, `npm run build` + `npm run check`
      zielone; sprawdzenie na żywo w headless Chromium (filtr, powiązania,
      losowanie — wszystkie akcje z Kroniki działają).
