# 0007 — Domyślna pętla sesji: Pętla Jakości (C1 treść ↔ C2 featury)

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Projekt prowadzą sesje agentów, które startują bez handoffa, bez
  zaległych prac, bez rozpoczętego kamienia milowego i bez informacji w czacie
  („agent przychodzi i nie wie, co robić”). Właściciel — wzorem projektu `mtg`
  (tam ADR 0021) — chce ustalić domyślną pętlę pracy, żeby sesja NIGDY nie
  pytała „co robić?” i zawsze miała produktywne zajęcie do wyczerpania budżetu.
  Zakazane jest też mieszanie tej pętli z zadaniami jednorazowymi (np.
  polerowaniem dokumentacji), które są wyłącznie zleceniem właściciela w sesji.
- Decyzja: Domyślny tryb sesji po lekturze startowej (AGENTS §0) to:
  1. **A — PR z planem.** Sesja otwiera PR gałęzi sesji (jeśli jeszcze nie
     istnieje — ADR 0004 pkt 1) i wpisuje do opisu PR plan pracy, które
     wypycha na GitHub, zanim zacznie cokolwiek kodować.
  2. **B — audyt.** Sesja szczegółowo audytuje poprzedni scalony PR
     (ADR 0004 pkt 2): plik po pliku, logika zmian, zgodność z ADR/protokołem,
     zieloność testów; wyniki w opisie PR i `docs/PROJECT_HISTORY.md`.
  3. **C — Pętla Jakości** (gdy brak zaległości po audycie, brak zlecenia
     właściciela w czacie i brak otwartych zadań w planie sesji). Pętla jest
     **rekurencyjna i trwa do wyczerpania budżetu sesji**:
     - **C1 — treść (wiki):** przegląd istniejących wpisów/manifestacji
       z priorytetem dla ostatnio dodanych; **research dodatkowy w źródłach
       www (ADR 0008)**; uzupełnianie wpisów o informacje, źródła i
       powiązania do innych manifestacji; tworzenie/grupowanie tagów;
       rozwijanie przeklikiwalnej sieci na wzór Wikipedii (backlinki liczy
       indeks). Zmiany wpisów przechodzą walidator + build + testy.
     - **C2 — featury:** sesja wymyśla nowe, pasujące do AME funkcje
       (inspiracja: `docs/BACKLOG.md`, `docs/ROADMAP.md` F2+), **koduje je z
       testami** i **przedstawia właścicielowi do akceptacji przed
       uruchomieniem live** — czyli feature ląduje w PR sesji z opisem, a na
       produkcję trafia dopiero po decyzji właściciela (scalenie PR).
       C2 nie modyfikuje aplikacji wbrew ADR 0001/0003.
     - Po każdym pełnym obiegu (C1→C2) pętla wraca do C1 (kolejny wpis do
       pogłębienia) — i tak do końca budżetu sesji.
  4. **Wyłączenia pętli:** polerowanie/rozbudowa dokumentacji projektowej NIE
     jest elementem Pętli Jakości — wykonuje się je wyłącznie na wyraźne
     zlecenie właściciela w sesji. Zlecenie właściciela (np. karty do
     opracowania — ROADMAP F1) zawsze ma priorytet nad pętlą.
- Konsekwencje:
  - Każda sesja bez zlecenia kończy się wymiernym przyrostem: głębsze wpisy,
    nowe źródła i powiązania (C1) albo zaprezentowane i przetestowane featury
    czekające na akceptację (C2).
  - C1 podlega rygorowi ADR 0008 (weryfikacja zewnętrzna) — research jest
    obowiązkowy, nie opcjonalny.
  - Ryzyko: pętla może „wbudować feature”, którego właściciel nie chce —
    ogranicza to reguła akceptacji przed live (scalenie PR to decyzja
    właściciela) i zakaz zmiany granic nienegocjowalnych (AGENTS §4).
- Powiązania: 0004, 0005, 0006, 0008
