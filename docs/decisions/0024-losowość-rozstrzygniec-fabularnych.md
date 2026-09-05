# 0024 — Losowość rozstrzygnięć fabularnych przy deterministycznej szansie

- Status: Zaakceptowana
- Data: 2026-09-05
- Kontekst: Dotychczasowe opisy Areny i SPLOTU zbyt mocno utożsamiały
  determinizm z identycznym wynikiem. AME potrzebuje losu i szczęścia, bo
  niepewność jest częścią opowieści o polowaniu, egzorcyzmie, przejściu i
  konflikcie bytów z ludzkim światem. Jednocześnie indeks, statystyki,
  wyliczenie szansy i build muszą pozostać powtarzalne.
- Decyzja:
  1. **Determinizm dotyczy modelu i szansy**, nie koniecznie rezultatu.
     Dla tych samych danych, składu, zasobu, terenu i warunków runner wylicza
     tę samą szansę sukcesu (`prawdopodobienstwo` 0–1).
  2. Rezultat rozstrzyga wstrzykiwany generator losowy: `los()` zwraca wartość
     w `[0, 1)`, a sukces zachodzi, gdy `los() < prawdopodobienstwo`.
     Rdzeń nie używa `Math.random`; adapter interfejsu może korzystać z
     `crypto.getRandomValues`, a tryb powtórki z RNG ziarnistego.
  3. Każde rozstrzygnięcie zapisuje `seed`/identyfikator losowania, wartość
     losową, wyliczoną szansę, wersję reguł i wynik. Dzięki temu zdarzenie
     kanoniczne da się odtworzyć i zarchiwizować, mimo że pierwsza próba była
     losowa.
  4. Preview może oferować tryb „powtórz tę drogę” z seedem, lecz nie może
     udawać, że wynik był z góry przesądzony. Statystyki nie są przeznaczeniem;
     opisują przewagę, którą los może przełamać.
  5. Deterministyczny pozostaje `data/index.json`, build, profile bytów,
     szansa i wszystkie dane źródłowe. Losowość należy do warstwy symulacji i
     opublikowanego dziennika zdarzenia.
- Konsekwencje:
  - testy sprawdzają granice `0`, `p` i wartości `>= p`, a nie jeden „jedyny”
    wynik fabuły;
  - przegrana silnego bytu może być ciekawym zwrotem, a nie błędem balansu;
  - live UI potrzebuje bezpiecznego adaptera losowości i logu rozstrzygnięcia;
  - AI może pisać warianty prozy po rozstrzygnięciu, ale nie ustala szansy ani
    wyniku.
- Powiązania: 0001, 0002, 0003, 0021, 0023
