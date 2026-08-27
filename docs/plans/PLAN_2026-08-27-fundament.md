# PLAN 2026-08-27 — Fundament projektu (F0)

> Roadmapa JEDNEGO zadania (AGENTS.md §2, ADR 0004). Odhaczanie etapów
> kolejnymi commitami; na końcu podsumowanie wykonania.

## Etapy

- [x] E1 — zasady i dokumentacja: `AGENTS.md`, `docs/PROTOKOL.md` (v1.1),
      ADR 0001–0006, `docs/setup/ENVIRONMENT.md`, LESSONS, ROADMAP, BACKLOG,
      ARCHITECTURE, WORKFLOW, ASSETS, PROJECT_HISTORY, README; oryginał
      protokołu do `docs/archive/`; usunięcie `old_AGENTS.md`/`old_ENVIRONMENT.md`.
      Kryterium: pełny spis lektury startowej istnieje i jest spójny.
- [ ] E2 — narzędzia: `package.json`, `tools/rebuild-index.mjs`
      (schemat, rama promptu, powiązania, deterministyczny indeks),
      `test/schema.test.js`, `test/rebuild-index.test.js`.
      Kryterium: `npm test` zielone na plikach fixture.
- [ ] E3 — dane przykładowe: `data/manifestations/wendigo.json`
      (Tarmogoyf; treść z przykładu protokołu, rama 21:9) i
      `data/manifestations/zmora.json` (Nightmare) z powiązaniem wzajemnym
      opisanym merytorycznie; `data/index.json` zbudowany.
      Kryterium: `npm test` + `npm run build` zielone.
- [ ] E4 — aplikacja: `index.html`, `app/geo.js` (+testy projekcji i dekodera
      TopoJSON), `app/map.js`, `app/data.js`, `app/ui.js`, `app/app.js`,
      `app/styles.css`, `assets/map/countries-50m.json`.
      Kryterium: mapa z pan/zoom (drag/wheel/pinch/dblclick/przyciski),
      pinezki z obu wpisów, panel wpisu z sekcjami I–V, tagi, powiązania
      + backlinki, szukanie, lista, łuki powiązań, baner `file://`.
- [ ] E5 — wizualizacje: wygenerować obrazy 21:9 z promptów obu wpisów do
      `assets/wizualizacje/` (≤ 2 MB), wskazać w `wizualizacja.obraz`.
      Kryterium: obrazy widoczne w panelu wpisów.
- [ ] E6 — CI + handoff: `.github/workflows/ci.yml`, instrukcja Pages
      (README/WORKFLOW), `docs/setup/HANDOFF_2026-08-27.md`, audyt własnego
      PR w opisie. Kryterium: CI zielone, handoff kompletny.

## Ryzyka / pułapki

- polskie znaki w edit_file (L2) → nowy pliki write_file, poprawki python3;
- egress zablokowany (L3) → dane kart weryfikować web_search/fetch_page,
  mapę brać z npm;
- `file://` nie fetchuje (ADR 0001) → baner z instrukcją, nie „naprawiać”;
- indeks deterministyczny — bez Date.now() w treści danych (L4).

## Podsumowanie wykonania

(uzupełniane po zakończeniu sesji)
