# 0023 — Pętla Jakości liniowa (C4→C1→C2→C6→C3+5) i autonomia wdrożeń

- Data: 2026-09-04
- Status: zaakceptowany
- Nadpisuje: 0007 (w zakresie składu pętli i reguły „akceptacja właściciela
  przed live")

## Kontekst

Projekt działa w trybie auto-sesji (cron co 30 minut, timeout 1800 s), w
którym pętlę zewnętrzną wykonuje harmonogram — każda sesja jest jednym
obrotem. Właściciel nie uczestniczy w bieżącej akceptacji; aplikacja ma się
rozwijać bez jego ingerencji. ADR 0007 zakładał pętlę rekurencyjną C1↔C2
z obowiązkową prezentacją featurów właścicielowi PRZED uruchomieniem live
— w trybie auto-sesji ta reguła jest martwa (wszystko i tak wchodzi na live
przez auto-scalenie PR-ów zanim właściciel je zobaczy).

## Decyzja

1. **Pętla Jakości staje się sekwencją liniową, bez zapętlenia:**
   **C4 → C1 → C2 → C6 → C3+5**. Sesja wykonuje jedno przejście (tyle, ile
   zmieści się w budżecie), po czym pisze handoff i kończy; kolejny obrót
   robi następna auto-sesja z cronu. Skład:
   - **C4 — materializacja z kolekcji:** jedna losowa karta z
     `Lista Kart w Kolekcji.txt`, której `karta.nazwa` nie występuje w
     żadnym wpisie `data/manifestations/*.json`; pełny wpis MFM, fetch
     Scryfall z setu z listy (ADR 0008), research www.
   - **C1 — pogłębianie wpisów** (jak dotychczas, research www).
   - **C2 — featury aplikacji** (jak dotychczas, z testami).
   - **C6 — rozwój Kroniki:** Epoki / rozgałęzienia / tomy; przekalibracja
     `test/kronika.test.js` w tym samym kroku (L20).
   - **C3+5 — Baza Skitów i narzędzia fabularne** (scalone): SKIT-y wg
     PROTOKOŁU §8.4 oraz narzędzia wykorzystujące zmaterializowane byty
     (fabuła, zasoby, grywalizacja, ekonomia, przygody, walka świata
     z materializacjami), konkretyzowane z `docs/BACKLOG.md`.
2. **Koniec reguły „prezentacja właścicielowi przed live".** Agent
   wprowadza nowe elementy AME na własną odpowiedzialność i scala je
   (mechanizm auto-scalania z AGENTS.md §2). Bramą jakości jest audyt
   wykonywany przez NASTĘPNĄ sesję (ADR 0004 pkt 2) — właściciel może
   wycofać każdą zmianę post factum, historia w PR-ach i
   `docs/PROJECT_HISTORY.md` jest pełna.
3. Polerowanie dokumentacji nadal NIE jest częścią pętli (tylko na zlecenie
   właściciela).

## Konsekwencje

- Jedna sesja robi mniej, ale przewidywalniej; ciągłość zapewnia cron,
  nie rekurencja w prompcie.
- Odpowiedzialność za jakość przesuwa się w całości na audyt kolejnej sesji
  i zieloność `npm test` + `npm run build` + `npm run check`.
- AGENTS.md §2 (definicja pętli) i prompt automatyzacji podążają za tym ADR.
