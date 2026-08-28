# 0005 — Protokół MFM jako obowiązujący format treści; rama promptu 21:9

- Status: Zaakceptowana
- Data: 2026-08-27
- Kontekst: Właściciel przekazał „Protokół MFM v1.0” (dokument założycielski
  w repozytorium) definiujący filozofię systemu (transpozycja kart MtG na
  realne byty folkloru/mitów/legend), strukturę wpisu (sekcje I–V) oraz
  zasadę „jeden byt, jedna kultura, jedno miejsce”. W wiadomości
  założycielskiej doprecyzował format promptu dla generatorów grafiki:
  kinowe, hiperrealistyczne zdjęcie całej postaci od stóp do głów, obiektyw
  35 mm anamorphic, 21:9 (dosłowny szablon z `--ar 21:9`).
- Decyzja:
  - Treść wpisów reguluje `docs/PROTOKOL.md` (wersja v1.1): struktura sekcji
    I–V z protokołu MFM v1.0 + poprawki założycielskie (jednostka zamiast
    „zjawiska-kosmosu”, zakaz rozmycia kulturowego) + sekcja V „Trofea”.
  - Prompt wizualizacji ma **stałą ramę otwarcia i zamknięcia** (dosłowne
    fragmenty szablonu właściciela) oraz swobodny środek opisujący scenę;
    rama jest walidowana maszynowo przez `tools/rebuild-index.mjs`.
  - Styl wizualizacji z v1.0 („National Geographic photography, YAML”) zostaje
    **zastąpiony** ramą kinową 21:9 z v1.1 — pliki wpisów używają wyłącznie
    nowej ramy.
  - Źródła w sekcji III muszą być prawdziwe i weryfikowalne; zakaz wymyślania
    pozycji bibliograficznych.
- Konsekwencje:
  - Wpisy generowane przed v1.1 podlegają konwersji przy pierwszej edycji
    (nie ma ich, więc brak migracji).
  - Walidator ramy chroni przed „dryfem” szablonu przy kopiowaniu między
    wpisami i agentami.
  - Obraz wizualizacji to JPEG 21:9 ≤ 2 MB w `assets/wizualizacje/<slug>.jpg`;
    brak obrazu nie blokuje publikacji wpisu (aplikacja pokazuje placeholder
    i gotowy prompt).
- Powiązania: 0002, 0006
