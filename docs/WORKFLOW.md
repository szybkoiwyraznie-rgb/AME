# WORKFLOW — jak powstaje zmiana w AME

## Cykl sesji agentskiej (szczegóły: AGENTS.md §2, ADR 0004, 0007)

```
start sesji
  → lektura obowiązkowa (AGENTS §0, w całości)
  → npm test && npm run build        # potwierdź zieloność
  → otwórz PR gałęzi sesji + wpisz plan pracy do opisu PR (ADR 0007 A)
  → szczegółowy audyt poprzedniego scalonego PR (ADR 0007 B)
  → zlecenie właściciela (jeśli jest — priorytet) LUB Pętla Jakości:
        C1: pogłębij wpis(y) z researchem www → commit → push
        C2: zaprojektuj/zakoduj/pokaz featurę z testami → commit → push
        (rekurencyjnie do wyczerpania budżetu sesji; ADR 0007 C)
  → handoff (docs/setup/HANDOFF_<data>.md) + blok przekazania w czacie
  → (właściciel scala PR — koniec sesji)
```

Polerowanie/rozbudowa dokumentacji projektowej **nie jest** elementem Pętli
Jakości — wykonuje się ją wyłącznie na wyraźne zlecenie właściciela w sesji.

## Procedura: dodanie manifestacji z karty (krok po kroku)

### 1. Dane wejściowe
Od właściciela: nazwa karty + set (albo sama grafika karty). Ustal set i
numer wydania, które mają być podstawą wpisu (domyślnie wydanie podane przez
właściciela).

### 2. Fetch karty ze Scryfall — OBOWIĄZKOWY (ADR 0008)
- `fetch_page` na `https://scryfall.com/card/<set>/<numer>/<slug-karty>`
  (jeśli set/numer nieznane: najpierw `web_search`, potem fetch).
- Zapisz z tej strony i użyj w wpisie **dokładnie**:
  - koszt many, typ kreatury, P/T,
  - pełny Oracle text zdolności (z reminderem w nawiasie),
  - pełny flavor text (jeśli jest) — dosłownie, w cudzysłowie,
  - artystę, set + numer, rok wydania, ewentualny watermark.
- Zakaz odtwarzania brzmienia karty z pamięci modelu.

### 3. Analiza translacji
Rozbierz kartę na elementy tabeli „Klucz Przywołania” (PROTOKÓŁ §4 I):
Nazwa → etymologia/skojarzenia; Mechanika → zdolności bytu; Ilustracja →
wskazówki kulturowe (opisuj tylko to, co potwierdzisz — nie zgaduj treści
grafiki, której nie widzisz; możesz się oprzeć na typie kreatury,
watermarku, flavorze); Flavor → „dokument terenowy”; Lore/Tło → kontekst
świata karty przełożony na nasz świat.

### 4. Identyfikacja bytu
JEDEN byt, JEDNA kultura, JEDNO miejsce, JEDNA nazwa (PROTOKÓŁ §2).
Byt musi być „grawalny”: da się namierzyć, skonfrontować, pokonać/odprawić.
Współrzędne dziesiętne realnej miejscowości/regionu powstania wierzenia
lub aktywności (dokładność ~0,01° wystarcza).

### 5. Weryfikacja źródłowa w www — OBOWIĄZKOWA (ADR 0008)
- `web_search` + `fetch_page` dla bytu: pochodzenie, wygląd/zachowanie
  w relacjach, obrzędy i metody obronne, miejsce.
- Każda teza faktograficzna wpisu = potwierdzona w co najmniej jednym
  źródle www. Każda pozycja sekcji III (dokumentacja) = istnienie
  autora/tytułu potwierdzone w sieci.
- Detal nie do potwierdzenia → opuszczamy (nie domyślamy się); dziury
  sygnalizujemy w opisie PR jako otwarte pytania.

### 6. Plik wpisu
- `data/manifestations/<slug>.json`, slug = nazwa BYTU (nie karty),
  `^[a-z0-9-]+$`, zgodna z nazwą pliku.
- Schemat pól: `docs/ARCHITECTURE.md`; rygory treści: `docs/PROTOKOL.md`.
- Prompt wizualizacji: **stała rama 21:9** + środek opisujący scenę po
  angielsku (pełne brzmienie ramek: PROTOKÓŁ §5 — walidator sprawdza
  dosłowność); zakaz słów *figurine/diorama/miniature/render/painting/
  illustration*.
- Tagi: małe litery + myślniki; powiązania: `{slug, opis}` tylko do
  istniejących wpisów, `opis` uzasadnia związek merytorycznie (ADR 0006).
- `meta.utworzono` = data w formacie **RRRR-MM-DD**; `autor` = sesja (np. „sesja arena 2026-08-28”).

### 7. Build + testy + commit
```bash
npm run build     # przebuduje data/index.json (wpis + tagi + backlinki)
npm test          # walidacja schematu, rama promptu, spójność indeksu
```
Commit: plik wpisu **i** zbudowany indeks w JEDNYM commicie, komunikat
`manifestacja: dodano <Nazwę> (inspiracja: <Karta>)`.

### 8. Ilustracja (wizualizacja 21:9)
1. Skopiuj prompt z pola `wizualizacja.prompt` (w aplikacji: panel wpisu →
   „Prompt generatora” → kopiuj) — nie modyfikuj ramek.
2. Wygeneruj obraz narzędziem agenta (generate_image) z PEŁNYM promptem.
3. Sprawdź proporcje: docelowo 21:9. Przytnij centralnie (boki albo
   góra/dół) i zapisz jako JPEG ≤ 2 MB:
   ```bash
   python3 - <<'EOF'   # wymaga: pip install --break-system-packages pillow
   from pathlib import Path
   from PIL import Image
   p = Path('assets/wizualizacje/<slug>.jpg')
   im = Image.open(p).convert('RGB'); w,h = im.size; d = 21/9
   if abs(w/h-d) > 0.02:
       if w/h > d: nw=int(h*d); x0=(w-nw)//2; im=im.crop((x0,0,x0+nw,h))
       else:       nh=int(w/d); y0=(h-nh)//3; im=im.crop((0,y0,w,y0+nh))
   if max(im.size) > 2100:
       s=2100/max(im.size); im=im.resize((int(im.size[0]*s),int(im.size[1]*s)),Image.LANCZOS)
   for q in (84,78,72,66):
       im.save(p,'JPEG',quality=q,optimize=True)
       if p.stat().st_size <= 2_000_000: break
   EOF
   ```
4. Wpis: `"wizualizacja": { "obraz": "assets/wizualizacje/<slug>.jpg", ... }`,
   potem `npm run build && npm test`, commit `wizualizacja: <slug>`.

### 9. Podłączenie do mapy i aplikacji
Dzieje się **automatycznie przez indeks** (ADR 0002): po buildzie i commicie
aplikacja pokazuje pinezkę ze współrzędnych wpisu, wpis otwiera się po
kliknięciu pinezki i pod adresem `index.html#<slug>` (deep-link). Weryfikacja
w podglądzie:
```bash
python3 -m http.server 8000 --bind 0.0.0.0   # http://localhost:8000/#<slug>
```
Sprawdź: pinezka na mapie, panel wpisu (sekcje I–V), tag klikalny,
powiązanie/backlink, ilustracja.

### 10. Rozbudowa istniejącego wpisu (np. Pętla Jakości C1)
Research www → dopisz/poszerz sekcje (II, III), nowe tagi/powiązania,
każdą zmianę opisz w `meta.modyfikacje: [{data, opis}]` → build → testy →
commit `manifestacja: pogłębiono <slug> (research: <temat>)`.

## Zasady commitów

- Jeden samodzielnie zielony krok = jeden commit (`npm test` + `npm run build`
  przechodzą PO KAŻDYM commicie, nie tylko na końcu).
- Komunikaty po polsku, konwencja `obszar: opis`; obszary: `manifestacja:`,
  `wizualizacja:`, `aplikacja:`, `dane:`, `narzędzia:`, `dokumenty:`,
  `ci:`, `zasady:`.
- Push po każdym commicie; przed pushem `git log --oneline -3` + `git status`
  (rygory ADR 0004: bez force push, przyrostowo).

## Uruchomienie lokalne

```bash
npm test                                      # testy + walidacja danych
npm run build                                 # przebudowa data/index.json
python3 -m http.server 8000 --bind 0.0.0.0    # http://localhost:8000
```

`file://` pokaże baner z instrukcją — `fetch()` nie działa pod `file://`
(ADR 0001); to ograniczenie przeglądarki, nie błąd aplikacji.

## CI i GitHub Pages (status: AKTYWNE)

- **CI**: `.github/workflows/ci.yml` na `main` (dodane przez właściciela
  2026-08-28; historycznie przepis w `docs/setup/ci-workflow.yml`). Na każdym
  PR i pushu do `main`: `npm test` + `npm run build` + kontrola, że
  `data/index.json` jest zcommitowany zgodny z wpisami.
- **Pages**: `https://szybkoiwyraznie-rgb.github.io/AME/` — Deploy from
  branch: `main`, folder `/ (root)`. Zmiany trafiają na live po scaleniu PR.
