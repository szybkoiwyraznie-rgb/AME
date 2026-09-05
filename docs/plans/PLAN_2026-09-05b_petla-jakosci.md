# PLAN sesji 2026-09-05b — audyt PR #32 + Pętla Jakości (ADR 0023)

Gałąź sesji: `arena/01a0712f-ame`. Dokument jednorazowy (roadmapa jednego
zadania, `AGENTS.md` §5) — reguły trwałe idą do ADR / PROTOKOŁU / LESSONS.

## Kroki

1. **A — PR na starcie** (ADR 0004 pkt 1): gałąź + opis na GitHubie przed kodowaniem.
2. **B — audyt PR #32** (poprzedni scalony, `7ff725c`): plik po pliku
   (`git diff 7ff725c^..7ff725c`), zgodność z ADR i protokołem, stan bram.
3. **C — Pętla Jakości** (ADR 0023, jedno przejście liniowe):
   - **C4** — materializacja z `Lista Kart w Kolekcji.txt`: karta, której
     `karta.nazwa` nie występuje w `data/manifestations/*.json`; fetch Scryfall
     (ADR 0008), research www, pełny wpis MFM;
   - **C1** — pogłębienie istniejącego wpisu (research www);
   - **C3** — SKIT o składzie nieużytym w bazie (preferowane 3–4, PROTOKÓŁ §8);
   - **C6** — Kronika (Epoka / rozgałęzienie / tom) + przekalibrowanie
     `test/kronika.test.js` w tym samym kroku (L20);
   - **C2+5** — development z `docs/BACKLOG.md`, z testami.
4. Handoff `docs/setup/HANDOFF_2026-09-05b.md` + `docs/PROJECT_HISTORY.md`.

## Bramy

`npm test` → `npm run build` → `npm run check`, każde jako osobne polecenie
(bez potoków maskujących kod wyjścia — L19). Po każdym zielonym kroku commit
i push na gałąź sesji (L21: żadnych commitów poza gałęzią z otwartym PR).
