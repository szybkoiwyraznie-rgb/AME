# PLAN — sesja M12 (2026-08-28): przenośność platformy budowy + treść

> Plan JEDNEJ sesji. Zasady: `AGENTS.md`, `docs/PROTOKOL.md` (v1.7), ADR 0001–0019.
> Kontynuacja PR #6. Właściciel pyta: czy przenieść rozwój na Meta.ai (czat z
> wieloagentowością/„agent swarm"), kończąc sesje patchem PR wgrywanym ręcznie?

## Pytanie właściciela (do rozłożenia uczciwie)

Meta.ai ma (wg właściciela) wbudowany „agent swarm" (wieloagentowość); brak
connectora do GitHuba, ale może pracować w sandboxie jak agent Areny i kończyć
sesję patchem/PR wgrywanym ręcznie. „Czy to nie jest rozwiązanie?"

## Kluczowe rozróżnienie (teza sesji)

To rozwiązuje INNY problem niż „subagenci w runtime gry":
- **build-time (kto BUDUJE projekt)** — wymienny; git+PR to granica przekazania.
  Wieloagentowość na etapie budowy = prawdziwa izolacja przy GENEROWANIU treści
  KRONIKI, bez kluczy w artefakcie (to realizacja „opcji 3/embodiment" na serio).
- **run-time (co NAPĘDZA grę u odbiorcy)** — bez zmian: artefakt zostaje vanilla
  static (ADR 0001–0003); pełna izolacja bytów u użytkownika to nadal 3a (klucze).

## Zadania sesji (bez kodu gry)

- [ ] **Analiza:** `docs/plans/POMYSL_platforma-budowy-przenosnosc.md` — build-time
      vs run-time, co Meta.ai realnie zmienia, warunki przenośności, ryzyka,
      rekomendacja. Uczciwie: nie weryfikuję zdolności Meta.ai.
- [ ] **Zasada przenośności** dopisana w widocznym miejscu (repo neutralne wobec
      platformy; git PR = granica; reguły AGENTS/testy obowiązują każdą platformę).
- [ ] **C1** treść: pogłębienie wpisu (research www).
- [ ] **C3** treść: nowy SKIT (3–4 osoby, blind-draft).
- [ ] Dokumenty sesji + PR.

## Brama jakości

`npm test` + `npm run build` + `npm run check` po każdym kroku; commit i push
przyrostowo (ADR 0004). Żadnego kodu gry.
