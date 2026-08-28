# BACKLOG — pomysły rozpoznane, ale niezobowiązujące

> **To NIE jest lista zadań.** Zadania przydziela właściciela w czacie.
> Backlog przechowuje rozpoznanie pomysłów (żeby nikt nie robił go drugi raz).
> Pomysły agentów są mile widziane — dopisuj sekcjami z datą i autorem.

## Aplikacja / UX

- **Deep-linki** `#/slug`: adresowalne wpisy + stan mapy w URL (kandydat do
  F2). Podstawa: `location.hash`, brak zależności.
- **Klastrowanie pinezek**: przy > 50 wpisach mapa zrobi się ciasna; prosty
  grid-clustering w przestrzeni ekranu wystarczy na start.
- **Miniatury na pinezkach** przy wysokim zoomie (obraz 21:9 małpowany w marker).
- **Strona tagu**: klik w tag → filtr mapy + lista; słownik tagów w indeksie
  już to umożliwia.
- **Tryb „wylosuj manifestację”** — przycisk losujący wpis (deterministyczny
  seed z daty jako opcja).
- **Warstwa kręgów kulturowych**: otoczki/halo grupujące wpisy jednej tradycji
  (słowiańska, algonkińska, nordycka…) — wymaga tagu-kręgu jako konwencji.
- **Oś czasu manifestacji**: sortowanie po epoce pierwszego odnotowania;
  wymaga pola `data_pierwszego_odnotowania` w schemacie (migracja indeksu).
- **Wersja EN wpisów**: pole `nazwa_en` / dwujęzyczne sekcje — dopiero po
  decyzji właściciela (podwaja koszt utrzymania treści).
- **PWA / offline**: service worker cache'ujący assety; wymaga HTTPS (Pages OK)
  i ADR (zmienia charakter aplikacji statycznej).
- **Import metadanych kart**: narzędzie sesji (nie przeglądarka!) pobierające
  dane karty (nazwa, set, artysta, flavor) do sekcji „Klucz Przywołania”;
  egress sandboxa jest zablokowany, więc przez `fetch_page`/`web_search`.

## Treść / protokół

- ~~**Kanon tagów**~~ — zrealizowane w M4 (ADR 0016): kategorie z limitami w
  `data/kanon-tagow.json`, walidator i prezentacja pasmami. Kandydaci dalej
  otwarci: kategoria „pora aktywności” (noc/dzień/sezons) i „język źródła”.
- **Wzór „Trophy Room”**: galeria trofeów pierwotnych/wtórnych z wpisów
  (sekcja V) jako osobny widok.
- **Zasady citowania w aplikacji**: sekcja III jako przypisy z linkami
  do repozytoriów cyfrowych (archive.org itp.) — sprawdzać dostępność linków.

## Infrastruktura

- **Test budżetu dokumentacji**: skrypt pilnujący rozmiaru lektury startowej
  (jak w projekcie mtg) — gdy dokumenty urosną.
- **Lint stylu wpisów**: prosta heurystyka „zakaz terminologii growej w
  sekcji II” (lista słów: haste, trample, mana…).

## Zrealizowane w M3 (2026-08-28)

- Baza Skitów + sekcja VI + `#skit:<slug>` (ADR 0013) i feed „Co nowego"
  (ADR 0014) — pomysły z tego rejestru weszły do kodu; patrz `docs/ROADMAP.md`.

## Rozpoznane w sesji M3 (2026-08-28) — po poprawkach z testów

- **Reakcja na zmianę preferencji systemu** — dziś `prefers-color-scheme` liczy
  się tylko przy braku zapisanego wyboru; można nasłuchiwać `change` i
  przełączać dopóki użytkownik nie zdecydował samodzielnie.
- **Miniatura wizualizacji w wierszu kartoteki i w liście** — obraz 21:9 już jest
  w indeksie (`obraz`), wystarczy `<img loading="lazy">` w `htmlListy`.
- ~~**Kopiuj link do wpisu**~~ — zrealizowane w M4 (C2): `ui.linkWidoku` +
  `ui.przyciskKopiowania`, przycisk „⧉ kopiuj link" w kartotece (obok ✕) i w
  warstwie skitu; test pilnuje, że handlerzy obu warstw obsługują `[data-kopia]`.
- **Kontrola żywości adresów źródłowych** — skrypt sesji (narzędzia agenta), NIE
  CI: egress sandboxa jest ograniczony (L3), a linki bywają przenoszone.
  Wymagałby decyzji: martwy link = ostrzeżenie czy błąd walidatora.
- **Widok druku (media print) dla warstwy wpisu** — kartoteka na A4 jako PDF;
  dziś warstwa przykrywa okno i nie ma stylów drukowych.
- **Znacznik „źródło bez adresu” w UI** — pozycje bez `url` (papier) warto
  oznaczać inną kursywą, żeby czytelnik wiedział, czego nie da się kliknąć.
- **Aspekt motywu w testach** — trzymać kontrakt tokenów (lista zmiennych
  wymaganych w obu paletach) jako test danych, gdy paleta urośnie.

## SKITy — rozpoznane kierunki dalszej pracy (M3)

- **Indeks tematów skitów** — przy >10 skitach warto dodać pole `temat` do
  słownika w indeksie (typu „filozofia”, „żałoba”, „jadło”), żeby C3 łatwiej
  dobierało niepowtarzalne tematy, nie tylko składy.
- **Widok „rozmowy” na mapie** — animowany łuk łączący uczestników skitu przy
  jego otwarciu (dziś sekcja VI linkuje tylko do kart).
- **Walidator spójności faktograficznej** — heurystyka ostrzegająca, gdy skit
  przywołuje zwyczaj/nazwę własną nieobecną w kartach uczestników (twarda
  egzekucja wymaga NLP — poza zakresem ADR 0001).
- **Nagrania/lektor** — odczyt skitu na głos (web speech API, bez zależności)
  jako opcja przystępności.
