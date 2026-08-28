# METAGRA AME — mapa otwartych pytań (przed akceptacją koncepcji)

> **Status: KONCEPCJA W OPRACOWANIU, NIEZAAKCEPTOWANA.** Właściciel słusznie
> zauważył (M13), że metagry jeszcze nie ma — są tropy rozsypane po czterech
> dokumentach `POMYSL_*`. Ten plik jest **spisem decyzji do podjęcia**, nie
> kolejną wizją. Dopiero gdy odpowiemy na pytania z §2, powstanie ADR i plan.
> Zasada: żadnego kodu gry ani pilotów, dopóki koncepcja nie zostanie przyjęta.

## 0. Po co ten dokument

Cztery dotychczasowe pliki mieszają diagnozy, wizje i realia:

- `POMYSL_arena-rezonansu-idle-battler.md` — pierwsza (odrzucona) walka 1:1.
- `POMYSL_kierunki-grywalizacji-analiza.md` — 10 pomysłów w 3 wiązki (A/B/C).
- `POMYSL_splot-i-kronika-koncepcja.md` — SPLOT+KRONIKA, dossier, realia AI (§1a).
- `POMYSL_platforma-budowy-przenosnosc.md` — build-time vs run-time, przenośność.

Trudno to zaakceptować „w kawałkach". Poniżej: co już jest USTALONE, i co jest
jeszcze OTWARTE. Akceptacja koncepcji = odpowiedzi na §2.

## 1. Co już jest ustalone (fundamenty, nie do podważania bez powodu)

- **U1. Statystyki z gęstości rekordu** (backlinki, powiązania, skity, epitety,
  motywy) — zaakceptowane przez właściciela jako dobra idea. Gotowe i
  przetestowane: `app/arena.js` (`statyManifestacji`, `profileKartoteki`,
  `archetypBytu`), znormalizowane (percentyle) → nowy wpis nie deklasuje reszty.
- **U2. Rola gracza = OBSERWATOR** (M11): świat toczy się sam; gracz czyta, nie
  steruje. Sprawiedliwość na systemie i bytach, nie na graczu.
- **U3. Determinizm + brak sekretów w artefakcie** (ADR 0001–0003): artefakt
  zostaje vanilla static; losowość tylko ze wstrzykiwanego RNG (seed z daty).
- **U4. Runner wymienny** (M13): build-time dowolny (Arena / Meta / inny),
  granica = git PR; „głos pojedynczego bytu" → subagenci odizolowani (priorytet)
  albo symulowani (blind-draft).
- **U5. Każdy nowy SKIT to darmowy prototyp KRONIKI** — piszemy je metodą
  embodimentu; już to robimy w Pętli Jakości (C3).

## 2. Pytania OTWARTE (na nie trzeba odpowiedzieć, by przyjąć koncepcję)

Pogrupowane; przy każdym: dlaczego to blokuje, i wstępne opcje.

### A. Pętla rozgrywki (czym właściwie JEST gra dla obserwatora)
- **P1. Co widz właściwie ogląda?** Oś czasu wydarzeń? Mapę zmieniających się
  wpływów? Kolejne SKIT-y/„epoki"? — bez tego nie wiadomo, co budować jako UI.
  *Opcje:* (a) feed epok (jak „Co nowego", ale fabularny); (b) mapa z animacją
  wpływów; (c) graf wątków (timeline'y, pomysł 11).
- **P2. Co napędza kolejną epokę?** Czas (codzienny seed)? Dodanie wpisu/skitu?
  Ręczne „pchnięcie" przez agenta sesji? — decyduje, czy gra „żyje" sama.
- **P3. Czym jest „wydarzenie"?** Spotkanie 2–4 bytów (jak SKIT) + skutek dla
  świata? Czy coś więcej (koalicje, przejęcia terenów)?

### B. Model świata (SPLOT) — co się właściwie zmienia
- **P4. Jaki jest stan świata i jak się zmienia?** Relacje między bytami?
  Wpływy na terenach (kraje z `lokalizacja`)? Zasób („Rezonans")? — trzeba
  wybrać MINIMALNY zestaw zmiennych, bo inaczej to za duże na 8–12 wpisów.
- **P5. Skąd biorą się „iskry" spotkań?** Z powiązań wiki? Z sąsiedztwa na
  mapie? Losowo z seeda? — to determinuje, czy świat jest spójny narracyjnie.
- **P6. Normalizacja siły w czasie** — staty rosną z rozbudową wpisów; jak nie
  dopuścić, by „najstarszy = wieczny hegemon"? (percentyle to część odpowiedzi;
  czy potrzeba „resetu epok" albo „zmęczenia"?).

### C. Treść (KRONIKA) — jak powstaje i gdzie mieszka
- **P7. Format danych epoki** — `data/kronika/*.json`: pola, walidacja (jak
  skity). Czy epoka to „SKIT + skutek", czy osobny typ? — przesądza schemat.
- **P8. Timeline'y jako graf wątków (pomysł 11)** — od razu, czy najpierw jedna
  liniowa oś? Graf jest potężny, ale kosztowny w UI i walidacji.
- **P9. Kanoniczność** — czy epoki Kroniki są „prawdą" archiwum (jak wpisy), czy
  osobną, „fabularną" warstwą, którą można odrzucać/rozgałęziać bez psucia kart?

### D. Skala i kolejność
- **P10. Ile bytów, zanim gra ma sens?** Wstępnie ustaliliśmy ~15–20. Czy to
  warunek wejścia, czy budujemy prototyp gry równolegle z treścią?
- **P11. Najmniejszy grywalny wycinek (MVP)** — od czego zacząć kod, gdy już
  koncepcja przyjęta? Kandydat: „jedna epoka = jedno spotkanie + widok osi".

## 3. Rekomendowana kolejność rozstrzygania (propozycja, nie decyzja)

1. Najpierw **A (pętla)** — bez tego reszta wisi w próżni. Zwłaszcza P1/P2.
2. Potem **B (świat)** w wersji MINIMALNEJ — jak najmniej zmiennych (P4).
3. **C (dane/format)** dopiero, gdy A+B znane — schemat wynika z mechaniki.
4. **D (skala)** równolegle: dowozić treść w Pętli Jakości niezależnie od gry.

## 4. Jak używać tego pliku

- Każda sesja myślenia nad metagrą **odpowiada na 1–3 pytania z §2** (albo
  dokłada nowe), zamiast pisać nową wizję. Odpowiedzi wędrują do §1 (ustalone).
- Gdy §2 jest w większości puste, a §1 spójne → piszemy **ADR metagry** i plan
  MVP. Wtedy (i tylko wtedy) zaczyna się kod.
- Do tego czasu: Pętla Jakości (C1 treść, C3 skity-prototypy) buduje świat, na
  którym gra kiedyś stanie.

## 5. Pierwszy wkład (M13): wstępne stanowisko do P1–P3

Nie są to decyzje właściciela — to propozycja do dyskusji, żeby ruszyć §2:

- **P1 (co widać):** feed „epok" jak „Co nowego", ale każda pozycja to
  mini-wydarzenie z linkami do uczestników i (docelowo) ilustracją. Najtańsze,
  spójne z istniejącym UI, rozszerzalne później o mapę/graf.
- **P2 (co napędza):** kolejną epokę dokłada **agent sesji** przy okazji Pętli
  Jakości (jak dziś dokłada SKIT) — świat rośnie „ludzkim" tempem, deterministy-
  cznie, bez runtime AI. Codzienny seed zostaje jako opcja na później.
- **P3 (czym jest wydarzenie):** na start = SKIT + krótkie pole `skutek`
  (1–2 zdania: co ta rozmowa zmienia w relacjach). Minimalne rozszerzenie tego,
  co już umiemy — zero nowej maszynerii.

To stanowisko celowo jest MAŁE: chroni przed „za dużą grą na 12 wpisach".

## 6. Drugi wkład (Pętla Jakości po M15): prototyp pierwszej epoki KRONIKI

[Nie jest to decyzja właściciela — to pierwsza **konkretna próbka** modelu
danych z §1/§2, żeby przestać rozważać P3/P7/P9 w powietrzu.]

- **Dokument:** `docs/plans/PROTOTYP_kroniki-epoka-1.md`.
- **Próba:** pierwsza „epoka” zbudowana na istniejącym SKICIE **„Znak burzy”**
  (Indra × Drangue × Barbarossa). Nie duplikujemy dialogu — epoka odwołuje się
  do SKIT-u i dodaje `iskra` + `skutek`.
- **Co odpowiada (wstępnie):**
  - **P3:** wydarzenie = SKIT + krótki `skutek` dla świata. Potwierdzone na
    konkretnym materiale; dialog zostaje jednokrotnie.
  - **P7:** minimalny rekord `data/kronika/epoka-N-*.json` — `skit`, `iskra`,
    `uczestnicy` (rola z `profileKartoteki`), `przebieg` (odwołanie + ślad),
    `skutek`, `meta`. Bez nowej maszynerii.
  - **P9:** epoka jest proponowana jako **opcjonalna, narratorska warstwa** —
    nie modyfikuje kart archiwum, więc da się ją odrzucić bez psucia wpisów.
- **Co dalej otwarte (z prototypu):** słownik `skutek.relacje` (wolny tekst vs
  kontrolowane wartości), strzeżenie spójności kolejnych epok, oraz P1/P2 —
  czy następna epoka rusza z „długu” opisanego w skutku, czy z osobnego seeda.
- **Stan:** prototyp koncepcyjny, nie dane produkcyjne; brak kodu, brak
  walidatora, brak wpięcia do UI (zgodnie z M13).
