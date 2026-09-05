# ARCHITECTURE — budowa aplikacji i danych AME

## Przegląd

Aplikacja to statyczna strona (ADR 0001): `index.html` + moduły ES w `app/`
+ assety w `assets/` + dane w `data/`. Działa z dowolnego serwera statycznego
(GitHub Pages, `python3 -m http.server`). Bez backendu, bez builda aplikacji.

```
index.html                  — powłoka UI (topbar, mapa, panel, lista)
app/
  app.js                    — bootstrap: ładuje indeks, spina moduły
  geo.js                    — dekodowanie TopoJSON, projekcja Web Mercator,
                              geometria mapy (czyste funkcje, testowalne w Node)
  map.js                    — render SVG mapy + pinezki + pan/zoom + łuki,
                              widok liczony z kontenera (ResizeObserver)
  data.js                   — ładowanie indeksu i wpisów, filtrowanie
  ui.js                     — warstwa wpisu (dialog), Baza Skitów, widok skitu,
                              feed „Co nowego", tagi, powiązania, lista, szukanie,
                              logika motywu (wszystko jako funkcje czyste)
  kregi.js                  — kręgi kulturowe: otoczki grup tradycji na mapie
  arena.js                  — Arena Rezonansu: statystyki bytu wyprowadzone
                              z indeksu, spór dwóch wersji świata (RNG wstrzykiwany)
  liga.js                   — Liga Rezonansu: terminarz round-robin liczony
                              z kalendarza i tabela sezonu (zero zapisanego stanu)
  prog.js                   — PRÓG: spotkanie bez walki, klucze i szanse
  splot.js                  — SPLOT: rozstrzyganie dróg (zasoby, napór świata)
  styles.css                — tokeny palety: motyw ciemny i jasny (bez webfontów)
assets/
  map/countries-50m.json    — Natural Earth jako TopoJSON (vendoring, PD/ISC)
  map/rivers-2km5.json      — obszary rzeczne OSM (GeoJSON MultiPolygon, geo-maps)
  map/lakes-2km5.json       — obszary jezior OSM (GeoJSON MultiPolygon, geo-maps)
  map/miasta.json           — miasta ≥100 tys. lub stolice (world-cities-json, CC BY 4.0)
  map/LICENSE.world-atlas   — licencja pakietu world-atlas
  wizualizacje/<slug>.jpg   — wygenerowane obrazy 21:9 (≤ 2 MB)
data/
  manifestations/<slug>.json — pełne wpisy MFM (źródło prawdy treści)
  skity/<slug>.json          — Baza Skitów: dialogi materializacji (ADR 0013)
  kanon-tagow.json           — słownik tagów: kategorie, limity, opisy (ADR 0016)
  kregi-kulturowe.json       — grupy kultur rysowane jako otoczki na mapie
  index.json                — GENEROWANY przez tools/rebuild-index.mjs (v3)
tools/
  rebuild-index.mjs         — walidacja wpisów + budowa indeksu (--check
                              używany w testach; zapis używany w buildzie)
test/                       — node --test (geo, schemat, indeks,
                              kontrakty: CSS↔klasy mapy, wersja protokołu)
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
5. Baza Skitów i feed: skróty `skity[]`, `manifestacje[].skity` (sekcja V) i
   `aktualizacje[]` („Co nowego") są w indeksie — pełny tekst skitu dociągany
   jest przy otwarciu (`data.js: zaladujSkit`). Nikt nie przepisuje list ręcznie.

## Schemat wpisu (skrót; pełna walidacja w tools/rebuild-index.mjs)

Kolejność sekcji w prezentacji i w plikach JSON: `wizualizacja` → `natura` →
`dokumentacja` → `trofea` (PROTOKÓŁ §4.1; v1.8 — bez `rezonans`); walidacja
i indeks są niezależne od porządku kluczy. Sekcje V–VII (SKITy, Tomy i Epoki,
Powiązania) są wyliczane, nie zapisywane w wpisie.

```
slug, nazwa, nazwy_alternatywne[]
karta: { nazwa, wydanie?, rok? }
lokalizacja: { miejscowosc, kraj, lat, lon }        # lat [-90..90], lon [-180..180]
pochodzenie_i_kultura: string
natura: { wyglad_i_aura, charakter_i_motywacje, zdolnosci,
          slabosci_i_metody_pokonania, preferencje }  # polskie teksty
dokumentacja: [{ typ, pozycja, url? }]               # prawdziwe źródła; ≥1 url http(s) na wpis
wizualizacja: { prompt, obraz? }                     # rama 21:9 walidowana
trofea: { pierwotne, wtorne? }
tagi: []                                             # ^[a-ząćęłńóśźż0-9-]+$, tylko z kanonu (ADR 0016)
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

Plik `data/index.json` (wersja 3) dokłada do tego: `kanon.kategorie[]`,
`tagi{tag:{kategoria,opis,wpisy}}`, `skity[]` (skróty: slug,
tytul, imiona, slow, data), `manifestacje[].skity` (sekcja V) i `aktualizacje[]`
(feed „Co nowego»). Sort feedu liczy chronologię zdarzeń: data malejąco
(porównanie po znakach — format `RRRR-MM-DD` albo `RRRR-MM-DD GG:MM`, ADR 0017:
dzień z godziną wygrywa z dniem bez godziny, wśród godzin kolejność
chronologiczna) → `sekwencja` w obrębie pliku malejąco (utworzenie = 0, kolejne
`meta.modyfikacje` = 1..n) → typ (skity przed wpisami) → slug; klucz
`sekwencja` służy tylko sortowaniu i nie trafia do pliku indeksu.

Stopka karty (`ui.js: htmlStopki`) wyświetla wyłącznie daty: `utworzono` oraz
`zmieniono` (najpóźniejsza z `meta.modyfikacje`), **bez godziny** — meta może
nieść porę (ADR 0017), ale w karcie liczy się dzień; godzina zdarzenia żyje w
feedzie „Co nowego”. Autorzy i opisy zmian zostają w plikach JSON i w feedzie —
karty nie są miejscem na notatki robocze sesji.

„🎲 wylosuj” (tryb ekspedycji): `data.js: wylosujSlug(slugi, {pomin, los})` to
czysta funkcja losująca slug z podanej puli — pomija wskazany wpis (o ile pula
> 1), przyjmuje wstrzykiwany RNG (test deterministyczny; produkcja `Math.random`).
`app.js: losujManifestacje` bierze pulę z `pasujace()` (filtr + tag), pomija
`stan.ostatniLos` (żeby reroll po zamknięciu karty nie powtarzał) i wywołuje
`otworzWpis(slug, {przewin: true})`, który przelatuje mapę do pinezki. Losowanie
dzieje się w przeglądarce na życzenie — determinizm indeksu (ADR 0002) nietknięty.

## Mapa (ADR 0003 + ADR 0009)

- Projekcja walcowa **Web Mercator** (kula): świat w kwadracie W×H = 3600×3600
  j.u.; x = (lon+180)/360·3600, y = H/2·(1 − atanh(sin φ)/π), szerokości
  przycięte do ±85,05112878°. 1° długości = 10 j.u., a skala lokalna w pionie
  rośnie jak 1/cos(φ) — dzięki temu Polska ma proporcje zbliżone do map Google.
- **Widok w pikselach kontenera**: `viewBox` = rozmiar kontenera, a grupa świata
  nosi transformację `translate(x, y) scale(s)`, gdzie `s = skalaBazowa · k`,
  `skalaBazowa = min(szer/3600, wys/3600)` (contain — cały świat w oknie, bez
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
- **Badge'e nazw mieszkają w osobnej grupie `.etykiety`** wewnątrz grupy świata,
  w DOM **za** grupą `.pinezki` — SVG maluje elementy w kolejności dokumentu,
  więc napisy nigdy nie chowają się pod inną pinezką (M6/A3). Widzialność
  sterują klasy na elemencie etykiety: `widoczna` (najechanie wskaźnikiem lub
  fokus klawiatury), `wybrana` (zaznaczona pinezka), `przygaszona` (filtr) —
  sprzęgane z pinezką zdarzeniami w `map.js`, nie zagnieżdżaniem. Stałe
  pokazywanie etykiet od progu zoomu (dawna klasa `przyblizona`) zniesione
  (M6/A1), a `.mapa-svg` ma `user-select: none`, by przeciąganie nie zaznaczało
  napisów (M6/A2).
- Łuki powiązań: krzywa Q z punktu kontrolnego uniesionego prostopadle nad
  środek segmentu (0.18 długości) — czytelne przy wielu liniach.
- **Warstwy tematyczne (ADR 0020).** `g.warstwy-szczegolow` nad kaflami
  `.kraje` zawiera `.rzeki`, `.jeziora`, `.miasta`, `.poi`. Warstwy ładowane są
  asynchronicznie dopiero po przekroczeniu progu zoomu (`PROGI_WARSTW`), a ich
  widoczność zależy od `k` (LOD treści): rzeki/jeziora od `k=4`, wielkie miasta
  od `k=4`, średnie od `k=7`, drobne od `k=10`, POI od `k=8`. Punkty miast i POI
  kompensują skalę `scale(1/s)` jak pinezki; linie wodne używają
  `vector-effect: non-scaling-stroke`. `app.js` spina przełącznik
  `#przycisk-warstwy` z checkboxami (stan: `{rzeki, jeziora, miasta, poi}`); dane
  niezmieniane przez przełącznik wracają z pamięci i nie są pobierane ponownie.
  W tej iteracji dane istnieją dla rzek, jezior i miast; drogi, szczyty, lasy
  i wysokość n.p.m. są poza zakresem (patrz ADR 0020 i `docs/ASSETS.md`).
- **Etykieta miasta (C4):** nazwa „miasto · populacja” jest widoczna tylko
  podczas przytrzymania przycisku (`pointerdown` → `pointerup`), nie po
  najechaniu. Miasto ma przezroczyste pole trafienia r=16 px
  (`PROMIEN_KLIK_MIASTA`) z `cursor: default`, więc nad punktem widać strzałkę,
  a nie łapkę (`grab` z mapy). Opis dostępności dla czytników ekranu niesie
  `aria-label` grupy miasta (usunięty `<title>`, żeby nazwa nie wyskakiwała na
  hover).
- Kartoteka bytu jest warstwą przykrywającą okno (ADR 0010), więc otwarcie wpisu
  nie zmienia rozmiaru kontenera mapy.

## Tagi: kanon i prezentacja (ADR 0016)

- Słownik: `data/kanon-tagow.json` = `{ wersja, zasady, kategorie[], tagi[] }`.
  Kategorie noszą `id, nazwa, skrot, min, max, opis`; tagi — `tag, kategoria, opis`.
- Pilnują tego: `walidujKanon` (sam plik) i `walidujTagi` (każdy wpis),
  wywoływane z `wczytajIKwaliduj`; bez kanonu build staje
  (`wczytajKanon` rzuca przy braku pliku).
- `zbudujIndeks(wpisy, skiti, kanon)` układa `tagi` w kolejności kanonu i
  dokleja `kanon.kategorie` do indeksu — UI nie zna słownika z innej strony.
- Prezentacja: `htmlTagow` (pasma: `.tagi-grupa[data-kategoria]` + `.tagi-nazwa`
  + chipy z `.licznik`), `chipyTagow` w karcie (skrót kategorii + `title` z pełną
  nazwą i opisem), `nazwaKategorii` / `skrotKategorii` / `tagiPosortowane` —
  funkcje czyste, badane w Node.

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
  ją najpierw. Udostępnianie widoku: `ui.linkWidoku(baza, cel)` +
  `ui.przyciskKopiowania(cel)`, a `app.js: kopiujLink` ma fallback dla braku
  Clipboard API (`file://`, odmowa uprawnień) — przycisk mówi „zaznacz i skopiuj"
  zamiast milczeć.
- Zakaz dependency runtime; nowe assety zewnętrzne → `docs/ASSETS.md`.
- Kolory wyłącznie przez tokeni CSS z `:root` / `html[data-motyw='jasny']`
  (barvy mapy też) — inaczej drugi motyw będzie nieczytelny (ADR 0010).
- Numeracja sekcji wpisu **jest** ich kolejnością (PROTOKÓŁ §4.1, v1.3;
  układ v1.8): I Wizualizacja → II Charakterystyka i natura → III Dokumentacja →
  IV Trofea → V SKITy → VI Tomy i Epoki → VII Powiązania. Przed v1.3 numer był
  przypisany do treści; v1.8 usunęła sekcję „Rezonans i tożsamość” (ADR 0022);
  przy starych zapisach stosuj mapy z PROTOKÓŁ §4.1.
