# WORKFLOW — jak powstaje zmiana w AME

## Cykl sesji agentskiej (szczegóły: AGENTS.md §2, ADR 0004, 0007)

```
start sesji
  → lektura obowiązkowa (AGENTS §0, w całości)
  → npm test && npm run build        # potwierdź zieloność
  → gh run list --repo <owner>/<repo> # czy CI faktycznie uruchamia jobs (L9)
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
- Spisz **adres** każdego wykorzystanego źródła (do niego, do opisu u wydawcy
  lub w bibliotece cyfrowej, albo do wzmianki potwierdzającej istnienie) —
  trafia do `dokumentacja[].url` (PROTOKÓŁ §4.3 III; bez co najmniej jednego
  adresu walidator nie przepuści wpisu).
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
- Tagi: wyłącznie z kanonu (`data/kanon-tagow.json`) — `kultura` (1), `typ` (1),
  `motyw` (1–2), `postac` (0–1); nowy tag dopisuje się do kanonu w tym samym
  commicie, z opisem będącym zdaniem (PROTOKÓŁ §6.1, ADR 0016). Kraj nie jest tagiem.
- Powiązania: `{slug, opis}` tylko do istniejących wpisów; `opis` uzasadnia
  związek merytorycznie **zdaniem — min. 12 słów, nie sam link** (ADR 0006, ADR 0019).
- Dokumentacja: `{ typ, pozycja, url }`, `url` = pełny `http(s)`; co najmniej
  jedno źródło w wpisie musi mieć adres (ADR 0011).
- Kolejność kluczy w pliku = numeracja sekcji: `wizualizacja` (I), `natura` (II),
  `dokumentacja` (III), `trofea` (IV), `rezonans` (V) — PROTOKÓŁ §4.1/§4.4.
- `meta.utworzono` = data w formacie **RRRR-MM-DD** (zalecane z godziną: **RRRR-MM-DD GG:MM**, ADR 0017); `autor` = sesja (np. „sesja arena 2026-08-28”).

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
Sprawdź:
- pinezka na mapie — klikalna (pole trafienia), badge nazwy czytelny,
  mapa w uczciwych proporcjach przy szerokości i wysokości okna (ADR 0009);
- kartoteka jako pełnoekranowa warstwa (B2/ADR 0010), sekcje w kolejności
  I → II → III → IV → V (→ VI SKITy), obraz na całą szerokość opisu;
- Dokumentacja: adresy klikalne i prowadzące donikąd tylko tam, gdzie ich nie
  potwierdzono (a potwierdzać trzeba — ADR 0008);
- tag klikalny (pasek w pasmach kategorii, licznik, opis w `title`),
  powiązanie/backlink, łuki powiązań; filtr po tagu pokazuje kategorię w statusie;
- przełącznik motywu: jasny i ciemny bez utraty czytelności mapy i tekstu;
- sekcja VI: skity bytu linkują do Bazy Skitów, `#skit:<slug>` otwiera tekst;
  „✚ nowości" pokazuje zmiany z dzisiejszego commita na górze;
- `Esc` i `✕` zamykają warstwę, fokus wraca na pinezkę/listę.

### 10. Rozbudowa istniejącego wpisu (np. Pętla Jakości C1)
Research www → dopisz/poszerz sekcje (II, III), nowe tagi/powiązania,
każdą zmianę opisz w `meta.modyfikacje: [{data, opis}]` → build → testy →
commit `manifestacja: pogłębiono <slug> (research: <temat>)`.

`opis` modyfikacji czyta właściciel w feedzie „Co nowego", więc: jedno zdanie o
tym, co zmieniło się **w treści** — bez oznaczeń wewnętrznych sesji (`M3`, `B1`,
`C1`) i bez nazw plików. Zmiany techniczne (kod, narzędzia, zasady) idą do
`docs/PROJECT_HISTORY.md` i opisu PR, nie do dziennika archiwum. Nie próbuj
mieścić opisu w stopce karty: wyświetla ona wyłącznie daty.

## Procedura: dopisanie SKITa (C3, PROTOKÓŁ §8)

1. **Skład.** Wypisz dotychczasowe zestawy uczestników (patrz
   `data/index.json` → `skity[].uczestnicy` (ewentualnie `grep '"slug"' data/skity/*.json`)
   i wybierz materializacje, których zestaw **jeszcze nie istniał** (walidator
   odrzuci powtórkę). **Domyślnie 3–4 uczestników** (preferowane, ADR 0019) —
   duet tylko, gdy temat naprawdę go wymaga; `npm run build` przypomni o tym
   podpowiedzią, gdy duetów w bazie jest za dużo.
2. **Materiał.** Przeczytaj sekcje II/III/V kart uczestników; zwyczaje,
   przedmioty i miejsca, które mają wypowiedzieć, muszą się z nimi zgadzać
   (ADR 0008). Nowy fakt w dialogu = fakt do sprawdzenia w sieci.
3. **Pisanie.** Nagłówek to `tytul` (wersaliki w renderze), pod nim uczestnicy,
   dalej czysty dialog: `**Imię:** [didaskalia] wypowiedź`, akapity po
   pustej linii. Zero żargonu gry, zero narracji autorskiej. Mieść się w
   60–300 słów (limit protokołu v1.4, ADR 0015).
4. **Plik.** `data/skity/<slug>.json` (slug = `^[a-z0-9-]+$`, zgodny z nazwą
   pliku), `meta.utworzono` = dzisiejsza data.
5. **Build i testy.** `npm run build && npm test` — walidator sprawdza limity,
   głos każdej postaci, istnienie uczestników i unikalność składów; indeks
   sam dopisze sekcję VI w kartach i pozycję w feedzie.
6. **Commit.** `skity: dodano „<TYTUŁ>” (<byt(a)>)`, indeks w tym samym commicie.

### Rygor: każda zmiana treści trafia do dziennika (ADR 0014)

Sekcja „Co nowego" jest wyliczana z `meta`: `utworzono` = „dodano",
wpis w `modyfikacje` = „zmieniono". Zmiana bez opisu w `meta.modyfikacje`
jest dla właściciela niewidoczna, więc: przy każdej edycji wpisu lub skitu
dopisuj `{data: <dzisiejsza data>, opis: <co i po co>}`.

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

## CI i GitHub Pages

- **GitHub Pages: aktywne** — `https://szybkoiwyraznie-rgb.github.io/AME/` (deploy z
  `main`, workflow `pages-build-deployment`; jego check-runs `build`/`deploy`/
  `report-build-status` są zielone i nie zależą od pliku CI).
- **Brama CI: AKTYWNA.** `.github/workflows/ci.yml` na `main` został naprawiony przez
  właściciela w PR #3 (2026-08-28) — wcześniej plik zaczynał się od bloku `<!-- … -->`
  przeniesionego z przepisu F0 i GitHub nie parsował YAML-a (runy `failure` w 0 s bez
  jobs; patrz L9 i wpis M3 w `docs/PROJECT_HISTORY.md`). Od PR #3 CI biega na każdym
  PR i na pushu do `main`: `npm test` → `npm run build` → `npm run check` +
  `git diff --exit-code data/index.json`.
- **Lustro w repo:** `docs/setup/ci-workflow.yml` trzyma tę samą treść; test
  `receptura CI jest zgodna z plikiem workflow` pilnuje, żeby nie rozjechało się
  z `.github/workflows/ci.yml` w drzewie.
- **Nienaruszalna reguła (L12):** agent nie zmienia plików w `.github/workflows/`
  (push i `gh api` → 403 `workflows`) i nie prosi właściciela o ich zmianę. Jeśli
  CI zacznie znów milczeć, sesja **opisuje** fakt w audycie/`PROJECT_HISTORY`
  i nie buduje na tym kolejki zadań dla właściciela.
- **Bramą sesji i tak są testy lokalne:** `npm test` + `npm run build` + `npm run
  check` przed każdym commitem (AGENTS §2) — CI jest siecią bezpieczeństwa, nie
  zastępcą sumienności.
