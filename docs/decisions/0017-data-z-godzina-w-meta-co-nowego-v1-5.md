# 0017 — Data zdarzeń w meta z godziną; „Co nowego” podaje datę i godzinę (protokół MFM v1.5)

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Właściciel (2026-08-28, zgłoszenie B) chce, by sekcja „Co nowego”
  podawała **datę i godzinę** aktualizacji danego elementu. Dotychczas
  `meta.utworzono` i `meta.modyfikacje[].data` niosły tylko dzień
  (`RRRR-MM-DD`), a o kolejności w obrębie dnia decydowała sekwencja zdarzeń
  w pliku (L11, ADR 0014). Feed odpowiadał więc na „co i kiedy (dzień)”,
  ale nie na „o której”.
- Decyzja:
  1. Format dat w meta rozszerzony: `RRRR-MM-DD` **albo**
     `RRRR-MM-DD GG:MM` (godzina 00–23, minuty 00–59; walidator odrzuca
     `24:00`, `12:60`, separator `T`, sekundy, podwójne spacje). Forma bez
     godziny pozostaje legalna — kompatybilność wstecz z istniejącymi wpisami
     i skitami, bez migracji.
  2. „Co nowego” renderuje datę verbatim z indeksu: pozycje z godziną
     pokazują `RRRR-MM-DD GG:MM` (to poprawny atrybut `datetime` w HTML:
     data + spacja + czas).
  3. Sort feedu: data porównywana **po znakach** (kodowo), nie collation —
     formaty o różnych precyzjach mają wtedy porządek totalny niezależny od
     tabel ICU (determinizm budowy indeksu, ADR 0002). Skutki: dzień z godziną
     wygrywa z dniem bez godziny, wśród godzin kolejność jest chronologiczna,
     a `sekwencja` (L11) pozostaje rozstrzygaczem remisów. Zapis bez godziny
     oznacza zdarzenie sprzed ADR 0017, więc legalnie ląduje pod godzinowymi
     tego samego dnia.
  4. Rygor dla agentów (PROTOKÓŁ §9, AGENTS §3): nowe `meta.utworzono` i
     `meta.modyfikacje` podają godzinę (moment zapisu zmiany, czas sesji).
     Budowa indeksu nadal nie korzysta z zegara — czas pochodzi wyłącznie
     z treści plików, nigdy z procesu builda.
- Konsekwencje:
  - Feed odpowiada „co i o której” bez zaglądania w historię gita; pozycje
    bez godziny znikną naturalnie przy najbliższej edycji starych kart.
  - `sekwencja` nie znika: dwie zmiany w tej samej minucie wciąż potrzebują
    rozstrzygacza kolejności.
  - Zamiana `localeCompare` na porównanie kodowe usuwa ukrytą zależność
    sortu od wersji środowiska ICU.
- Powiązania: 0002, 0013, 0014, 0015
