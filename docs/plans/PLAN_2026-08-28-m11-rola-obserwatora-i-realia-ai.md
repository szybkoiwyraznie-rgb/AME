# PLAN — sesja M11 (2026-08-28): rola obserwatora + realia „subagentów" + treść

> Plan JEDNEJ sesji. Zasady: `AGENTS.md`, `docs/PROTOKOL.md` (v1.7), ADR 0001–0019.
> Kontynuacja PR #6. Właściciel odpowiedział na 3 pytania z M10 i zadał ważną
> wątpliwość o subagentów. Na razie MYŚLIMY, nie kodujemy gry; w międzyczasie treść.

## Odpowiedzi właściciela (skrót)

1. **Rola obserwatora** ciekawsza — więcej wymaga od mechaniki i decyzji AI, ale
   obserwator nikogo nie faworyzuje (robi to system + agenci).
2. **Wątpliwość:** czy agent Areny może powoływać subagentów? Właściciel żył w
   przekonaniu, że to jeden wszechwiedzący agent bez podzlecania. Trzeba
   odpowiedzieć SZCZERZE — to zmienia architekturę B/KRONIKI.
3. Zależy od (2); dopuszcza symulowanie niezależnych agentów przez jednego, ale
   widzi ryzyko wycieku wiedzy.
4. **Nowy pomysł:** opowieść/kronika/fabuła jako niezależne timeline'y —
   rozwijane osobno, z rozszczepianiem, zamieraniem (dead-end) i krzyżowaniem.
   Dopisać do pliku pomysłów.

## Zadania sesji (bez kodu gry)

- [ ] **Uczciwa odpowiedź o AI** w koncepcji: sekcja „Realia zdolności agenta"
      (jeden agent na turę; brak powoływania subagentów; co to znaczy dla
      izolacji wiedzy; jak minimalizować wycieki bez kluczy; kiedy trzeba 3a).
- [ ] **Rozstrzygnięcie roli gracza:** obserwator (Q1) jako domyślny tryb SPLOTU.
- [ ] **Timeline'y (pomysł właściciela)** → `LUZNE_POMYSLY_NA_PRZYSZLOSC.md`.
- [ ] **C1** treść: pogłębienie wpisu (balor — 2 powiązania, 0 modyfikacji).
- [ ] **C3** treść: nowy SKIT (3–4 osoby, metoda embodimentu z dyscypliną „blind-draft").
- [ ] Dokumenty sesji + PR.

## Brama jakości

`npm test` + `npm run build` + `npm run check` po każdym kroku; commit i push
przyrostowo (ADR 0004). Żadnego kodu gry.
