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

A dostarcza KRONICE powodów i stawki, i jest odpowiedzią na „auto-gra vs decyzje".
Proponuję **auto-grę z opcjonalną ręką gracza** (obie na tym samym silniku):

- **Świat = kartoteka + jej sieć.** Stan świata to statystyki (znormalizowane,
  `profileKartoteki`), powiązania, tereny (kraje z `lokalizacja`).
- **Zmiana w czasie:** każda „epoka" (tick) przelicza świat — wynik spotkań
  z Kroniki modyfikuje relacje i wpływy (kto komu winien, kto z kim w koalicji,
  kto stracił teren). Dochodzą nowe byty (każda nowa materializacja = nowy gracz
  świata) i interferują z resztą.
- **Rola gracza (do wyboru, nie teraz):**
  - *tryb obserwatora (auto-gra):* patrzysz, jak świat sam się plecie; klikasz w
    wydarzenia, one prowadzą do kart (spójne z resztą AME);
  - *tryb kustosza (decyzje):* rzadkie, znaczące wybory — które spotkanie
    „rozegrać" jako następne, kogo wesprzeć zasobem, którą koalicję pobłogosławić.
    Decyzje zmieniają, KTO się spotyka i z jaką stawką — a nie mikro-liczby.

Otwarte pytanie do właściciela pozostaje (jaki dokładnie zakres decyzji), ale
rama jest: **decyzje gracza operują na poziomie „reżysera spotkań", nie
mikro-menedżera słupków** — to trzyma A z dala od płaskości.

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
| Subagenci-postaci | możliwe, ale kosztowne i ulotne | **idealne** — każdy agent gra rolę i zapisuje ślad |

**Rekomendacja:** zacząć od **3b** (pregenerowana Kronika popychana przez
agentów Areny). Jest zgodna z DNA projektu, nie wymaga sekretów, daje
deterministyczny, wersjonowany artefakt i najlepiej wykorzystuje pomysł
subagentów-postaci. Runtime (3a) zostaje jako możliwe późniejsze rozszerzenie
(np. „zagraj jedną turę na żywo swoim kluczem") za osobnym ADR.

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
- **Otwarte pytania do właściciela** (nie blokują treści):
  1. Rola gracza w SPLOCIE: obserwator, kustosz-reżyser, czy oba tryby?
  2. Architektura AI: potwierdzasz start od 3b (bez kluczy), z 3a jako opcją później?
  3. Czy „Kronika jako dane w repo" (wersjonowana, popychana sesjami) to
     kierunek, który chcesz — zanim napiszę pod niego ADR?
