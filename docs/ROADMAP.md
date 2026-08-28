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
- [x] Audyt PR #1 + naprawa receptury CI (L9) — sam plik `.github/workflows/ci.yml`
      na `main` wciąż wymaga łatki po stronie właściciela.

## M3b (2026-08-28) — zlecenia: Baza Skitów i „Co nowego" — ✅ KOŃCZONA (w PR #2)

- [x] **SKITy** (ADR 0013, PROTOKÓŁ §8): format danych `data/skity/`,
      walidator (2–4 uczestników, unikalny skład, 60–250 słów, zakaz żargonu
      gry), indeks v2, Baza Skitów w UI (przycisk „✎ skity"), sekcja VI pod
      kartą bytu, deep-link `#skit:<slug>`; pierwszy SKIT „PŁÓTNO I KAMIEŃ".
- [x] **C3 w Pętli Jakości** (nad C2): dopisywanie SKITa o nowym składzie.
- [x] **„Co nowego"** (ADR 0014): feed `aktualizacje[]` liczony z `meta`
      (powstania i zmiany wpisów oraz skitów), najnowsze na górze, przycisk
      „✚ nowości", linki do treści; rygor opisywania zmian w `meta.modyfikacje`.

## F2 — Jakość i ergonomia mapy

- [x] Deep-linki (`#<slug>` — stan mapy i otwartego wpisu; działa od M1, tu
      dopiero odnotowane zgodnie z audytem PR #1).
- [x] Pełny przegląd na małych ekranach — kartoteka jako pełnoekranowa warstwa
      zamiast bottom sheetu (M3).
- [ ] Klastrowanie pinezek przy niskim zoomie / deryterowanie etykiet.
- [ ] Miniatury wizualizacji na pinezkach przy wysokim zoomie.
- [ ] Strona tagu (filtr + lista wpisów), eksport PDF kartoteki (media print).

## F3 — Publikacja

- [ ] Włączenie GitHub Pages przez właściciela (branch `main`, katalog `/`).
- [ ] Weryfikacja produkcji: mapy, wpisy, wizualizacje, cache.
- [ ] Ewentualnie: wersja offline (PWA/service worker) — wymaga ADR.

## F4 — Pomysły otwarte

Patrz `docs/BACKLOG.md` (tryb ekspedycji/„polowania”, warstwy kręgów
kulturowych, oś czasu manifestacji, wersja EN, import metadanych kart…).
