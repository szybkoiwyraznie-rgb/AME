# 0013 — Baza Skitów: nowy typ danych, sekcja VI wpisu i krok C3 pętli

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Właściciel (2026-08-28) zlecił warstwę literacką spinającą
  manifestacje z różnych kultur: **SKITy** — krótkie (≤250 słów) fragmenty
  prozy dialogowej w stylu przerywników z serii *Tales of…*, w których głos
  zabierają same materializacje (nie karty), rozmawiając in-character, w 100%
  przez lore swojej kultury i epoki. Wymagania zlecenia: niezależne obiekty w
  **Bazie Skitów** z dostępem z górnego paska (analogicznie do „Kartoteki”),
  nagłówek `### **SKIT: tytuł**`, lista uczestników, czysty dialog bez
  meta-języka gry, temat zawsze inny, **zakaz powtarzania składu osobowego**
  między skitami, a w Pętli Jakości nowy krok **C3** wyżej niż C2.
- Decyzja:
  1. **Nowy typ danych:** `data/skity/<slug>.json` ze schematem
     `{ slug, tytul, temat?, uczestnicy: [{imie, slug}], tekst, meta }`.
     Skit nie jest sekcją wpisu ani polem w nim — kartoteka pozostaje źródłem
     prawdy o bycie, skit jest obiektem niezależnym i linkowanym.
  2. **Rygor w narzędziach** (`tools/rebuild-index.mjs`, testy): 2–4
     uczestników, każdy `slug` musi istnieć w kartotece i nie może się
     powtarzać; każdy uczestnik musi zabrać głos w `tekscie`; repliki w formie
     `**Imię:** …`; 60–250 słów; **unikalność zestawu uczestników w całej
     bazie** (`walidujUnikalnoscSkitow`); zakaz żargonu growego i odwołań do
     kart/Scryfall; `meta` jak we wpisach. Zasady nie zależą od dobrej woli
     pisarza — pilnuje ich walidator.
  3. **Indeks v2** (ADR 0002 rozszerzony): `skity[]` (skróty),
     `manifestacje[].skity` (sekcja VI) i `aktualizacje[]` (feed, ADR 0014).
     Sekcja VI **wylicza się** z powiązań w skitach — plik wpisu nie duplikuje
     listy, więc nie ma dryfu i nie ma konfliktów przy równoległych sesjach.
  4. **UI:** przycisk „✎ skity” w topbarze → warstwa z listą bazy (najnowsze
     na górze) i widokiem skitu; sekcja VI pod kartą materializacji; deep-link
     `#skit:<slug>`. Render dialogu czyszczą funkcje `ui.js`
     (`htmlDialogu`, `htmlSkitu`, `htmlBazySkitow`) — escapują treść i dopiero
     na escapowanym tekście dokładają markup.
  5. **Pętla Jakości (ADR 0007): nowy krok C3** — po C1, przed C2 (w liście
     todo nad C2): wybrać 2–4 materializacje o składzie, który nie ma jeszcze
     skitu, napisać dialog i dopisać do bazy.
  6. **Treść reguluje `docs/PROTOKOL.md` §8** (forma, rygory, przykłady
     tematów) — to on jest dokumentacją obowiązkową dla przyszłych agentów.
- Konsekwencje:
  - Walka z powtórkami jest maszynnna: drugi skit o tym samym składzie nie
    przejdzie `npm test`, więc presja na oryginalność nie zależy od dobrej
    woli sesji.
  - Skład unikalny wymusza rosnącą kartotekę: przy dwóch wpisach możliwy jest
    jeden skład; autorzy nowych manifestacji (F1/C1) automatycznie odblokowują
    kolejne skity.
  - Faktografia w dialogu podlega ADR 0008: zwyczaje i przedmioty przywołane w
    skicie muszą wynikać z zweryfikowanych sekcji kart bytów; nowy fakt w
    tekście = nowy fakt do sprawdzenia w sieci.
  - Koszt: trzeci katalog danych, trzeci zestaw reguł walidatora i testy
    renderu; bez nowych zależności (ADR 0001 nietknięty).
  - Widok skitu to kolejna warstwa nad kartoteką (ADR 0010) — stąd jednolita
    delegacja klików przez `closest()` z listą atrybutów (patrz L10).
- Powiązania: 0001, 0002, 0006, 0007, 0008, 0010, 0012, 0014
