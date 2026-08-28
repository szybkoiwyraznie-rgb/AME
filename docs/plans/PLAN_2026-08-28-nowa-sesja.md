# PLAN 2026-08-28 (M4) — nowa sesja: audyt PR #3 + Pętla Jakości (C1 → C3 → C2)

Start wg `AGENTS.md` §0: lektura w całości (AGENTS 207 linii, PROTOKÓŁ 318,
LESSONS 151, ENVIRONMENT 121, ADR 0001–0015 + rejestr, HANDOFF_*).
Bramę sprawdzono przed zmianami: `npm test` 95/95, `npm run build` 4 wpisy /
2 SKITy / 8 pozycji feedu / 22 tagi, `npm run check` spójny.

## Stan wejściowy (ważny dla kolejności pracy)
- `main` = `8f0cd4d` (PR #3 właściciela: naprawa `ci.yml`).
- PR #2 (M3) **wciąż otwarty** — całość prac M3 (mapa A1–A5, kartoteka B1–B3,
  Baza Skitów, „Co nowego”, v1.3, v1.4) czeka na decyzję o scaleniu.
- Scalenie **nie jest zrobione**: scalenie jest decyzją właściciela (ADR 0004) — sesja NIE scala i NIE
  przenosi pracy na `main`. Konsekwencja: praca M4 narasta na tej samej gałęzi co
  PR #2 (stack), a każdy commit trzyma testy zielone, żeby właściciel mógł scalać
  całość jednym ruchem.

## Audyt poprzedniego scalonego PR (#3, `git diff 25b1615 8f0cd4d` — 1 plik)
1. `.github/workflows/ci.yml`: usunięty blok `<!-- -->` (to on łamał YAML), ciało
   = `name: CI` + `on: pull_request|push(main)|workflow_dispatch` +
   `permissions: contents: read` + `concurrency` + trzy rozdzielone kroki
   (`npm test`, `npm run build`, `npm run check` + `git diff --exit-code`).
   Zgodne z lustrem `docs/setup/ci-workflow.yml` — różnica tylko w nagłówku lustra.
2. **Znalezione i naprawione w tej sesji:** dokumenty głosiły „CI na `main` się nie
   parsuje, stan znany i zamknięty” (WORKFLOW, ENVIRONMENT, receptura) — po PR #3
   to nieprawda. Nadpisane na stan faktyczny + dodany test `receptura CI jest
   zgodna z plikiem workflow`, który łapie rozjazd lustra z drzewem (L12: bez
   proszenia właściciela, tylko opis i aktualizacja lustra).
3. Brak zaległości merytorycznych w PR #3 (nie rusza danych ani aplikacji).

## Kolejka (Pętla Jakości, AGENTS §2 / ADR 0007)
- **C1** — pogłębienie `selkie-sule-skerry`: motyw skradzionej/ukrytej skóry z
  potwierdzeniem w źródle + recepcja ballady; wpis do `meta.modyfikacje` (feed
  „Co nowego” ma to pokazać — test reguły ADR 0014).
- **C3** — SKIT na unikalnym składzie trio (balor + egungun + lincoln-imp);
  pierwszy praktyczny test nowego limitu 300 słów (ADR 0015).
- **C2** — featura z BACKLOGu: kopiowanie linku do wpisu w warstwie kartoteki
  (czysty helper w `ui.js` + test) — do akceptacji właściciela przed live.
- Domknięcie: handoff M4, `docs/PROJECT_HISTORY.md`, opis PR.
