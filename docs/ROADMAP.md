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
- [x] CI (GitHub Actions: `npm test` + build) i instrukcja włączenia Pages.

## F1 — Proces treściowy (CIĄGŁA; praca kolejni agentów)

Domyślna pętla pracy sesji bez innego zlecenia (ADR 0004):

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
