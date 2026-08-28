# 0004 — Model sesji: PR, audyt poprzedniego PR, inkrementalne commity

- Status: Zaakceptowana
- Data: 2026-08-27
- Kontekst: Projekt jest prowadzony naprzemiennymi sesjami agentów (Arena).
  Każda sesja startuje z czystego klona `main` i tekstu pierwszego promptu —
  nie ma dostępu do stanu lokalnego poprzedniej sesji, historii czatu ani
  niewypchniętych commitów. Doświadczenia z projektu-matki (`mtg`,
  github.com/jurekjurekgh/mtg) pokazały powtarzalne pułapki: praca ginęła bez
  pusha, sesje nadpisywały się nawzajem, zmiany lądowały jednym mega-commitem
  bez audytu.
- Decyzja: Cztery reguły nadrzędne każdej sesji (szczegóły i brzmienie w
  `AGENTS.md` §2, stamtąd pochodzą):
  1. **PR na starcie** — gałąź sesji i PR istnieją na GitHubie przed
     kodowaniem.
  2. **Audyt poprzedniego scalonego PR przed nową pracą** — przegląd diffu
     plik po pliku pod kątem logiki, zgodności z ADR/protokołem i zieloności
     testów; wnioski w opisie PR i `docs/PROJECT_HISTORY.md`.
  3. **Inkrementalne commity** — każdy samodzielnie zielony krok
     (`npm test` + `npm run build`) to osobny commit, od razu wypchnięty.
  4. **Nigdy force push** — praca wyłącznie nowymi commitami na końcu gałęzi;
     przed pushem porównanie ze stanem zdalnym.
  Ponadto: 1 sesja = 1 gałąź = 1 PR; scalanie (preferowane *Squash and merge*)
  jest decyzją właściciela; push do `main` zakazany; sesja kończy się handoffem
  (`docs/setup/HANDOFF_<data>.md`) i blokiem przekazania w czacie.
- Konsekwencje:
  - Każda sesja zostawia po sobie audytowalny, odwracalny łańcuch małych
    commitów; awaria sesji kosztuje co najwyżej ostatni niewypchnięty krok.
  - Audyt poprzedniego PR zamienia „kontynuujemy” w kontrolę jakości zamiast
    ślepego doklejania pracy.
  - Pytania do właściciela tylko przy realnej blokadzie decyzyjnej — resztę
    rozstrzyga repozytorium (ADR, PROTOKÓŁ, ROADMAP).
  - Reguły te pochodzą z dojrzałego modelu pracy projektu `mtg` (tam ADR 0007,
    0013, 0016, 0020) i są tu zaadaptowane do skali AME.
- Powiązania: 0002, 0005
