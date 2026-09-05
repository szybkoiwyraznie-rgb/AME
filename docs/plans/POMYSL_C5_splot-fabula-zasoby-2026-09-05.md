# C5 — Splot: fabuła, droga i konflikt bytów

> Dokument koncepcyjny. Nie jest jeszcze ADR-em ani specyfikacją wdrożenia.
> Powstał po uruchomieniu Profilu Rezonansu i po uwadze właściciela, że
> sama walka 1:1 jest zbyt płaska. Celem C5 nie jest „dodać HP”, tylko
> zbudować warstwę, w której mechanika wynika z archiwum i popycha fabułę.

## 1. Decyzja kierunkowa

AME powinno mieć **fabułę jako drogę przez świat**, a nie osobny ekran walki.
Byt dostaje cel, przeszkodę, sojuszników, zasób i koszt. Walka jest tylko
jednym z możliwych sposobów rozwiązania konfliktu; równie ważne są targ,
przysługa, zdrada, przejście, nazwanie, ofiara i koalicja.

Proponowana nazwa warstwy: **SPLOT**.

- **Kartoteka** mówi, czym byt jest.
- **SKIT** pokazuje, jak byty mówią.
- **Kronika** pokazuje, co wydarzyło się w jednym ciągu epok.
- **SPLOT** pozwala wybrać drogę, ponieść koszt i zmienić stan świata.
- **Profil Rezonansu** dostarcza wyprowadzanych zdolności, ale nie jest
  samodzielnym celem ani rankingiem jakości wpisu.

## 1.1. Korekta: szansa jest deterministyczna, wynik może być losowy

Determinizm nie oznacza, że Sfinks zawsze wygrywa, gdy ma przewagę. Oznacza,
że z tych samych danych obliczamy tę samą **szansę**. Potem los decyduje,
czy próba się uda. Przykład: łowca ma 37% szansy na udany egzorcyzm; wynik
może być sukcesem albo porażką, a porażka może otworzyć ciekawszą odnogę.

Rdzeń dostaje `los()` przez wstrzykiwanie. W trybie demonstracyjnym można
użyć RNG ziarna do powtórki, a w trybie gry — adaptera opartego o bezpieczne
losowanie przeglądarki. Wynik zapisuje się razem z szansą, wartością losową,
seedem i wersją reguł. Rozstrzygnięcie jest więc naprawdę losowe w chwili
próby, ale później audytowalne i możliwe do odtworzenia.

## 2. Najważniejsza zasada: mechanika nie może być silniejsza od opowieści

Każda akcja gry musi dać się przeczytać jako zdanie fabularne:

- „Sfinks zatrzymała wyprawę pytaniem”,
- „Ben-Varrey poprowadziła łódź za obietnicę jabłek”,
- „Talos zamknął wybrzeże, lecz zapłacił za to własnym obiegiem”,
- „Egungun zwołał przodków, ale kosztował go powrót do linii”.

Zakazane jako podstawowy język UI: HP, DPS, lootbox, level grind, zwykła
„walka bytów”. Dopuszczalne są: **siła obecności**, **dług**, **droga**,
**próba**, **przysługa**, **wpływ**, **ślad**, **koszt**, **rozstrzygnięcie**.

## 3. Pętla rozgrywki

1. **Wybierz drogę** — wyprawę z celem, miejscem i trzema węzłami próby.
2. **Zbierz skład** — 2–4 byty; role wynikają z profilu i tagów, nie z pól
   wpisywanych ręcznie.
3. **Wybierz zasób i koszt** — np. pamięć, gościnę, imię, przejście albo
   dług. Każda korzyść ma ujście.
4. **Rozstrzygnij węzeł** — mechanika porównuje zdolności, kontry, relacje,
   teren i wstrzyknięty seed; wynik ma formę krótkiego wydarzenia.
5. **Podejmij rozstaj** — gracz wybiera jedną z 2–3 konsekwencji. Wybór
   zmienia dalszą drogę, nie tylko wynik liczbowy.
6. **Zapisz ślad** — droga dostaje status: ukończona, rozszczepiona,
   zamrożona albo skrzyżowana z inną. Ślad może wejść do Kroniki jako epoka.
7. **Zainwestuj koszt** — zasób wraca przez nową treść (C1/C3, nowy fakt,
   powiązanie, SKIT) albo przez rozwiązanie następnej próby; nie przez klikanie
   tego samego przycisku.

## 4. Trzy rodzaje konfliktu

### 4.1. Konflikt fabularny

Węzeł ma `typ`: `przejście`, `straż`, `targ`, `tożsamość`, `gościna`,
`pamięć`, `przemiana`, `spór`.

Profil dostarcza zdolności, np.:

- dużo backlinków → **Filar**: utrzymuje drogę, gdy inni tracą wpływ;
- dużo SKIT-ów → **Mediator**: obniża koszt koalicji i otwiera trzecią odpowiedź;
- `warunek`/`zagadka` → **Strażnik pytania**: omija próbę siłową, jeśli spełni
  warunek;
- `oplaty`/`przewodnik` → **Pośrednik**: zamienia zasób na bezpieczne przejście;
- `przemiana` → **Przekraczający**: może rozwiązać węzeł tożsamości, ale
  ryzykuje utratę części własnego wpływu.

To są nazwy zachowań, nie ręczne klasy postaci.

### 4.2. Konflikt między bytami

Starcie ma trzy poziomy:

1. **napięcie** — różnica interesów, bez uszczerbku;
2. **próba** — jeden byt blokuje drogę, drugi odpowiada zdolnością lub ceną;
3. **konfrontacja** — dopiero gdy nie ma porozumienia, rozstrzygana jest
   siła obecności, teren i kontra motywów.

Rezultatem nie jest „zabity / żyje”, lecz np. `ustąpił`, `został nazwany`,
`zawarł dług`, `utracił teren`, `zmienił postać`, `wycofał się`, `przełamał
straż`. Historyczne trofea i konsekwencje pozostają literackie.

### 4.3. Konflikt z cywilizacją

Druga strona nie musi być bytem. Droga może mieć stan `archiwizacja` kontra
`odczarowanie`: im więcej archiwum, tym silniejszy byt, ale tym bardziej
świat próbuje nadać mu jedną, muzealną interpretację. To tworzy napięcie
zgodne z Kroniką zamiast prostego „potwory kontra bohaterowie”.

## 5. Zasoby: cztery kieszenie zamiast jednej waluty

Jedna waluta szybko zamienia fabułę w sklep. Proponowany model:

| Zasób | Co znaczy | Skąd przychodzi | Na co znika |
|---|---|---|---|
| **Pamięć** | ile wspólnota jeszcze pamięta | backlinki, imiona, Kronika | utrzymanie wpływu i powrót bytu |
| **Przejście** | możliwość przekroczenia granicy | przewodnik, droga, teren | ominięcie straży i zmiana regionu |
| **Dług** | zobowiązanie wobec bytu | targ, pomoc, koalicja | wymusza późniejszą scenę lub zapłatę |
| **Ślad** | dowód, że coś się wydarzyło | ukończona droga, trofeum, SKIT | odblokowanie rozgałęzienia i skrzyżowania |

Pamięć może być wyliczana z indeksu. Pozostałe zasoby powstają wyłącznie z
rozstrzygnięć fabularnych. Nie wolno ich produkować bez końca przez idle.
Każdy zasób powinien mieć limit wynikający z aktualnego świata albo jawne
ujście w postaci kosztu kolejnej sceny.

## 6. Droga jako model danych

Pierwszy eksperymentalny zapis może być generowanym JSON-em poza wpisem MFM:

```json
{
  "slug": "droga-imie-na-progu",
  "cel": "przejść przez próg bez odebrania bytom ich imion",
  "start": { "miejsce": "Wyspa Man", "zasob": { "pamiec": 18, "przejscie": 2 } },
  "sklad": ["ben-varrey", "selkie-sule-skerry", "sfinks-teby"],
  "wezly": [
    { "typ": "tozsamosc", "teren": "wybrzeze", "opcja": "nazwij", "koszt": { "pamiec": 3 } },
    { "typ": "targ", "teren": "brzeg", "opcja": "zawrzec dlug", "koszt": { "dlug": 1 } }
  ],
  "wynik": { "status": "rozszczepiona", "slad": "imie-które-nie-zamyka" },
  "seed": "2026-09-05:droga-imie-na-progu"
}
```

W wersji pierwszej dane dróg powinny być deklaratywne i generowane przez
runnera, nie edytowane z poziomu przeglądarki. Przeglądarka może pokazywać
rozstrzygnięcie i lokalny wybór, ale nie powinna udawać trwałego wspólnego
świata bez PR-a/runnera.

## 7. Timeline'y i Kronika

Kronika pozostaje jedną księgą opublikowanych epok. SPLOT może mieć wiele
roboczych timeline'ów:

- **rozszczepienie** — jeden węzeł daje dwie legalne drogi;
- **zamrożenie** — droga czeka na brakujący fakt, SKIT albo zasób;
- **dead-end** — droga kończy się konsekwencją, ale nie jest błędem;
- **skrzyżowanie** — dwa timeline'y spotykają się przez wspólny byt, teren,
  zasób lub wątek.

Dopiero zatwierdzona/uruchomiona droga może wygenerować Epokę Kroniki.
To rozwiązuje konflikt między interaktywną grą a kanonem: gra ma alternatywy,
Kronika ma udokumentowane skutki.

## 9. Jak zachować determinizm i los

- seed/identyfikator próby = wersja indeksu + data + slug drogi + numer węzła;
- szansa jest wyliczana deterministycznie, ale wynik jest losowany zgodnie z ADR 0024;
- rdzeń dostaje `los()` jako parametr, nigdy `Math.random`;
- wynik ma pełny log wejść: seed, wersja indeksu, skład, role i koszt;
- zmiana kartoteki może zmienić wynik — dlatego wynik archiwizujemy z wersją;
- AI może proponować prozę, ale nie jest arbitrem wyniku; arbiter jest
  deterministycznym runnerem, a tekst przechodzi walidację i research.

## 8.1. Oś konfliktu: świat zewnętrzny kontra byty

Głównym przeciwnikiem nie musi być inny byt. Może nim być epoka, która
postanowiła usunąć metafizykę z codzienności: łowcy potworów, komisje,
karczmarze zamykający kaplice, urzędnicy prostujący mapy, kaznodzieje
odprawiający egzorcyzmy i uczeni, którzy chcą sprowadzić każdą legendę do
jednego wyjaśnienia. To nie jest proste „ludzie są źli”. Świat zewnętrzny
może chronić wspólnotę przed drapieżnikiem, a byt może być jednocześnie
ocaleniem i zagrożeniem.

Konflikt ma trzy zasoby po obu stronach: **świadectwo** (czy ktoś widział),
**instytucję** (kto ma władzę nazwać zdarzenie) i **obecność** (czy byt może
jeszcze działać). Łowca może wygrać starcie, ale przegrać opowieść; byt może
przetrwać egzorcyzm, lecz utracić miejsce, imię albo możliwość powrotu.

Przykładowe drogi:

- „Ostatni ślad w Gévaudan” — łowcy zamykają las, a loup-garou wybiera ucieczkę,
  układ albo konfrontację; los decyduje o tropie, nie o prawdzie wpisu.
- „Komisja od cudów” — Neith może przemówić, zamilknąć albo pozwolić ludziom
  uznać lampy za zwykły obrzęd; każda opcja chroni inną część jej obecności.
- „Droga bez zagadki” — Sfinks staje wobec ludzi, którzy chcą wysadzić skałę,
  aby nie musieć odpowiadać na pytanie.

To daje konflikt wiedźmiński w sensie struktury: polowanie, strach,
przemoc i ekonomia spotykają byty z legend, ale AME nie kopiuje świata ani
postaci z cudzej fikcji. Tworzy własną epokę, w której archiwizacja może
ratować byt i równocześnie go unieruchamiać.

## 8.2. Fabuła, proza i wizualizacja są częścią mechaniki

Każda ukończona droga musi mieć trzy warstwy artefaktu:

1. **strukturę** — węzły, opcje, szanse, los, koszt i wynik;
2. **prozę fabularną** — narracyjny fragment o świecie, ludziach i bytach,
   dłuższy niż SKIT i niezależny od dialogu; SKIT może być sceną w środku,
   ale nie zastępuje Fabuły;
3. **obraz** — kadr miejsca lub konsekwencji, wygenerowany poza runtime i
   podpięty przez prompt 21:9. Obraz pokazuje zmianę świata, nie tylko
   portret uczestnika.

Raport drogi powinien pokazywać: mapę przejścia, tabelę szansy i wyniku,
wykres obecność–odczarowanie, bilans zasobów, relacje przed/po oraz oś
rozgałęzień. Wizualizacja może mieć wariant „przed” i „po”, jeśli droga
zmieniła teren albo sposób widzenia bytu.

## 10. Najmniejszy sensowny prototyp C5

Nie zaczynać od całej ekonomii ani mapy państw. MVP powinno mieć:

1. trzy gotowe drogi o różnych typach: `przejście`, `targ`, `spór`;
2. jeden węzeł fabularny i trzy opcje rozstrzygnięcia;
3. wyliczany profil i jeden koszt zasobu;
4. wynik zapisany w pamięci przeglądarki tylko jako sesja demonstracyjna;
5. log rozstrzygnięcia z linkami do kartotek bytów;
6. testy: deterministyczność, brak niedozwolonego składu, bilans kosztu,
   spójność timeline'u;
7. dopiero potem: trwałe drogi w repo, generowanie Epok i koalicje.

## 11. Kolejność C5

1. **Model czystych funkcji**: `profilZdolnosci`, `kosztDrogi`,
   `rozstrzygnijWezel`, `rozgalezTimeline`.
2. **Jedna demonstracyjna droga** bez UI, pokryta testami.
3. **Widok drogi** z linkami do kartoteki; bez serwera i bez kluczy.
4. **Zasoby i ekonomia** dopiero po obserwacji, czy wynik tworzy ciekawą
   opowieść.
5. **Walka narracyjna** jako jedna z opcji węzła, nigdy jedyny tryb.
6. **Kronika** konsumuje zatwierdzone wyniki, nie każdy lokalny eksperyment.

## 12. Rzeczy, których nie robić

- nie budować turnieju każdy-z-każdym jako głównej gry;
- nie zastępować Fabuły krótkim SKITem ani paskiem wyniku;
- nie używać HP/DPS jako języka produktu;
- nie pozwalać, by kliknięcie bez treści produkowało zasoby;
- nie trzymać stanu kanonicznego w `localStorage`;
- nie mieszać faktów źródłowych z generowaną prozą;
- nie wpuszczać modeli AI jako arbitra bez zapisu wersji, promptu i wyniku;
- nie dodawać 10 zasobów przed prototypem jednej drogi.

## 13. Kryterium sukcesu

Po jednej sesji czytelnik powinien umieć powiedzieć: „Sfinks nie wygrała
walki — wybrała pytanie, zapłaciła pamięcią i otworzyła inną drogę”. Jeśli
potrafi tylko powiedzieć „miała więcej punktów”, C5 jest nieudane.
