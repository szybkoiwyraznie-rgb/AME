# 0012 — Numeracja sekcji wpisu zgodna z ich kolejnością (protokół MFM v1.3)

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: ADR 0011 przyjęło nową kolejność prezentacji sekcji (Wizualizacja
  najpierw), ale pozostawiło numery rzymskie przypisane do treści, przez co
  kartoteka czytała się jako IV → II → III → V → I. Właściciel (2026-08-28)
  uściślił: „zamiana miejscami sekcji powinna obejmować także zmianę ich
  numeracji — nowa numeracja powinna odzwierciedlać kolejność; jeśli wymaga to
  zmiany w podstawowej dokumentacji projektu, zrób to”. Drugie zlecenie z tego
  samego dnia domaga się „sekcji VI SKITy”, co jest spójne wyłącznie z
  numeracją porządkową.
- Decyzja:
  1. `docs/PROTOKOL.md` przechodzi na **wersję v1.3** i nadaje sekcjom numery
     równe pozycji: **I Wizualizacja, II Charakterystyka i natura,
     III Dokumentacja, IV Trofea i dowody eliminacji, V Rezonans i tożsamość**,
     a od tej sesji również **VI SKITy** (ADR 0013).
  2. Zmiana obejmuje wszystkie nośniki standardu: renderer kartoteki
     (`app/ui.js`), kolejność i opisy w plikach wpisów (`data/manifestations/`),
     manual (`docs/PROTOKOL.md`, `docs/WORKFLOW.md`), zasady w `AGENTS.md`,
     `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` oraz stopkę aplikacji
     („protokół MFM v1.3”).
  3. Dla materiałów sprzed v1.3 obowiązuje mapa przeliczenia: IV→I, II→II,
     III→III, V→IV, I→V. Nazwy pól w JSON (`wizualizacja`, `natura`,
     `dokumentacja`, `trofea`, `rezonans`) są bez zmian — numeracja dotyczy
     prezentacji i dokumentacji, nie schematu danych.
  4. ADR 0011 pozostaje aktualne w części o adresach źródłowych i o tym, że
     kolejność jest standardem; jego punkt o „numerach jako tożsamości sekcji”
     zostaje zastąpiony przez niniejszy.
- Konsekwencje:
  - Numery przestają być stabilnymi etykietami treści: cytat w stylu „sekcja
    IV” z dokumentów sprzed v1.3 wymaga przeliczenia wg pkt 3 (wpisano mapę w
    PROTOKÓŁ §4.1).
  - Każdy nowy układ sekcji wymaga ruchu numerów w pięciu nośnikach naraz —
    testy `test/ui.test.js` pilnują, że numeracja jest rosnąca i zgodna z
    treścią nagłówków.
  - Sekcja VI (SKITy) wchodzi do schematu bez migracji starych wpisów: jest
    wyliczana z indeksu, a nie przechowywana w pliku wpisu.
- Powiązania: 0005, 0011, 0013
