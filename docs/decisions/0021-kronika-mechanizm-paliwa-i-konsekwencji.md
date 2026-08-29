# 0021 — Kronika: mechanizm paliwa i konsekwencji + pierwsza epoka

- Status: Zaakceptowana
- Data: 2026-08-29
- Kontekst:
  Właściciel zaakceptował kierunek Kroniki i wskazał, że najpierw ma działać
  **mechanizm**, nie sam mockup. Kluczowa korekta z jego strony: udział w skicie
  nie może dokładać paliwa (bo „każda epoka = nowy skit” automatycznie
  pomnażałoby kapitał). Dodatkowo doprecyzował P16: słabości/wrażliwości nie są
  „przyciskiem exploitu” ani komentarzem „X wykorzystał Y”, tylko **oceną
  agenta-narratora**, jak mocno działania/słowa bytu wykorzystywały w retoryce
  słabości drugiego. Rozstaje mają na razie pozostać pomysłem.

- Decyzja:
  1. **Paliwo pasywne** — budowy, deterministyczne: `2×backlinki + tagi kanonu +
     sieć powiązań (max 3)`. Liczone z `data/index.json` i kanonu tagów.
  2. **Udział kosztuje**: `kosztUdzialu = 1 + ceil(wątki_naruszone/2)`, opcjonalnie
     `kosztKlucza` za ciężki skutek i `boost` za wzmocnienie skutku. Udział nigdy
     nie jest źródłem paliwa.
  3. **Zwrot tylko za realną zmianę** — dodatnia zmiana zasięgu bytu uprawnia do
     zwrotu (z capem `2×delta_pp + 3`); byt-statysta traci.
  4. **Wykorzystanie słabości nie jest kosztem** — to `narrator.ocena[]`
     (kto→kogo, stopień 0–3, kontekst, komentarz). Nie flagujemy exploitu
     mechanicznie; narracja może prowadzić do statusu (np. „zraniony”).
  5. **Konsekwencje** w strukturze `konsekwencje`: `os` (mit/racjonalizacja),
     `relacje`, `zasieg` (per byt), `dominacje` (kultura/kult), `pozycje`,
     `watki`; walidator sprawdza spójność ze `stanStart` i dozwolone zbiory.
  6. **Oś „rząd dusz” jest zamknięta** — `mit + racjonalizacja = 100`, a delty
     konsekwencji sumują się do 0. Walidator odrzuca stany typu 51/50.
  7. **Rozstaje nie wchodzą do mechanizmu** — zostają pomysłem
     (`docs/BACKLOG.md` / mockup jako kierunek, nie funkcja).
  8. **Epoki liczą się sekwencyjnie** — `stanPo` (łącznie z paliwem bytów)
     przechodzi do kolejnej epoki; rozliczenie jest ciągłe, nie per-epoka od
     zera.
  9. **Wątki mają ciągłość** — wątek otwarty w poprzedniej epoce musi zostać
     przeniesiony albo domknięty w kolejnej; wątek zamknięty nie może się
     z powrotem otworzyć (`walidujCiągłośćWątków`).
  10. **Pierwsze epoki** uruchomione w Tomie I „Kronika trzech stołów”:
      Epoka I na `trzy-stoly`, Epoka II na `nieproszeni-goscie`, Epoka III na
      nowym `odzwierni` (Egungun × Balor × Empusa, unikalny skład).
      Wynik w `data/kronika/summary.json` + raporty `docs/kronika-*.html`.

- Konsekwencje:
  - `tools/kronika.mjs` — mechanizm + generowanie raportów; npm `kronika` i
    `kronika:check`.
  - `data/kronika/tom-1.json`, `data/kronika/epoka-1.json`,
    `data/kronika/epoka-2.json`, `data/kronika/epoka-3.json` — źródło danych.
  - `test/kronika.test.js` — 9 testów (wzór paliwa, trzy epoki sekwencyjnie,
    oś zamknięta, ciągłość wątków, gate, zwrot bez zmiany, struktura
    podsumowania).
  - `docs/KRONIKA_tryb.md` §20–§21; `docs/ROADMAP.md`; `docs/PROJECT_HISTORY.md`.
  - Seedowe wartości osi/zasięgu są umowne (kalibracji w miarę wzrostu
    kartoteki) — dopuszczalne w pierwszym tomie, oznaczone w metryce.
  - Ryzyko: raport HTML generowany przez narzędzie przyciąga ręczne edycje —
    dlatego `--check` odrzuca różnicę względem `summary.json`/raportu.

- Powiązania: ADR 0006 (warstwa wiki), ADR 0007 (Pętla Jakości), ADR 0013
  (Baza Skitów), ADR 0016 (kanon tagów), ADR 0019 (skład SKITów), §18–§21
  w `docs/KRONIKA_tryb.md`.
