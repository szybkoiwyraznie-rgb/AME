# 0022 — Usunięcie sekcji „Rezonans i tożsamość” i renumercja V–VII (protokół MFM v1.8)

- Status: Zaakceptowana
- Data: 2026-08-30
- Kontekst: właściciel zauważył w kartotece **przebicie czwartej ściany** —
  sekcja III „Dokumentacja (The Source Stack)” bytu *Knecht z Koptos*
  cytowała mechanikę karty MtG jako źródło wiedzy o manifestacji
  („Scryfall, Apprentice Wizard (Double Masters #40) — {1}{U}{U}, Creature —
  Human Wizard 0/1 …”). Te same mechaniki (koszty many, flavor, printy,
  artyści) trafiały do opisu bytu także przez sekcję „Rezonans i tożsamość”
  (tabela translacji: Mechanika, Flavor text, Lore MTG). Właściciel: „Usuń to
  czym prędzej i jeśli jeszcze gdzieś jest podobne »przebicie czwartej
  ściany«, to popraw”. Dodatkowe zlecenia z tej samej recenzji:
  1. usunąć całą sekcję V (Rezonans i Tożsamość) z instrukcji materializacji
     i ze wszystkich materializacji;
  2. przenumerować: VI SKITy → V, „Tomy i Epoki” → VI, „Powiązania” → VII;
  3. odnośnik do Tomu w sekcji „Tomy i Epoki” ma używać konwencji
     „brązowego przycisku” jak pozostałe odnośniki (był niebieskim linkiem).
- Decyzja:
  1. **Protokół MFM v1.8**: sekcje wpisu = I Wizualizacja, II Charakterystyka
     i natura, III Dokumentacja, IV Trofea i dowody eliminacji, V SKITy,
     VI Tomy i Epoki, VII Powiązania. Sekcja „Rezonans i tożsamość” nie
     istnieje; pole `rezonans` znika z materializacji.
  2. **Zakaz przekładania mechaniki MtG na in-lore opisy bytów**: wpis nie
     cytuje kosztów many, typów karty, zdolności, flavoru, artystów ani listy
     wydań jako „dokumentacji” bytu. Źródłem są wyłącznie realne teksty
     kulturowe (mitologia, folklor, literatura, opracowania). Tożsamość karty
     inspiracji pozostaje wyłącznie w metadanych `karta` (nagłówek „inspiracja
     kartą: …”) — to warstwa meta-projektu, nie lore.
  3. Renumercja obejmuje wszystkie nośniki (renderer `app/ui.js`,
     kartoteka osadzona w `tools/kronika.mjs`, `docs/PROTOKOL.md`,
     `docs/WORKFLOW.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`,
     `docs/ROADMAP.md`, `README.md`, stopka aplikacji „protokół MFM v1.8”).
  4. Migracja danych: usunięte pola `rezonans` z 20 materializacji i pozycje
     „baza kart” z dokumentacji 5 wpisów (knecht-z-koptos, morowa-panna,
     pandora, protostates, syama-i-sarvara); walidator przestaje wymagać
     `rezonans`.
  5. Odnośnik do Tomu w `htmlTomyIEpoki` używa `class="chip link"` —
     ta sama konwencja brązowego przycisku co odnośniki do epok, skitów i
     bytów.
- Konsekwencje:
  - „Rezonans i tożsamość” w starych notatkach/ADR = sekcja usunięta;
    mapy przeliczeń w PROTOKÓŁ §4.1.
  - Sekcje V–VII są wyliczane (indeks / summary Kroniki), nie zapisywane
    w pliku wpisu — zgodnie z §4.1 v1.8.
  - Wpis bez `rezonans` przechodzi walidację; testy `test/schema.test.js`
    i `test/ui.test.js` pilnują nowej numeracji i braku sekcji V.
- Powiązania: 0005, 0011, 0012, 0013, 0019
