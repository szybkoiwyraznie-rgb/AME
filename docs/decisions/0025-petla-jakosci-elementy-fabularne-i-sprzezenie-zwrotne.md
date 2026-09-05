# 0025 — Pętla Jakości: C6 jako rozwój elementów fabularnych i pętla powtarzana do wyczerpania budżetu

- Data: 2026-09-05
- Status: Zaakceptowana
- Nadpisuje: 0023 (w zakresie zakresu kroku C6 i liniowości pętli)
- Powiązania: 0004, 0007, 0021, 0023, 0024

## Kontekst

ADR 0023 ustalił pętlę **C4 → C1 → C3 → C6 → C2+5** jako sekwencję LINIOWĄ:
jedna sesja = jedno przejście, ciągłość zapewnia cron. Dwie rzeczy okazały się
za ciasne w praktyce:

1. **C6 był zdefiniowany wąsko — „rozwój Kroniki”.** Tymczasem świat AME ma
   już więcej niż jedno narzędzie fabularne: obok Kroniki (Tomy, Epoki, wątki,
   paliwo) istnieje SPLOT (drogi, węzły, zasoby, Fabularna Proza), a kolejne
   narzędzia będą przybywać. Dosłowne czytanie C6 zmuszało sesję do dopisywania
   Epoki nawet wtedy, gdy większą wartość miałoby rozwinięcie drogi SPLOTU
   albo spięcie obu systemów.
2. **Sesja kończyła się po jednym przejściu, choć budżet bywał niewyczerpany.**
   Przy szybkim przejściu (mała karta, mały feature) sandbox zostawał bezczynny,
   mimo że kolejny obrót — nowa materializacja, nowy SKIT, nowa Epoka, nowy
   feature — mieściłby się w tej samej sesji.

## Decyzja

1. **C6 = rozwój elementów fabularnych** (zamiast „rozwój Kroniki”). Obejmuje:
   - Kronikę (Epoki, rozgałęzienia, Tomy, wątki, mechanika paliwa),
   - SPLOT (drogi, węzły, zasoby, Fabularna Proza, konflikt świata z bytami),
   - **inne narzędzia fabularne** — istniejące i nowe (np. sprzężenia między
     systemami, ekonomia śladów, kalendarz świata).
   Wybór narzędzia w danym obrocie należy do sesji; kryterium jest największy
   przyrost spójności świata, nie kolejność alfabetyczna. Obowiązki techniczne
   pozostają: przy zmianie sieci SKIT-ów lub powiązań przekalibrować asercje
   `test/kronika.test.js` **w tym samym kroku** (L20), a każdy element fabularny
   trzymać w danych i czystych funkcjach, nie w UI.
2. **Pętla jest powtarzana, nie jednorazowa (sprzężenie zwrotne).** Po
   domknięciu C2+5 sesja **wraca na początek** i zaczyna kolejny obrót od C4.
   Obroty numeruje się w handoffie (obrót 1, obrót 2, …). Warunki przerwania:
   - wyczerpanie budżetu sesji (czas/kontekst) — wtedy sesja kończy obrót,
     którego nie da się domknąć, **cofa się do ostatniego zielonego commitu
     w sensie zakresu** (nie zostawia półproduktu w gałęzi) i pisze handoff;
   - zlecenie właściciela w czacie (ma pierwszeństwo przed pętlą);
   - brak możliwości wykonania kroku bez decyzji właściciela — wtedy sesja
     notuje blokadę i przechodzi do następnego kroku pętli.
   Każdy krok każdego obrotu nadal kończy się osobnym zielonym commitem
   (ADR 0004 pkt 3), więc przerwanie pętli w dowolnym momencie zostawia
   repozytorium w stanie spójnym.
3. **Kolejność w obrocie pozostaje bez zmian:** C4 → C1 → C3 → C6 → C2+5.
   Powtarzalność dotyczy całych obrotów, nie pojedynczych kroków — sesja nie
   robi „pięciu C4 pod rząd”.
4. **Higiena powtórzeń.** W drugim i kolejnym obrocie tej samej sesji:
   - C4 losuje kartę z puli nadal nieużytych (bez powtórzeń w obrębie sesji),
   - C1 bierze inny wpis niż w poprzednim obrocie,
   - C3 pilnuje unikalności składu w całej bazie,
   - C2+5 nie „poprawia” featuru z poprzedniego obrotu — bierze nową pozycję
     z `docs/BACKLOG.md`.

## Konsekwencje

- AGENTS.md §2 opisuje pętlę jako powtarzaną i C6 jako rozwój elementów
  fabularnych; prompt automatyzacji podąża za tym ADR.
- Sesje o dłuższym budżecie dają więcej niż jeden obrót, a handoff musi
  rozliczać każdy obrót osobno (co weszło, co zostało otwarte).
- Ryzyko: rosnąca liczba zmian w jednym PR utrudnia audyt. Mitygacja —
  twardy podział na commity per krok i tabela obrotów w opisie PR.
- Ryzyko: pokusa robienia w C6 zawsze tego samego narzędzia. Mitygacja —
  handoff wymienia, które narzędzie fabularne dostało rozwój w danym obrocie,
  więc następna sesja widzi zaległości.
