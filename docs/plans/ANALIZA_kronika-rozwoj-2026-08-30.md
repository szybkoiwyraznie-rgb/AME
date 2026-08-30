# Analiza trybu KRONIKA i pomysły na rozwój (2026-08-30)

> Zlecenie właściciela: „analiza trybu Kroniki i pomysły na jego rozwój,
> może np. więcej wizualizacji (wykresy? tabele?) w szablonie Epoki i Tomu.
> Albo jakieś pomysły z »bazy pomysłów« tego trybu?”.
> Dokument jest analizą + propozycjami — **bez wdrażania** na razie;
> propozycje C2 czekają na akceptację właściciela (ADR 0007).

## 1. Stan obecny — co już jest

| Element | Epoka (`kronika-epoka-N.html`) | Tom (`kronika-tom-1.html`) |
|---|---|---|
| Oś mit/rac | pasek `gauge` (stan po) | pasek `gauge` (stan po Tomie) |
| Mapa SVG | tylko uczestnicy epoki | byty biorące udział w Tomie |
| Uczestnicy | karty + role + paliwo przed→po | lista bytów z paliwem/zasięgiem |
| Dialog SKIT | pełny tekst + werdykt narratora | — (link do epok) |
| Zasięgi | lista „slug X% → Y%” + delta | tylko finalny zasięg w liście bytów |
| Pozycje/statusy | lista | — |
| Wątki | lista (stan + opis) | dwie kolumny: otwarte/zamknięte |
| Ocena narratora | lista kto→kogo, stopień 0–3 | — |
| Bilans paliwa | tabela jednej epoki | tabela sald końcowych per epoka |

## 2. Co leży w danych, a **nie** pokazuje się w raportach

Sprawdzone na `summary.json` + wygenerowanym HTML (epoka-6, tom-1):

1. **`iskra` i `pytanie` epoki** — są w `data/kronika/epoka-N.json`, ale
   `zbudujPodsumowanieTomu` **nie kopiuje ich** do `summary.json`, więc
   generator nie może ich renderować. Widz dostaje „gauge + mapa + tabele”,
   a nie ramę narracji („po co to spotkanie”, „co rozstrzyga”).
2. **`przebieg`** („Pełny tekst rozmowy: …”) — też nie trafia do summary.
3. **`konsekwencje.relacje`** — są w summary, ale HTML Epoki ich nie
   renderuje (grep: 0 bloków). To najbardziej „fabularna” część skutku:
   kto kogo wzmocnił/schłodził — i jest niewidoczna.
4. **`konsekwencje.dominacje`** (kultura/kult/delta) — nie renderowane
   per epoka (w Tomie tylko finalna dominacja w liście bytów).
5. **Trend osi po epokach** — `summary.epoki[].stanPo.os` istnieje, ale
   pokazywany jest tylko końcowy pasek; nie ma linii „jak dryfował świat”.
6. **Trend paliwa** — `summary.epoki[].stanPo.paliwo` istnieje, nie ma
   wykresu „kto ile spalał przez Tom”.
7. **Emoji bytów** — do tej pory mapy `EMOJI_BYTU` miały 15 wpisów
   (naprawione w C2: +5 nowych bytów). Było to niewidoczne „ubogacenie”
   — błąd, nie feature.

## 3. Propozycje (pogrupowane, z kosztem i wartością)

### S1 — Wizualizacje w szablonach (generator, deterministycznie, bez zmian ADR)

*Wszystko z danych już w `summary.json`; wymaga tylko funkcji renderujących
SVG + 1–2 drobnych zmian schematu (dopisanie `iskra/pytanie/przebieg` do
summary) i testów. Bez runtime, bez sieci — bezpieczne.*

| # | Pomysł | Dane (już jest?) | Wartość | Koszt |
|---|---|---|---|---|
| W1 | **Ramka epoki**: render `iskra` + `pytanie` (nad mapą) + `przebieg` | brak w summary (dodać) | wysokie — widz wie, o co idzie | niski |
| W2 | **Wykres osi**: linia MIT% po epokach (SVG, zakres 0–100, punkty per epoka) | tak | wysokie — „rzecz idzie do przodu” | niski |
| W3 | **Wykres zasięgów przed→po** (słupki poziome, zielony/czerwony delta) | tak | wysokie — szybki odczyt kto zyskuje | niski |
| W4 | **Wykres paliwa**: linie per uczestnik w całym Tomie | tak | średnie — widać „statystów” | niski |
| W5 | **Słupki dominacji** kultur/kultów (per epoka i na końcu Tomu) | tak | średnie | niski |
| W6 | **Diagram relacji**: łuki między uczestnikami (kolor = wzmocnienie/schłodzenie, grubość = stopień) | tak | wysokie — najbardziej fabularna zmiana | średni |
| W7 | **Oś czasu wątków**: pionowa linia z markerami (otwarty/zamknięty), po epokach | tak | średnie | niski |
| W8 | **„Dziennik zmiany”** — jedna tabela epoki: relacje + zasięgi + dominacje + pozycje (dziś rozproszone na 4 kartki) | tak | wysokie | średni |
| W9 | **Heatmap zasięgów**: macierz byt × epoka (kolor = wielkość/delta) | tak | wysokie — „kto rządzi światem” | średni |
| W10 | **Mapa**: halos wg zasięgu (już częściowo), tooltip z nazwą i deltą, łuki łączące uczestników epoki (adaptacja pomysłu „widok rozmowy na mapie” z BACKLOG) | tak | średnie | średni |

### S2 — UX/i aplikacja (dotyka głównego UI; wg §10 KRONIKA_tryb: wymaga akceptacji właściciela)

| # | Pomysł | Źródło | Uwagi |
|---|---|---|---|
| U1 | **Filtr bytów** na stronie Tomu (wybierz byt → epoki, w których grał) | KRONIKA_tryb §10 pkt 4 | czysty JS, zero zależności |
| U2 | **Deep-linki** `#kronika:<slug>` / `#skit:<slug>` z aplikacji głównej | §10 pkt 2, BACKLOG (deep-linki) | wymaga wpięcia w `ui.js`/`app.js` |
| U3 | **Feed epok** w aplikacji głównej (jak „Co nowego”, ale fabularny) | §10 pkt 1 | osobny spanek przycisków „✎ skity/✚ nowości” |
| U4 | **Odwołania między epokami** (`poprzednik`/`kontynuacja`) — krok 2 grafu wątków (P8) | KRONIKA_tryb §11 krok 2 | małe: pole w `epoka-N.json` + render „powiązane epoki” |

### S3 — Struktura (na później)

- **Graf wątków** (P8 krok 3) — dopiero >~15 epok; obecnie 6.
- **Indeks tematów skitów** (BACKLOG: „Indeks tematów skitów”) — pomaga
  wybierać temat kolejnej epoki bez powtórek; małe pole `temat` w indeksie.

## 4. Co z „bazy pomysłów” da się wziąć od razu

- `docs/BACKLOG.md` → **„Widok rozmowy na mapie — animowany łuk łączący
  uczestników skitu”** → adaptacja statyczna na stronę Epoki (W10/W6).
- `docs/KRONIKA_tryb.md` §10 → feed/filtr/deep-link (U1–U3) — to jest
  „oficjalna” propozycja UI trybu, dziś niezaimplementowana w aplikacji.
- §11 P8 → odwołania epok (U4), graf odłożony.
- §14 P6 → „zmęczenie epok” (byt nie co epokę) — już działa empirycznie
  (nowe składy), ale można dodać walidator „nie więcej niż co 2 epoki”.
- BACKLOG „Oś czasu manifestacji” — przydatne w Kronice (epoka pierwszego
  odnotowania), ale osobna migracja indeksu — poza zakresem S1.

## 5. Rekomendacja (etapy)

1. **S1 (następny C2)** — W1+W2+W3+W8 w pierwszym rzucie (najwyższa
   wartość/najniższy koszt), potem W4–W7, W9–W10. Jeden commit z testami
   (czyste funkcje `wykresOsiSVG()` itd., asercje na deterministycznym
   wyjściu). **Zgodne z ADR 0001/0003 — bez runtime zależności.**
2. **S2** — osobna decyzja właściciela (dotyka głównego UI, ADR 0007).
3. **S3** — po >15 epokach.

## 6. Pytania do właściciela

- **D1:** czy wdrażać S1 (wykresy/tabele w raportach Epok i Tomu) w ramach
  kolejnej Pętli Jakości (C2), czy najpierw obejrzeć statyczny podgląd
  jednego wariantu (np. epoka-6 + tom-1 z W1–W3)?
- **D2:** czy dodać pole `poprzednik`/`kontynuacja` do epok (U4, krok 2
  grafu wątków)?
- **D3:** czy dopuścić internetową warstwę podkładową mapy (online) —
  patrz `RESEARCH_mapa-warstwy-2026-08-30.md` (to wymaga rozszerzenia
  ADR 0001/0003).
