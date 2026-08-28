# 0019 — SKITy wieloosobowe jako preferowane i twardy wymóg opisu powiązania

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst:
  Dwa zlecenia właściciela z sesji M8.
  (A) Baza Skitów wypełniła się rozmowami dwuosobowymi, a największy potencjał
  literacki i filozoficzny AME tkwi w spotkaniach 3–4 bytów z różnych kultur
  (spięcie kilku tradycji naraz, nie duet). Trzeba to utrwalić jako kierunek,
  nie tylko dozwolenie.
  (B) Powiązanie między manifestacjami bywa kuszące skrócić do jednego słowa
  albo samego adresu, co czyni warstwę wiki nieczytelną. Powiązanie ma
  tłumaczyć, DLACZEGO dwa byty są ze sobą związane.

- Decyzja:
  1. **SKITy 3–4-osobowe są składem preferowanym** (PROTOKÓŁ §8.2). Minimum
     pozostaje 2 (istniejące duety są legalne i się nie zmieniają), maksimum 4.
     Wprowadzamy stałą `SKIT_ZALECANE_UCZESTNIKOW = 3`. Build (`npm run build`)
     wypisuje **niełamiącą** podpowiedź, gdy duetów jest więcej niż skitów o
     składzie ≥3 — sygnał dla kroku C3, nie błąd walidacji. C3 dobiera skład
     wieloosobowy domyślnie, a duet wybiera świadomie (gdy temat go wymaga).
  2. **Opis powiązania musi być zdaniem uzasadniającym związek** (PROTOKÓŁ §6.2).
     Walidator (`walidujPowiazania`) odrzuca opis krótszy niż
     `POWIAZANIE_MIN_SLOW = 12` słów oraz opis będący samym adresem `http(s)`.
     Próg jest niski względem stanu faktycznego (istniejące opisy: 43–78 słów) —
     pilnuje wyłącznie, by żaden przyszły nie zszedł do etykiety ani do linku.

- Konsekwencje:
  - `tools/rebuild-index.mjs`: nowe stałe `SKIT_ZALECANE_UCZESTNIKOW`,
    `POWIAZANIE_MIN_SLOW`; `walidujPowiazania` zyskuje dwa błędy (za krótki
    opis, sam link); nowa czysta funkcja `podpowiedzSkladySkitow` + hint w buildzie.
  - Testy kontraktowe „kod = protokół = instrukcja” pilnują obu progów i tego,
    że dokumenty cytują tę samą liczbę (jak przy limicie 300 słów, L14).
  - PROTOKÓŁ v1.7: §8.2 (skład preferowany 3–4) i §6.2 (opis powiązania).
  - 2-osobowe SKITy z bazy pozostają ważne; migracja nie jest potrzebna, bo
    żaden istniejący opis powiązania nie schodzi poniżej progu.

- Powiązania: ADR 0006 (warstwa wiki: tagi, powiązania), ADR 0013 (Baza Skitów),
  ADR 0015 (limit długości SKITa), ADR 0007 (Pętla Jakości: C3).
