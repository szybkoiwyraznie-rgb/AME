# PROTOKÓŁ MFM — format wpisu Archiwum Manifestacji Eterycznych

> **MFM** to oznaczenie protokołu treściowego z pierwszej wersji dokumentu
> (v1.0, 2026-08-27) i pozostaje nazwą metody. **AME** to cały projekt:
> aplikacja + kartoteka. Protokół opisuje, jak powstaje i co zawiera pojedynczy
> wpis („kartotka manifestacji”).
>
> Status: **obowiązujący** (v1.1). Zmiany protokołu wymagają ADR.

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
ANALIZA TRANSLACJI
  • Nazwa → etymologia, skojarzenia
  • Mechanika → jak przekłada się na zdolności bytu
  • Ilustracja → wizualna identyfikacja manifestacji
  • Flavor text → wskazówki fabularne, cytat jako trop
  • Lore MTG → kontekst, który może naprowadzić na kulturę źródłową
       ↓
IDENTYFIKACJA BYTU (folklor, mitologia, legendy miejskie)
       ↓
PEŁNY WPIS MFM (data/manifestations/<slug>.json)
```

## 4. Struktura wpisu

### [NAZWA BYTU / MANIFESTACJI]
**Inspiracja kartą:** [NAZWA KARTY MTG]

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

#### IV. WIZUALIZACJA (prompt dla grafiki AI)
Techniczny prompt zapisany w polu `wizualizacja.prompt` wpisu. Rezygnamy z
formy figurki/dioramy: celem jest **hiperrealistyczny, filmowy portret
środowiskowy bytu w jego naturalnym otoczeniu** — patrz §5.

#### V. TROFEA I DOWODY ELIMINACJI
* Trofeum Pierwotne
* Trofeum Wtórne (opcjonalne)

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
`docs/ARCHITECTURE.md`). Sekcje tekstu (I–V) noszą nazwy jak wyżej.
Tagi i powiązania (`tagi`, `powiazania`) tworzą warstwę wiki — powiązanie
musi mieć uzasadnienie w polu `opis`, a backlinki wylicza indeks.

## 7. Przykład zastosowania (karta: *Tarmogoyf*)

Pełny, zaktualizowany do v1.1 przykład znajduje się w repozytorium jako
rzeczywisty wpis: [`data/manifestations/wendigo.json`](../data/manifestations/wendigo.json).
Drugim przykładem, pokazującym powiązania między wpisami, jest
[`data/manifestations/zmora.json`](../data/manifestations/zmora.json)
(inspiracja: *Nightmare*).
