# 0006 — Warstwa wiki: tagi, powiązania przez slugi, backlinki w indeksie

- Status: Zaakceptowana
- Data: 2026-08-27
- Kontekst: Właściciel chce, by kolejni agenci rozbudowywali opisy istniejących
  manifestacji, tagowali je we wspólne grupy i szukali powiązań między
  manifestacjami „jak w Wikipedii”. Aplikacja ma pokazywać sieć tych
  powiązań na mapie.
- Decyzja:
  - `tagi`: lista znormalizowanych etykiet — małe litery, myślniki, bez spacji
    (`byt-nocny`, `ameryka-polnocna`). Słownik tagów wylicza indeks.
  - `powiazania`: lista obiektów `{ slug, opis }` wskazujących **istniejące**
    wpisy (walidowane przy buildzie; bez self-linków). Powiązanie jednokierunkowe
    jest legalne; **backlinki** („wzmiankowany przez”) wylicza `data/index.json`,
    więc autor wpisu nie musi edytować cudzych plików, by powiązanie było
    widoczne z drugiej strony.
  - `opis` powiązania jest wymagany i ma uzasadniać związek merytorycznie
    (wspólna kategoria bytów, sąsiedztwo geograficzne, wspólny rytuał
    obronny…), nie tylko „podobne”.
  - Aplikacja rysuje powiązania jako łuki między pinezkami (warstwa
    przełączalna) i pozwala skakać między wpisami z panelu wpisu.
- Konsekwencje:
  - Sieć powiązań rośnie przyrostowo i jest spójna (brak wiszących referencji
    — walidator blokuje build).
  - Backlinki załatwiają problem „obustronnych” linków bez podwójnej edycji
    i konfliktów merge.
  - Przy usuwaniu/zmianie slugu wpisu trzeba poprawić referencje w innych
    wpisach — walidator wskaże wszystkie miejsca.
- Powiązania: 0002, 0005
