# KONCEPCJA: „SPLOT" i „KRONIKA" — grywalizacja AME oparta na wcieleniu

> Pogłębienie kierunków A/B po odpowiedziach właściciela (sesja M10). To wciąż
> **etap myślenia** — żadnego kodu gry. Cel: dojść do koncepcji na tyle
> konkretnej, żeby dało się ją zweryfikować małymi eksperymentami, zanim
> powstanie ADR i plan implementacji. Spis pomysłów: `docs/LUZNE_POMYSLY_NA_PRZYSZLOSC.md`;
> analiza wyjściowa: `docs/plans/POMYSL_kierunki-grywalizacji-analiza.md`.

## 0. Co powiedział właściciel (i co z tego wynika)

1. **A (zarządzanie/auto-gra)** i **B (treść z kombinacji)** — oba warte
   rozważenia; A musi być rozbudowany (płaski = nudny), rola gracza otwarta:
   albo **auto-gra** (obserwacja zmieniającego się świata bytów), albo
   **decyzje gracza** (jakie? — brak odpowiedzi).
2. **B ożywa dzięki subagentom wcielonym w pojedyncze byty** — każdy agent
   „jest" postacią: jej percepcja, wiedza, wierzenia, ograniczenia. Zderzenie
   bytów z różnych kultur robi się twórcze i „wybuchowe" — czego nie da jeden
   wszechwiedzący narrator.
3. **Dwie architektury AI**: (a) runtime w artefakcie (klucze API w pamięci
   sesji); (b) **pregenerowana rozgrywka popychana przez kolejnych agentów
   Areny** + pregenerowane ilustracje, fabuła posuwa się z każdą sesją.
4. Na razie **myślimy**, nie kodujemy; równolegle nowa treść.

**Wniosek nadrzędny:** A i B to nie alternatywy, tylko **dwie warstwy jednej
gry**. B (wcielone spotkania) produkuje wydarzenia; A (świat, który się zmienia)
decyduje, kto kogo spotyka, kiedy i z jaką stawką. Poniżej rozwijam to jako
jeden system o dwóch nazwach roboczych: **SPLOT** (warstwa świata, A) i
**KRONIKA** (warstwa opowieści, B).

## 1. Fundamentalna zgodność z DNA projektu

AME już jest „grą popychaną przez kolejnych agentów": każda sesja to inny agent,
który czyta stan z gita, dokłada wpisy/skity i zostawia handoff następcy. To
**dokładnie model 3b** (pregenerowana rozgrywka posuwana sesja po sesji).
SKIT-y to już **pierwotna forma B** — wcielone rozmowy bytów, tyle że pisane
przez jednego agenta „w charakterze". Krok naprzód: od „jeden agent pisze
dialog" do „**każdy byt ma własnego subagenta**, który zna tylko to, co jego
postać, i broni jej interesu".

To pozwala oprzeć całość na tym, co mamy, bez łamania granic (ADR 0001–0003):
kanoniczny artefakt zostaje czystą statyką, a „silnikiem AI" jest proces
sesyjny (agent Areny), którego wynikiem są **dane** dogrywane do repo.

## 1a. Realia zdolności agenta Areny — SZCZERA odpowiedź na wątpliwość (M11)

> **Reguła platformowo-neutralna (M13, rozstrzygnięcie właściciela):** procedurę
> „głosu pojedynczego bytu" wykonują — zależnie od runnera — **odizolowani
> subagenci** (prawdziwy swarm, PRIORYTET) albo **symulowani subagenci** przez
> jednego agenta sesji (blind-draft). Koncepcja ma być uniwersalna: ta sama
> treść daje się wyprodukować oboma sposobami, tylko z inną siłą izolacji.
> Szczegóły i status: `docs/plans/POMYSL_platforma-budowy-przenosnosc.md` §9.
> Poniższy tekst (M11) opisuje przypadek runnera-pojedynczego-procesu (Arena).

Właściciel słusznie pyta: czy agent Areny może powoływać subagentów? **Uczciwa
odpowiedź: nie w sposób, w jaki brzmiało to w koncepcji z M10.** Muszę to
sprostować, żeby projekt nie stał na fałszywym założeniu.

**Jak jest naprawdę:**

- Agent Areny to **jeden proces w danej turze**. Nie mam narzędzia „powołaj
  niezależny model z własnym kontekstem", nie odpalam równoległych agentów z
  odseparowaną pamięcią. Wszystko, co „mówią" postacie, wychodzi z jednego,
  wspólnego kontekstu — czyli **de facto z jednego wszechwiedzącego umysłu**.
- „Subagenci wcieleni w byty" z M10 są więc **metaforą metody pisania**, a nie
  osobnymi bytami technicznymi. Mogę *symulować* wielogłos (pisać każdą postać
  w jej dossier), ale nie ma twardej izolacji pamięci między nimi — a to
  właśnie ta izolacja dawała obiecywaną „wybuchowość" i brak wycieków.

**Co z tego wynika (trzy uczciwe opcje):**

1. **Symulowany wielogłos z dyscypliną „blind-draft" (możliwe DZIŚ, bez kluczy).**
   Jeden agent, ale pisze postaci w narzuconym rygorze: dla każdej repliki
   świadomie korzysta tylko z jej dossier, a wiedzę spoza niego traktuje jak
   nieznaną. To da się wymusić proceduralnie (patrz §2.4) i przetestować
   (walidator „czy postać użyła faktu spoza swojego dossier"). Ograniczenie:
   izolacja jest **dyscyplinarna, nie techniczna** — ryzyko subtelnego wycieku
   zostaje, choć walidator łapie te jawne. To jest realny, natychmiastowy tryb.
2. **Prawdziwie niezależne modele = architektura 3a (runtime z kluczami).**
   Dopiero osobne wywołania API (różne modele, każdy z własnym promptem-dossier
   i bez dostępu do cudzego) dają twardą izolację i autentyczny wielogłos. To
   wymaga kluczy w pamięci sesji przeglądarki i złamania ADR 0003 (osobny ADR).
   To jedyna droga do tego, co właściciel nazwał „mega możliwościami".
3. **Wieloturowa Kronika popychana przez KOLEJNE sesje (hybryda, ciekawa!).**
   Choć w jednej turze jestem jednym umysłem, **różne sesje to różne uruchomienia
   agenta**, które widzą tylko stan z repo + prompt. Można to wykorzystać jako
   naturalną, choć powolną izolację: sesja A dopisuje ruch bytu X (znając stan
   publiczny), sesja B — bytu Y. „Ukryta wiedza" bytu nie żyje wtedy w jednym
   kontekście, tylko w prywatnych polach danych, których kolejna sesja świadomie
   nie czyta przy graniu innej postaci. To wolne, ale zgodne z DNA projektu i
   bez kluczy.

**Wniosek dla kierunku:** obietnica „każdy byt = niezależny agent" jest
realna tylko w 3a (klucze). Bez kluczy mamy do dyspozycji symulowany wielogłos
(1) oraz izolację przez kolejne sesje (3) — słabsze, ale uczciwe i wdrażalne
od zaraz. Rekomendacja aktualizowana: **prototypować na (1)+(3), a 3a trzymać
jako świadomy, opisany w ADR skok, gdy właściciel zdecyduje o kluczach.**

### 2.4 „Blind-draft": dyscyplina pisania wielogłosu jednym agentem

Skoro izolacja jest dyscyplinarna, potrzebuje twardej procedury i testu:

1. Dla każdej postaci wypisz jej **dossier** (§2.1) PRZED pisaniem dialogu.
2. Pisz replika po replice; przy każdej patrz WYŁĄCZNIE w dossier mówiącego.
   Jeśli fakt nie jest w jego dossier, postać go NIE zna (może się mylić,
   zgadywać, reagować swoimi kategoriami — to jest pożądane).
3. Po napisaniu: **audyt wycieków** — dla każdej repliki sprawdź, czy nie użyła
   nazwy własnej / pojęcia / wiedzy spoza dossier mówiącego (np. Balor nie
   powie „selkie" ani „katedra", bo tego nie zna). Jawne wycieki = poprawka.
4. Kandydat na walidator (przyszłość): lista „obcych terminów" per byt z jego
   epoki/kultury; ostrzeżenie, gdy replika ich używa. Heurystyka, nie NLP.

## 2. KRONIKA (warstwa B) — wcielone spotkania jako źródło treści

### 2.1 Dossier postaci (to, co dostaje subagent)

Sednem embodimentu jest **ograniczona karta wiedzy**. Subagent NIE dostaje
całego archiwum — dostaje „dossier" jednego bytu, deterministycznie wycięte z
jego wpisu:

- **Tożsamość i głos:** nazwa, epitety, kultura, epoka, rejestr mowy.
- **Percepcja świata:** czego byt szuka, czego się boi, co uważa za oczywiste
  (z sekcji II „charakter i motywacje", „preferencje").
- **Wiedza i granice:** co wie (fakty ze swoich sekcji II/III/V), a czego wiedzieć
  NIE może (nic o kartach MtG, nic o bytach, których jego kultura nie znała, nic
  z przyszłości względem jego epoki).
- **Słabość/„szew":** jak można go pokonać/zdemaskować (sekcja II „słabości").
- **Zakazy stylu:** żargon gry (jak w walidatorze SKIT-ów), anachronizmy,
  cyrylica/CJK w prozie (transliteracje).

To jest deterministyczne: dossier powstaje z pliku wpisu, więc dwie sesje z tego
samego wpisu dostają tę samą kartę. Kandydat na czystą funkcję `dossierBytu(wpis)`
(w przyszłości; dziś tylko projekt).

### 2.2 Pętla wcielonego spotkania (metodyka, nie kod)

1. **Zawiązanie:** SPLOT (warstwa A) wybiera skład 2–4 bytów i „iskrę" —
   powód spotkania wynikający ze stanu świata (np. spór o teren, wspólne
   zagrożenie, dług, święto).
2. **Odegranie:** każdy byt = osobny subagent z własnym dossier (§2.1). Rozmawiają
   / działają w turach; żaden nie widzi cudzego dossier — zna drugiego tylko z
   tego, co tamten pokaże. Konflikt wiedzy i wierzeń jest paliwem.
3. **Rozjemca/Kronikarz:** nadrzędny agent (może być agentem sesji Areny) pilnuje
   reguł (fakty z kartotek, brak anachronizmów, unikalność), rozstrzyga skutki na
   podstawie statystyk/archetypów (`arena.js`) i **spisuje wynik jako dane**.
4. **Zapis:** wynik to nowy obiekt danych — patrz §4 (nie „luźny tekst", lecz
   ustrukturyzowany wpis Kroniki z uczestnikami, iskrą, przebiegiem i skutkiem
   dla świata).

### 2.3 Dlaczego to lepsze niż „mini-fabuła jednym agentem"

- **Nieprzewidywalność z ograniczeń:** byt, który nie zna pojęcia „selkie",
  zareaguje na foko-człowieka swoimi kategoriami — powstaje autentyczne
  nieporozumienie, nie gładka narracja.
- **Napięcie interesów:** każdy subagent broni swojego bytu, więc wynik nie jest
  z góry ustawiony; Kronikarz tylko egzekwuje reguły i skutki.
- **Wierność źródłom:** dossier zamyka wiedzę do zweryfikowanych faktów (ADR 0008),
  więc „wybuchowość" nie znaczy „zmyślanie".

## 3. SPLOT (warstwa A) — świat, który się zmienia

A dostarcza KRONICE powodów i stawki. **Decyzja właściciela (M11): tryb
OBSERWATORA jest domyślny i główny** — jest ciekawszy, bo wymaga więcej od
mechaniki i od decyzji AI, a obserwator z definicji **nikogo nie faworyzuje**:
sprawiedliwość spoczywa na systemie (statystyki, reguły) i na „agentach"
(bytach grających swoje interesy), nie na graczu. Tryb kustosza-reżysera
zostaje jako możliwe późniejsze rozszerzenie, nie rdzeń.

- **Świat = kartoteka + jej sieć.** Stan świata to statystyki (znormalizowane,
  `profileKartoteki`), powiązania, tereny (kraje z `lokalizacja`).
- **Zmiana w czasie:** każda „epoka" (tick) przelicza świat — wynik spotkań
  z Kroniki modyfikuje relacje i wpływy (kto komu winien, kto z kim w koalicji,
  kto stracił teren). Dochodzą nowe byty (każda nowa materializacja = nowy gracz
  świata) i interferują z resztą.
- **Rola gracza — OBSERWATOR (domyślna, M11):**
  - patrzysz, jak świat sam się plecie: byty spotykają się, zawiązują koalicje,
    tracą tereny, dochodzą nowe materializacje i interferują z resztą;
  - interakcja jest **eksploracyjna, nie sterująca**: klikasz w wydarzenia,
    filtrujesz oś czasu, wchodzisz w karty bytów — jak w resztę AME. Nie
    „grasz" bytem, tylko czytasz kronikę świata, który toczy się sam;
  - ciężar „ciekawości" spada więc na **mechanikę i decyzje AI** (byty muszą
    zachowywać się nietrywialnie), a nie na wybory gracza — dokładnie to, co
    właściciel wskazał jako trudniejsze, ale wartościowe.
- **Tryb kustosza-reżysera (opcja na później, nie rdzeń):** rzadkie, znaczące
  wybory (które spotkanie rozegrać, kogo wesprzeć) — do rozważenia dopiero, gdy
  obserwator zadziała.

## 4. Model danych „Kroniki" (szkic, nie schemat)

Rozgrywka jako **dane w repo** (jak wpisy/skity), więc jest wersjonowana,
deterministyczna w odczycie i popychana przez kolejnych agentów:

```
data/kronika/<numer-epoki>-<slug-wydarzenia>.json
{
  epoka: 3,
  uczestnicy: [{slug, rola}],        // role z archetypów (Filar/Drapieżnik…)
  iskra: "spór o ...",               // powód z warstwy A
  przebieg: [ ... ],                 // ślad wcielonego spotkania (repliki/akcje)
  skutek: { relacje: [...], tereny: [...], zasob: [...] },  // wpływ na świat
  ilustracja?: "assets/kronika/<...>.jpg",  // pregenerowana (§5)
  meta: { utworzono, autor: "agent Areny sesji N" }
}
```

- **Idempotencja/determinizm:** stan świata po epoce N liczy się z sumy skutków
  epok ≤ N (jak feed „Co nowego" liczy się z `meta`). Nowy agent czyta stan,
  dogrywa epokę N+1. To ADR 0002 zastosowane do rozgrywki.
- **Walidacja** analogiczna do SKIT-ów: uczestnicy istnieją, brak żargonu,
  fakty w zgodzie z dossier, skutek dobrze uformowany.

## 5. Ilustracje (pomysły 3/8) w modelu pregenerowanym

Skoro rozgrywkę popychają agenci Areny, **ilustracje wydarzeń generuje agent w
sesji** (narzędzie generacji obrazów) i zapisuje jako asset — dokładnie tak, jak
dziś powstają wizualizacje 21:9 wpisów. Zero kluczy w runtime, zero łamania
ADR 0003. „Budżet z gęstości" (pomysł 3) staje się miękką regułą: droższe/
większe sceny należą się bytom o wyższym rezonansie — ale to rozliczenie robi
agent przy zapisie, nie przeglądarka.

## 6. Dwie architektury AI — rekomendacja

| | 3a: AI w runtime | 3b: pregenerowane przez agentów Areny |
|---|---|---|
| Klucze API | w pamięci sesji przeglądarki (ryzyko) | **brak w artefakcie** |
| Granice ADR | łamie ADR 0003 (sieć w runtime) → nowy ADR | mieści się w ADR 0001–0003 |
| Determinizm | trudny (odpowiedzi modeli) | **naturalny** (wynik zapisany jako dane) |
| Doświadczenie | interaktywne „na żywo" | narracja rosnąca sesja po sesji |
| Subagenci-postaci | **prawdziwa izolacja** (osobne wywołania modeli) | tylko symulowana (§1a) albo przez kolejne sesje |

**Rekomendacja (zaktualizowana po §1a, M11):** zacząć od **3b** (Kronika jako
dane popychane przez kolejne sesje agenta) w połączeniu z **symulowanym
wielogłosem „blind-draft"** (§2.4) i **izolacją przez kolejne sesje** (§1a
opcja 3). To realne od zaraz, bez kluczy, zgodne z ADR 0001–0003 i z trybem
obserwatora (§3). **Ale trzeba nazwać rzecz po imieniu:** twardej izolacji
wiedzy między bytami (prawdziwych niezależnych „subagentów") **nie da się
osiągnąć bez 3a** (osobne wywołania modeli, klucze w pamięci sesji, osobny
ADR łamiący ADR 0003). 3a to jedyna droga do „mega możliwości" z pełną
izolacją — decyzja o kluczach należy do właściciela.

## 7. Weryfikacja PRZED kodem (eksperymenty myślowe/treściowe)

Zanim powstanie jakikolwiek kod gry, tanie testy pomysłu:

1. **Test dossier:** wypisać dla 1 bytu jego „kartę do odegrania" (co wie / czego
   nie wie) i sprawdzić, czy da się z niej grać bez zaglądania do reszty archiwum.
   (Przykład niżej, §8.)
2. **Test embodimentu na SKIT-cie:** napisać SKIT tak, jakby każdy głos pisał
   osobny „umysł postaci" trzymający się swojego dossier — i zobaczyć, czy jest
   ciekawszy od dotychczasowych. To robimy JUŻ TERAZ w Pętli Jakości (C3), więc
   każdy nowy SKIT jest zarazem prototypem KRONIKI.
3. **Test skutku:** dla gotowego SKIT-a spróbować wypełnić `skutek` z §4 (co ta
   rozmowa zmienia w relacjach) — sprawdzić, czy warstwa A ma się czym żywić.

## 8. Przykład: dossier „do odegrania" (Balor z Tory Island)

Demonstracja §2.1 — tak wyglądałaby karta jednego subagenta (skrót, z wpisu):

```
JESTEM: Balor z Tory Island — Balór na Súile Nimhe, „Uderzający".
KULTURA/EPOKA: mitologia irlandzka, Fomorianie; czas mityczny (przed-chrześcijański).
GŁOS: władczy, oszczędny; mówię jak ktoś, kto zna cenę każdego słowa.
CHCĘ: nie doczekać wnuka, bo przepowiedziano, że wnuk mnie zabije.
BOJĘ SIĘ: własnego oka odwróconego przeciw mnie; wypełnienia warunku.
WIEM: że moje oko zabija w linii wzroku, gdy je odsłonią czterej ludzie na powiece;
      że proroctwo jest wypowiedzianym warunkiem, nie losem.
NIE WIEM: czym jest „selkie", „egungun", katedra w Lincoln; niczego z epok po mojej;
          niczego o kartach ani o tym, że jestem „materializacją".
SŁABOŚĆ (szew): ktoś może zmienić kierunek mojego wzroku — wtedy giń, kogo kocham,
      albo ja sam. Termin, który sam próbuję przechytrzyć, hoduję własnymi rękami.
ZAKAZY: żargon gry, anachronizmy, wiedza spoza mojej kultury i czasu.
```

Gdyby drugi subagent (np. Selkie) miał swoje dossier, żaden nie znałby cudzego —
i stąd bierze się „wybuchowość": Balor usłyszy o „zapłacie karmicielce" i
zinterpretuje to po swojemu, nie jak wszechwiedzący narrator.

## 9. Następne kroki (bez kodu gry)

- **Teraz (M10+):** każdy nowy SKIT piszemy metodą embodimentu (§7.2) — to
  darmowa weryfikacja KRONIKI. Rozbudowa kartoteki do ~15–20 wpisów (więcej
  bytów = bogatszy świat A).
- **Gdy właściciel zdecyduje:** ADR „Kronika: rozgrywka jako dane popychane przez
  agentów (model 3b)" + `docs/plans/PLAN_...` z modelem danych §4 i pierwszą
  epoką. Dopiero wtedy kod (walidator Kroniki, widok `#kronika`).
- **Rozstrzygnięte (M11):**
  1. **Rola gracza = OBSERWATOR** (§3) — domyślny i główny tryb.
  2. **Realia AI wyjaśnione (§1a):** bez kluczy mamy symulowany wielogłos
     (blind-draft) + izolację przez kolejne sesje; twarda izolacja „subagentów"
     wymaga 3a (klucze, osobny ADR). Start prototypu od 3b + blind-draft.
- **Nadal do decyzji właściciela** (nie blokuje treści):
  1. Czy akceptujesz, że pełna izolacja bytów = dopiero 3a (klucze w sesji),
     a do tego czasu jedziemy na symulacji (§1a opcje 1+3)?
  2. Czy „Kronika jako dane w repo" (wersjonowana, popychana sesjami) to
     kierunek, pod który mam napisać ADR i plan pierwszej epoki?
