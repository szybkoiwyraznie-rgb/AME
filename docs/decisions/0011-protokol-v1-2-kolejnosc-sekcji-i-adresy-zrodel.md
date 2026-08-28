# 0011 — Protokół MFM v1.2: kolejność prezentacji sekcji i adres źródła w dokumentacji

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Właściciel (testy 2026-08-28) zgłosił dwie zmiany treści wpisu:
  (B1) sekcje mają iść w kolejności IV → II → III → V → I, „jako standard —
  także w przykładach i manualu”, czyli nie tylko w renderze; (B3) sekcja
  Dokumentacja ma linkować do źródeł albo do ich opisów/wzmianek w sieci, „jako
  potwierdzenie prawdziwości ich istnienia”. ADR 0005 wymaga, by zmiany
  protokołu były decyzją architektoniczną, a ADR 0008 — by każda teza i każda
  pozycja bibliograficzna były sprawdzane w www.
- Decyzja:
  1. `docs/PROTOKOL.md` otrzymuje **wersję v1.2**. Zmiana nie dotyka treści
     sekcji ani ich numeracji: numery rzymskie pozostają **tożsamością** sekcji
     (IV to zawsze Wizualizacja). v1.2 wprowadza *obowiązującą kolejność
     prezentacji* (PROTOKÓŁ §4.1) — tę samą w aplikacji, w plikach wpisów i w
     manualu.
  2. **Pole `dokumentacja[].url`**: pełny adres `http(s)`; w każdym wpisie co
     najmniej jedno źródło musi mieć adres prowadzący do źródła, jego opisu
     (wydawca, biblioteka cyfrowa, recenzja) albo wzmianki potwierdzającej
     istnienie. Walidator (`tools/rebuild-index.mjs`) odrzuca wpis bez adresu i
     adres inny niż http(s); `app/ui.js` renderuje tylko adresy http(s) (z
     `rel="noopener noreferrer external"`), etykietę skracając wizualnie.
  3. Kolejność kluczy w plikach JSON = kolejność prezentacji; walidacja i indeks
     nie zależą od porządku (schemat polowy, ADR 0002).
- Konsekwencje:
  - Wpisy sprzed v1.2 nie wymagają migracji treści — przy najbliższej edycji
    uzupełniamy adresy i porządek kluczy (obie istniejące kartoteki zrobione w
    tej sesji).
  - Źródło bez adresu nadal jest dozwolone (papier, druk), ale wpis musi mieć
    choć jeden obronny link — to koszt przy każdym nowym wpisie: minimum jedno
    sprawdzenie adresu w sieci (ADR 0008).
  - Stopka aplikacji i dokumentacja cytują protokół jako v1.2; ADR 0005
    pozostaje aktualne co do ramy promptu 21:9 (nie zastąpione, rozszerzone).
  - Pomysł „sprawdzania żywości linków” w CI zostaje w `docs/BACKLOG.md`
    (egress sandboxa jest ograniczony, więc kontrola adresów byłaby pracą
    sesji, nie CI).
- Powiązania: 0002, 0005, 0008, 0010
