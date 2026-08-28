# PROTOKÓŁ MFM — format wpisu Archiwum Manifestacji Eterycznych

> **MFM** to oznaczenie protokołu treściowego z pierwszej wersji dokumentu
> (v1.0, 2026-08-27) i pozostaje nazwą metody. **AME** to cały projekt:
> aplikacja + kartoteka. Protokół opisuje, jak powstaje i co zawiera pojedynczy
> wpis („kartotka manifestacji”).
>
> Status: **obowiązujący** (v1.3 od 2026-08-28; v1.2 i v1.1 — 2026-08-27/28).
> Zmiany protokołu wymagają ADR.
> v1.1 (ADR 0005): rama promptu 21:9. v1.2 (ADR 0011): obowiązująca kolejność
> prezentacji sekcji oraz adres www jako część źródła. **v1.3 (ADR 0012):
> numeracja sekcji idzie za kolejnością (I = Wizualizacja … V = Rezonans) i
> dochodzi sekcja VI „SKITy”** (Baza Skitów, ADR 0013).

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

### 4.1 Numeracja = kolejność prezentacji (od v1.3)

```
I   Wizualizacja            II  Charakterystyka i natura   III Dokumentacja
IV  Trofea i dowody         V   Rezonans i tożsamość       VI SKITy
```

Sekcje układamy i numerujemy w tej kolejności — **numer rzymski to pozycja w
wpisie**, a nie tylko etykieta treści. Obowiązuje wszędzie: w kartotece
(`app/ui.js`), w plikach wpisów (`data/manifestations/`), w tym dokumencie i w
instrukcji `docs/WORKFLOW.md`. Po sekcji VI następują elementy bez numeru:
powiązania (warstwa wiki) i meta.

> Przeliczenie historyczne (dla wpisów, ADR-ów i notatek sprzed v1.3):
> IV→I, II→II, III→III, V→IV, I→V (stara numeracja była przypisana do treści).

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

#### V. REZONANS I TOŻSAMOŚĆ
* **Klucz Przywołania:** analiza, jak nazwa, ilustracja, mechanika i flavor
  karty korelują z danym bytem — w formie tabeli translacji:

  | Element karty | Translacja na byt |
  |---|---|
  | **Nazwa** | jak nazwa naprowadza na tożsamość manifestacji |
  | **Mechanika** | które zdolności karty odpowiadają mocom bytu |
  | **Ilustracja** | co na obrazie wskazuje na folklor/region |
  | **Flavor text** | interpretacja cytatu jako „dokumentu terenowego” |
  | **Lore/Tło** | kontekst ze świata MTG przełożony na nasz świat |

* **Pochodzenie i Kultura** (np. mitologia Inuitów, folklor słowiański,
  współczesne legendy miejskie Japonii).
* **Lokalizacja geograficzna:** precyzyjne miejsce, gdzie wierzenie powstało
  lub gdzie odnotowano aktywność bytu — z podaniem regionu i współrzędnych
  dziesiętnych.

### 4.4 Słowniczek: sekcja ↔ pole w JSON

| Sekcja | Pole w `data/manifestations/<slug>.json` |
|---|---|
| I Wizualizacja | `wizualizacja` |
| II Charakterystyka i natura | `natura` |
| III Dokumentacja | `dokumentacja` (pozycje z `url`) |
| IV Trofea | `trofea` |
| V Rezonans i tożsamość | `rezonans` (+ `karta`, `lokalizacja`, `pochodzenie_i_kultura`) |
| VI SKITy | **brak pola** — wyliczane z bazy skitów (ADR 0013); autor skitu wskazuje uczestników, wpis ich nie duplikuje |

### 4.5 Sekcja VI — SKITy

SKIT to fragment prozy (dialog materializacji) z **Bazy Skitów**
(`data/skity/`, ADR 0013). Sekcja VI wpisu nie jest pisana w pliku wpisu:
indeks podpowiada wszystkie skity, w których dana manifestacja występuje, a
aplikacja linkuje je pod kartoteką. Zasady pisania skitów (dramatis personae,
limit 250 słów, unikalność zestawu uczestników, zakaz terminologii growej)
reguluje §8.

## 5. Rama promptu wizualizacji (v1.1 — obowiązuje od 2026-08-27)

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
Dopóki obrazu nie ma, aplikacja pokazuje miejsce złożenia („wizualizacja
nieodtworzona”) razem z gotowym do skopiowania promptem.

## 6. Forma zapisu technicznego

Wpis przechowujemy jako `data/manifestations/<slug>.json` zgodny ze schematem
walidowanym przez `tools/rebuild-index.mjs` (szczegóły pól:
`docs/ARCHITECTURE.md`). Sekcje tekstu (I–V) noszą nazwy jak wyżej, a **klucze
JSON układamy w kolejności numeracji z §4.1** (czytelność pliku = czytelność
kartoteki; walidacja patrzy na pola, nie na porządek).
Tagi i powiązania (`tagi`, `powiazania`) tworzą warstwę wiki — powiązanie
musi mieć uzasadnienie w polu `opis`, a backlinki wylicza indeks.

## 7. Przykład zastosowania (karta: *Tarmogoyf*)

Przykłady rzeczywistych wpisów w repozytorium (oba zweryfikowane wg ADR 0008:
fetch Scryfall + źródła www):
- [`data/manifestations/egungun.json`](../data/manifestations/egungun.json) —
  inspiracja: *Krumar Initiate* (TDM 84); pokazuje translację mechaniki
  „endure/Pay X life” na kult przodków;
- [`data/manifestations/lincoln-imp.json`](../data/manifestations/lincoln-imp.json) —
  inspiracja: *Forge Devil* (DKA 91); pokazuje tłumaczenie flavoru karty na
  realną legendę (imp z katedry Lincoln) oraz powiązanie z innym wpisem.

## 8. SKITy — warstwa literacka archiwum (od v1.3)

**SKIT** to niezależny obiekt literacki: krótki fragment prozy dialogowej, który
łączi manifestacje z różnych kultur w rozmowie mądrej, zabawnej i zajmującej
(por. przerywniki dialogowe z serii *Tales of…*). SKITy budują warstwę
filozoficzno-satyryczną archiwum: pokazują, jak byty widziane przez swoje
tradycje rozmawiają ze sobą.

### 8.1 Gdzie mieszkają

* plik `data/skity/<slug>.json` — **Baza Skitów**; wpisy kartoteki NIE
  zawierają tekstu skitu;
* indeks (`npm run build`) wylicza: `skity[]` (skróty), `manifestacje[].skity`
  (sekcja VI pod kartą bytu) i pozycje feedu „Co nowego";
* aplikacja: przycisk **✎ skity** (Baza Skitów), widok pojedynczego skitu oraz
  sekcja **VI SKITy** w karcie materializacji; deep-link `#skit:<slug>`.

Pola: `slug`, `tytul`, `temat?`, `uczestnicy: [{imie, slug}]`, `tekst`,
`meta: {utworzono, autor?, modyfikacje[]}`.

### 8.2 Forma

* nagłówek w pliku wpisu/aplikacji ma postać: `### **SKIT: TYTUŁ**` (tytuł
  nadaje autor, na podstawie treści; w renderze wersalikami);
* bezpośrednio pod nim lista uczestników (`Uczestnicy:` + nazwiska);
* **czysty dialog materializacji** — żadnej narracji autorskiej między replikami,
  jeśli już, to w didaskaliach w nawiasach kwadratowych;
* każda replika w wierszu: `**Imię:** [didaskalia] wypowiedź`, akapity rozdzielone
  pustą linią;
* długość: **maks. 250 słów** (walidator liczy w `tekst`; poniżej ~60 słów
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
4. **Oryginalność.** Każdy SKIT ma inny temat niż poprzednie. Zakazane jest
   powtórzenie **składu osobowego**: dwa skity z identycznym zestawem
   materializacji nie przejdą walidatora (`walidujUnikalnoscSkitow`). Skład o
   jedną osobę mniejszy lub większy jest dozwolony, o ile sam jest unikalny.
5. **Uczestnicy:** 2–4 materializacje z kartoteki, każda musi zabrać głos
   (imię w replikach = `imie` z listy uczestników), żadnej postaci spoza składu.

### 8.4 C3 w Pętli Jakości (ADR 0007)

Po C1 (treść wpisów) i przed C2 (featury): **wybierz 2, 3 lub 4 materializacje
tak, aby taki zestaw nie miał jeszcze swojego SKITa**, napisz SKIT wg §8.2–§8.3,
dopisz plik do Bazy Skitów, uruchom `npm run build` + `npm test` i zacommituj.
Sekcja VI kart materializacji oraz feed „Co nowego" podlinkują się same — z
indeksu.

## 9. Dziennik zmian (feed „Co nowego")

Sekcja **Co nowego** (przycisk **✚ nowości**, deep-link `#nowosci`) jest
**wyliczana, nie pisana ręcznie**: `tools/rebuild-index.mjs` zbiera z pola
`meta` każdego wpisu i każdego skitu:

* `meta.utworzono` → pozycja „dodano";
* każdy wpis w `meta.modyfikacje: [{data, opis}]` → pozycja „zmieniono".

Sortowanie: najnowsze na górze; w obrębie tej samej daty przyrosty przed
zmianami, potem alfabetycznie (indeks musi pozostać deterministyczny — ADR 0002).
Konsekwencja dla agentów: **każda zmiana w treści musi zostać opisana w
`meta.modyfikacje` z poprawną datą** — inaczej zmiana nie trafi do dziennika i
łamie §6. Nowy plik (wpis lub skit) dostaje `meta.utworzono` w formacie
`RRRR-MM-DD`.
