# PLAN — sesja M10 (2026-08-28): pogłębienie koncepcji („Splot"/„Kronika") + treść

> Plan JEDNEJ sesji. Zasady: `AGENTS.md`, `docs/PROTOKOL.md` (v1.7), ADR 0001–0019.
> Kontynuacja PR #6. Właściciel: myślimy dalej, na razie BEZ kodu gry; w
> międzyczasie nowe skity / update'y istniejących wpisów.

## Odpowiedzi właściciela (skrót — pełny zapis w dokumencie koncepcyjnym)

1. A i B oba warte rozważenia. A nie może być płaski — albo auto-gra
   (obserwacja świata bytów, który się zmienia), albo decyzje gracza (jakie? —
   otwarte). B kuszący, ale nie „proste mini-fabuły": kluczowa idea —
   **subagenci wcielający się w pojedyncze byty** (percepcja, wiedza, wierzenia,
   ograniczenia postaci), zamiast jednego wszechwiedzącego narratora.
2. AI: dwie ścieżki — runtime w artefakcie (klucze w pamięci sesji) ALBO
   pregenerowana rozgrywka popychana przez kolejnych agentów Areny + pregenero-
   wane ilustracje. Obie możliwe.
3. Myśleć teraz, nie kodować gry; pętla pomysł → weryfikacja → pomysł, a w
   międzyczasie treść.

## Zadania sesji

- [ ] **Główne:** `docs/plans/POMYSL_splot-i-kronika-koncepcja.md` — rozwinięcie
      koncepcji: metodyka wcielania w postać, dwie architektury AI, unifikacja
      A+B, model „Kronika popychana przez kolejnych agentów", eksperymenty
      weryfikacyjne PRZED kodem. Cross-link z `LUZNE_POMYSLY_NA_PRZYSZLOSC.md`.
- [ ] **Weryfikacja (bez kodu gry):** przykład „karty postaci do odegrania"
      (dossier) w dokumencie — demonstracja, czym embodiment różni się od
      narracji wszechwiedzącej.
- [ ] **C1** treść: pogłębienie najsłabszego wpisu (kentaur-pelion, 3 źródła).
- [ ] **C3** treść: nowy SKIT (preferencja 3–4 osoby, ADR 0019).
- [ ] Dokumenty: ROADMAP, PROJECT_HISTORY, HANDOFF; aktualizacja PR #6.

## Brama jakości

`npm test` + `npm run build` + `npm run check` po każdym kroku; commit i push
przyrostowo (ADR 0004). Żadnego kodu gry — tylko dokumenty i treść.
