# WORKFLOW — jak powstaje zmiana w AME

## Cykl sesji agentskiej (szczegóły: AGENTS.md §2, ADR 0004)

```
start sesji
  → lektura obowiązkowa (AGENTS §0)
  → npm test && npm run build        # potwierdź zieloność
  → otwórz PR gałęzi sesji
  → audyt poprzedniego scalonego PR
  → praca w pętli:
        zmiana → npm test → npm run build → commit → push
  → handoff (docs/setup/HANDOFF_<data>.md) + blok przekazania w czacie
  → (właściciel scala PR — koniec sesji)
```

## Dodanie / rozbudowa wpisu manifestacji

1. Dane wejściowe od właściciela: karta MtG (nazwa+set albo grafika).
2. Analiza translacji (nazwa, mechanika, ilustracja, flavor, lore) — materiał
   do „Klucza Przywołania”. Zweryfikuj szczegóły karty (np. Scryfall przez
   `web_search`/`fetch_page`) — nie zgaduj statystyk ani cytatów.
3. Identyfikacja bytu: JEDNA tradycja, JEDNO miejsce; współrzędne prawdziwe
   (miejscowość/region powstania wierzenia lub aktywności).
4. Napisz `data/manifestations/<slug>.json` wg schematu i PROTOKOŁU:
   - sekcje I–V kompletne; źródła prawdziwe;
   - prompt wizualizacji: stała rama 21:9 + środek opisujący scenę;
   - tagi znormalizowane; powiązania z uzasadnieniem (lub nowy wpis bez
     powiązań — sieć dorabia się z czasem).
5. `npm run build` (przebuduje `data/index.json`) → `npm test`.
6. Commit: wpis + indeks w jednym commicie; komunikat np.
   `manifestacja: dodano Zmorę (inspiracja: Nightmare)`.
7. (Opcjonalnie, jeśli w zakresie sesji) odtworzenie wizualizacji narzędziem
   generate_image z promptu wpisu → `assets/wizualizacje/<slug>.jpg` (≤ 2 MB),
   pole `wizualizacja.obraz`, osobny commit `wizualizacja: <slug>`.

## Zasady commitów

- Jeden samodzielnie zielony krok = jeden commit (testy+build przechodzą
  PO KAŻDYM commicie, nie tylko na końcu).
- Komunikaty po polsku, konwencja `obszar: opis` — obszary: `manifestacja:`,
  `wizualizacja:`, `aplikacja:`, `dane:`, `narzędzia:`, `dokumenty:`,
  `ci:`, `zasady:`.
- Push po każdym commicie; przed pushem `git log --oneline -3` + `git status`.

## Uruchomienie lokalne

```bash
npm test            # testy + walidacja danych (brama commitu)
npm run build       # przebudowa data/index.json
python3 -m http.server 8000 --bind 0.0.0.0   # potem: http://localhost:8000
```

Otwarcie `index.html` bezpośrednio z dysku (`file://`) wyświetli baner
z instrukcją — `fetch()` nie działa pod `file://` (ADR 0001).

## GitHub Pages (jednorazowa konfiguracja właściciela)

Settings → Pages → Source: *Deploy from a branch* → branch: `main`,
folder: `/ (root)`. Strona: `https://<owner>.github.io/AME/`.
CI (.github/workflows/ci.yml) uruchamia `npm test` na każdym PR.
