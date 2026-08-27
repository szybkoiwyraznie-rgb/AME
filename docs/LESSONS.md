# LESSONS — rejestr lekcji

Format: `## LN (data) — tytuł`, objaw → przyczyna → reguła. Czytasz CAŁY
rejestr na start sesji (`AGENTS.md` §0). Nowe lekcje dopisuj na końcu.

## L1 (2026-08-27, dziedziczone z mtg) — sandbox resetuje workspace w trakcie sesji

**Objaw:** commity sesji „znikają”, HEAD wskazuje `main`, push odrzucony.
**Przyczyna:** środowisko odtwarza workspace ze świeżego klona.
**Reguła:** praca istnieje dopiero po `git push`; po resecie postępuj wg
`docs/setup/ENVIRONMENT.md` §2 (fetch gałęzi sesji + `reset --hard FETCH_HEAD`).

## L2 (2026-08-27, dziedziczone z mtg) — edycja plików z polskimi znakami

**Objaw:** po edycji w pliku pojawia się mojibake (np. `Ä…` zamiast `ą`).
**Przyczyna:** narzędzie `edit_file` potrafi uszkodzić UTF-8.
**Reguła:** nowe pliki twórz `write_file`; istniejące pliki z polskim tekstem
edytuj przez `python3` + `pathlib` z `encoding='utf-8'`; po edycji sprawdzaj
`git diff`.

## L3 (2026-08-27, zmierzone w AME) — egress HTTPS zablokowany, npm działa

**Objaw:** `curl https://raw.githubusercontent.com/...` → kod 000/SSL_ERROR.
**Przyczyna:** sandbox przepuszcza tylko wybrane hosty (api.github.com,
registry.npmjs.org).
**Reguła:** danych z sieci nie pobieraj curl/fetch w sandboxie — użyj
narzędzi agenta (`fetch_page`, `web_search`, `image_search`); pakiety npm
instalują się normalnie.

## L4 (2026-08-27, AME) — ręcznie zbudowany indeks = niespójna aplikacja

**Objaw:** pinezka/odnośnik wskazuje wpis, który nie istnieje (lub odwrotnie:
wpis jest w repo, a mapa go nie pokazuje).
**Przyczyna:** ktoś edytował `data/index.json` ręcznie albo zapomniał
`npm run build` po dodaniu wpisu.
**Reguła:** `data/index.json` jest wyłącznie generowany; po każdej zmianie
w `data/manifestations/` uruchom build i wcommituj indeks razem z wpisem
(walidator i tak przerwie testy przy niespójności).
