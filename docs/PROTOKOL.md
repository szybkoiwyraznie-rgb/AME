# PROTOKÓŁ MFM — format wpisu Archiwum Manifestacji Eterycznych

> **MFM** to oznaczenie protokołu treściowego z pierwszej wersji dokumentu
> (v1.0, 2026-08-27) i pozostaje nazwą metody. **AME** to cały projekt:
> aplikacja + kartoteka. Protokół opisuje, jak powstaje i co zawiera pojedynczy
> wpis („kartotka manifestacji”).
>
> Status: **obowiązujący** (v1.8 od 2026-08-30; v1.7 — 2026-08-28; v1.6, v1.5, v1.4, v1.3 i v1.2 — 2026-08-28; v1.1 — 2026-08-27).
> Zmiany protokołu wymagają ADR.
> v1.1 (ADR 0005): rama promptu 21:9. v1.2 (ADR 0011): obowiązująca kolejność
> prezentacji sekcji oraz adres www jako część źródła. **v1.3 (ADR 0012):
> numeracja sekcji idzie za kolejnością (I = Wizualizacja … V = Rezonans) i
> dochodzi sekcja VI „SKITy”** (Baza Skitów, ADR 0013). **v1.4 (ADR 0015):
> limit długości SKITa 250 → 300 słów.** **v1.5 (ADR 0017):
> data w meta może nieść godzinę — `RRRR-MM-DD` albo `RRRR-MM-DD GG:MM` —
> a feed „Co nowego” podaje datę i godzinę zdarzenia.** **v1.6 (ADR 0018):
> ton SKITów — obok rozmów poważnych pełnoprawnym rejestrem jest luz:
> humor, codzienność, rozmowa „przy ognisku”.** **v1.7 (ADR 0019): SKITy
> 3–4-osobowe są składem preferowanym (min. 2 zostaje), a opis powiązania
> musi być zdaniem uzasadniającym związek — nie jednym słowem ani samym linkiem.**
> **v1.8 (ADR 0022, 2026-08-30): sekcja „Rezonans i tożsamość” usunięta
> (zakaz przekładania mechaniki MtG na opisy bytów); sekcje numerowane na
> nowo: V SKITy, VI Tomy i Epoki, VII Powiązania.**

## 1. Filozofia systemu

System służy do transponowania kart Magic: The Gathering na rzeczywiste byty
pochodzące z mitologii, folkloru, legend miejskich oraz wierzeń religijnych
(historycznych i współczesnych). Każda karta jest traktowana jako
wizualno-pojęciowy **„odcisk”**, który pozwala zidentyfikować konkretną
emanację w naszym świecie. System kładzie nacisk na autentyzm źródłowy,
precyzję geograficzną i głęboką charakterystykę psychologiczno-magiczną.

## 2. Zasady nienegocjowalne wpisu

| Wymóg | Opis |
|-------|------|
| **Jednostka** | Pojedynczy byt lub jeden konkretny gatunek |
| **Grywalność** | Można go namierzyć, skonfrontować, pokonać |
| **Precyzja kulturowa** | Jedna tradycja źródłowa, jeden region |
| **Spójność** | Jednoznaczny wygląd, zachowanie, słabości |

Zakazane są: (a) „zjawiska-kosmosy” zamiast konkretnego bytu do upolowania,
(b) rozmycie kulturowe — synteza kilku tradycji w jeden wpis.

## 3. Schemat pracy

```
KARTA (pełny opis: nazwa+set albo grafika od właściciela)
       ↓
FETCH Z SCRYFALL — OBOWIĄZKOWY (ADR 0008)
  • fetch_page https://scryfall.com/card/<set>/<numer>/<slug>
  • dokładne brzmienie: koszt, typ, P/T, Oracle text, flavor, artysta, rok
  • zakaz odtwarzania karty z pamięci
       ↓
ANALIZA TRANSLACJI
  • Nazwa → etymologia, skojarzenia
  • Mechanika → jak przekłada się na zdolności bytu
  • Ilustracja → wizualna identyfikacja manifestacji
  • Flavor text → wskazówki fabularne, cytat jako trop
  • Lore MTG → kontekst, który może naprowadzić na kulturę źródłową
       ↓
IDENTYFIKACJA BYTU (folklor, mitologia, legendy miejskie)
       ↓
WERYFIKACJA ŹRÓDŁOWA W WWW — OBOWIĄZKOWA (ADR 0008)
  • każda teza faktograficzna i każde źródło potwierdzone
    narzędziami agenta (web_search / fetch_page)
  • detal nie do potwierdzenia → opuszczamy (nie „domyślamy się”)
       ↓
PEŁNY WPIS MFM (data/manifestations/<slug>.json)
```

## 4. Struktura wpisu

### 4.1 Numeracja = kolejność prezentacji (od v1.3, układ od v1.8)

```
I   Wizualizacja            II  Charakterystyka i natura   III Dokumentacja
IV  Trofea i dowody         V   SKITy                      VI Tomy i Epoki
VII Powiązania
```

Sekcje układamy i numerujemy w tej kolejności — **numer rzymski to pozycja w
wpisie**, a nie tylko etykieta treści. Obowiązuje wszędzie: w kartotece
(`app/ui.js`), w tym dokumencie i w instrukcji `docs/WORKFLOW.md`. Sekcje
V–VII nie są pisane w pliku wpisu: `SKITy` wylicza indeks (ADR 0013),
`Tomy i Epoki` wylicza podsumowanie Kroniki (`summary.json`), a `Powiązania`
to pole `powiazania` + backlinki z indeksu. Meta (data, autor) zostaje na
końcu, bez numeru.

> Przeliczenie historyczne (dla wpisów, ADR-ów i notatek sprzed v1.3):
> IV→I, II→II, III→III, V→IV, I→V (stara numeracja była przypisana do treści).
>
> Przeliczenie v1.7 → v1.8 (2026-08-30): sekcja „Rezonans i tożsamość”
> (dawna V) **usunięta** — pole `rezonans` nie istnieje w materializacjach;
> dawne VI SKITy → V; „Tomy i Epoki” (niegdyś litera K) → VI; „Powiązania”
> (niegdyś symbol ∞) → VII.

### 4.2 Nagłówek wpisu

```
### [NAZWA BYTU / MANIFESTACJI]
**Inspiracja kartą:** [NAZWA KARTY MTG]
```

### 4.3 Treść sekcji

#### I. WIZUALIZACJA (prompt dla grafiki AI)
Techniczny prompt zapisany w polu `wizualizacja.prompt`. Rezygnujemy z
formy figurki/dioramy: celem jest **hiperrealistyczny, filmowy portret
środowiskowy bytu w jego naturalnym otoczeniu** — patrz §5. W kartotece sekcja
jest **sekcją I** i zajmuje pełną szerokość wpisu (ADR 0010).

#### II. CHARAKTERYSTYKA I NATURA (opis fabularny)
* **Wygląd i Aura:** opis fizycznej manifestacji, zapachu, temperatury
  otoczenia towarzyszącej pojawieniu się bytu.
* **Charakter i Motywacje:** byt drapieżny, opiekuńczy, amoralny? Czego
  pragnie? Dlaczego wchodzi w interakcje z ludźmi?
* **Zdolności (fizyczne i magiczne):** opis mocy **bez terminologii growej** —
  jak byt manipuluje rzeczywistością, umysłem, materią.
* **Słabości i metody pokonania:** rytuały, przedmioty, substancje, zachowania.
* **Preferencje (lubiane/nielubiane):** ofiary, dźwięki, pory dnia, symbole.

#### III. DOKUMENTACJA (The Source Stack)
Pełna lista źródeł: literatura naukowa (antropologia, religioznawstwo),
klasyczne teksty mitologiczne, literatura piękna, kino, reportaże, dokumenty
historyczne. **Źródła muszą być prawdziwe i weryfikowalne.**

Każda pozycja ma postać `{ typ, pozycja, url? }` (pole `dokumentacja`), przy czym:

* **`url` jest obowiązkowy dla co najmniej jednego źródła w wpisie** i prowadzi
  do samego źródła, do jego opisu (wydawca, biblioteka cyfrowa, recenzja) albo
  do wzmianki potwierdzającej jego istnienie w sieci (ADR 0008, ADR 0011).
  Walidator odrzuci wpis bez ani jednego adresu i adres inny niż pełny `http(s)`.
* gdy źródło ma opisany kontekst (co potwierdza, do czego go użyliśmy),
  mieści się to w polu `pozycja` po myślniku — bez nowych pól;
* aplikacja renderuje `url` jako klikalny adres pod pozycją (tylko `http(s)`).

#### IV. TROFEA I DOWODY ELIMINACJI
* Trofeum Pierwotne
* Trofeum Wtórne (opcjonalne)

#### Nagłówek — dane identyfikacyjne (bez numeru sekcji)

Obok sekcji I–IV wpis niesie **dane nagłówkowe** (nie są numerowane, ADR 0022):

* **Karta inspiracji** (`karta`): nazwa, wydanie i rok karty MtG — to warstwa
  meta-projektu (nagłówek „inspiracja kartą: …”). Nazwa, mechanika, ilustracja,
  flavor i lore karty naprowadzają agenta na byt w trakcie analizy, ale **nie
  wchodzą do treści wpisu** (zakaz przekładania mechaniki MtG na in-lore opisy).
* **Pochodzenie i Kultura** (`pochodzenie_i_kultura`): np. mitologia Inuitów,
  folklor słowiański, współczesne legendy miejskie Japonii.
* **Lokalizacja geograficzna** (`lokalizacja`): precyzyjne miejsce, gdzie
  wierzenie powstało lub gdzie odnotowano aktywność bytu — z podaniem regionu
  i współrzędnych dziesiętnych (`lat`, `lon`).

### 4.4 Słowniczek: sekcja ↔ pole w JSON

| Sekcja | Pole w `data/manifestations/<slug>.json` |
|---|---|
| I Wizualizacja | `wizualizacja` |
| II Charakterystyka i natura | `natura` |
| III Dokumentacja | `dokumentacja` (pozycje z `url`) |
| IV Trofea | `trofea` |
| V SKITy | **brak pola** — wyliczane z bazy skitów (ADR 0013); autor skitu wskazuje uczestników, wpis ich nie duplikuje |
| VI Tomy i Epoki | **brak pola** — wyliczane z podsumowania Kroniki (`data/kronika/summary.json`) |
| VII Powiązania | `powiazania` (`{slug, opis}`) + backlinki wyliczane z indeksu |

### 4.5 Sekcja V — SKITy

SKIT to fragment prozy (dialog materializacji) z **Bazy Skitów**
(`data/skity/`, ADR 0013). Sekcja V wpisu nie jest pisana w pliku wpisu:
indeks podpowiada wszystkie skity, w których dana manifestacja występuje, a
aplikacja linkuje je pod kartoteką. Zasady pisania skitów (dramatis personae,
limit 300 słów, unikalność zestawu uczestników, zakaz terminologii growej)
reguluje §8.

### 4.6 Sekcja VI — Tomy i Epoki

Sekcja linkuje Tom Kroniki, w którym manifestacja występuje, oraz raporty
epok z jej udziałem (wyliczane z `summary.json`; patrz `docs/KRONIKA_tryb.md`).
Odnośnik do Tomu używa tej samej konwencji „brązowego przycisku” co pozostałe
odnośniki (epoki, skity, byty).

### 4.7 Sekcja VII — Powiązania

Warstwa wiki (ADR 0006): `powiazania` to pary `{slug, opis}` — opis musi być
zdaniem uzasadniającym związek (ADR 0019); backlinki („wzmiankowany przez”)
wylicza indeks.

## 5. Rama promptu wizualizacji (v1.1 — obowiązuje od 2026-08-27)

Prompt jest zwykłym tekstem o ścisłej konstrukcji: **stała rama otwarcia** +
**treść sceny** + **stała rama zamknięcia**. Ramy są niezmienne i walidowane
narzędziem (`tools/rebuild-index.mjs`); agent uzupełnia wyłącznie środek.

**Rama otwarcia (stała, dosłowna):**

```
Style: A wide-angle full-body cinematic photograph. The central objects/persons of the photo are visible from head to toe, standing centrally in the frame. No parts of the body are cropped.
```

**Treść sceny (pisze agent; po angielsku):** opis bytu od stóp do głów,
środowisko (region, pora doby, pogoda), akcja/postawa, paleta i światło
(styl cinematograficzny, nie HUD, nie grafika komputerowa, nie malarstwo).
Zakaz słów: *figurine, diorama, miniature, render, painting, illustration*.

**Rama zamknięcia (stała, dosłowna):**

```
Captured with a 35mm anamorphic lens at f/1.8. Shallow depth of field with a heavy, creamy bokeh background. Environmental portraiture. Dramatic cinematic lighting, sharp focus on the character, hyper-realistic textures of clothing and skin. Shot on 70mm film stock, ultra-wide 21:9 aspect ratio. --ar 21:9
```

Wygenerowany obraz zapisujemy jako `assets/wizualizacje/<slug>.jpg`
(JPEG, proporcje 21:9, ≤ 2 MB) i wskazujemy w polu `wizualizacja.obraz`.

## 6. Forma zapisu technicznego

Wpis przechowujemy jako `data/manifestations/<slug>.json` zgodny ze schematem
walidowanym przez `tools/rebuild-index.mjs` (szczegóły pól:
`docs/ARCHITECTURE.md`). Sekcje tekstu (I–V) noszą nazwy jak wyżej, a **klucze
JSON układamy w kolejności numeracji z §4.1** (czytelność pliku = czytelność
kartoteki; walidacja patrzy na pola, nie na porządek).
Tagi i powiązania (`tagi`, `powiazania`) tworzą warstwę wiki — powiązanie
musi mieć uzasadnienie w polu `opis`, a backlinki wylicza indeks.

### 6.1 Kanon tagów (od v1.4)

Słownikiem tagów jest **`data/kanon-tagow.json`** (ADR 0016): kategorie z limitami
i dozwolone tagi z opisami. Zasady:

| Kategoria | Skrót | Ile | Co oznacza |
|---|---|---|---|
| `kultura` | kultura | dokładnie 1 | tradycja źródłowa bytu (patrz §2: jedna kultura na wpis) |
| `typ` | typ | dokładnie 1 | czym byt jest (duch przodków, selkie, olbrzym…) |
| `motyw` | motyw | 1–2 | co wiąże byty ze sobą i z SKITami (złe oko, warunek, opłaty…) |
| `postac` | postać | 0–1 | w jakiej formie byt występuje (maskarada, kamienna figura…) |

* **tag spoza kanonu = błąd walidatora** (`npm test` i `npm run build`), więc
  słownik nie rozpełza się na jednozdaniowe etykiety w stylu `nigeria-2026`;
* **nowy tag dopisuje się do kanonu** w tym samym commicie co wpis: `tag`,
  `kategoria`, `opis` (zdanie, nie powtórzenie nazwy). Nie potrzeba do tego ADR,
  ale potrzeba kategorii, która ma sens dla >1 wpisu — jeśli tag miałby opisywać
  tylko jeden wpis, nie jest tagiem, tylko treścią wpisu (patrz `lokalizacja`,
  `pochodzenie_i_kultura`);
* **kraj/państwo nie jest tagiem** — jest w `lokalizacja.kraj` i po nim działa
  wyszukiwarka;
* w pliku wpisu `tagi` wymienia się w kolejności kategorii kanonu (jak wyżej);
* aplikacja prezentuje tagi **pasrami po kategoriach**: podpis kategorii + chipy
  z licznikiem wpisów i opisem w `title`; w karcie bytu chip ma skrót kategorii
  (`typ | olbrzym`), a pełna nazwa i opis są w podpowiedzi.

### 6.2 Opis powiązania (od v1.7, ADR 0019)

Powiązanie (`powiazania: [{slug, opis}]`) to krawędź w sieci wiki — a jej sens
niesie **`opis`**. Wymogi:

* **`opis` to zdanie (lub kilka) tłumaczące, DLACZEGO byty są ze sobą związane** —
  wspólny motyw, lustrzana mechanika, kontrast tradycji. Nie wolno zredukować go
  do jednego słowa, etykiety kategorii ani do samego adresu www.
* walidator odrzuca opis krótszy niż **`POWIAZANIE_MIN_SLOW` (12 słów)** oraz opis
  będący samym `http(s)`-linkiem. Próg jest niski względem praktyki (istniejące
  opisy: 43–78 słów) i pilnuje wyłącznie dolnej granicy czytelności.
* powiązanie ma być **uzasadnione, nie „na siłę”**: jeśli nie umiesz w zdaniu
  napisać, co łączy dwa byty, prawdopodobnie nie są powiązane. Backlinki liczy
  indeks, więc opis warto napisać z perspektywy obu stron krawędzi.

## 7. Przykład zastosowania (karta: *Tarmogoyf*)

Kartoteka zawiera cztery zweryfikowane wg ADR 0008 wpisy (fetch Scryfall +
źródła www z adresami) — każdy inny przypadek użycia karty:

- [`data/manifestations/egungun.json`](../data/manifestations/egungun.json) —
  *Krumar Initiate* (TDM 84, 2025); translacja mechaniki „endure / Pay X life”
  na rodowy kult przodków egúngún (Oyo);
- [`data/manifestations/lincoln-imp.json`](../data/manifestations/lincoln-imp.json) —
  *Forge Devil* (DKA 91, 2012); tłumaczenie flavoru na realną legendę (imp
  z katedry Lincoln) i powiązanie z innym wpisem;
- [`data/manifestations/balor.json`](../data/manifestations/balor.json) —
  *Weftblade Enhancer* (EOE 44, 2025); nazwa z warsztatu tkackiego i mechanika
  „wzmacniania dwóch” czytane przez Cath Maige Tuired: oko jako urządzenie
  z obsługą, termin zamiast losu;
- [`data/manifestations/selkie-sule-skerry.json`](../data/manifestations/selkie-sule-skerry.json) —
  *Kulrath Mystic* (ECL 56, 2026); +2/+0 i vigilance po wielkim czare jako rytm
  ballady Child 113: moc bytu zapala się na wypowiedzenie warunku i gaśnie wraz
  z turą.

Przykłady SKITów (Baza Skitów, §8): `znak-i-liczba` (Balor × Selkie — znak na
dziecku) i `plotno-i-kamien` (Egungun × Imp z Lincoln — kto wchodzi do
świątyni).

## 8. SKITy — warstwa literacka archiwum (od v1.3)

**SKIT** to niezależny obiekt literacki: krótki fragment prozy dialogowej, który
łączy manifestacje z różnych kultur w rozmowie mądrej, zabawnej i zajmującej
(por. przerywniki dialogowe z serii *Tales of…*). SKITy budują warstwę
filozoficzno-satyryczną archiwum: pokazują, jak byty widziane przez swoje
tradycje rozmawiają ze sobą — **nie tylko o rzeczach wielkich**: od v1.6
pełnoprawnym rejestrem jest zwykła rozmowa przy ognisku, o codzienności,
z humorem (ADR 0018, patrz §8.3 pkt 3).

### 8.1 Gdzie mieszkają

* plik `data/skity/<slug>.json` — **Baza Skitów**; wpisy kartoteki NIE
  zawierają tekstu skitu;
* indeks (`npm run build`) wylicza: `skity[]` (skróty), `manifestacje[].skity`
  (sekcja V pod kartą bytu) i pozycje feedu „Co nowego";
* aplikacja: przycisk **✎ skity** (Baza Skitów), widok pojedynczego skitu oraz
  sekcja **VI SKITy** w karcie materializacji; deep-link `#skit:<slug>`.

Pola: `slug`, `tytul`, `temat?`, `uczestnicy: [{imie, slug}]`, `tekst`,
`meta: {utworzono, autor?, modyfikacje[]}`. `temat` jest **katalogowe**: służy do
dobierania niepowtarzalnych tematów i do szukania, ale **nie jest renderowane**
ani w widoku skitu, ani w liście bazy — widz dostaje nagłówek, uczestników i
dialog, bez zdań-wstępów. Stopka karty (wpisu i skitu) pokazuje wyłącznie daty:
`utworzono` i `zmieniono` (najpóźniejsza z `modyfikacje`).

### 8.2 Forma

* **skład: 2–4 uczestników; preferowane 3–4** (od v1.7, ADR 0019). Rozmowa
  trzech, czterech bytów z różnych kultur niesie największy potencjał AME —
  spina kilka tradycji naraz, zamiast poprzestać na duecie. Minimum pozostaje 2
  (istniejące duety są legalne), ale **C3 domyślnie sięga po trójkę lub czwórkę**,
  a duet wybiera świadomie, gdy temat go wymaga. `npm run build` przypomina o tym
  podpowiedzią, gdy duetów w bazie jest więcej niż składów ≥3;
* nagłówek w pliku wpisu/aplikacji ma postać: `### **SKIT: TYTUŁ**` (tytuł
  nadaje autor, na podstawie treści; w renderze wersalikami);
* bezpośrednio pod nim lista uczestników (`Uczestnicy:` + nazwiska);
* **czysty dialog materializacji** — żadnej narracji autorskiej między replikami,
  jeśli już, to w didaskaliach w nawiasach kwadratowych;
* każda replika w wierszu: `**Imię:** [didaskalia] wypowiedź`, akapity rozdzielone
  pustą linią;
* długość: **maks. 300 słów** (limit podniesiony z 250 decyzją właściciela 2026-08-28,
  ADR 0015; walidator liczy w `tekst`; poniżej ~60 słów
  rozmowa nie ma oddechu — też odrzucamy).

### 8.3 Treść — rygory

1. **100% in-character i 100% z lore.** Rozmawiają byty z naszego świata, w ich
   kulturach i czasach. Zakaz meta-języka gry: nie ma `mana`, `P/T`, `booster`,
   `deck`, „karty MtG/Magic", „Scryfall" — karta jest kluczem do bytu, nie jego
   słownictwem (walidator sprawdza listę żargonu).
2. **Fakty za tło muszą być prawdziwe.** SKIT jest fabularny, ale zwyczaje,
   przedmioty, miejsca i wierzenia, które postacie wymieniają, muszą się zgadzać
   z sekcjami kart ich bytów (a te są zweryfikowane wg ADR 0008). Nowy fakt w
   skicie = nowy fakt do sprawdzenia w źródłach.
3. **Tematy dowolne, ale zawsze zgodne z charakterem bytu:** przeszłość,
   filozofia, wzajemne relacje, obserwacje okolicy, stan fizyczny i psychiczny,
   przemyślenia, zwyczaje wyniesione z kultury, jedzenie, wolny czas, hobby,
   pasje, pragnienia, kompleksy, traumy, duma, poczucie humoru.
   **Ton (sugestia, v1.6 — ADR 0018):** rozmowy nie muszą być poważne, by były
   dobre. Pisz też luźne — klimatem jak przy ognisku, po robocie: o prostych,
   codziennych sprawach (jedzenie, sen, pogoda na jutro, kurz i pranie,
   zwierzęta pod dachem, drobne ndrogi i żale na sąsiadów), z humorem, żartem
   i ciepłem. Elegia to jeden z rejestrów, nie jedyny: po serii sążnistych
   rozmów następna powinna być lekka. Humor trzyma się rygorów: postać żartuje
   tak, jak żartowałaby w swojej kulturze i czasach (pkt 1), a każdy fakt
   z żartu musi się zgadzać z kartoteką (pkt 2).
4. **Oryginalność.** Każdy SKIT ma inny temat niż poprzednie. Zakazane jest
   powtórzenie **składu osobowego**: dwa skity z identycznym zestawem
   materializacji nie przejdą walidatora (`walidujUnikalnoscSkitow`). Skład o
   jedną osobę mniejszy lub większy jest dozwolony, o ile sam jest unikalny.
5. **Uczestnicy:** 2–4 materializacje z kartoteki, **preferowane 3–4** (ADR 0019;
   §8.2), każda musi zabrać głos (imię w replikach = `imie` z listy uczestników),
   żadnej postaci spoza składu.

### 8.4 C3 w Pętli Jakości (ADR 0007)

Po C1 (treść wpisów) i przed C2 (featury): **wybierz materializacje tak, aby taki
zestaw nie miał jeszcze swojego SKITa — domyślnie 3 lub 4 (ADR 0019), duet tylko
gdy temat go wymaga**, napisz SKIT wg §8.2–§8.3,
dopisz plik do Bazy Skitów, uruchom `npm run build` + `npm test` i zacommituj.
Sekcja V kart materializacji oraz feed „Co nowego" podlinkują się same — z
indeksu.

## 9. Dziennik zmian (feed „Co nowego")

Sekcja **Co nowego** (przycisk **✚ nowości**, deep-link `#nowosci`) jest
**wyliczana, nie pisana ręcznie**: `tools/rebuild-index.mjs` zbiera z pola
`meta` każdego wpisu i każdego skitu:

* `meta.utworzono` → pozycja „dodano";
* każdy wpis w `meta.modyfikacje: [{data, opis}]` → pozycja „zmieniono".

Sortowanie: **najnowsze na górze**. Data może mieć dokładność dzienną
(`RRRR-MM-DD`) albo godzinową (`RRRR-MM-DD GG:MM`, ADR 0017). Pozycje z godziną
układają się w obrębie dnia chronologicznie (godzina rozstrzyga przed
sekwencją); pozycje bez godziny — zapisy sprzed v1.5 — lądują pod godzinowymi
tego samego dnia, a ich kolejność wynika z **chronologii zdarzeń w pliku**:
każda pozycja dostaje `sekwencja` (0 = `utworzono`, k+1 = k-ty wpis
`modyfikacje`, dopisywany na końcu tablicy). Sort liczy `data malejąco →
sekwencja malejąco → typ (skity przed wpisami) → slug`. Utworzenie karty
z poprzedniej sesji nie może przysłonić zmian z dziś. Klucz `sekwencja` służy
tylko sortowaniu i nie trafia do indeksu (pozostaje deterministyczny —
ADR 0002).

`opis` modyfikacji czyta człowiek w dzienniku archiwum: to **zdanie o treści**
(co doszło, co się poprawiło w karcie), a nie notatka robocza sesji — bez
oznaczeń wewnętrznych (`M3`, `B1`, `C1`, `PROTOKÓŁ §`) i bez nazw plików. Zmiany
techniczne (kod, narzędzia, zasady) idą do `docs/PROJECT_HISTORY.md` i opisu PR.
Konsekwencja dla agentów: **każda zmiana w treści musi zostać opisana w
`meta.modyfikacje` z poprawną datą** — inaczej zmiana nie trafi do dziennika i
łamie §6. Nowy plik (wpis lub skit) dostaje `meta.utworzono` w formacie
`RRRR-MM-DD`, **zalecane z godziną** (`RRRR-MM-DD GG:MM` — moment zapisu,
ADR 0017); forma bez godziny pozostaje legalna dla starych zapisów. Godzina
pochodzi z treści pliku, nigdy z zegara builda (determinizm — ADR 0002).
