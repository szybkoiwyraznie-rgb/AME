# ROADMAP — Archiwum Manifestacji Eterycznych

> Plan faz; status aktualizowany na końcu każdej sesji. Szczegóły bieżącego
> zadania żyją w `docs/plans/PLAN_*.md`. Nowe pomysły → `docs/BACKLOG.md`.

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
- [ ] Tagowanie we wspólne grupy i porządkowanie słownika tagów.
- [ ] Powiązywanie wpisów (uzasadnione `opis`-em), obserwacja spójności sieci.
- [ ] Odtwarzanie wizualizacji dla wpisów bez obrazu (rama 21:9, ≤ 2 MB).

## F2 — Jakość i ergonomia mapy

- [ ] Deep-linki (`#/slug` — powracalny stan mapy i otwartego wpisu).
- [ ] Klastrowanie pinezek przy niskim zoomie / deryterowanie etykiet.
- [ ] Miniatury wizualizacji na pinezkach przy wysokim zoomie.
- [ ] Strona tagu (filtr + lista wpisów), eksport PDF kartoteki (media print).
- [ ] Pełny przegląd na małych ekranach (mobile: panel jako bottom sheet).

## F3 — Publikacja

- [ ] Włączenie GitHub Pages przez właściciela (branch `main`, katalog `/`).
- [ ] Weryfikacja produkcji: mapy, wpisy, wizualizacje, cache.
- [ ] Ewentualnie: wersja offline (PWA/service worker) — wymaga ADR.

## F4 — Pomysły otwarte

Patrz `docs/BACKLOG.md` (tryb ekspedycji/„polowania”, warstwy kręgów
kulturowych, oś czasu manifestacji, wersja EN, import metadanych kart…).
