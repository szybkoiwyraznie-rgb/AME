# Koncepcja: ubarwienie Kroniki grafikami + samonapędzająca się fabuła z rozstajami (2026-08-30)

> Zlecenie właściciela: *„Zastanów się, w jaki sposób ubarwić Kronikę generowaniem
> grafik. Zastanowiłbym się też nad rozwojem Kroniki w stronę ciekawej fabuły,
> samonapędzającej się historii z wieloma rozwinięciami.”*
> Dokument jest **koncepcją + planem etapów — bez wdrażania**; decyzje na końcu.
> Odwołania: `docs/KRONIKA_tryb.md` (§5–§6, §18, §20–21), `ANALIZA_kronika-rozwoj-2026-08-30.md`.

---

## 0. Stan wyjściowy (co już jest, czego brakuje)

**Jest:**
- Mechanizm: `tom-1.json` (seed) + 7 epok (`epoka-1..7.json`), `przeliczEpoke`,
  walidator ciągłości wątków, oś zamknięta (mit+rac=100), paliwo jako bramka,
  ledger z ciągłością, **delty** (zero re-basowania seedu).
- Treść: `iskra` + `pytanie` per epoka, uczestnicy z rolami, `przebieg`,
  `narrator.ocena` (kto→kogo, stopień 0–3, komentarz), `konsekwencje`
  (oś, relacje, zasięgi, dominacje, pozycje, wątki).
- Prezentacja: `docs/kronika-tom-1.html` + `kronika-epoka-1..7.html` + spis
  Tomów. Wykresy SVG (oś, macierz, dominacje, wątki, graf epok), mapa SVG bytów,
  karty uczestników, dziennik zmiany.
- Grafiki: **20 wizualizacji bytów** (21:9, ≤2 MB, prompts w polu
  `wizualizacja.prompt`, wpis w `docs/ASSETS.md`, „generowane narzędziem AI”).
- Zasady: ADR 0001/0003 (statyczna, offline, bez runtime AI), ADR 0007
  (akceptacja przed live), ADR 0008 (fakty w źródłach, zakaz pisania z pamięci),
  ADR 0019 (skład 3–4), PROTOKÓŁ §8 (SKITy).

**Brakuje / jest „szaro”:**
1. Strony Epok i Tomu **nie mają żadnej ilustracji narracyjnej** — czysta
   typografia + wykresy; jest „archiwum”, nie ma „opowieści”.
2. Fabuła jest **liniowa i pisana ręcznie**: kolejną epokę wymyśla sesja,
   a nie stan świata. Brak „popychacza” (P5 działa intuicyjnie, nie mechanicznie).
3. **Rozstaje** — świadomie odłożone przez właściciela (2026-08-29, §21.2
   „zostają pomysłem”). Teraz właściciel wraca do „wielu rozwinięć” — to jest
   ten moment, żeby zaprojektować je dobrze.
4. Brak wspólnego **języka wizualnego** (stylu), który spinałby byty, epoki
   i mapy w jedną „księgę”.
5. Nie ma **celu Tomu** wybieranego z góry (18.5: mgła/odczarowanie/równowaga/
   pętla) — oś dryfuje, ale nikt nie powiedział, dokąd ma dojść.

---

## 1. Ubarwienie grafikami — cztery warstwy

Kluczowa zasada: **jedna, świadoma stylistyka** — inaczej 7 obrazów
w różnych stylach zrobi z Kroniki kolaż. Propozycja: **„iluminowana księga /
atlas antropologiczny"** — pergamin/sepia, inicjały, filigrany, herby kultur,
mapy w kolorze atramentu i bursztynu (spójne z `kolorZasiegu`: granat→bursztyn).
Bez współczesnych elementów (zakaz technologii, samochodów, ubrań XX w.,
tekstu łacińskiego w kadrze — AI słabo rysuje litery).

### G0 — Warstwa SVG/typograficzna (zero AI, build-time, tania)

| Element | Co to | Gdzie |
|---|---|---|
| **Inicjał epoki** | wielka litera `I`–`VII` w ozdobnym kadrze | nagłówek strony Epoki |
| **Herb/„pieczęć” kultury** | SVG: emoji-znak bytu + kolor kultury + nazwa (czytelna, `NAZWY_KULTUR`) | karty uczestników, wykres dominacji |
| **Trasy epoki na mapie** | łuki SVG między miejscami uczestników z animowanym „przebiegiem” (dashed) | mapa strony Epoki (mamy współrzędne!) |
| **Winiety tytułów** | ornament pod tytułem + sygnatura („spisano w Archiwum… w roku…”) | strony Tomu i Epok |
| **Pasek losów** | miniatury statusów (wzmocniony/zraniony/…) jako ikony SVG zamiast samych słów | dziennik zmiany |

Wartość: natychmiastowa „książkowość” przy zerowym koszcie i zerowym ryzyku.
Deterministyczne — czyste funkcje + testy na SVG.

### G1 — Kluczowe ujęcia epok (kluczową warstwą „ubarwienia”)

**1 obraz na epokę** (7 na Tom): „kadr rozstrzygnięcia” zbudowany z danych
epoki — uczestnicy (miejsca, atrybuty z kart), światło i nastrój z
`narrator.podsumowanie`, kompozycja z `iskra`.

- **Prompt generowany deterministycznie** z epoki (`promptGrafikiEpoki()`)
  + **zapisany w epoce** (`grafika: { prompt, obraz, styl }`) — reprodukowalny,
  jak przy bytach.
- Pliki: `assets/wizualizacje/kronika-tom-1-epoka-3.jpg`, 21:9 (spójne z bytami,
  ale 16:9 dopuszczalne dla hero), ≤2 MB, `loading="lazy"`.
- Wstawienie: hero na początku strony Epoki (nad ramką) + miniatura na karcie
  epoki na stronie Tomu → **strony przestają być „szare”**.
- `docs/ASSETS.md`: jeden wiersz per obraz („generowane narzędziem AI
  z promptu epoki N”).
- Regeneracja tylko przy zmianie epoki: hash promptu w nazwie/`meta`.

Koszt: 7 obrazów ≈ 2–4 MB w repo (spójne z obecnymi ~7,2 MB bytów).

### G2 — Miniatury rozstajów (związane z fabułą, patrz §2)

Każde rozstaje = 1 mały kadr „co by było, gdyby…” (inna iskra/inny skład/
inny kierunek osi). To wizualny kontrapunkt: przy głównej ścieżce widać
**obrazy dróg, których nie wybrano** — dokładnie klimat „Archiwum przebiegów,
których nie było”.

### G3 — Okładka Tomu + portret „Archiwisty” (one-shots)

- **Okładka Tomu**: kolaż-symbol (najsilniejsze byty + oś mit/rac jako rozstajny
  gościniec) — hero strony głównej Tomu.
- **Portret narratora/Archiwisty**: postać spisująca Kronikę (opcjonalna,
  dodaje „głosu” marginesom §3), albo symbol — księga z okiem.

Niższy priorytet: G3 po G0+G1, G2 razem z rozstajami.

---

## 2. Fabuła samonapędzająca — „Silnik Kronikarza” (build-time, nie runtime)

Rozróżnienie najważniejsze: **maszyna prowadzi fabułę, agent pisze prozę,
właściciel zatwierdza kanon.** Determinizm i statyczność zachowane (ADR 0001/0003):
wszystko liczone w `tools/kronika.mjs`, strony pre-kompilowane.

### 2.1 Stan świata (już prawie jest)

`stanPo` Tomu = oś, zasięgi, dominacje, paliwo, **wątki (otwarte/zamknięte)**,
relacje, pozycje. To wystarczający SPLOT. Dodać:
- `pamiec` — wiek wątku (`od epoki` — jest w id/opisie, spisać w polu),
- `dlugi` — kto komu „winien” (relacje wzmocnienie/schłodzenie jako zobowiązania).

### 2.2 Pięć reguł „popychania” (formalizacja P5/P6)

Następną epokę wybiera **ranking**, nie wolna wola sesji:

| Reguła | Zasada | Skąd |
|---|---|---|
| **R1** Wątek woła | otwarte wątki = 1. priorytet (stary wątek > nowy) | `watki` |
| **R2** Linia zasięgu | iskra ciągnie się od kultury/bytu o największym zasięgu albo o największej delta | `zasieg` |
| **R3** Zmęczenie | max 1 powtórka z poprzedniej epoki; byt nie częściej niż co 2 epoki | P6 |
| **R4** Oddech | min 1 byt „nowy w Tomie” na 2 epoki (wprowadzanie kartoteki) | P10 |
| **R5** Dług | relacja wzmocnienie/schłodzenie bez zamknięcia = kandydat na spotkanie | `relacje` |

Do tego **bramka paliwa** (tak jak dziś) i **preferencja unikalnego składu**
(ADR 0019 / walidator skitów).

### 2.3 Funkcje proponujące (kandydat na C2)

- `proponujEpoke(stan, kartoteka)` → **ranking 3–5 kandydatów**:
  `{ iskra (szablon), skład (slugi + role), kierunek osi, powód (R1–R5) }`.
- `agendaTomu(stan)` → lista „co wisi”: otwarte wątki z wiekiem, byty
  z paliwem < 50% startu, kultury bez głosu w ostatnich 3 epokach, tagi/motywy
  bez epoki. **To jest sprzężenie z Pętlą Jakości:** agenda mówi, kogo pogłębić
  (C1) i jaki skład zagrać (C3) — Kronika napędza pracę, a praca napędza Kronikę.
- Oba czyste (bez I/O), deterministyczne, z testami.

### 2.4 Rozwinięcia — trzy tryby (do wyboru właściciela)

**A. „Rozstaje czytelnika” (prekompilowane strony wyboru)**
Przy epokach-węzłach generator tworzy **2–3 warianty następnej epoki**
(dziś: 1). Każdy wariant = osobne dane + osobna strona
(`kronika-tom-1-epoka-8-a.html`, `-b`, `-c`), z własną grafiką G2.
Strona Epoki 7 pokazuje karty: „Jeśli — …” (opis + kadr). Klik → strona
wariantu. Kanon = ścieżka główna; warianty = **„przebiegi, których nie było”** —
idealnie pasuje do metafory Archiwum (odpięte od kanonu, widoczne w aneksie
„Mapa rozstajów” — drzewo SVG jak graf epok, gałęzie przygaszone).
Zgodne z ADR 0001/0003 (wszystko statyczne, zero fetchy/AI w przeglądarce).

**B. „Warianty równoległe” (bez klikania)**
Wszystkie rozwinięcia wygenerowane i opisane obok siebie w aneksie — czytelnik
czyta linię główną, a „co mogło być” jako rozdziały z różnicą (oś, zasięgi,
skład). Tańsze w UI, mniej „gry”, więcej „atlasu”.

**C. Kanon tylko jeden**
Generator tylko **doradza** (ranking), nie tworzy alternatyw; rozstaje zostają
opisem w treści epoki („świat wybrał X, ale Y czekało”). Najbezpieczniejsze,
najmniej spektakularne.

Rekomendacja: **A** (właściciel prosił o „wiele rozwinięć”), z B jako
pierwszym krokiem (pilotaż 1 węzła, potem UI wyboru).

### 2.5 Łuk Tomu i stan końcowy (18.5 — formalizacja)

Tom zaczyna się od **deklaracji celu** (`cel: mgla | odczarowanie | rownowaga | petla`):
- generator dobiera epoki tak, by oś dryfowała w stronę celu;
- **finał Tomu** musi: domknąć ≥ ⅓ otwartych wątków, otworzyć 1–2 nowe,
  doprowadzić oś do progu celu — walidator sprawdza;
- koniec Tomu generuje **„agendę Tomu II”** (co wisi) — samonapędzanie między
  Tomami.

### 2.6 Narrator i proza (warstwa literacka zostaje przy agencie)

`narrator` już istnieje (ocena + podsumowanie). Rozwinięcie:
- **marginesy Archiwisty** — 1–2 zdania komentarza między epokami („spisano
  dnia…; czytający niech zauważy, że…”), w stylu iluminowanej księgi;
- SKITy nadal pisane ręcznie (embodiment, §6 pkt 4) — **maszyna nie pisze
  dialogów**, maszyna wybiera *kto, gdzie, o co i z jakim skutkiem*;
- generator może proponować **motyw SKITu** (z `temat` bazy — indeks tematów,
  patrz S3 analizy), by unikać powtórek.

### 2.7 Rygor (żeby „samonapędzanie” nie wymknęło się spod kontroli)

- **Zero nowych faktów bez ADR 0008:** generator buduje iskry i skutki wyłącznie
  z kartoteki (powiązania, słabości, miejsca, tagi) — nie wymyśla historii świata.
- **Determinizm:** ten sam seed kartoteki + ten sam stan → ta sama propozycja
  i ten sam wariant (RNG wstrzyknięty, jak `wylosujSlug`).
- **Kanon = decyzja właściciela** (ADR 0007): generowane warianty lądują w PR
  jako propozycje; właściciel zatwierdza, co jest „spisane” (kanon), a co
  „utracone” (warianty).
- **Koszt:** każdy wariant = 1 epoka danych + 1 strona + ~1 obraz — warianty
  tylko na węzłach (nie przy każdej epoce), np. 1 rozstaje na 2–3 epoki.
- **Budżet repo:** grafiki wariantów tylko po akceptacji próbki stylu (G1
  pilotem) — unikamy wygenerowania 20 obrazów w stylu, który właściciel odrzuci.

---

## 3. Etapy wdrożenia (propozycja; każdy po akceptacji)

| Etap | Co | Jak | Brama |
|---|---|---|---|
| **A** | „Popychacz” — `proponujEpoke` + `agendaTomu` + testy (bez zmian danych) | czyste funkcje w `tools/kronika.mjs` | `npm test` zielone |
| **B** | G0 — iluminacja SVG (inicjały, herby, trasy, winiety, pasek statusów) | funkcje SVG + CSS + testy | `npm test` + podgląd |
| **C** | G1 — **1 próbka** key-artu (np. Epoka VII) → akceptacja stylu → 6 pozostałych | prompt z danych, ASSETS, `grafika` w epoce | podgląd właściciela |
| **D** | Rozstaje pilotażowe: 1 węzeł (po Epocze VII), 2 warianty (tryb B→A) | warianty jako osobne dane+strony, „Mapa rozstajów” SVG | `npm test` + podgląd |
| **E** | Auto-Tom II: `cel` + generowane epoki + agenda; SKITy w pętlach C3 | `kronika.mjs --tom-2 --seed` | pełna brama + akceptacja |

Pętla jakości w tle: A i B jako **C2**, warianty jako **C3** (SKITy na
proponowanych składach), pogłębianie bytów z agendy jako **C1** — Kronika
staje się wtedy *motorem* Pętli, a nie jej odbiorcą.

---

## 4. Decyzje właściciela (do wyboru)

1. **Styl graficzny Kroniki** (dla G0/G1/G2):
   - (a) „iluminowana księga” — pergamin, sepia, inicjały, filigran, herby;
   - (b) „atlas antropologiczny / akwarela” — mapa + szkice, kolor kultur;
   - (c) „staloryt/rycina” — czarno-biała rycina + bursztyn jako akcent;
   - (d) „kinowy realizm” — jak wizualizacje bytów (spójne z kartami, ale
     najmniej „książkowe”).
2. **Zakres grafik w pierwszej iteracji:** (a) tylko G0 (0 kosztu AI),
   (b) G0 + 1 próbka G1 (do oceny stylu), (c) pełne G1 dla 7 epok od razu.
3. **Tryb rozwinięć:** (a) rozstaje czytelnika (strony wyboru), (b) warianty
   równoległe w aneksie, (c) kanon jeden + doradztwo generatora.
4. **Tempo samonapędzania:** (a) silnik tylko *sugeruje* (Etap A), b) silnik
   *generuje* kolejne epoki na podstawie stanu (Etap E) — różnica między
   „asystentem sesji” a „automatem z ręką właściciela”.
