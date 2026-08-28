# ARCHITECTURE — budowa aplikacji i danych AME

## Przegląd

Aplikacja to statyczna strona (ADR 0001): `index.html` + moduły ES w `app/`
+ assety w `assets/` + dane w `data/`. Działa z dowolnego serwera statycznego
(GitHub Pages, `python3 -m http.server`). Bez backendu, bez builda aplikacji.

```
index.html                  — powłoka UI (topbar, mapa, panel, lista)
app/
  app.js                    — bootstrap: ładuje indeks, spina moduły
  geo.js                    — dekodowanie TopoJSON, projekcja równoodległa,
                              geometria mapy (czyste funkcje, testowalne w Node)
  map.js                    — render SVG mapy + pinezki + pan/zoom + łuki,
                              widok liczony z kontenera (ResizeObserver)
  data.js                   — ładowanie indeksu i wpisów, filtrowanie
  ui.js                     — warstwa wpisu (dialog), Baza Skitów, widok skitu,
                              feed „Co nowego", tagi, powiązania, lista, szukanie,
                              logika motywu (wszystko jako funkcje czyste)
  styles.css                — tokeny palety: motyw ciemny i jasny (bez webfontów)
assets/
  map/countries-50m.json    — Natural Earth jako TopoJSON (vendoring, PD/ISC)
  map/LICENSE.world-atlas   — licencja pakietu world-atlas
  wizualizacje/<slug>.jpg   — wygenerowane obrazy 21:9 (≤ 2 MB)
data/
  manifestations/<slug>.json — pełne wpisy MFM (źródło prawdy treści)
  skity/<slug>.json          — Baza Skitów: dialogi materializacji (ADR 0013)
  index.json                — GENEROWANY przez tools/rebuild-index.mjs (v2)
tools/
  rebuild-index.mjs         — walidacja wpisów + budowa indeksu (--check
                              używany w testach; zapis używany w buildzie)
test/                       — node --test (geo, schemat, indeks)
docs/                       — protokół, ADR, plany, handoffy (patrz AGENTS.md)
```

## Przepływ danych

1. Agent pisze/rozbudowuje `data/manifestations/<slug>.json`.
2. `npm run build` → walidacja → przebudowa `data/index.json` (deterministyczna:
   sortowanie po slugu, słownik tagów, backlinki z powiązań).
3. `npm test` → walidacja `--check` + testy jednostkowe (projekcja, dekoder
   TopoJSON, schemat wpisów i skitów) — brama commitu.
4. Aplikacja: `app.js` rozstrzyga motyw (zapis w `localStorage` →
   `prefers-color-scheme` → ciemny) i ustawia `html[data-motyw]`, pobiera
   `data/index.json` → rysuje pinezki; kliknięcie dociąga
   `data/manifestations/<slug>.json` do pełnoekranowej warstwy wpisu.
5. Baza Skitów i feed: skróty `skity[]`, `manifestacje[].skity` (sekcja VI) i
   `aktualizacje[]` („Co nowego") są w indeksie — pełny tekst skitu dociągany
   jest przy otwarciu (`data.js: zaladujSkit`). Nikt nie przepisuje list ręcznie.

## Schemat wpisu (skrót; pełna walidacja w tools/rebuild-index.mjs)

Kolejność sekcji w prezentacji i w plikach JSON: `wizualizacja` → `natura` →
`dokumentacja` → `trofea` → `rezonans` (PROTOKÓŁ §4.1); walidacja i indeks są
niezależne od porządku kluczy.

```
slug, nazwa, nazwy_alternatywne[]
karta: { nazwa, wydanie?, rok? }
lokalizacja: { miejscowosc, kraj, lat, lon }        # lat [-90..90], lon [-180..180]
pochodzenie_i_kultura: string
rezonans: { klucz_przywolania: string,
            tabela: [{ element, translacja } ≥ 5 wierszy: Nazwa/Mechanika/Ilustracja/Flavor/Lore ] }
natura: { wyglad_i_aura, charakter_i_motywacje, zdolnosci,
          slabosci_i_metody_pokonania, preferencje }  # polskie teksty
dokumentacja: [{ typ, pozycja, url? }]               # prawdziwe źródła; ≥1 url http(s) na wpis
wizualizacja: { prompt, obraz? }                     # rama 21:9 walidowana
trofea: { pierwotne, wtorne? }
tagi: []                                             # ^[a-ząćęłńóśźż0-9-]+$
powiazania: [{ slug, opis }]                         # istniejące wpisy, bez self
meta: { utworzono, autor?, modyfikacje: [{data, opis}] }
```

## Schemat SKITa (Baza Skitów, ADR 0013)

```
slug, tytul, temat?
uczestnicy: [{ imie, slug }]                         # 2–4, slugi muszą istnieć, zestaw unikalny w bazie
tekst                                                # „**Imię:** [didaskalia] słowa”, 60–300 słów
meta: { utworzono, autor?, modyfikacje: [] }
```

Plik `data/index.json` (wersja 2) dokłada do tego: `skity[]` (skróty: slug,
tytul, imiona, slow, data), `manifestacje[].skity` (sekcja VI) i `aktualizacje[]`
(feed „Co nowego»). Sort feedu liczy chronologię zdarzeń: data malejąco →
`sekwencja` w obrębie pliku malejąco (utworzenie = 0, kolejne
`meta.modyfikacje` = 1..n) → typ (skity przed wpisami) → slug; klucz
`sekwencja` służy tylko sortowaniu i nie trafia do pliku indeksu.

Stopka karty (`ui.js: htmlStopki`) wyświetla wyłącznie daty: `utworzono` oraz
`zmieniono` (najpóźniejsza z `meta.modyfikacje`). Autorzy i opisy zmian zostają
w plikach JSON i w feedzie — karty nie są miejscem na notatki robocze sesji.

## Mapa (ADR 0003 + ADR 0009)

- Projekcja walcowa równoodległa; świat w prostokącie W×H = 3600×1800 j.u.,
  1° długości = 1° szerokości = 10 j.u. (10 j.u. na stopień w obu osiach).
- **Widok w pikselach kontenera**: `viewBox` = rozmiar kontenera, a grupa świata
  nosi transformację `translate(x, y) scale(s)`, gdzie `s = skalaBazowa · k`,
  `skalaBazowa = min(szer/3600, wys/1800)` (contain — cały świat w oknie, bez
  przycinania i rozciągu). Całą logikę liczy czysta `dopasujWidok()` w `geo.js`
  (docina przesunięcia do brzegów świata, wyśrodkowuje, gdy świat jest
  mniejszy od okna); `ResizeObserver` + `window.resize` zachowują punkt pod
  środkiem okna.
- Zoom do kursora: `k' = k·f`, `x' = px − (px − x)·(s'/s)` (analogicznie y);
  pinch = stosunek odległości dwóch wskaźników.
- **Antypołudnik**: `potnijPierscien()` rozcina pierścienie przekraczające ±180°
  na kawałki po jednej stronie szwu, domykając je wzdłuż ±180° (albo bieguna,
  gdy dane są rozcięte na szwie nieparzyście — Antarktyda). Bez tego Rosja i
  Fidżi rysują cięciwę przez całą mapę (L7).
- Elementy interfejsu mapy (pinezki, badge nazwy, obrysy) są w **pikselach CSS**:
  grupa pinezki kompensuje skalę `scale(1/s)`, linie używają
  `vector-effect: non-scaling-stroke` (L8).
- Łuki powiązań: krzywa Q z punktu kontrolnego uniesionego prostopadle nad
  środek segmentu (0.18 długości) — czytelne przy wielu liniach.
- Kartoteka bytu jest warstwą przykrywającą okno (ADR 0010), więc otwarcie wpisu
  nie zmienia rozmiaru kontenera mapy.

## Konwencje kodu

- ES modules, bez zależności; funkcje czyste tam, gdzie się da (`geo.js` w
  całości testowalne w Node).
- Teksty UI po polsku; klasy CSS `kebab-case`; identyfikatory danych
  (slug/tagi) bez spacji i wielkich liter.
- Kliknięcia w warstwach obsługuje JEDEN `closest('[data-…], [data-…]')`
  z listą atrybutów w kolejności priorytetu — inaczej element dziedziczny
  (chip w `<article data-skit>`) zostaje pożarty przez kontekst (L10).
- `#panel` (kartoteka bytu) i `#warstwa` (Baza Skitów / skit / Co nowego) to
  dwie warstwy: ta druga jest nad pierwszą (z-index 70 vs 60) i Esc zamyka
  ją najpierw.
- Zakaz dependency runtime; nowe assety zewnętrzne → `docs/ASSETS.md`.
- Kolory wyłącznie przez tokeni CSS z `:root` / `html[data-motyw='jasny']`
  (barvy mapy też) — inaczej drugi motyw będzie nieczytelny (ADR 0010).
- Numeracja sekcji wpisu **jest** ich kolejnością (PROTOKÓŁ §4.1, v1.3):
  I Wizualizacja → II Charakterystyka i natura → III Dokumentacja → IV Trofea →
  V Rezonans i tożsamość → VI SKITy. Przed v1.3 numer był przypisany do treści
  (Wizualizacja = IV); przy starych zapisach stosuj mapę z PROTOKÓŁ §4.5.
