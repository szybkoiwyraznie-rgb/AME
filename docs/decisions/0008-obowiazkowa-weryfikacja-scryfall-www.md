# 0008 — Obowiązkowa weryfikacja zewnętrzna: Scryfall dla kart, źródła www dla wpisów

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Wpisy MFM powstają w transpozycji kart MtG na realne byty
  folklorystyczne. Doświadczenie sesji 2026-08-27 pokazało, że szczegóły kart
  (dokładne brzmienie zdolności, flavor text, artysta, numer w secie) oraz
  fakty folklorystyczne łatwo odtworzyć błędnie z pamięci modelu. Sandbox ma
  zablokowany swobodny egress, ale narzędzia agenta (`fetch_page`,
  `web_search`, `image_search`) działają i to nimi dane się pozyskuje.
  Właściciel (2026-08-28) uczynił to rygorem twardym: karta — zawsze fetch ze
  Scryfall; wpis — zawsze sprawdzany w www, nigdy pisany z pamięci.
- Decyzja:
  1. **Karta MtG = zawsze fetch ze Scryfall** (`fetch_page` na
     `https://scryfall.com/card/<set>/<numer>/<slug>`; jeśli set/numer nieznane
     — najpierw `web_search`). Z wpisu wynikać muszą dokładne brzmienia:
     koszt, typ, P/T, pełny Oracle text zdolności, pełny flavor text (jeśli
     jest), artysta, set i numer, rok. Materiał trafia do `karta.*` oraz do
     tabeli „Klucz Przywołania”. Zakaz pisania brzmienia karty z pamięci.
  2. **Wpis manifestacji = zawsze weryfikacja w źródłach www.** Każda teza
     faktograficzna (kultura i region pochodzenia wierzenia, wygląd i
     zachowanie bytu w relacjach, obrzędy/słabości, cytowane źródła) musi być
     potwierdzona w co najmniej jednym źródle www pozyskanym narzędziami
     agenta. Detal nie do potwierdzenia — opuszczamy albo sygnalizujemy w
     opisie PR jako otwarty; nie „domyślamy”.
  3. **Źródła w sekcji III są prawdziwe i weryfikowalne** — każdą pozycję
     bibliograficzną w wpisie potwierdzamy w sieci (istnienie autora/tytułu),
     zanim trafi do pliku wpisu.
  4. Rygor obowiązuje też Pętlę Jakości (ADR 0007 C1): pogłębianie wpisów
     zaczyna się od researchu www, nie od „przeredagowania z pamięci”.
- Konsekwencje:
  - Jakość faktograficzna wpisów przestaje zależeć od pamięci modelu; ramy
    kart są jednolite między agentami.
  - Koszt: każda nowa manifestacja wymaga min. 1 fetcha Scryfall + researchu
    źródłowego (kilka zapytań). Zysk: wpis obronny przy weryfikacji.
  - Gdy narzędzia sieciowe są niedostępne w sesji — sesja NIE tworzy nowych
    wpisów (research to warunek konieczny), tylko prace techniczne/testy.
- Powiązania: 0005, 0007
