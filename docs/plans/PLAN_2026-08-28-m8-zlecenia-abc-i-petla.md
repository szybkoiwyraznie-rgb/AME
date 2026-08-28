# PLAN — sesja M8 (2026-08-28): zlecenia A/B/C + Pętla Jakości

> Plan JEDNEJ sesji. Zasady: `AGENTS.md`, `docs/PROTOKOL.md` (v1.6), ADR 0001–0018.
> Kontynuacja PR #6 (właściciel zaakceptował featurę „🎲 wylosuj” z M7 — bierze).

## Zlecenia właściciela (priorytet nad pętlą)

- [ ] **A — SKITy 3–4 osobowe jako pożądane.** Utwardzić w dokumentacji, że
      składy 3–4 są preferowane (nie tylko dozwolone). Stała + kontrakt „kod =
      protokół = instrukcja”. NIE łamać istniejących 2-osobowych (min. = 2 zostaje).
- [ ] **B — powiązania jasno opisane.** Walidator wymaga sensownego `opis`
      (nie jedno słowo, nie sam link): próg słów + odrzucenie gołego URL-a.
      Testy. Dziś dane mają 43–78 słów — próg pilnuje przyszłości.
- [ ] **C — grywalizacja (idle battler).** Rozpoznanie i zręby: dokument
      projektowy (mechanika wyprowadzona z danych wpisu — deterministycznie),
      wpis do BACKLOG, ewentualnie czysty moduł „staty z wpisu” + testy jako
      fundament. Kodowanie pełne — dopiero po akceptacji (C robi się w C2 pętli).

## Pętla Jakości po zleceniach (ADR 0007)

- [ ] **C1** — pogłębienie wpisu (research www, ADR 0008), źródła z adresami.
- [ ] **C3** — SKIT o unikalnym składzie, **3–4 osoby** (demonstracja A;
      po serii poważnych — rejestr wg v1.6).
- [ ] **C2** — grywalizacja: dokument + zręby (realizacja zlecenia C).

## Brama jakości

`npm test` + `npm run build` + `npm run check` po każdym zielonym kroku;
commit i push przyrostowo (ADR 0004). Featury do akceptacji przed live.
