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

- **Kanon tagów**: krótka lista „tagów systemowych” (kontynent, typ bytu, pora
  aktywności) vs tagi swobodne — gdy słownik urósł, zaproponować właścicielowi.
- **Wzór „Trophy Room”**: galeria trofeów pierwotnych/wtórnych z wpisów
  (sekcja V) jako osobny widok.
- **Zasady citowania w aplikacji**: sekcja III jako przypisy z linkami
  do repozytoriów cyfrowych (archive.org itp.) — sprawdzać dostępność linków.

## Infrastruktura

- **Test budżetu dokumentacji**: skrypt pilnujący rozmiaru lektury startowej
  (jak w projekcie mtg) — gdy dokumenty urosną.
- **Lint stylu wpisów**: prosta heurystyka „zakaz terminologii growej w
  sekcji II” (lista słów: haste, trample, mana…).
