# PLAN 2026-08-28 — Pętla Jakości w zasadach + materializacja dwóch kart

> Roadmapa zadania wg AGENTS §2 / ADR 0004. Zlecenia właściciela w tej sesji:
> (1) ADR domyślnej pętli, (2) rygor Scryfall/www, (3) polerowanie dokumentacji
> (procedura dodawania manifestacji), (4) wymiana wpisów przykładowych na
> pełne materializacje: Krumar Initiate (TDM) i Forge Devil (DKA).

## Etapy

- [x] E1 — ADR 0007 (Pętla Jakości C1↔C2 rekurencyjnie do wyczerpania budżetu;
      polerowanie dokumentacji wyłącznie na zlecenie) + ADR 0008 (obowiązkowy
      fetch Scryfall dla kart, weryfikacja www dla wpisów, zakaz pisania
      z pamięci) + aktualizacja AGENTS/ENVIRONMENT/ROADMAP/PROTOKOL/rejestru.
- [ ] E2 — polerowanie dokumentacji: pełna procedura „dodanie manifestacji
      z karty” krok po kroku w `docs/WORKFLOW.md` (fetch Scryfall, research,
      wpis, build, wizualizacja, podłączenie do mapy) + odnośnik z README.
- [ ] E3 — wymiana danych: usunięcie `wendigo`/`zmora` (+ ilustracje),
      pełne materializacje wg ADR 0008:
      Krumar Initiate (TDM 84) → `egungun` (Joruba, Oyo, Nigeria),
      Forge Devil (DKA 91) → `lincoln-imp` (katedra Lincoln, Anglia);
      fetch Scryfall wykonany (brzmienia potwierdzone), research www wykonany;
      aktualizacja testów (ui/dane) i odniesień w PROTOKOL §7; build+testy.
- [ ] E4 — wizualizacje 21:9 obu nowych manifestacji (prompty z wpisów,
      kadrowanie, ≤ 2 MB, pole `obraz`, rebuild indeksu).
- [ ] E5 — handoff 2026-08-28, wpis M2 w PROJECT_HISTORY, podsumowanie
      planu, aktualizacja opisu PR (kumulatywnie).

## Ryzyka / pułapki

- reset workspace między turami już wystąpił (odzyskano wg ENVIRONMENT §2) —
  pushować po każdym kroku;
- polskie znaki — edycje przez python3/UTF-8;
- `str.replace` w pythonie cicho pomija niedopasowany wzorzec — po każdej
  edycji weryfikować `grep` (z tolerancją zawijania linii).

## Podsumowanie wykonania

(uzupełnione na końcu sesji)
