# 0016 — Kanon tagów jako dane źródłowe i prezentacja pasmami kategorii

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Po sześciu wpisach słownik urósł do 32 tagów bez
  jakiejkolwiek struktury: mieszały się w nim kultura (`joruba`), kraj
  (`nigeria`), gatunek bytu (`maskarada`, `imp`), obiekt (`katedra`,
  `groteska`) i motyw (`kult-przodkow`). Pasek tagów był alfabetyczną listą
  chipsów, więc filtr „co to za byt” i filtr „skąd on jest” wyglądały tak samo.
  Właściciel (2026-08-28, w ramach C2) zażądał „czytelnego kanonu tagów i
  sposobu ich prezentacji”.
- Decyzja:
  1. **Słownikiem jest plik danych, nie kod i nie konwencja**:
     `data/kanon-tagow.json` — `kategorie` (id, nazwa, skrót, min, max, opis) i
     `tagi` (tag, kategoria, opis). Zmiana słownika nie wymaga zmiany kodu, a
     brak słownika uniemożliwia build.
  2. **Cztery kategorie, limoby wymuszone**: `kultura` (dokładnie 1), `typ`
     (dokładnie 1), `motyw` (1–2), `postac` (0–1). Walidator
     (`walidujTagi` w `tools/rebuild-index.mjs`) odrzuca: tag spoza słownika,
     brak wymaganej kategorii, przekroczenie limitu, duplikaty; osobna
     `walidujKanon` sprawdza sam plik (unikalność, istnienie kategorii, opis i
     skrót, kategoria niepusta).
  3. **Kraj nie jest tagiem** — pochodzi z `lokalizacja.kraj`, po którym już
     teraz szuka `app/data.js: dopasowania`; podwójne etykietowanie geografii
     rozjechałoby filtr z wyszukiwarką.
  4. **Indeks v3**: `tagi[tag] = { kategoria, opis, wpisy[] }` (dotąd: sama
     tablica slugów) oraz `kanon.kategorie[]`; kolejność tagów w indeksie bierze
     się z kanonu, więc UI nie musi znać słownika, a build pozostaje
     deterministyczny (ADR 0002).
  5. **Prezentacja**: pasek tagów układany w pasma po kategoriach (podpis
     kategorii + chipy z licznikiem i opisem w `title`); w karcie bytu chip
     pokazuje skrót kategorii (`typ | olbrzym`), pełna nazwa i opis w
     podpowiedzi; status pokazuje, którą kategorią aktualnie filtrowano.
- Konsekwencje:
  - Wszystkie wpisy trzeba było przetagować do kanonu (utrata kilku niefunkcjonalnych
    tagów: `nigeria`, `katedra`, `festiwal-rodowy`, `ballada`, `motyw-a571`); ich
    treść nie zniknęła — siedzi w `lokalizacja`, `pochodzenie_i_kultura` i
    `nazwy_alternatywne`, więc wyszukiwarka je nadal łapie.
  - Dodanie wpisu wymaga teraz jednego spójnego ruchu: tagi *z* kanonu albo
    dopisanie ich do kanonu w tym samym commicie (walidator nie przepuści
    inaczej). To celowe tarcie, nie usterka: zmusza do myślenia o słowniku.
  - Limit „motyw 1–2” oznacza, że rozbudowa sieci znaczeń idzie przez nowe
    wpisy, nie przez dokleianie etykiet; jeśli kategoria okaże się za ciasna,
    zmienia się `max` w pliku kanonu i dopisuje test.
  - Skan UI jest tańszy: cztery pasma zamiast 32 chipsów; na mobile pasma
    składają się w jedną kolumnę bez separatorów.
  - Kanon nie obejmuje SKITów (te nie mają tagów); jeśli dojdą, dojdzie
    kategoria — bez zmiany reszty schematu.
- Powiązania: 0002, 0006, 0011, 0013
