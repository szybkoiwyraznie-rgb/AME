# 0027 — Autonomia wdrożeniowa: featury i elementy fabularne idą na live bez osobnej zgody

- Data: 2026-09-05
- Status: Zaakceptowana
- Nadpisuje: 0007 (w zakresie „akceptacji przed live”), doprecyzowuje 0023 i 0025
- Powiązania: 0004, 0007, 0021, 0023, 0025, 0026

## Kontekst

ADR 0007 wprowadził regułę „feature czeka na akceptację właściciela przed
uruchomieniem live”. ADR 0023 zniósł ją dla featurów aplikacyjnych, ale zapis
został tylko w jednym akapicie AGENTS §2, a dokumentacja nadal była nim
podszyta: `docs/BACKLOG.md` w ośmiu miejscach kończył opis wdrożonej pozycji
zdaniem „Do akceptacji właściciela przed live”, handoffy powtarzały tę formułę,
a przy elementach fabularnych i grywalizacyjnych (Kronika, SPLOT, PRÓG, Arena)
nigdzie nie było powiedziane wprost, czy wolno je włączać bez pytania.

Właściciel rozstrzygnął to w czacie 2026-09-05:

> Wdrożenia featurów oraz kolejnych elementów fabularnych i grywalizacyjnych
> możesz robić na live bez mojej zgody. Jeśli czegoś nie ma w dokumentacji —
> dopisz do dokumentacji.

## Decyzja

1. **Agent wdraża bez pytania.** Nowe featury aplikacji ORAZ nowe elementy
   fabularne i grywalizacyjne (Epoki i wątki Kroniki, drogi i węzły SPLOTU,
   PRÓG, Arena Rezonansu, kolejne narzędzia świata) trafiają na `main` przez
   normalny PR sesji i idą live bez osobnej akceptacji właściciela.
2. **Formuła „do akceptacji właściciela przed live” znika z dokumentacji.**
   W backlogu, handoffach i historii nie opisuje się już wdrożonej rzeczy jako
   czekającej na zgodę. Miejsca historyczne wolno zostawić tylko jako cytat
   z datą, gdy opisują ówczesny stan procesu.
3. **Bramą jakości jest test, nie zgoda.** Wdrożenie musi mieć: zielone
   `npm test`, `npm run build`, `npm run check`, commit per krok (ADR 0004),
   opis w PR i wpis w `meta.modyfikacje`, jeśli dotyka treści. Audyt następnej
   sesji (ADR 0004 pkt 2) jest kontrolą po fakcie.
4. **Co nadal wymaga decyzji właściciela** (bez zmian):
   - granice nienegocjowalne z AGENTS §4 (brak frameworków i kroku budowania,
     generowany indeks, sekrety, pliki > 2 MB),
   - **scalanie PR** — agent nigdy nie scala sam (L18),
   - zmiana samej procedury pracy (nowy ADR to nie to samo co feature),
   - usuwanie istniejących bytów, SKIT-ów i Epok — kasowanie treści to nie
     wdrożenie.
5. **Brak zapisu w dokumentacji nie jest powodem do pytania.** Gdy agent
   napotka regułę, której nie ma w dokumentach, ustala ją sam wedle najlepszej
   wiedzy i **dopisuje ją w tym samym PR** do właściwego miejsca (tabela
   AGENTS §5: ADR / PROTOKOL / LESSONS / BACKLOG).

## Konsekwencje

- AGENTS §2 i §4 mówią o autonomii wdrożeniowej wprost i obejmują nią elementy
  fabularne oraz grywalizacyjne, nie tylko featury UI.
- `docs/BACKLOG.md` opisuje pozycje wdrożone bez zdania o akceptacji.
- Ryzyko: agent wprowadzi element świata, którego właściciel nie chce.
  Mitygacja — pełny opis w PR, rozliczenie obrotów w handoffie i możliwość
  cofnięcia przez niescaloną gałąź; PR nadal scala wyłącznie właściciel.
- Ryzyko: dokumentacja spuchnie od reguł dopisywanych ad hoc. Mitygacja —
  tabela AGENTS §5 wskazuje jedno miejsce na regułę, a budżet lektury startowej
  pilnuje `node tools/budzet-lektury.mjs`.
