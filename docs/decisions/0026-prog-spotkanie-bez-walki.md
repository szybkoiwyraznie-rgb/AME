# 0026 — PRÓG: trzecie narzędzie fabularne (spotkanie rozstrzygane kluczem, nie walką)

- Data: 2026-09-05
- Status: Zaakceptowana
- Powiązania: 0021 (Kronika), 0023, 0024 (losowość przy deterministycznej szansie), 0025 (C6 = elementy fabularne)

## Kontekst

Archiwum miało dotąd trzy sposoby rozstrzygania spotkania z bytem:

- **Arena** — kto kogo pokona w starciu (staty, motywy, kontry),
- **SPLOT** — co świat zewnętrzny zrobi z drogą (węzły, zasoby, trudność),
- **Kronika** — jak spotkania odkładają się w historii świata (Epoki, oś, paliwo).

Wszystkie trzy zakładają konfrontację albo wyprawę. Tymczasem sama kartoteka
mówi coś innego: większość bytów w Kartotece nie ginie od broni. Bazyliszek
z Krzywego Koła pada od własnego odbicia w lustrach skazańca, morowa panna
odchodzi po jednym zdaniu wypowiedzianym w progu, psy Saramy zasypiają po
trzykrotnym „idź spać” z hymnu Rigwedy 7.55, imp z Lincoln zostaje unieruchomiony
zanim ktokolwiek go dotknie. Sekcja „słabości i metody pokonania” każdego wpisu
jest w praktyce **katalogiem gestów**, nie katalogiem broni — a żadne narzędzie
tego nie czytało.

## Decyzja

Wprowadzamy **PRÓG** (`app/prog.js`) — czwarte narzędzie fabularne, opisujące
spotkanie rozstrzygane kluczem zamiast walki.

1. **Klucz progu.** Stała lista `KLUCZE_PROGU`: zwierciadło, odpowiedź, hymn,
   opłata, ogień, imię, zasłona. Każdy klucz ma gest (zdanie po polsku), listę
   motywów kanonu, na które działa, i siłę bazową. Klucz dobiera się z motywów
   bytu (tagi kategorii `motyw`), więc dopisanie wpisu nie zmienia kluczy
   pozostałych bytów. Byt bez pasującego motywu zawsze ma wyjście „zasłona” —
   nie otwierać drzwi.
2. **Opór progu** liczy się z percentyli profilu (`app/arena.js`): byt gęsto
   wrośnięty w archiwum trzyma próg mocniej niż świeży wpis.
3. **Szansa jest w pełni deterministyczna** (`szansaProgu`), a los wchodzi
   dopiero w `rozstrzygnijProbe` — zgodnie z ADR 0024. Wyniki są trzy, nie dwa:
   `przejscie`, `cena` (pas 12 punktów tuż nad progiem sukcesu) i `odmowa`.
4. **Sprzężenie Kronika → PRÓG jest jednokierunkowe** (`pogodaProgu`). Świat
   mityczny sprzyja gestom obrzędowym, zracjonalizowany je psuje; zasięg bytu
   działa **odwrotnie niż w SPLOCIE** — im szerzej byt się rozszedł, tym trudniej
   zamknąć go jednym gestem w jednych drzwiach. PRÓG niczego w Kronice nie
   zapisuje, więc reguła „Epoka ma dokładnie jedno źródło” (`skit` XOR
   `zrodloSplotu`) zostaje nienaruszona.
5. **UI**: przycisk `🔑 próg`, fragment `#prog`, warstwa z tablicą progów całej
   kartoteki (klucz, gest, opór, wpływ świata, szansa) i przyciskiem jednej próby.

## Konsekwencje

- Kartoteka zyskuje narzędzie czytające sekcję słabości jako mechanikę, a nie
  jako ozdobnik; nowe wpisy automatycznie wchodzą do tablicy progów.
- Nowy motyw w kanonie trzeba przypisać do klucza (albo świadomie zostawić bez
  klucza — wtedy byt broni się „zasłoną”), podobnie jak dziś przypisuje się mu
  wagę w `WAGA_MOTYWU`.
- Test `test/prog.test.js` pilnuje, by każdy klucz celował wyłącznie w motywy
  istniejące w `data/kanon-tagow.json` — rozjazd kanonu i mechaniki jest wykrywany
  automatycznie.
- Moduł nie zna DOM-u, nie używa `Math.random` ani API Node (L22), więc może być
  używany przez UI, testy i przyszłe narzędzia wsadowe.

## Odrzucone warianty

- **Rozszerzenie Areny o „walkę niekonwencjonalną”** — zaciemniłoby czytelny
  model starcia i zmusiło do sztucznego przeliczania gestów na obrażenia.
- **Zapisywanie wyniku progu wprost do Kroniki** — złamałoby regułę jednego
  źródła Epoki; jeśli próg ma zostawić ślad w historii, właściwą drogą jest
  Epoka oparta o SKIT albo o drogę SPLOTU.
