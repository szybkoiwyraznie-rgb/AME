# PLAN — sesja M7 (2026-08-28): Pętla Jakości (C1 → C3 → C2)

> Plan JEDNEJ sesji. Zasady nadrzędne: `AGENTS.md`, `docs/PROTOKOL.md` (v1.6),
> ADR 0001–0018. Po scaleniu treść trafia do ROADMAP/PROJECT_HISTORY.

## Punkt wyjścia

- Poprzedni scalony PR: **#5** (M6). Audyt: patrz opis PR i sekcja niżej.
- Stan wejściowy: `npm test` 120/120, build+check zielone, indeks
  deterministyczny — **8 wpisów, 5 SKITów, 26 tagów**, protokół v1.6.
- Brak nowego zlecenia właściciela na starcie → **Pętla Jakości (ADR 0007)**.

## Audyt PR #5 (M6)

- **A1** badge tylko na hover/fokus/wybranie (usunięty toggle `przyblizona`) —
  logika w `app/map.js`, kontrakt w `test/pinezka.test.js`; OK.
- **A2** `user-select: none` na `.mapa-svg` — `test/mapa-css.test.js`; OK.
- **A3** grupa `.etykiety` malowana po `.pinezki` (kolejność dokumentu SVG),
  etykieta niesie transform pinezki; OK.
- **B** godzina w `meta` (ADR 0017/v1.5): `RE_DATA` z opcjonalnym `GG:MM`,
  sort feedu po znakach, feed renderuje godzinę; OK.
- **Pętla M6**: C1 (drangue-shala, barbarossa-kyffhaeuser), C3
  (`godzina-otwarcia`), C2 (podgląd powiązań na hover — łuki zwężone do
  sąsiadów). Wszystko z testami; indeks czysty po buildzie.
- Wniosek: PR #5 spójny z ADR i protokołem, brama lokalna zielona. Bez zaległości.

## Zadania sesji (Pętla Jakości)

- [ ] **C1** — pogłębienie wpisu (research www, ADR 0008), źródła z adresami,
      `meta.modyfikacje` z godziną (v1.5).
- [ ] **C3** — SKIT o unikalnym składzie (PROTOKÓŁ §8; ton wg v1.6 — po serii
      poważnych rejestr lekki).
- [ ] **C2** — featura AME z testami; prezentacja właścicielowi do akceptacji
      przed live (ADR 0007).
- [ ] Dokumenty pętli: ROADMAP (sekcja M7), PROJECT_HISTORY, HANDOFF, ew.
      LESSONS/BACKLOG.

## Brama jakości

`npm test` + `npm run build` + `npm run check` po każdym zielonym kroku; commit
i push przyrostowo (ADR 0004).
