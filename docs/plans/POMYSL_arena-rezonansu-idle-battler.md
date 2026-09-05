# POMYSŁ / PROJEKT — „Arena Rezonansu": idle battler manifestacji

> Zlecenie właściciela (M8, C2 Pętli Jakości): rozważyć grywalizację na kształt
> idle battlera między manifestacjami; na tym etapie **projekt + zręby**, nie
> pełna implementacja live.
>
> **STATUS 2026-09-05 (C2+5 obrotu 5, PR #34): pierwszy etap WDROŻONY na live.**
> Zgodnie z ADR 0027 wpięcie elementów grywalizacyjnych nie wymaga osobnej
> akceptacji właściciela. Działa widok `#arena` — ręcznie wybierany spór dwóch
> bytów, rundy, kontry motywów i rozstrzygnięcie (`rozegrajSpor`,
> `paraDnia`, `opisRozstrzygniecia` w `app/arena.js`). Nie ma jeszcze części
> „idle”: ligi toczącej się w tle i turnieju Epoki — sekcje poniżej opisują
> docelowy kształt.

## 1. Po co to AME

AME to archiwum bytów, które „istnieją, dopóki wspólnota je pamięta i nazywa".
Grywalizacja ma **wynikać z tej tezy**, nie doklejać obcej mechaniki:

- byt jest tym silniejszy, im mocniej jest **osadzony w sieci archiwum**
  (ile innych wpisów go przywołuje, w ilu SKITach mówi, ile nosi imion);
- walka to nie „HP vs miecz", lecz **rezonans** — spór tradycji, w którym
  wygrywa ten, czyja obecność jest pełniejsza i czyj motyw akurat kontruje
  motyw przeciwnika (jak w mit-folklorze: złe oko, warunek, opłata, przemiana);
- idle = archiwum „żyje" samo: manifestacje ścierają się w tle rundami, a widz
  ogląda ligę/turniej i klika detale, które i tak prowadzą z powrotem do kart.

## 2. Twarde ograniczenia (z ADR)

- **Vanilla, bez builda aplikacji** (ADR 0001) — moduł ESM w `app/`, zero zależności.
- **Determinizm** (ADR 0002): identyczne dane → identyczny wynik. Żadnego
  `Math.random` w rdzeniu; losowość wyłącznie ze **wstrzykiwanego, ziarnistego
  RNG** (seed z numeru rundy / daty), jak w `wylosujSlug` z M7.
- **Statystyki wyłącznie z danych wpisu** — nie wymyślamy liczb ręcznie
  (to byłby ręcznie edytowany „indeks", zakazany jak w ADR 0002). Staty
  wyprowadza czysta funkcja z rekordu indeksu; zmiana treści → zmiana staty
  automatycznie (i to jest zaleta: rozbudowa wpisu wzmacnia byt).

## 3. Statystyki wyprowadzone z rekordu (rdzeń — w zrębach)

Rekord indeksu daje deterministyczne liczby: `nazwy_alternatywne`, `tagi`
(kultura/typ/motyw/postać), `powiazania` (wyjścia), `backlinki` (wejścia),
`skity`. Z nich liczymy cztery staty (moduł `app/arena.js`, funkcja
`statyManifestacji`):

| Staty | Znaczenie w lore | Wzór (z rekordu) |
|---|---|---|
| **ŻYWOTNOŚĆ** (HP) | jak głęboko byt tkwi w pamięci sieci — trudniej go „rozwiać" | baza + `backlinki` × 6 + `skity` × 4 |
| **MOC** (atak) | potęga imion i motywów — ile ma epitetów i jak groźne motywy | baza + `nazwy_alternatywne` × 3 + waga motywów |
| **SPRYT** (inicjatywa) | ile aktywnych związków sam zawiązuje — kto pierwszy uderza | baza + `powiazania` × 4 |
| **REZONANS** (szansa na „rozbłysk") | jak żywy jest w rozmowach i ilu tradycjami operuje | baza + `skity` × 3 + `tagi` × 2 |

- „waga motywów": słownik `motyw → punkty` (np. `zle-oko` bije mocno, `oplata`
  raczej broni) — konfigurowany w module, **nie** ręcznie w danych; kandydat na
  wpis do kanonu tagów w przyszłości.
- wszystkie wartości całkowite → indeks i wynik pozostają deterministyczne.

## 4. Rozstrzygnięcie starcia (deterministyczne, ze wstrzykniętym RNG)

`symulujStarcie(a, b, { rundy, los })`:

1. Inicjatywa: wyższy SPRYT uderza pierwszy (remis → po slugu, alfabetycznie).
2. Obrażenia rundy: `max(1, MOC_atakującego − OBRONA)` gdzie OBRONA to funkcja
   ŻYWOTNOŚCI; kontra motywów daje modyfikator (np. `warunek` kontruje
   `zle-oko`: byt, który „zna warunek", tnie skuteczność złego oka).
3. „Rozbłysk rezonansu": jeśli `los() < REZONANS/100`, cios jest wzmocniony —
   to jedyne miejsce losowości i tylko przez wstrzyknięty RNG.
4. Koniec, gdy czyjaś ŻYWOTNOŚĆ ≤ 0 albo po `rundy` rundach (wtedy wygrywa
   wyższy procent pozostałej ŻYWOTNOŚCI). Zwraca log rund + zwycięzcę.

Determinizm: przy tym samym seedzie wynik jest powtarzalny → można pokazać
„ligę dnia" (seed z daty) identyczną dla wszystkich widzów, bez serwera.

## 5. Pętla idle (warstwa UI — do zrobienia po akceptacji)

- **Liga Rezonansu**: codziennie (seed z daty, ADR 0002) rozgrywa się turniej
  każdy-z-każdym; tabela wyników, „walka dnia" z logiem rund.
- **Tryb bezczynny**: pasek postępu „następne starcie za…"; kliknięcie
  uczestnika otwiera jego kartotekę (spójne z resztą AME).
- **Zero nowej trwałej mechaniki w danych** — wszystko liczone z indeksu; jedyny
  stan lokalny (opcjonalnie) w `localStorage`, jak motyw.

## 6. Etapy wdrożenia

1. **(ten commit — zręby)** `app/arena.js`: `statyManifestacji` + jedna runda
   starcia jako czyste funkcje; testy jednostkowe (`test/arena.test.js`).
   Zero wpięcia do UI, zero zmian w `index.html`.
2. Po akceptacji: `symulujStarcie` pełne + „walka dnia" i tabela ligi (widok
   jak Baza Skitów / Co nowego), deep-link `#arena`.
3. Balans wag motywów + strona „profil bojowy" w kartotece (sekcja poza
   numeracją protokołu — to warstwa aplikacji, nie treść wpisu).

## 7. Ryzyka / pytania do właściciela

- **Ton**: czy „walka" nie kłóci się z powagą archiwum? Proponuję ramę
  „Rezonans/spór tradycji", nie „krew i HP" — nazewnictwo trzyma klimat.
- **Balans a treść**: silniejsze są byty lepiej opisane i lepiej powiązane —
  to celowo nagradza pracę C1/C3, ale może faworyzować „stare" wpisy; wagi
  motywów mają to równoważyć.
- **Zakres**: czy Liga ma być osobnym widokiem, czy „profil bojowy" wpleciony
  w kartotekę? (rekomendacja: najpierw osobny widok `#arena`).
