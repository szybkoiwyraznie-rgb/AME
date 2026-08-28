# Środowisko sesji agentskiej — ograniczenia i pułapki (dokument trwały)

> **To NIE jest handoff.** Handoff opisuje jedną sesję i traci aktualność; ten
> plik zbiera **stałe właściwości środowiska**, które dotyczą każdej sesji.
> Dziedziczy doświadczenia projektu `mtg` (github.com/jurekjurekgh/mtg),
> zweryfikowane też w sandboxie AME (2026-08-27).

Powiązania: [ADR 0004](../decisions/0004-model-sesji-pr-audyt-inkrementalne-commity.md)
(model sesji), [docs/LESSONS.md](../LESSONS.md).

## 1. Izolacja sesji — co NAPRAWDĘ przetrwa do następnej sesji

Nowa sesja startuje z czystego klona i ma dostęp wyłącznie do:

1. **gałęzi `main` na GitHubie** (stan po scaleniu PR poprzedniej sesji),
2. **tekstu pierwszego promptu**.

**Nie przetrwa NIC innego** — pliki lokalne, `/tmp`, historia czatu, zmienne
środowiskowe, zainstalowane zależności, niewypchnięte commity. Konsekwencje:

- **Praca istnieje dopiero po `git push`.** Commituj i pushuj po każdym
  samodzielnie zielonym kroku.
- Wszystko, co ma przetrwać, zapisz w repozytorium (kod, testy, ADR, lekcje,
  handoff). Blok przekazania w czacie jest kopią wiedzy z repo, nie nośnikiem.

## 2. Sandbox potrafi zresetować workspace w trakcie sesji

**Objaw:** lokalny `HEAD` nagle wskazuje `main`, commity sesji „znikają”,
`git push` odrzuca (*non-fast-forward*). W `git reflog` widać świeży wpis
`clone: from …`.

**To nie jest utrata pracy — o ile commity były wypchnięte.** Procedura
odzyskania:

```bash
git reflog -10                                  # potwierdź reset
git ls-remote --heads origin                    # praca jest na zdalnej gałęzi?
git fetch origin <gałąź-sesji>
git reset --hard FETCH_HEAD                     # odtwórz historię sesji lokalnie
```

Jeśli po resecie zdarzyło Ci się zacommitować na `main`, przenieś commit:
`git branch backup-<opis> <sha>` → `git reset --hard FETCH_HEAD` →
`git cherry-pick <sha>`.

**Profilaktyka:** po każdym commicie `git log --oneline -1` + `git status`;
pushuj od razu; przed długimi operacjami upewnij się, że praca jest wypchnięta.

## 3. Git i GitHub

- **`gh` i `git push` działają z tokenem arena-ai-coding-agent[bot].**
  Token potrafi wygasnąć w trakcie sesji (objaw: push prosi o hasło).
  Commity lokalne są bezpieczne — poproś właściciela o reconnect GitHub
  w Arenie i ponów push. **Nigdy nie proś o token w czacie.**
- **`gh pr edit` bywa odrzucane** błędem GraphQL; obejście:
  `gh api -X PATCH repos/<owner>/<repo>/pulls/<nr> -f title=… -F body=@plik`.
- **Komunikaty commitów pisz do pliku poza repozytorium**
  (np. `/home/user/msg.txt`), nigdy w katalogu repo.
- Pracuj wyłącznie na gałęzi sesji; nigdy nie pushuj do `main`; nigdy
  `--force` (ADR 0004).
- **CI: działa od PR #3 (2026-08-28), ale i tak nie jest nasza sprawa.**
  `.github/workflows/ci.yml` na `main` był martwy (komentarz HTML z przepisu F0 →
  YAML się nie parsował, runy `failure` w 0 s bez jobs — L9); właściciel naprawił go
  jednorazowo w PR #3 i od tej pory brama biega na PR-ach i na `main`. Reguła
  pozostaje: agent nie pisze do `.github/workflows/` (push i `gh api` → 403
  `workflows`) i nie prosi o zmiany; lustro receptury leży w
  `docs/setup/ci-workflow.yml`, a jego zgodność z plikiem w drzewie pilnuje test
  w `test/dane.test.js`. Stan bramy sprawdzamy (`gh run list`) po to, żeby go
  **opisać**, nie żeby komuś coś zlecać (L12).
- **`git checkout <plik>` cofa niezacommitowane zmiany w tym pliku** —
  zacommituj pracę przed takimi operacjami.

## 4. Sieć i narzędzia

- **Swobodny egress HTTPS jest zablokowany** (curl do losowych hostów → kod
  000). Działa: `api.github.com`, rejestr npm. Zmierzone 2026-08-27.
- Zatem: pakiety npm instalują się normalnie; dane z sieci (karty MtG,
  źródła) pozyskuj narzędziami agenta (`fetch_page`, `web_search`,
  `image_search`), a nie `curl`/`fetch` w sandboxie.
- Aplikacja AME jest samowystarczalna (ADR 0003) — nie potrzebuje sieci
  w przeglądarce.
- **`write_file` działa tylko w workspace.** Skrypty pomocnicze poza repo
  twórz przez `bash` + heredok.
- **Polskie znaki:** narzędzie `edit_file` potrafi je uszkodzić. Nowe pliki
  twórz `write_file`; istniejące pliki z polskim tekstem edytuj przez
  `python3` + `pathlib` z `encoding='utf-8'`. Po każdej edycji sprawdź
  `git diff` pod kątem mojibake.
- Testy logiki uruchamisz bez przeglądarki (`node --test test/`);
  do „na żywo” użyj serwera statycznego na `0.0.0.0`
  (`python3 -m http.server 8000 --bind 0.0.0.0`).

### 4.1 Przeglądarka do weryfikacji wizualnej (headless Chromium z npm)

Swobodny egress jest zablokowany, więc `npx puppeteer browsers install chrome`
kończy się błędem (Chrome pobiera się z hostów Google, nie z rejestru npm).
Binarkę da się jednak zdobyć **z paczki npm** — `@sparticuz/chromium` niesie
w tarballi skompresowany Chromium i potrzebne biblioteki (zestaw pod Amazon
Linux 2023). Sprawdzone 2026-08-28 (Chromium 149, node 22):

```bash
mkdir -p /home/user/.narzedzia && cd /home/user/.narzedzia   # poza repozytorium!
npm i puppeteer @sparticuz/chromium pngjs
node -e "const fs=require('fs'),z=require('zlib');\
  fs.writeFileSync('chromium', z.brotliDecompressSync(\
    fs.readFileSync('node_modules/@sparticuz/chromium/bin/chromium.br')));\
  fs.chmodSync('chromium',0o755);\
  fs.writeFileSync('al2023.tar', z.brotliDecompressSync(\
    fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));"
mkdir -p libs && tar -xf al2023.tar -C libs          # biblioteki idą do libs/lib
LD_LIBRARY_PATH=$PWD/libs/lib ./chromium --version   # → Chromium 149…
```

Potem `puppeteer.launch({ executablePath: process.env.CHROME_PATH, args:
['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
'--disable-dev-shm-usage'] })` i weryfikacja na żywo: `getBoundingClientRect`,
`getComputedStyle().display`, `elementFromPoint`, zrzut ekranu. Uwagi:

- **Nie instaluj tego w repozytorium** — `/home/user/.narzedzia` jest poza
  drzewem, więc `package.json` projektu zostaje bez zależności (ADR 0001).
- Katalogi `node_modules` i `.cache` nie wchodzą do snapshotu workspace'u; po
  resecie sandboxa przepis trzeba powtórzyć (kilkanaście sekund).
- Zrzutów PNG agent nie „widzi” — analizuj piksele programowo (`pngjs`:
  histogram kolorów, udział barwy lądu i oceanu) zamiast wpatrywać się w obraz.
- W headless domyślny jest **jasny** motyw (`prefers-color-scheme`), a nie
  ciemny — przy pomiarach kolorów mapy przełącz motyw albo uwzględnij to.

## 5. Czas wykonania (orientacyjnie)

| Operacja | Czas | Uwagi |
|---|---|---|
| `npm test` | < 10 s | node --test + walidacja danych |
| `npm run build` | < 2 s | przebudowa `data/index.json` |
| generowanie 1 wizualizacji (narzędzie agenta) | ~0,5–1 min | JPEG 21:9, potem ew. rekompresja |

## 6. Checklista startu sesji

1. `git log --oneline -3` i `git status` — gdzie jestem, czy czysto.
2. Lektura obowiązkowa wg `AGENTS.md` §0 (całe pliki).
3. `npm test` i `npm run build` — potwierdź zieloność przed zmianami (to jest
   TWOJA brama); `gh run list` — czy CI na `main` biega (powinno, od PR #3), i to
   tylko po to, by znać stan, nie by o cokolwiek prosić (L12).
4. Otwórz PR gałęzi sesji (ADR 0004), zanim zaczniesz kodować.
5. Audyt poprzedniego scalonego PR przed nową pracą.
6. Nie pytaj „co robimy?” — brak zlecenia po audycie = **Pętla Jakości**
   (ADR 0007: C1 treść ↔ C2 featury, rekurencyjnie do wyczerpania budżetu).
7. Nowe karty/wpisy tylko z obowiązkową weryfikacją zewnętrzną (ADR 0008):
   Scryfall dla kart, źródła www dla manifestacji — nigdy z pamięci.

## 7. Checklista przed końcem sesji

1. `npm test` i `npm run build` zielone.
2. Wszystko zacommitowane **i wypchnięte** (`git status` czysty).
3. Najnowszy `docs/setup/HANDOFF_<data>.md` opisuje aktualny stan.
4. Reguły trwałe trafiły do ADR / PROTOKOŁU / `AGENTS.md` / `docs/LESSONS.md`,
   a nie tylko do handoffu.
5. Opis PR zaktualizowany kumulatywnie (w tym wynik audytu).
6. W czacie wypisany blok przekazania projektu dla następnego agenta.
