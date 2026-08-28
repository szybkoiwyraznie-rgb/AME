# ANALIZA KIERUNKÓW GRYWALIZACJI (C2, sesja M9)

> Głębszy namysł nad 10 pomysłami właściciela (spis: `docs/LUZNE_POMYSLY_NA_PRZYSZLOSC.md`).
> Cel: nie kodować pochopnie, tylko **ocenić, pogrupować i wskazać kierunek**
> z pierwszym sensownym krokiem. Wiążąca decyzja o kierunku należy do
> właściciela; duży kierunek dostanie własny ADR.

## 1. Dlaczego „walka" (Arena Rezonansu) była płaska

Walka 1:1 na czterech liczbach jest **przewidywalna i pozbawiona decyzji** —
widz nic nie wybiera, wynik jest funkcją danych. Ciekawość w grach bierze się z
(a) **decyzji z konsekwencjami**, (b) **napięcia rzadkiego zasobu**, (c)
**nowej treści**, której nie da się przewidzieć. Sama walka nie ma żadnego z
tych trzech. Wniosek: statystyki-z-gęstości to dobry *silnik*, ale potrzebują
*pętli decyzyjnej* wokół siebie.

## 2. Ocena 10 pomysłów wg trzech kryteriów

Kryteria: **Wartość** (czy to ciekawe i wierne duchowi AME), **Koszt/ryzyko**
(architektura, ADR, sekrety), **Gotowość** (ile już mamy).

| # | Pomysł | Wartość | Koszt | Gotowość | Notatka |
|---|---|---|---|---|---|
| 1 | Modele/zdolności ze statystyk | ★★★ | niski | wysoka | rozwija istniejący `arena.js`; fundament pod resztę |
| 2 | Ekonomia zasobów / kapitał | ★★★ | średni | średnia | daje „decyzje z konsekwencjami" — brakujący element |
| 3 | Generator obrazów z budżetu | ★★ | wysoki | niska | generacja = narzędzie sesji, nie runtime; rozstrzygnąć architekturę |
| 4 | Kombinacje → fabuła/„nie-SKITy" | ★★★ | średni | średnia | najbliżej duszy AME; treść z reguł lub AI |
| 5 | Panowanie nad regionami mapy | ★★ | wysoki | niska | wymaga #7 i większej kartoteki; przedwczesne |
| 6 | Koalicje/współpraca | ★★★ | średni | średnia | przeciwwaga walki; synergie z `powiazania` |
| 7 | Mapa granularna (zoom) | ★★ | wysoki | niska | wartość też poza grą; osobny ADR (źródło mapy) |
| 8 | Mapa + generator obrazów | ★★ | wysoki | niska | zależny od #3 i #7 |
| 9 | Quizy z modelami AI | ★★★ | wysoki | niska | pierwsze złamanie „bez sieci w runtime"; klucze API |
| 10 | Modele AI zarządzające grą | ★★ | b. wysoki | niska | łańcuch ADR; determinizm trudny |

## 3. Trzy spójne kierunki (wiązki, nie pojedyncze pomysły)

Pojedyncze pomysły są słabe; łączą się w trzy grywalne całości:

### KIERUNEK A — „Kustosz Archiwum" (idle-management): #1 + #2 + #6
Gracz jest kustoszem; byty generują **Rezonans** (zasób) proporcjonalnie do
gęstości (#1 daje archetypy/zdolności modyfikujące produkcję). Rezonans
inwestuje się w byty i **koalicje** (#6): powiązane w wiki byty dają synergię.
Pętla idle z rzadkimi decyzjami. **Bez sieci, bez AI, deterministyczny** —
mieści się w ADR 0001–0003. Największa wartość/koszt.

### KIERUNEK B — „Wyprawy / Sploty" (treść z kombinacji): #4 + #1 + #6
Rozszerzenie ducha SKIT-ów: dobrany skład (role wg archetypów #1) rusza na
**wyprawę** o rozgałęzieniu i wyniku zależnym od profili i powiązań. Treść
albo **prekomputowana deterministycznie** (mieści się w ADR), albo generowana
AI (wtedy dochodzi ryzyko #9/#10). Najbliżej duszy archiwum.

### KIERUNEK C — „Teleturniej AI" (#9 + #10)
Quiz z faktów kart; różne modele jako gracze/sędziowie. **Najciekawszy
medialnie, ale najdroższy i najryzykowniejszy**: pierwsze wyjście poza „czystą
statykę bez sieci" (ADR 0003), klucze API tylko w pamięci sesji przeglądarki,
determinizm rozgrywki niemożliwy przy odpowiedziach modeli. Wymaga łańcucha ADR.

## 4. Rekomendacja

1. **Najpierw treść, potem gra.** Przy 8 wpisach każda mechanika jest cienka.
   Pętla Jakości (C1/C3) niech dowozi kartotekę do ~15–20 bytów — a to i tak
   automatycznie wzmacnia każdy przyszły system (staty z gęstości).
2. **Fundament pod A i B — znormalizowane statystyki** (ten commit): rozwiązuje
   problem „stary wpis zawsze wygrywa" (percentyle/poziomy w obrębie kartoteki)
   i daje **archetypy** (#1) jako czytelną, deterministyczną warstwę nad
   surowymi liczbami. To krok bez żalu: przyda się w A, B, nawet w profilu
   bojowym w kartotece, niezależnie od wyboru kierunku.
3. **Kierunek A** jako pierwszy kandydat do zbudowania (największa wartość przy
   akceptowalnym koszcie, zero sekretów). **Kierunek C** świadomie odłożony —
   wymaga decyzji o kluczach API i złamania ADR 0003.

## 5. Co powstaje już teraz (fundament, nie feature)

- `app/arena.js`: `statyManifestacji` zyskuje **procentową normalizację w
  obrębie kartoteki** (`profileKartoteki(rekordy)`) i **archetyp** wyprowadzony
  z profilu (`archetypBytu`), np. „Filar", „Pieśniarz", „Drapieżnik", „Samotnik".
- Wszystko deterministyczne (bez RNG, bez sieci), czyste funkcje + testy.
- **ZERO wpięcia do UI.** To materiał pod decyzję właściciela o kierunku.

## 6. Pytania do właściciela (żeby wybrać kierunek)

1. Wolisz **grę-zarządzanie** w tle (kierunek A) czy **treść-z-kombinacji**,
   bliższą SKIT-om (kierunek B)?
2. Czy jesteśmy gotowi na **AI w runtime** (kierunek C) — czyli decyzję o
   kluczach API w pamięci sesji i osobny ADR łamiący „bez sieci" (ADR 0003)?
3. Czy zgadzasz się na zasadę **„najpierw kartoteka do ~15–20 wpisów, potem
   duża mechanika"**, czy wolisz prototyp gry już teraz na 8 bytach?
