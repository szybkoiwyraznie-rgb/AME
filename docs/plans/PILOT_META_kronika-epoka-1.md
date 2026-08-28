# PILOT META.AI — jedna epoka KRONIKI z 3 odizolowanymi bytami

> Brief pilota uzgodnionego przez właściciela (M13). Cel: sprawdzić, czy
> wieloagentowy „swarm" Meta.ai buduje treść AME lepiej niż pojedynczy agent —
> konkretnie czy utrzymuje TWARDĄ izolację wiedzy między bytami (czego pojedynczy
> agent Areny nie potrafi — patrz `POMYSL_splot-i-kronika-koncepcja.md` §1a).
> Ten plik jest jedynym „briefem": reszta konieczna jest w repo (AGENTS.md,
> PROTOKÓŁ, ADR-y, koncepcje). Paczka startowa nie jest potrzebna.

## 0. Gdzie jest projekt (WAŻNE)

- Repo publiczne: <https://github.com/szybkoiwyraznie-rgb/AME>
- **Pracuj z gałęzi `arena/01a048ac-ame` (PR #6), NIE z `main`.** `main` stoi na
  M6 i nie zawiera koncepcji SPLOT/KRONIKA, `app/arena.js` ani analiz. Klonuj:
  `git clone -b arena/01a048ac-ame https://github.com/szybkoiwyraznie-rgb/AME`
- Lektura startowa: `AGENTS.md` §0 (obowiązkowa kolejność), potem
  `docs/plans/POMYSL_splot-i-kronika-koncepcja.md` (§1a realia AI, §2.1 dossier,
  §2.4 blind-draft) oraz `docs/PROTOKOL.md` §8 (format SKITa) i ADR 0019.

## 1. Zakres pilota (mały, mierzalny)

Wygeneruj **jeden SKIT** (wcielone spotkanie 3 bytów) — bo SKIT ma gotowy,
walidowany format i jest bezpośrednio porównywalny z tym, co robił pojedynczy
agent. To jest „epoka Kroniki" w minimalnej, sprawdzalnej formie.

**Skład (unikalny, nie istniał w bazie) — 3 byty z 3 różnych kultur:**

| Agent | Byt | slug | Plik źródłowy (dossier) |
|---|---|---|---|
| 1 | Egungun | `egungun` | `data/manifestations/egungun.json` |
| 2 | Drangue z doliny Shali | `drangue-shala` | `data/manifestations/drangue-shala.json` |
| 3 | Empusa z Koryntu | `empusa-korynt` | `data/manifestations/empusa-korynt.json` |

Trzy odległe kultury (joruba / albańska / grecka) = każde skrzyżowanie wiedzy
jest łatwo wykrywalnym wyciekiem (patrz §3). `imie` w skicie musi brzmieć
dokładnie: „Egungun", „Drangue", „Empusa" (albo pełne nazwy z pól `nazwa`).

## 2. Jak (procedura swarm, którą testujemy)

1. **Izolacja:** Agent 1 dostaje TYLKO dossier Egunguna, Agent 2 tylko Drangue,
   Agent 3 tylko Empusy. Żaden nie widzi cudzego pliku ani cudzych replik przed
   napisaniem swoich. Dossier = sekcje II/III/V danego wpisu (§2.1 koncepcji).
2. **Iskra (powód spotkania):** wspólny, neutralny pretekst, który każdy byt
   zinterpretuje po SWOJEMU (np. „ktoś nieproszony/proszony u progu domu" —
   egungun i empusa są już powiązani motywem wchodzenia pod okryciem; drangue
   wnosi trzeci, obcy im punkt widzenia). Orchestrator podaje iskrę wszystkim,
   ale NIE podaje cudzej wiedzy.
3. **Odegranie:** każdy agent pisze repliki swojego bytu, reagując tylko na to,
   co inni powiedzieli GŁOŚNO (nie na ich dossier).
4. **Scalenie:** orchestrator składa repliki w jeden dialog wg formatu §8.2.

## 3. Test izolacji (to jest właściwy wynik pilota)

Każdy byt ma „fakty prywatne", które NIE MOGĄ paść w replikach innego bytu.
Wyciek = agent użył wiedzy spoza swojego dossier. Lista kontrolna:

- **Tylko Egungun** może mówić o: `oríkì`, `bàtá`/`dùndún`, `ara ọ̀run`,
  `Aláàfin`/Oyo, `ilé egúngún`, płótnach maskarady.
- **Tylko Drangue** może mówić o: `kulshedra`, `kamień piorunowy`, `czepek`
  (urodzony w czepku), dolina `Shala`/Pogradec, walka o pogodę/grad.
- **Tylko Empusa** może mówić o: `Hekate`, miedziana noga, `Menippos`, `Korynt`,
  `Filostrat`, iluzja pękająca od słowa.

Przykład wycieku: gdyby Drangue wspomniał „Hekate" albo Empusa „kulshedrę" —
to znaczy, że izolacja nie zadziałała. **W raporcie pilota podaj: 0 wycieków
albo je wypisz.** Byt MOŻE się mylić co do drugiego (to pożądane) — nie może
znać jego prywatnych nazw własnych.

## 4. Twarde wymogi formatu (inaczej `npm test` czerwony)

- Plik: `data/skity/<slug>.json`, `slug` = `^[a-z0-9-]+$`, unikalny (nie kolizja
  z istniejącymi 11 skitami ani z `skity`/`nowosci`/`panel`/`mapa`/`lista`).
- Pola: `slug`, `tytul` (WERSALIKAMI w renderze — w danych po prostu tytuł),
  `temat?`, `uczestnicy: [{imie, slug}]` (3 pozycje), `tekst`,
  `meta: {utworzono: "RRRR-MM-DD GG:MM", autor, modyfikacje: []}`.
- `tekst`: czysty dialog, każda replika w wierszu `**Imię:** [didaskalia] treść`,
  akapity rozdzielone pustą linią. **60–300 słów** (ADR 0015). Każdy z 3
  uczestników MUSI zabrać głos; żadnej postaci spoza składu.
- **Zero żargonu gry** (mana, deck, karta MtG, Scryfall itd. — walidator
  sprawdza). Fakty zgodne z dossier (ADR 0008). Proza po polsku; nazwy w innych
  alfabetach — transliteracja (bez cyrylicy/CJK).
- Po dodaniu pliku: `npm run build` (przebuduje `data/index.json`) — indeks
  MUSI być w tym samym patchu. Sekcja VI kart i feed „Co nowego" wyliczą się same.

## 5. Kryteria zaliczenia pilota

- [ ] `npm test` → **zielone** (obecnie 144/144; po dodaniu skitu przybędą testy
      danych, ale wszystkie mają przejść).
- [ ] `npm run build` + `npm run check` → zielone, drzewo czyste po buildzie
      (indeks deterministyczny).
- [ ] Skit spełnia format §4 (unikalny skład, 60–300 słów, 3 głosy).
- [ ] **Raport izolacji (§3):** liczba wycieków + ewentualna lista.
- [ ] Oddanie: git patch albo ZIP repo gotowy do `Add file → Upload` na
      GitHubie, tak by PR wpadł i CI był zielony. **Zero sekretów w patchu.**

## 6. Uczciwe odniesienie do analizy Areny (prośba właściciela)

W raporcie napisz wprost: czy swarm dał TWARDĄ izolację, której pojedynczy agent
nie daje (§1a koncepcji), czy przeszedł `npm test`/`build` w Twoim sandboxie i
czy oddał czysty patch. To są trzy pytania pilota (a/b/c) — odpowiedz na każde.

## 7. Po pilocie (nie teraz)

Jeśli pilot wyjdzie: napiszemy ADR „Kronika jako dane w repo, tryb obserwatora,
timeline'y jako graf wątków" (pomysł 11 w `LUZNE_POMYSLY_NA_PRZYSZLOSC.md`) i
pełny model danych `data/kronika/*.json` z §4 koncepcji. Wtedy SKIT-forma pilota
zamieni się w właściwą „epokę" z polem `skutek` dla świata SPLOTU.
