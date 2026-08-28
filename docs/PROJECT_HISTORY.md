# PROJECT_HISTORY — dziennik sesji

> Archiwum przebiegu prac. NIE jest lekturą startową — sięgasz tu punktowo
> i grepem, gdy potrzebny jest kontekst historyczny (AGENTS.md §0).

## M1 (2026-08-27) — założenie projektu, fundament F0

**Zakres:** uporządkowanie repozytorium po pierwszym commicie właściciela;
zasady, protokół, ADR, narzędzia, aplikacja v1, dwa przykładowe wpisy,
wizualizacje, CI.

**Kontekst startowy:** w repo były trzy pliki: zarys idei (protokół MFM v1.0
z przykładem Tarmogoyf→Wendigo) oraz `old_AGENTS.md`/`old_ENVIRONMENT.md`
z projektu `mtg` (github.com/jurekjurekgh/mtg). Polecenie właściciela:
wyciągnąć najważniejsze rygory pracy i opublikować jako obowiązujący AGENTS.

**Decyzje sesji (ADR):**
- 0001 — statyczna aplikacja vanilla HTML+JS bez builda (Pages + lokalnie);
- 0002 — wpisy JSON + generowany `data/index.json` (walidator + determinizm);
- 0003 — samowystarczalna mapa SVG: Natural Earth/TopoJSON, projekcja
  walcowa równoodległa, własny pan/zoom (scroll/pinch/drag/dwuklik);
- 0004 — model sesji z mtg (PR, audyt poprzedniego PR, inkrementalne
  commity, zakaz force push) zaadaptowany do skali AME;
- 0005 — protokół MFM v1.1: sekcje I–V + rama promptu 21:9 (zastępuje styl
  „NatGeo/YAML” z v1.0);
- 0006 — warstwa wiki: tagi, powiązania slugami, backlinki z indeksu.

**Wykonanie:** 6 commitów inkrementalnych (dokumenty/zasady → narzędzia+testy →
dane przykładowe → aplikacja → wizualizacje → CI+handoff), każdy z zielonym
`npm test`+`npm run build` przed commitem. Finalnie: 32 testy, 2 wpisy,
10 tagów, mapa działa offline.

**Pułapki napotkane w sesji (zapisane też w testach/dokumentach):**
node 22 nie przyjmuje katalogu w `node --test` (autofind bez argumentu);
`pkill -f` może zabić własną powłokę, gdy wzorzec pasuje do wiersza polecenia;
pierwsza wersja fixture TopoJSON myliła delty łuków z pozycją absolutną
(pierwszy delta = punkt absolutny) — test mini-topologii to trwale pilnuje.

**Otwarte po sesji:**
- włączenie GitHub Pages przez właściciela (branch `main`, folder `/`);
- scalenie PR sesji;
- F1 (proces treściowy) czeka na karty od właściciela.

## M2 (2026-08-28) — Pętla Jakości, rygory weryfikacji, pierwsze materializacje na zlecenie

**Kontekst:** właściciel przed scaleniem PR #1 zlecił: (1) domyślną pętlę dla
sesji bez zlecenia — wzorem mtg; (2) twardy rygor: każda karta fetchowana ze
Scryfall, każdy wpis weryfikowany w www, nigdy z pamięci; (3) polerowanie
dokumentacji jako zlecenie sesji (NIE element pętli); (4) usunięcie wpisów
przykładowych i pełną materializację kart Krumar Initiate (TDM) oraz
Forge Devil (DKA). Równolegle właściciel dodał na main `.github/workflows/ci.yml`
i włączył GitHub Pages.

**Decyzje:** ADR 0007 (Pętla Jakości C1↔C2 rekurencyjnie do wyczerpania
budżetu; dokumentacja tylko na zlecenie), ADR 0008 (Scryfall + www, zakaz
pisania z pamięci, weryfikacja każdej pozycji bibliografii).

**Wykonanie (commity 1047089..607487a):** zasady w AGENTS/ENVIRONMENT/
ROADMAP/PROTOKOL + rejestr; pełna procedura dodawania manifestacji w WORKFLOW
+ status CI/Pages; usunięcie wendigo/zmora; pełne wpisy egungun (Krumar
Initiate → kult egúngún, Oyo) i lincoln-imp (Forge Devil → legenda o impie
z katedry Lincoln) z wizualizacjami 21:9 i powiązaniem krzyżowym; testy
przepisane (34/34).

**Zdarzenia operacyjne:** reset workspace między turami (odzysk wg
ENVIRONMENT §2), utrata upstream po odzyskaniu (L5), start pakietu pip po
resecie — commit przeskoczył bez kadrowania obrazów, domknięte następnym
commitem po weryfikacji (L6).

**Otwarte po sesji:** scalenie PR #1; dalsze karty od właściciela; Pętla
Jakości dla kolejnych sesji.
