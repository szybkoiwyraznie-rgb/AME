# PROTOKÓŁ MFM — format wpisu Archiwum Manifestacji Eterycznych

> **MFM** to oznaczenie protokołu treściowego z pierwszej wersji dokumentu
> (v1.0, 2026-08-27) i pozostaje nazwą metody. **AME** to cały projekt:
> aplikacja + kartoteka. Protokół opisuje, jak powstaje i co zawiera pojedynczy
> wpis („kartotka manifestacji”).
>
> Status: **obowiązujący** (v1.2 od 2026-08-28; v1.1 — 2026-08-27). Zmiany
> protokołu wymagają ADR. W v1.2 (ADR 0011): obowiązująca **kolejność
> prezentacji** sekcji (§4.1) oraz **adres www jako część źródła** (§4.4).

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

### 4.1 Kolejność prezentacji (standard od 2026-08-28)

Aplikacja, przykłady w `data/manifestations/` i ten dokument podają sekcje
w tej samej, obowiązującej kolejności:

```
IV Wizualizacja  →  II Charakterystyka i natura  →  III Dokumentacja
                  →  V Trofea  →  I Rezonans i tożsamość
```

Numery rzymskie są **tożsamością sekcji**, nie pozycją: „IV” zawsze znaczy
„Wizualizacja”, więc zmiana układu nie wymaga zmian w danych ani w walidatorze.
Po pięciu sekcjach następują elementy bez numeru: powiązania (warstwa wiki)
i meta — ich kolejność się nie zmienia.

### 4.2 Nagłówek wpisu

```
### [NAZWA BYTU / MANIFESTACJI]
**Inspiracja kartą:** [NAZWA KARTY MTG]
```

### 4.3 Treść sekcji

#### IV. WIZUALIZACJA (prompt dla grafiki AI)
Techniczny prompt zapisany w polu `wizualizacja.prompt`. Rezygnujemy z
formy figurki/dioramy: celem jest **hiperrealistyczny, filmowy portret
środowiskowy bytu w jego naturalnym otoczeniu** — patrz §5. W kartotece sekcja
jest pierwsza i zajmuje pełną szerokość wpisu (ADR 0010).

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

#### V. TROFEA I DOWODY ELIMINACJI
* Trofeum Pierwotne
* Trofeum Wtórne (opcjonalne)

#### I. REZONANS I TOŻSAMOŚĆ
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

### 4.4 Słowniczek pól a sekcje

| Sekcja | Pole w JSON |
|---|---|
| IV Wizualizacja | `wizualizacja` |
| II Charakterystyka i natura | `natura` |
| III Dokumentacja | `dokumentacja` (z `url`) |
| V Trofea | `trofea` |
| I Rezonans i tożsamość | `rezonans` (+ `karta`, `lokalizacja`, `pochodzenie_i_kultura`) |

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
JSON układamy w kolejności prezentacji z §4.1** (czytelność pliku = czytelność
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
