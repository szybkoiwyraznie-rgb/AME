# ROADMAP — Archiwum Manifestacji Eterycznych

> Plan faz; status aktualizowany na końcu każdej sesji (ostatnio: 2026-08-28,
> sesja M3). Szczegóły bieżącego zadania żyją w `docs/plans/PLAN_*.md`.
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
je wyłącznie na wyraźne zlecenie właściciela w sesji.

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
      I Wizualizacja … V Rezonans, od v1.3 protokołu (ADR 0012).
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
      gry), indeks v2, Baza Skitów w UI (przycisk „✎ skity"), sekcja VI pod
      kartą bytu, deep-link `#skit:<slug>`; pierwszy SKIT „PŁÓTNO I KAMIEŃ".
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
      słów) → sekcja VI obu kart i pozycja w feedzie.
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

## F2 — Jakość i ergonomia mapy

- [x] Deep-linki (`#<slug>` — stan mapy i otwartego wpisu; działa od M1, tu
      dopiero odnotowane zgodnie z audytem PR #1).
- [x] Pełny przegląd na małych ekranach — kartoteka jako pełnoekranowa warstwa
      zamiast bottom sheetu (M3).
- [ ] Klastrowanie pinezek przy niskim zoomie / deryterowanie etykiet.
- [ ] Miniatury wizualizacji na pinezkach przy wysokim zoomie.
- [x] Czytelny kanon tagów i ich prezentacja (ADR 0016): słownik w danych,
      limity kategorii w walidatorze, pasek w pasmach z licznikami i opisami.
- [ ] Strona tagu (filtr + lista wpisów), eksport PDF kartoteki (media print).

## F3 — Publikacja

- [ ] Włączenie GitHub Pages przez właściciela (branch `main`, katalog `/`).
- [ ] Weryfikacja produkcji: mapy, wpisy, wizualizacje, cache.
- [ ] Ewentualnie: wersja offline (PWA/service worker) — wymaga ADR.

## F4 — Pomysły otwarte

Patrz `docs/BACKLOG.md` (tryb ekspedycji/„polowania”, warstwy kręgów
kulturowych, oś czasu manifestacji, wersja EN, import metadanych kart…).
