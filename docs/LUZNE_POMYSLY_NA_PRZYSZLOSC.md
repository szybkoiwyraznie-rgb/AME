# LUŹNE POMYSŁY NA PRZYSZŁOŚĆ

> **Nie jest to kolejka zadań ani zobowiązanie.** To magazyn kierunków
> rzuconych przez właściciela i agentów, żeby nie przepadły i żeby nikt nie
> rozpoznawał ich drugi raz. Zadania przydziela właściciel w czacie
> (`AGENTS.md` §2). Pomysł „dojrzewa" tu, zanim ktokolwiek go zakoduje — a gdy
> dojrzeje na tyle, że staje się decyzją o granicach/danych/mechanice, dostaje
> **ADR** i plan (`docs/plans/`). Różnica względem `docs/BACKLOG.md`: backlog
> zbiera drobne, konkretne usprawnienia; ten plik trzyma większe, otwarte
> kierunki wymagające namysłu.

## Zasada wspólna dla wszystkich pomysłów (fundament, który już mamy)

Wszystko poniżej ma korzeń w jednej idei, którą właściciel wskazał jako dobrą:

> **Statystyki bytu wyprowadzone z „gęstości" jego rekordu w archiwum** —
> z backlinków, powiązań, liczby SKITów, epitetów (`nazwy_alternatywne`),
> motywów/tagów. Rozbudowa wpisu (praca C1/C3) realnie wzmacnia byt. To już
> istnieje jako czysty, przetestowany moduł `app/arena.js`
> (`statyManifestacji`), niezależny od odrzuconej „walki" — i może zasilić
> dowolny z pomysłów poniżej.

Twarde ograniczenia (z ADR) obowiązujące każdy z tych pomysłów:

- **vanilla, bez builda aplikacji** (ADR 0001) — moduły ESM w `app/`, zero zależności;
- **determinizm indeksu** (ADR 0002) — dane budują się identycznie; wszelka
  losowość wyłącznie ze **wstrzykiwanego, ziarnistego RNG** (seed z daty/rundy),
  nigdy `Math.random` w rdzeniu;
- **statystyki tylko WYPROWADZANE z danych** — nie wpisujemy liczb ręcznie do
  wpisów (to byłby zakazany ręczny indeks);
- **sekrety nigdy do repo ani na Arenę** — klucze API tylko w pamięci sesji
  przeglądarki (patrz pomysły 9–10, ryzyko krytyczne).

---

## Rozwinięcie koncepcji (sesja M10)

Kierunki B (+ A) rozwinięte w `docs/plans/POMYSL_splot-i-kronika-koncepcja.md`:
„SPLOT" (świat, który się zmienia) + „KRONIKA" (wcielone spotkania bytów przez
**subagentów-postacie**, każdy z własnym dossier). Rekomendacja architektury:
model 3b — rozgrywka jako **dane w repo, popychane przez kolejnych agentów
Areny** + pregenerowane ilustracje (bez kluczy API w runtime). Każdy nowy SKIT
jest już darmowym prototypem KRONIKI (metoda embodimentu).

## C5 — Splot: fabuła, droga i konflikt bytów (2026-09-05)

Na podstawie kierunków 1–6 i 11 powstał dokument `docs/plans/POMYSL_C5_splot-fabula-zasoby-2026-09-05.md`. Rekomendacja: nie budować turnieju ani klikacza, tylko warstwę **SPLOT**, w której byt wybiera drogę, ponosi koszt, wchodzi w konflikt lub koalicję, a wynik tworzy rozgałęzienie timeline'u. Walka jest jedną z opcji rozstrzygnięcia, obok targu, nazwania, przejścia i długu.

C5 ma zacząć się od jednej deterministycznej drogi i trzech węzłów, bez trwałego stanu kanonicznego w `localStorage`; dopiero wynik zaakceptowany przez runnera może stać się Epoką Kroniki. Zasoby robocze: Pamięć, Przejście, Dług i Ślad.

## Status: „Arena Rezonansu" (idle battler) — WSTRZYMANA

Pierwotny pomysł walki 1:1 (M8, `docs/plans/POMYSL_arena-rezonansu-idle-battler.md`).
Właściciel: **idea statystyk-z-gęstości dobra, ale sama walka za prosta / mało
ciekawa**. Nie wypychamy tego jako feature. Rdzeń (`app/arena.js`,
`statyManifestacji`) zostaje jako fundament pod pomysły 1–6 poniżej. Ewentualna
walka wróci tylko jako element czegoś bogatszego, nie jako cel sam w sobie.

---

## Pomysły właściciela (2026-08-28, sesja M9)

### (1) Modele / zdolności budowane na statystykach z gęstości rekordu

Zamiast czterech surowych liczb → **zdolności i „archetypy"** wyprowadzone z
profilu danych. Np. byt z wieloma backlinkami, a małą liczbą wyjściowych
powiązań = „Filar" (trzyma sieć); byt z wieloma SKITami = „Gaduła/Mediator";
byt z motywem `zle-oko` = zdolność ofensywna, `oplaty` = defensywna/handlowa.
Zdolność to nie liczba, lecz **reguła zachowania** w dowolnym z systemów 2–6.
- *Do przemyślenia:* katalog zdolności wyprowadzalnych deterministycznie z
  rekordu; jak uniknąć „im starszy wpis, tym silniejszy" (normalizacja,
  percentyle w obrębie kartoteki).
- *Fundament:* `app/arena.js` rozbudowany o `profilBytu(rekord)` → archetyp + zdolności.

### (2) Ekonomia zasobów, inwestowanie i pomnażanie kapitału

Zasób wspólny — roboczo **„Rezonans"** (albo „Wiara"/„Pamięć") — generowany
przez byty proporcjonalnie do ich gęstości; gracz (kustosz archiwum) inwestuje
go w byty/regiony i pomnaża. Idle-friendly: kapitał „kapie" w tle, decyzje są
rzadkie i strategiczne.
- *Do przemyślenia:* źródło i ujście zasobu (co go tworzy, na co się wydaje),
  krzywa wzrostu bez inflacji, brak potrzeby serwera (stan w `localStorage`).
- *Ryzyko:* „klikacz bez treści" — musi wiązać ekonomię z lore, nie z paskami.

### (3) Generator obrazów rozliczany z budżetu statystyk

Twórcze użycie generatora obrazów **w oparciu o byty i ich staty**, z
**limitowaniem kosztu z budżetu „Rezonansu"** (pomysł 2). Np. „przywołanie
wariantu wizualizacji bytu w innej porze/scenerii" kosztuje X Rezonansu, a
jakość/rozdzielczość zależy od staty bytu.
- *Do przemyślenia:* generacja obrazów to narzędzie AGENTA (sesja), nie
  runtime przeglądarki — więc albo (a) prekomputowana galeria wariantów w
  `assets/`, odblokowywana budżetem po stronie klienta, albo (b) feature
  „studio" działające tylko w sesji agenta. Rozstrzygnąć architekturę zanim
  cokolwiek.
- *Ograniczenie:* ADR 0001 (bez builda), rozmiar assetów ≤ 2 MB, licencje.

### (4) Kombinacje manifestacji → fabuła / „coś jak SKITy, ale inne"

Łączenie bytów w **zestawy generujące treść** — nie dialog (to SKITy), lecz np.
**wyprawy/questy**: dobrany skład (jak w SKIT-ach, ale z rolami wg statystyk)
odblokowuje mini-fabułę o wyniku zależnym od profili uczestników.
- *Do przemyślenia:* skąd treść? Prekomputowane rozgałęzienia (deterministyczne,
  w danych) vs generacja AI (pomysły 9–10). Relacja do SKIT-ów: SKIT = gotowy
  tekst literacki; „wyprawa" = struktura + wynik z reguł.
- *Fundament:* unikalność składów i walidacja z Bazy Skitów da się uogólnić.

### (5) Walka o panowanie nad regionami / państwami na mapie

Warstwa strategiczna: byty rozszerzają „strefę wpływów" na kraje/regiony mapy;
kontrola regionu daje zasób (pomysł 2). Mapa już zna `lokalizacja.kraj` i
współrzędne — naturalne pole gry.
- *Do przemyślenia:* granularność (kraj? kontynent? własne „strefy"?),
  geometria stref na istniejącej mapie wektorowej, wymaga pomysłu 7 (mapa
  granularna). Bilans: mało bytów (8) na wielkiej mapie — najpierw więcej treści.

### (6) Koalicje / współpraca bytów dla wspólnego celu

Przeciwwaga dla walki (1): byty **z różnych kultur łączą się** wokół celu
(np. obrona regionu, wielki rytuał), a synergie wynikają z motywów/powiązań
(byty już powiązane w wiki współpracują lepiej). Fabularnie bliskie duchowi
SKIT-ów („jak tradycje rozmawiają" → „jak tradycje działają razem").
- *Do przemyślenia:* macierz synergii z istniejących `powiazania`/`backlinki`;
  cel wspólny jako mini-ekonomia (pomysł 2).

### (7) Mapa o większej granularności (sensowny zoom w głąb)

Obecna mapa (Natural Earth 1:50m) wystarcza na pinezki, ale nie na „wejście w
region". Wyższa rozdzielczość geometrii + poziomy szczegółu przy zoomie
odblokowałyby pomysły 5/8.
- *Do przemyślenia:* rozmiar danych (1:10m waży dużo — ADR o assetach), LOD /
  doładowywanie regionów, utrzymanie cięcia na antypołudniku (L7). Możliwy
  osobny ADR (zmiana źródła mapy).
- *Wartość samodzielna:* nawet bez gry — lepsza mapa to lepsza kartoteka.

### (8) Mapa + generator obrazów

Wizualizacje bytów **osadzone w mapie** przy dużym zbliżeniu (miniatura 21:9 na
pinezce — już jest w BACKLOG jako drobny wariant), a docelowo generowane
„sceny regionu" łączące kilka bytów danego obszaru.
- *Do przemyślenia:* jak w (3) — generacja to narzędzie sesji; runtime pokazuje
  prekomputowane. Łączy się z pomysłem 7.

### (9) Quizy / teleturnieje na danych z kart — z udziałem modeli AI

Teleturniej oparty o zweryfikowane fakty z wpisów (sekcje II/III/V, klucz
przywołania). Pytania **generowane deterministycznie z danych** albo przez AI;
**różne modele AI jako uczestnicy** (przez OpenRouter / Google AI Studio).
- **Ryzyko krytyczne — klucze API:** klucz podaje użytkownik i żyje **wyłącznie
  w pamięci sesji przeglądarki** (nie `localStorage`, nie repo, nie Arena, nie
  logi). Wywołania z przeglądarki użytkownika wprost do dostawcy; sandbox i CI
  nigdy nie widzą klucza. To wymaga ADR (pierwsze wyjście AME poza „czystą
  statykę bez sieci w runtime" — ADR 0003).
- *Do przemyślenia:* tryb „bez klucza" (pytania deterministyczne, gracz sam
  odpowiada) jako domyślny; tryb „z modelami" jako opcja. CORS dostawców,
  koszty po stronie użytkownika, moderacja.

### (10) Różne modele AI zarządzające czymś w grywalizacji

Rozszerzenie (9): modele AI jako „gracze/zarządcy" w pomysłach 2/5/6 (prowadzą
frakcję, negocjują koalicje, inwestują zasób). „Liga modeli" nad archiwum.
- *Ryzyko:* jak (9) — klucze w pamięci sesji; determinizm rozgrywki trudny
  (odpowiedzi modeli nie są deterministyczne) → oddzielić „szkielet
  deterministyczny" od „decyzji modelu", logować seed + wersję modelu.
- *Do przemyślenia:* to duży kierunek; prawdopodobnie łańcuch ADR-ów, nie jeden.

### (11) Fabuła jako niezależne timeline'y — rozszczepienie, zamieranie, krzyżowanie

Pomysł właściciela (M11): opowieść / kronika / fabuła nie jako jedna oś, lecz
**wiele niezależnych timeline'ów**, każdy rozwijany osobno, przy czym w ramach
jednej sesji można pchnąć więcej niż jedną ścieżkę. Ścieżki mogą się
**rozszczepiać** (jeden wątek dzieli się na dwa warianty), **zamierać** (dead-end
— wątek się kończy bez kontynuacji) i **krzyżować** (dwa niezależne wątki
spotykają się i wpływają na siebie).

- *Dlaczego pasuje:* to naturalne rozszerzenie modelu „Kronika jako dane w repo,
  popychane sesjami" (`docs/plans/POMYSL_splot-i-kronika-koncepcja.md`). Zamiast
  jednej liniowej epoki — **graf wątków**: każdy plik Kroniki wskazuje swój wątek
  i rodzica (jak commity w gicie). Rozszczepienie = dwa dzieci jednego węzła;
  dead-end = liść bez dzieci; krzyżowanie = węzeł z dwoma rodzicami (merge).
- *Zgodność:* determinizm zachowany (stan wątku liczony z jego przodków, jak feed
  z meta — ADR 0002). Model danych: `data/kronika/<watek>/<nr>-<slug>.json` z
  polami `watek`, `rodzice: [...]`, `status: rozwija|dead-end|krzyzuje`.
- *Do przemyślenia:* wizualizacja grafu wątków (oś czasu z rozgałęzieniami);
  reguły, kiedy wątki wolno krzyżować (np. wspólny byt/teren); jak obserwator
  (§3) nawiguje po wielu równoległych opowieściach bez chaosu.
- *Powiązania:* rozwija pomysły 4 i 6; niezależne od architektury AI (działa i na
  symulacji, i na 3a).

---

## Wątki przekrojowe (do rozstrzygnięcia zanim ruszymy którykolwiek)

- **Normalizacja siły** — wszystkie pomysły oparte o „gęstość rekordu" premiują
  stare/rozbudowane wpisy. Potrzebna normalizacja (percentyle w obrębie
  kartoteki, „poziom" zamiast surowych liczb), by nowe byty miały szansę.
- **Treść vs mechanika** — przy 8 wpisach każda gra jest cienka. Najpierw masa
  krytyczna kartoteki (Pętla Jakości C1/C3), potem systemy 4–6.
- **Architektura AI** (9–10) — pierwsze złamanie „bez sieci w runtime" (ADR 0003);
  wymaga ADR o kluczach-w-pamięci-sesji i o granicy, że rdzeń działa bez AI.
- **Generacja obrazów** (3/8) — rozstrzygnąć: prekomputacja w sesji agenta vs
  runtime. Runtime wymaga klucza (jak 9–10); prekomputacja mieści się w ADR 0001.
- **Determinizm + losowość** — wzorzec z `wylosujSlug`/`arena.js` (wstrzykiwany
  RNG, seed z daty) jest już sprawdzony i powinien obowiązywać wszędzie.
