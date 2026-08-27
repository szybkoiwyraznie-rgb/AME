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
  map.js                    — render SVG mapy + pinezki + pan/zoom + łuki
  data.js                   — ładowanie indeksu i wpisów, filtrowanie
  ui.js                     — panel wpisu, tagi, powiązania, lista, szukanie
  styles.css                — styl „ciemne archiwum” (bez webfontów)
assets/
  map/countries-50m.json    — Natural Earth jako TopoJSON (vendoring, PD/ISC)
  map/LICENSE.world-atlas   — licencja pakietu world-atlas
  wizualizacje/<slug>.jpg   — wygenerowane obrazy 21:9 (≤ 2 MB)
data/
  manifestations/<slug>.json — pełne wpisy MFM (źródło prawdy treści)
  index.json                — GENEROWANY przez tools/rebuild-index.mjs
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
   TopoJSON, schemat) — brama commitu.
4. Aplikacja: `app.js` pobiera `data/index.json` → rysuje pinezki; kliknięcie
   dociąga `data/manifestations/<slug>.json` do panelu.

## Schemat wpisu (skrót; pełna walidacja w tools/rebuild-index.mjs)

```
slug, nazwa, nazwy_alternatywne[]
karta: { nazwa, wydanie?, rok? }
lokalizacja: { miejscowosc, kraj, lat, lon }        # lat [-90..90], lon [-180..180]
pochodzenie_i_kultura: string
rezonans: { klucz_przywolania: string,
            tabela: [{ element, translacja } ≥ 5 wierszy: Nazwa/Mechanika/Ilustracja/Flavor/Lore ] }
natura: { wyglad_i_aura, charakter_i_motywacje, zdolnosci,
          slabosci_i_metody_pokonania, preferencje }  # polskie teksty
dokumentacja: [{ typ, pozycja }]                     # prawdziwe źródła
wizualizacja: { prompt, obraz? }                     # rama 21:9 walidowana
trofea: { pierwotne, wtorne? }
tagi: []                                             # ^[a-ząćęłńóśźż0-9-]+$
powiazania: [{ slug, opis }]                         # istniejące wpisy, bez self
meta: { utworzono, autor?, modyfikacje: [{data, opis}] }
```

## Mapa (ADR 0003)

- Projekcja walcowa równoodległa; świat w prostokącie W×H = 3600×1800 j.u.
- Widok = transformacja `{x, y, k}` na grupie SVG; zoom do kursora:
  `k' = k·f`, `x' = px − (px − x)·(k/k')` (analogicznie y); pinch = stosunek
  odległości dwóch wskaźników; pinezki kompensują skalę `scale(1/k)`.
- Łuki powiązań: krzywa Q z punktu kontrolnego uniesionego prostopadle nad
  środek segmentu (0.15 długości) — czytelne przy wielu liniach.

## Konwencje kodu

- ES modules, bez zależności; funkcje czyste tam, gdzie się da (`geo.js` w
  całości testowalne w Node).
- Teksty UI po polsku; klasy CSS `kebab-case`; identyfikatory danych
  (slug/tagi) bez spacji i wielkich liter.
- Zakaz dependency runtime; nowe assety zewnętrzne → `docs/ASSETS.md`.
