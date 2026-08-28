# AGENTS.md — zasady pracy w repozytorium AME

> **To jest plik startowy każdej sesji.** Runner (Arena i każdy inny) wczytuje
> ten plik jako pierwszy, niezależnie od treści wiadomości startowej właściciela.
> Nie odpowiadaj właścicielowi i nie otwieraj ankiety o zadanie, zanim nie
> wykonasz bloku §0.

Projekt: **AME — Archiwum Manifestacji Eterycznych**. Aplikacja mapowa
(vanilla HTML+JS, bez kroku budowania) plus kartoteka wpisów o bytach
zidentyfikowanych kartami Magic: The Gathering. Treść reguluje
`docs/PROTOKOL.md`, architekturę — ADR-y.

## 0. Kolejność lektury startowej (obowiązkowa, przed jakąkolwiek pracą)

**Każdy plik lektury obowiązkowej czytasz W CAŁOŚCI — od pierwszej do ostatniej
linii.** „Przejrzałem”, „streściłem”, „doczytałem najnowsze” NIE jest
przeczytaniem. Jeśli narzędzie zwróci plik pofragmentowany (truncated,
hasMore, stronicowanie) — dobierasz kolejne fragmenty do końca. Kontrola dla
siebie: znasz `wc -l` pliku i wiesz, że dotarłeś do ostatniej linii.

1. **Ten plik** (`AGENTS.md`).
2. **`docs/PROTOKOL.md`** — obowiązujący format wpisów MFM i szablon promptu
   wizualizacji 21:9. To zasada treściowa, nie sugestia.
3. **Wszystkie ADR-y** w `docs/decisions/` — najpierw README rejestru, potem
   **każdy** `NNNN-*.md` w całości.
4. **`docs/LESSONS.md`** — cały rejestr lekcji do ostatniej.
5. **`docs/setup/ENVIRONMENT.md`** — stałe ograniczenia sandboxa / gita / sieci.
6. **Najnowszy `docs/setup/HANDOFF_*.md`** — skrót JEDNEJ sesji: stan na koniec
   i rzeczy otwarte. Nie jest źródłem zasad.

Budżet lektury startowej: pozycje 1–5 mają się mieścić w **40 tys. tokenów**.
Gdy próg zostanie przekroczony, skrócenie/rozdzielenie dokumentów staje się
obowiązkowym zadaniem sesji, a nie opcją.

Czego NIE czytasz na start: `docs/PROJECT_HISTORY.md` (dziennik sesji) i
`docs/plans/*` — to archiwum przebiegu prac; sięgasz tam punktowo i grepem,
gdy potrzebny jest kontekst konkretnej decyzji.

## 1. Źródło prawdy

Repozytorium, testy i dokumentacja są źródłem prawdy. Historia czatu, opis
zadania i komentarze mogą być niepełne. Jeżeli są sprzeczne:

1. nie ukrywaj sprzeczności;
2. sprawdź najnowsze ADR-y i najnowszy handoff;
3. poproś właściciela o decyzję, jeśli zmiana jest nieodwracalna lub wpływa
   na zakres;
4. zapisz rozstrzygnięcie w repozytorium.

## 2. Tryb sesji — cztery reguły nadrzędne (ADR 0004)

Obowiązują KAŻDĄ sesję bez wyjątku i są nadrzędne wobec handoffów, startowego
promptu i planów w `docs/plans/`. Żaden inny dokument nie może ich wyłączyć.

1. **Pull Request na starcie.** PR gałęzi sesji istnieje na GitHubie PRZED
   jakimkolwiek kodowaniem. Może na początku zawierać tylko porządkowe commity,
   ale gałąź musi być na GitHubie.
2. **Audyt poprzedniego PR przed kodowaniem.** Zanim rozpocznie się nowa praca,
   sesja przegląda zmiany poprzedniego scalonego PR (plik po pliku, `git diff`)
   pod kątem logiki, zgodności z ADR i protokołem oraz zieloności testów.
   Wynik audytu trafia do opisu PR i `docs/PROJECT_HISTORY.md`. Audyt to
   sprawdzenie stanu projektu, nie zaraportowanie listy plików.
3. **Inkrementalne commity.** Każdy samodzielnie zielony krok (`npm test` +
   `npm run build`) to OSOBNY commit, od razu wypchnięty. Zakazany jest jeden
   wielki commit z całą sesją.
4. **Tylko przyrostowo, nigdy force push.** Praca ląduje jako NOWE commity na
   końcu gałęzi. Przed pushem: `git log --oneline -3` + `git status`, potem
   `git fetch origin <gałąź>` i porównanie `HEAD..FETCH_HEAD`. Odrzucony push
   (`non-fast-forward`) znaczy, że tego sprawdzenia nie było — nie sięgaj po
   `--force`. Procedura odzyskiwania po resecie workspace:
   `docs/setup/ENVIRONMENT.md` §2.

Ponadto:

- **1 sesja = 1 gałąź = 1 PR.** Pracuj wyłącznie na gałęzi sesji, nie pushuj do
  `main`, nie wykonuj merge — scalenie (preferowane *Squash and merge*) jest
  jawną decyzją właściciela i kończy sesję kodowania.
- Pytanie do właściciela wolno zadać wyłącznie gdy praca jest **zablokowana**
  decyzją, której agent nie może podjąć sam (zmiana architektury, sprzeczność
  ADR, nowa granica nienegocjowalna). **Nie pytaj „co robimy?”** — gdy po
  audycie brak zaległości i zlecenia właściciela, sesja wchodzi w **Pętlę
  Jakości (ADR 0007)**: rekurencyjnie, do wyczerpania budżetu sesji,
  **C1** (pogłębianie wpisów — zawsze z researchem w www) → **C3** (SKIT do
  Bazy Skitów: 2–4 materializacje o unikalnym składzie, PROTOKÓŁ §8.4) →
  **C2** (nowe featury: wymyślić, zakodować z testami, zaprezentować
  właścicielowi do akceptacji PRZED uruchomieniem live). W liście todo sesji
  C3 idzie nad C2. Polerowanie dokumentacji NIE jest częścią pętli —
  wykonuje się je wyłącznie na zlecenie właściciela w sesji.
- **Praca istnieje dopiero po `git push`.** Nowa sesja widzi wyłącznie `main`
  i tekst pierwszego promptu. Commituj i pushuj po każdym zielonym kroku.
- **Obowiązkowy blok na koniec sesji:** wypisz w czacie instrukcję przekazania
  projektu dla następnego agenta, a jej trwałą wersję zapisz w
  `docs/setup/HANDOFF_<data>.md` i `docs/PROJECT_HISTORY.md`.

## 3. Zasady treści — protokół MFM (szczegóły: `docs/PROTOKOL.md`, ADR 0005)

- **Karta MtG = zawsze fetch ze Scryfall** (ADR 0008): `fetch_page` na
  `https://scryfall.com/card/<set>/<numer>/<slug>`; z wpisu wynikają dokładne
  brzmienia (Oracle text, flavor, artysta, set/numer, rok). Zakaz
  odtwarzania karty z pamięci.
- **Wpis = zawsze weryfikacja w źródłach www** (ADR 0008): każda teza
  faktograficzna i każda pozycja bibliograficzna potwierdzona narzędziami
  agenta (`web_search` / `fetch_page`). Zakaz pisania wpisów z pamięci.
- **Jeden byt, jedna kultura, jedno miejsce, jedna nazwa.** Zakaz mieszanek
  synkretycznych („Dziki Gon + Santa Compaña + Perchten” w jednym wpisie).
  Byt musi być jednostką: da się go namierzyć, skonfrontować, pokonać.
- **Karta MtG jest kluczem, nie tematem.** Wpis opisuje byt z naszego świata;
  karta (nazwa, mechanika, ilustracja, flavor, lore) służy do identyfikacji i
  uzasadnienia wyboru w sekcji „Klucz Przywołania”.
- **Źródła są prawdziwe i weryfikowalne.** Zakaz wymyślania tytułów, autorów,
  lat. Jeśli źródła nie da się potwierdzić — nie wpisuj go. Każde źródło
  podpisujemy adresem (`dokumentacja[].url`, pełny `http(s)`) — co najmniej
  jedno na wpis musi prowadzić do źródła, jego opisu albo wzmianki w sieci.
- **Numeracja sekcji wpisu = ich kolejność** (PROTOKÓŁ §4.1, od v1.3):
  I Wizualizacja, II Charakterystyka i natura, III Dokumentacja, IV Trofea,
  V Rezonans i tożsamość, VI SKITy. Dotyczy UI, przykładów i manuala.
- **Współrzędne są prawdziwe** (miejsce powstania wierzenia lub aktywności
  bytu), zapis dziesiętny, W szerokość geograficzna jako dodatnia.
- **Prompt wizualizacji trzyma się RAMY 21:9** z `docs/PROTOKOL.md` §5 (sekcja I).
  Otwarcie i zamknięcie ramy są stałe i walidowane narzędziem
  (`tools/rebuild-index.mjs` odrzuci wpis ze zniekształconą ramą).
- **Język wpisów: polski** (nazwy własne, cytaty i terminy źródłowe mogą
  pozostać oryginalne).
- **Tagi tylko z kanonu** (`data/kanon-tagow.json`): małe litery, myślniki, bez
  spacji; kategorie i limity — `kultura` 1, `typ` 1, `motyw` 1–2, `postac` 0–1
  (PROTOKÓŁ §6.1, ADR 0016). Nowy tag = dopisanie go do kanonu w tym samym
  commicie. Kraj nie jest tagiem (jest w `lokalizacja.kraj`).
- **Powiązania** wskazują slugi istniejących wpisów; backlinki liczy automatycznie
  indeks. Nie twórz powiązań „na siłę” — opis powiązania ma uzasadniać związek.
- **Slug** = `^[a-z0-9-]+$`, zgodny z nazwą pliku (`data/manifestations/<slug>.json`).
- **SKITy (C3, PROTOKÓŁ §8):** dialog materializacji w `data/skity/<slug>.json`
  — maks. 300 słów (ADR 0015), 2–4 uczestników z kartoteki, każdy zabiera głos, **skład
  osobowy unikalny w całej bazie**, zero żargonu gry, fakty zgodne z lore wpisów.
  Sekcja VI kart i feed „Co nowego" wyliczają się same (z indeksu).
- **Każda zmiana treści** trafia do `meta.modyfikacje: [{data, opis}]` (albo
  `meta.utworzono`, gdy plik jest nowy) — na tym oparty jest dziennik „Co
  nowego" (PROTOKÓŁ §9); bez tego zmiana jest niewidoczna dla właściciela.
  Od protokołu v1.5 data podaje się z godziną (`RRRR-MM-DD GG:MM`, ADR 0017),
  bo feed „Co nowego" pokazuje datę i godzinę zdarzenia.
  `opis` = zdanie o treści dla czytelnika archiwum, **nie** notatka robocza
  sesji (bez `M3`, `B1`, `C1`, `PROTOKÓŁ §`). Stopka karty pokazuje tylko daty
  (`utworzono`, `zmieniono`) — autorzy i opisy zmian zostają w JSON-ie i feedzie.
- Każdy nowy lub zmieniony wpis MUSI przejść `npm test` (schemat + spójność +
  rama promptu) oraz `npm run build` (przebudowa `data/index.json`), a zbudowany
  indeks jest częścią commita.

## 4. Granice nienegocjowalne

- **Aplikacja pozostaje vanilla HTML+JS+CSS bez frameworków i bez kroku
  budowania** (ADR 0001). Zmiana tego paradigmatu = wyraźna decyzja właściciela
  + nowy ADR.
- **`data/index.json` jest generowany** przez `tools/rebuild-index.mjs`
  (wpisy + Baza Skitów + sekcja VI + feed zmian; `wersja: 2`).
  Ręczna edycja indeksu jest zakazana; edytuje się pliki wpisów i uruchamia build.
- Nie commituj sekretów. Pojedyncze pliki binarne > 2 MB wymagają zgody
  właściciela; wygenerowane wizualizacje zapisuj jako JPEG ≤ 2 MB w
  `assets/wizualizacje/`. Licencje assetów zewnętrznych dokumentuj w
  `docs/ASSETS.md`.
- **Nie przenoś pracy na właściciela.** Pliki w `.github/workflows/` są fizycznie
  poza zasięgiem agenta (token GitHub App dostaje 403 `workflows` przy pushu i przy
  API) i poza zakresem próśb: brak zielonego CI **nie jest blokerem sesji ani
  powodem, by prosić o zmianę pliku**. Bramą jakości są `npm test` + `npm run build`
  + `npm run check` w każdej sesji oraz testy w PR. Stan CI opisz jako znany fakt
  (patrz `docs/WORKFLOW.md`), nie jako zadanie do wykonania przez właściciela.
- Nie przepisuj działającej aplikacji przed jej uruchomieniem i udokumentowanym
  audytem. Patchuj chirurgicznie (minimalne fragi, nie całe pliki).
- **Błędy naprawiaj u root cause, nie maskuj.** Zakaz dodawania `return`,
  `try-catch` czy warunków-specjalnych ukrywających objaw.
- Nowe pomysły agentów są mile widziane — zapisuj je w `docs/BACKLOG.md`
  (rozpoznanie do wykorzystania, nie kolejka zadań). Zadania przydziela
  właściciel w czacie; backlog nie upoważnia do wzięcia się za temat.

## 5. Gdzie zapisać regułę, żeby nie przepadła

Reguły trwałe nie mogą mieszkać w handoffie — handoff opisuje jedną sesję.

| Rodzaj treści | Miejsce | Trwałość |
|---|---|---|
| Wiążąca decyzja o granicach, danych, mapie, deploymencie | ADR (`docs/decisions/`) | trwała, formalna |
| Format wpisu, szablon promptu, rygory treści | `docs/PROTOKOL.md` | trwała |
| Powtarzalna pułapka, wniosek diagnostyczny, heurystyka | `docs/LESSONS.md` | trwała, nieformalna |
| Zasada obowiązująca każdego agenta / kolejność lektur | ten plik | trwała |
| Stałe ograniczenie środowiska (sandbox, git, sieć) | `docs/setup/ENVIRONMENT.md` | trwała |
| Stan i kolejka jednej sesji | `docs/setup/HANDOFF_*.md` | jednorazowa |
| Roadmapa jednego zadania | `docs/plans/PLAN_*.md` | jednorazowa |
| Pomysł „może kiedyś” | `docs/BACKLOG.md` | trwała, niezobowiązująca |

Jeśli w trakcie sesji trafisz na pułapkę, która zmarnowała czas i może się
powtórzyć — dopisz lekcję do `docs/LESSONS.md` (format: `## LN (data) — tytuł`,
objaw → przyczyna → reguła).

## 6. Nowa decyzja architektoniczna?

Nowy ADR jest potrzebny, gdy zmiana: ustala lub zmienia granice komponentów;
wybiera istotną technologię lub sposób persistence/deployment; zmienia model
danych lub format wpisów; wprowadza trwały kompromis wpływający na wiele
funkcji. Użyj szablonu z `docs/decisions/README.md`. Nie edytuj historii
zaakceptowanego ADR tak, aby zmienić znaczenie decyzji — utwórz nowy, który go
zastępuje.

## 7. Oczekiwania wobec zmian

- Pracuj ciągle: nie zatrzymuj się po podetapie i nie proś o wdrożenie tylko
  dlatego, że skończyła się checklista. Koduj do decyzji projektowej właściciela
  albo do braku niezbędnych danych wejściowych.
- Najpierw test odtwarzający błąd/zachowanie, potem implementacja, gdy ma to
  sens. Testy logiki (projekcja, walidacja, dekodowanie) nie wymagają DOM ani
  sieci.
- Sortowanie danych deterministyczne (indeks buduje się identycznie za każdym
  razem — bez znaczników czasu losowych w treści danych).
- Przy zmianie kodu sprawdź, czy zaktualizować: `docs/ROADMAP.md`,
  `docs/ARCHITECTURE.md`, `docs/WORKFLOW.md`, ADR, `README.md`.
