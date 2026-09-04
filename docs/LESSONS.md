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

## L5 (2026-08-28) — po odzyskaniu workspace z gałęzi zdalnej znika upstream

**Objaw:** `git push` kończy się podpowiedzią `git push --set-upstream origin <gałąź>`,
a `git log origin/<gałąź>` mówi „unknown revision”.
**Przyczyna:** odzyskiwanie po resecie workspace (ENVIRONMENT §2) przez
`git fetch origin <gałąź>` + `git reset --hard FETCH_HEAD` nie odtwarza
konfiguracji upstream ani remote-tracking refa (klon mógł być single-branch).
**Reguła:** po każdym odzyskaniu workspace pierwszy push wykonuj z `-u`:
`git push -u origin <gałąź>`; stan zdalny sprawdzaj przez
`git ls-remote origin <gałąź>`, nie przez ref tracking.

## L6 (2026-08-28) — reset sandboxa ściera pakiety systemowe; commit może „skłamać”

**Objaw:** skrypt w commicie opisany jako wykonany (np. kadrowanie obrazów),
a faktycznie nie działał — `ModuleNotFoundError: PIL` w stderr, którego nie
zauważono, bo dalsze kroki łańcucha i tak wypchnęły commit.
**Przyczyna:** świeży klon/restart środowiska usuwa pakiety zainstalowane
przez `pip install` w poprzedniej turze; heredok z pythonem pada PO tym,
jak reszta polecenia (`&&`) już nie nadąża — a `git commit` wykonany osobno
po cichu trafia niezaktualizowane pliki.
**Reguła:** każdy skrypt obróbki plików uruchamiaj jako SAMODZIELNE polecenie
i czytaj jego STDERR; przed commitem zweryfikuj efekt (np. wymiary obrazu,
pole `obraz` w JSON); komunikat commita opisuje stan PO weryfikacji, nie
zamiar.

## L7 (2026-08-28, AME) — geometria przez antypołudnik: cięciwa zamiast lądu

**Objaw:** Rosja „rozlewa się” na dwa poziome pasy idące przez całą szerokość
mapy, a na wysokości Madagaskaru widać nienaturalnie gruby równoleżnik.
**Przyczyna:** Natural Earth zapisuje pierścienie przekraczające ±180° z
przeskokiem ~360° między kolejnymi punktami (w `countries-50m.json`: Rosja
pierścień 17 — skoki 359,87° i 359,93°; Fidżi — 10-punktowy pierścień na
-16,45°, czyli owy „gruby równoleżnik”; Antarktyda — kontur rozcięty na szwie).
Linearna projekcja walcowa łączy takie punkty odcinkiem przez cały świat.
**Reguła:** każdą geometrię kulistą wchodzącą do projekcji płaskiej tnij na
szwie (`potnijPierscien` w `app/geo.js`, ADR 0009), a nie maskuj w CSS
(`clip-path`). Niezmienniki trzymaj w testach na prawdziwym pliku: brak punków
poza prostokątem świata i brak odcinka dłuższego niż połowa szerokości mapy
(poza leżącymi na ramach).

## L8 (2026-08-28, AME) — jednostki w SVG: px w grupie skalowanej to nie px na ekranie

**Objaw:** etykieta pinezki `font-size: 15px` była nieczytelna (~6 px), siatka
grubiała przy zbliżeniu, w pinezkę nie dało się trafić kursorem.
**Przyczyna:** rozmiary podano w jednostkach świata (viewBox 3600×1800), a
viewBox był skalowany do okna (~0,42 px/j.u.), więc wszystko wewnątrz było
~2,4× mniejsze niż wskazuje zapis; brak było też obszaru trafienia i
`vector-effect: non-scaling-stroke` dla linii.
**Reguła:** rozstrzygaj jednostki u źródła — model widoku z ADR 0009 (viewBox =
piksele kontenera, elementy interfejsu mapy w px CSS przez kompensację skali).
„Powiększyć fontem” nie wolno: to mnożnik korygujący błąd, a nie decyzja.

## L9 (2026-08-28, AME) — przepis CI wklejony z komentarzem HTML: brama milczała

**Objaw:** lokalne `npm test` zielone, a wszystkie runy Actions
(`33148046060`, `33150562702`, `33155771652`) to `failure` w 0 s, zero jobs,
brak logów.
**Przyczyna:** `.github/workflows/ci.yml` na `main` zaczyna się od bloku
`<!-- … -->` przeniesionego razem z przepisu `docs/setup/ci-workflow.yml`; to nie
jest komentarz YAML, więc workflow się nie parsuje i NIE uruchamia żadnego kroku
(w tym kontroli aktualności `data/index.json`).
**Reguła:** audyt poprzedniego PR (ADR 0004 pkt 2) sprawdza, **czy brama
działa**, a nie tylko czy diff jest sensowny: `gh workflow list` i
`gh run list` na dowód, że jobs istnieją. Przepisy plików konfiguracyjnych
przechowujemy w wersji gotowej do wklejenia — komentarze w składni docelowej
(`#` w YAML), bez opakowywania w znaczniki innego języka. Stwierdzenie „brama nie
działa” jest **opisem stanu**, nie poleceniem dla właściciela — dalsze kroki
reguluje L12.

## L10 (2026-08-28, AME) — delegacja klików: najbliższy traf, nie kolejność atrybutów

**Objaw:** klik w „uczestnika" w widoku SKITa nie otwierał karty bytu — otwierał
ten sam skit od nowa.
**Przyczyna:** handler warstwy sprawdzał `closest('[data-skit]')` przed
`closest('[data-slug]')`, a chip uczestnika siedzi w `<article data-skit=…>`:
starszy selector zgaduje kontekst i podnosi rodzica nad dziecko.
**Reguła:** w kontenerach zagnieżdżonych (warstwa nad kartoteką, sekcje w
`<article>`) deleguj przez JEDEN `closest('[data-a], [data-b], [data-c]')` z
atrybutami ułożonymi wg priorytetu i decyduj po `hasAttribute()`. Testy
jednostkowe tego nie łapią — sprawdź przepływ na żywo albo w smoke-na-atrapie
DOM.

## L11 (2026-08-28, AME) — dziennik o dokładności dziennej potrzebuje sekwencji zdarzeń

**Objaw:** w „Co nowego" najnowsze pozycje leżały na dole, mimo że sortowanie
było „datą malejąco".
**Przyczyna:** drugi klucz sortowania był **rangą typu akcji** (dodano przed
zmieniono), a nie chronologią. Ponieważ `meta` nosi tylko datę (RRRR-MM-DD),
utworzenia kart z porannej sesji i zmiany z popołudniowej mają tę samą datę —
ranga wyciągnęła więc najstarsze zdarzenia na górę.
**Reguła:** agregując `meta` do strumienia zmian, nadaj pozycji `sekwencja` w
obrzębie pliku (0 = `utworzono`, k+1 = k-ty wpis `modyfikacje`, bo ta tablica
jest dopisywana chronologicznie) i sortuj `data desc → sekwencja desc → typ →
slug`. Klucz sortujący usuń przed zapisem indeksu, żeby nie generował szumu w
diffach (PROTOKÓŁ §9, ADR 0014).

## L12 (2026-08-28, AME) — audyt nie może produkować próśb do właściciela o czynności jednorazowe

**Objaw:** sesja zgłosiła w audycie i w liście „otwarte”, że `.github/workflows/ci.yml`
na `main` się nie parsuje, i poprosiła właściciela o naprawę. Właściciel słusznie
zauważył: ten plik wkleił **raz** (2026-08-27, zgodnie z procedurą F0) i nie zamierza
do niego wracać — a awarię zawinił przepis w repo (blok `<!-- -->` zamiast komentarza
YAML), czyli strona agentów.
**Przyczyna:** potraktowanie faktu środowiskowego jako zadania właściciela. Do tego
agent fizycznie nie może tego naprawić: GitHub odrzuca każdy zapis do
`.github/workflows/**` bez uprawnienia `workflows` (push → `remote rejected`,
`gh api …/contents/` → 403). Próba „wrzucę naprawkę do PR-a” też jest z góry skazana.
**Reguła:** audyt opisuje stan, nie rozdziela pracy. Jeśli naprawa leży poza
uprawnieniami agenta i poza jego zakresem — **zapisz to jako znany, zamknięty fakt**
(w `docs/WORKFLOW.md`, `ENVIRONMENT`), ewentualnie zostaw gotową treść w repo do
skopiowania, ale nie odnawiaj żądania w PR-ach, handoffach i listach „otwarte”.
Bramą jakości pozostają lokalne `npm test` + `npm run build` + `npm run check`.

## L13 (2026-08-28, AME) — kolizja nazwy klasy: reguła CSS strony gasi SVG mapy

**Objaw:** mapa nie rysuje się w ogóle — widać wyłącznie tło oceanu; `npm test`
108/108 zielone, w konsoli ani jednego błędu, 241 ścieżek krajów w drzewie,
`getBBox()` grupy świata poprawne (0, 0, 3600, 1800), ale
`getBoundingClientRect()` tej samej grupy = 0, 0, 0, 0.
**Przyczyna:** `app/map.js` nadawał grupie świata `class: 'warstwa'`, a
`.warstwa { … display: none }` w `app/styles.css` to pełnoekranowa nakładka UI
(ADR 0010), domyślnie ukryta — cała zawartość mapy dziedziczyła `display: none`.
`getComputedStyle(g).display` rozstrzyga sprawę w jednym odczycie. Testy
milczały, bo atrapa DOM (`test/pinezka.test.js`) nie liczy kaskady CSS, a
niezmienniki `test/geo.test.js` patrzą na geometrię, nie na render.
**Reguła:** (1) Klasy wewnątrz SVG mapy mają nazwy własne i nie pożycza się ich
z warstwy UI strony — takiej kolizji nie widać w testach jednostkowych, widać
ją dopiero u właściciela. (2) Kontrakt między arkuszem a klasami renderu mapy
pilnuje `test/mapa-css.test.js`. (3) Gdy „element nie rysuje się”, mierz
w przeglądarce trzy rzeczy naraz: `getBoundingClientRect`,
`getComputedStyle().display` i `elementFromPoint(środek)` — rozjazd między nimi
wskazuje warstwę, na której zgasła treść (tu: kaskada CSS, nie geometria).

## L14 (2026-08-28, AME) — wersja standardu rozjeżdża się między nośnikami

**Objaw:** po podniesieniu protokołu do v1.4 (ADR 0015) stopka aplikacji nadal
głosiła „protokół MFM v1.3”, a tabela dokumentów w README — v1.2.
**Przyczyna:** ADR zmienił liczbę w `docs/PROTOKOL.md` i w instrukcjach, ale
nikt nie zaktualizował dwóch miejsc, w których wersję widzi czytelnik, nie
agent: stopki `index.html` i opisu repozytorium.
**Reguła:** numer wersji protokołu jest **wyprowadzany** ze statusu w
`docs/PROTOKOL.md`, a nie wpisywany ręcznie — kontrakt w `test/ui.test.js`
porównuje status ze stopką aplikacji i z README i odrzuca cytowanie starszej
wersji (ta sama zasada co limit SKITa w `test/skit.test.js`).

## L15 (2026-08-28, AME) — pola trafień pinezek nachodzą na siebie: kursor nad pinezką to nie pinezka, którą liczyłeś

**Objaw:** weryfikacja headless M6: kursor poszedł na środek głowy balor (Irlandia),
a `pointerenter` dostała selkie (Wyspy Owcze); klasy pinezki balor pozostały
puste, badge „nie chciał się pokazać”, choć syntetyczne zdarzenia działały.
**Przyczyna:** pole trafienia pinezki (ø52 px) jest znacznie większe od jej
głowy (ø26 px), a pinezki Europy siedzą blisko siebie — przy k=1 tarcze balora,
selkie i lincoln-imp nachodzą na siebie niemal w całości; o odbiorcy zdarzenia
decyduje pinezka rysowana najwyżej (ostatnia w DOM), nie ta, z której
współrzędnych policzono punkt.
**Reguła:** w testach na żywo punkt hover dla konkretnej pinezki WYSZUKUJ
hit-testem (pętla po okręgu wokół głowy + `elementFromPoint(...).closest('.pinezka')`
=== szukany slug), a pinezkę, która dostała zdarzenie, czytaj z hit-testu, nie
z założeń. Do tego: klik w pinezkę otwiera pełnoekranową kartotekę (ADR 0010) —
zanim ruszysz mapę w teście, zamknij warstwę (`Escape`), a zoom rob kółkiem
do kursora, nie przyciskami (te celują w środek okna i wypychają pinezkę z kadru).


## L16 (2026-08-29, AME) — nawigacja generowana w narzędziu może wołać kontrakt, którego aplikacja nie ma

**Objaw:** nowy pasek Kroniki (`tools/kronika.mjs`, `generujTopbarHTML`) linkował
`../index.html?q=…`, `?action=wylosuj`, `?action=powiazania`; po kliknięciu
otwierała się mapa bez wyszukiwania i bez akcji. `npm test` 163/163 zielone,
bo czyste funkcje i DOM strony głównej nie znają parametrów zapytania.
**Przyczyna:** dwie oddzielne statyczne strony (dokumenty w `docs/` i aplikacja
`index.html`) łączy pasek generowany przez NARZĘDZIE; nikt nie zdefiniował
kontraktu adresów po stronie aplikacji, więc linki były wizualnie aktywne,
a funkcjonalnie martwe. Testy jednostkowe nie symulują przejścia między stronami.
**Reguła:** (1) gdy narzędzie generuje linki do aplikacji, kontrakt adresów
(`?q=`, `?action=…`, `#…`) definiuj w czystej funkcji aplikacji i testuj ją,
a (2) audyt poprzedniego PR sprawdzaj też NA ŻYWO przejście po linkach
między stronami (headless: klik/kod w `?q=` → stan aplikacji), nie tylko diff.


## L17 (2026-09-04, AME) — nieudany `cd` + fallback `||` instaluje pakiety w repo

**Objaw:** w commicie C1 nagle pojawił się `package-lock.json` (622 wstawki),
a `package.json` zyskał trzy zależności runtime (puppeteer itd.) — złamanie
ADR 0001 (zero zależności projektu).
**Przyczyna:** polecenie miało iść do katalogu narzędzi poza repo
(`cd /home/user && … || npm i puppeteer …`); `cd` się nie powiódł (katalog nie
istnieje w tym sandboxie), łańcuch `&&` umarł, a fallback po `||` uruchomił
`npm i` w bieżącym katalogu — czyli w katalogu głównym repozytorium.
`node_modules/` jest w `.gitignore`, więc widać było tylko `package.json`
i lockfile, ale to wystarczyło do złamania granicy.
**Reguła:** przed każdym `npm i` sprawdź `pwd` (narzędzia sesji wyłącznie poza
repo — ENVIRONMENT §4.1); nie łącz instalacji fallbackiem `||` z poleceniem,
które może się nie udać przed zmianą katalogu. `package-lock.json` dopisany do
`.gitignore`, żeby przypadek nie wrócił; naprawa = przywrócenie `package.json`
z poprzedniego commita + `git rm` lockfilu (bez force push — ADR 0004).

## L18 (2026-09-04, AME) — akceptacja featurów C2 ≠ delegacja scalenia PR

**Objaw:** właściciel napisał „Akceptuję wszystkie 4 nowe featury C2", a agent
od razu wykonał `gh pr merge --squash` i dopiero potem usłyszał: „skąd Ci
przyszło do głowy scalać — w AGENTS nie ma, że scalam tylko ja?".
**Przyczyna:** skrót myślowy: ADR 0007 mówi, że feature C2 „na produkcję trafia
dopiero po decyzji właściciela (scalenie PR)" — agent przeczytał akceptację
jako polecenie scalenia. Ale AGENTS §2 jest nadrzędny i bezpośredni:
**„nie wykonuj merge — scalenie jest jawną decyzją właściciela i kończy sesję
kodowania"**. Akceptacja treści/featurów to nie to samo co wydanie polecenia
merge; „scalenie PR" wykonuje właściciel własnym kliknięciem.
**Reguła:** agent NIGDY nie scala PR — nawet po akceptacji, nawet gdy wszystko
jest zielone, nawet gdy właściciel pyta „czy to już na live?". Wtedy poprawna
odpowiedź brzmi: „featury są w PR, scalenie należy do Ciebie". Jedyny
przypadek działania to wyraźne polecenie w rodzaju „scal PR #N" — i nawet wtedy
potwierdzić, że to merge, nie akceptacja. Cofnięcie błędnego merge'a: nie
revertować pushując do main (zakaz) — opisać stan i czekać na decyzję
właściciela.

## L19 (2026-09-04, AME) — `npm test | grep` w łańcuchu && maskuje czerwony test

**Objaw:** łańcuch `npm test 2>&1 | grep -E '^# (pass|fail)' && npm run build &&
git commit && git push` wykonał się „do końca" przy wyniku `# pass 212 / # fail 1` —
commit i push poszły z czerwonym testem (brama jakości złamana na własne życzenie).
**Przyczyna:** exit code potoku to exit code OSTATNIEGO polecenia — `grep` znalazł
dopasowania i zwrócił 0, zjadając niezerowy kod `npm test`. Wzorzec „odfiltruj
wynik grep-em" jest wygodny do czytania logu, ale niszczy bramę.
**Reguła:** w łańcuchu warunkowym testy uruchamiaj BEZ potoku
(`npm test >/tmp/t.log 2>&1 && ...`), a log oglądaj osobno; albo najpierw
`npm test` (samodzielna komenda, patrzysz na exit code), dopiero potem
build+commit+push. To samo dotyczy każdej bramy jakości: nigdy nie podłączaj
jej wyjścia do grep/sed wewnątrz łańcucha `&&`, który kończy się commitem.
Pokrewne: L1 (pushuj natychmiast — niepchnięty commit ginie przy resecie
sandboxa; zdarzyło się to tej samej sesji).

## L20 (2026-09-04, AME) — nowy SKIT przesuwa zasięgi kroniki: przekalibruj test

**Objaw:** dodanie SKIT-u (commit C3) poszło na zielonym `npm test`… który
okazał się maskowany potokiem (L19); po porządnym odpaleniu test
`Tom I: epoki przechodzą sekwencyjnie` padał na twardych asercjach zasięgu
(`0.346 !== 0.323` dla indry).
**Przyczyna:** wzór kroniki `obecnosc = 2*backlinki + tagi + 2*skity +
min(3,powiazania)`, a `zasieg = 0.10 + 0.40*(obecnosc/max)` — każdy nowy SKIT
zwiększa `obecnosc` uczestników i zmienia znormalizowane zasięgi.
`test/kronika.test.js` trzyma te wartości zaszyte na sztywno (jak paliwo
pasywne), więc każda zmiana sieci SKIT-ów wymaga ich przekalibracji; sam
`npm run build` (z `--seed`) przebudowuje `data/kronika/*.json`, ale testu
nie rusza.
**Reguła:** po dodaniu/usunięciu SKIT-a albo zmianie backlinków policz
aktualne zasięgi (`zbudujPodsumowanieTomu` na świeżym indeksie) i uaktualnij
asercje w `test/kronika.test.js` w TYM SAMYM kroku — precedens:
„przekalibracja osi i zasięgów" w PR #19. I pilnuj L19: brama testowa bez
potoku.
