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
- [x] E2 — polerowanie dokumentacji: pełna procedura „dodanie manifestacji
      z karty” krok po kroku w `docs/WORKFLOW.md` (fetch Scryfall, research,
      wpis, build, wizualizacja, podłączenie do mapy) + odnośnik z README.
- [x] E3 — wymiana danych: usunięcie `wendigo`/`zmora` (+ ilustracje),
      pełne materializacje wg ADR 0008:
      Krumar Initiate (TDM 84) → `egungun` (Joruba, Oyo, Nigeria),
      Forge Devil (DKA 91) → `lincoln-imp` (katedra Lincoln, Anglia);
      fetch Scryfall wykonany (brzmienia potwierdzone), research www wykonany;
      aktualizacja testów (ui/dane) i odniesień w PROTOKOL §7; build+testy.
- [x] E4 — wizualizacje 21:9 obu nowych manifestacji (prompty z wpisów,
      kadrowanie, ≤ 2 MB, pole `obraz`, rebuild indeksu).
- [x] E5 — handoff 2026-08-28, wpis M2 w PROJECT_HISTORY, podsumowanie
      planu, aktualizacja opisu PR (kumulatywnie).

## Ryzyka / pułapki

- reset workspace między turami już wystąpił (odzyskano wg ENVIRONMENT §2) —
  pushować po każdym kroku;
- polskie znaki — edycje przez python3/UTF-8;
- `str.replace` w pythonie cicho pomija niedopasowany wzorzec — po każdej
  edycji weryfikować `grep` (z tolerancją zawijania linii).

## Podsumowanie wykonania

Wszystkie etapy wykonane (commity 1047089..607487a, każdy z zielonym
`npm test`+`npm run build`): ADR 0007 (Pętla Jakości C1↔C2) i ADR 0008
(Scryfall + www, zakaz pisania z pamięci) w AGENTS/ENVIRONMENT/ROADMAP/
PROTOKOL; pełna procedura dodawania manifestacji w WORKFLOW (status CI/Pages
zaktualizowany jako aktywne); wendigo/zmora usunięte; pełne materializacje:
egungun (Krumar Initiate, TDM 84 — fetch Scryfall + źródła: Drewal–Pemberton
1989, badania Òyó 2019, ModernGhana) i lincoln-imp (Forge Devil, DKA 91 —
fetch Scryfall + źródła: BBC Lincolnshire, BBC News 2025, materiały katedry),
z wizualizacjami 21:9 i powiązaniem krzyżowym. Pułapki sesji: reset workspace
między turami (odzysk §2), utrata upstream (L5), start pakietu pip (L6).
Testy: 34/34.
