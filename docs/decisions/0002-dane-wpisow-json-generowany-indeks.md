# 0002 — Wpisy jako pliki JSON + generowany `data/index.json`

- Status: Zaakceptowana
- Data: 2026-08-27
- Kontekst: Wpisy (kartoteki manifestacji) tworzą i rozbudowują kolejni agenci;
  musi być możliwa praca równolega wielu sesji nad różnymi wpisami bez
  konfliktów. Aplikacja jest statyczna (ADR 0001), więc nie ma backendu, a
  Pages nie zwraca listingów katalogów — aplikacja nie może „wylistować”
  katalogu wpisów przez HTTP.
- Decyzja:
  - Każdy wpis to osobny plik `data/manifestations/<slug>.json` (pełna treść
    zgodna z `docs/PROTOKOL.md` i schematem z `tools/rebuild-index.mjs`).
  - `data/index.json` jest **wyłącznie generowany** przez
    `npm run build` (`tools/rebuild-index.mjs`): zawiera listę skróconych
    rekordów (slug, nazwa, lokalizacja, tagi, powiązania, karta, ścieżka
    obrazu), słownik tagów i backlinki wyliczone z powiązań.
  - Pełny wpis aplikacja dociąga na żądanie (`data/manifestations/<slug>.json`)
    po kliknięciu pinezki.
  - Walidacja (schemat, rama promptu 21:9, istnienie powiązań, zakresy
    współrzędnych, zgodność slugu z nazwą pliku) biegnie przy każdym
    `npm test` i `npm run build`; build kończy się błędem na nieprawidłowym
    wpisie.
  - Indeks jest deterministyczny (sortowanie po slugu, bez znaczników czasu
    w treści), by przebudowa nie generowała fałszywych diffów.
- Konsekwencje:
  - Agent dodający wpis MUSI uruchomić `npm run build` i wcommitować
    zaktualizowany `data/index.json` razem z plikiem wpisu.
  - Konflikty merge sprowadzają się do plików wpisów (rzadkie) i indeksu
    (rozstrzygany przez ponowny build).
  - Ręczna edycja `data/index.json` jest zakazana — następnym buildem i tak
    zostałaby nadpisana.
- Powiązania: 0001, 0005, 0006
