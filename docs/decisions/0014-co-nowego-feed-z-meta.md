# 0014 — „Co nowego”: dziennik zmian wyliczany z pola meta

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Właściciel chce sekcji **Co nowego** z przycisku w górnym pasku,
  pokazującej feed: nowe wpisy (z linkami), nowe skity (z linkami) i zmiany
  istniejących wpisów, „najnowsze na górze”. Prowadziłoby to do ręcznie
  prowadzonej listy zmian — pierwszej rzeczy, która się rozjeżdża z treścią
  (por. L4: ręcznie pisany indeks). W repo od pierwszej sesji każdy wpis i (od
  ADR 0013) każdy skit ma `meta.utworzono` oraz `meta.modyfikacje:
  [{data, opis}]` — dane dziennika już istnieją, tylko nikt ich nie agregował.
- Decyzja:
  1. **Feed jest wyprowadzany, nie pisany.** `tools/rebuild-index.mjs` buduje
     `indeks.aktualizacje[]`: z `meta.utworzono` → pozycja „dodano”, z każdego
     wpisu `meta.modyfikacje` → „zmieniono” (typ: `manifestacja` albo `skit`,
     plus `slug`, `tytul`, `opis`). Żaden plik „CHANGELOG” nie powstaje.
  2. **Kolejność:** data malejąco; w obrębie jednej daty przyrosty przed
      zmianami, potem `typ`, potem `slug` — porządek totalny i deterministyczny
      (ADR 0002), więc przebudowa indeksu nie generuje fałszywych diffów.
  3. **UI:** przycisk „✚ nowości” (deep-link `#nowosci`) otwiera warstwę z
      feedem; każda pozacja linkuje do treści: wpis → `#<slug>`, skit →
      `#skit:<slug>`.
  4. **Rygor dla agentów** (AGENTS §3, PROTOKÓŁ §9): każda zmiana treści wpisu
     lub skitu musi zostać opisana w `meta.modyfikacje` z datą `RRRR-MM-DD`;
     bez tego znika z dziennika. Walidator wymaga formatu dat i struktury
     wpisów; test `dane.test.js` pilnuje, że indeks z feedem jest aktualny.
- Konsekwencje:
  - Zmiana w treści, której nie opisano w `meta`, staje się widoczna jako
    luka: feed jej nie pokaże, a autor traci „dowód” wykonanej pracy.
  - Daty decydują o pozycji: sesje piszące `modyfikacje` z datą przyszłą lub
    przesuniętą trafią na złe miejsce — reguła: data = dzień commita.
  - Feed pokazuje zmiany *treści*; zmiany kodu, UI i zasad zostają w
    `docs/PROJECT_HISTORY.md` i opisie PR (żeby dziennik archiwum nie zmieniał
    się w changlog aplikacji).
  - Koszt: jedno pole więcej w indeksie (~kilka KB przy setce wpisów) i obowiązek
    aktualizowania `meta` przy każdej edycji — i tak wymagany od sesji M2.
- Powiązania: 0002, 0008, 0013
