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

## M3 (2026-08-28) — audyt PR #1 + poprawki z testów właściciela (A1–A5, B1–B3)

**Kontekst:** PR #1 scalony (merge `25b1615`). Właściciel w pierwszym prompcie
przekazał zgłoszenie testera (mapa: proporcje, motyw, artefakt Rosji, rozmiar
pinezki i badge’a; wpis: kolejność sekcji, pełnoekranowa warstwa, linki
źródłowe). Sesja realizuje najpierw obowiązkowy blok dokumentacyjny (plan +
audyt), potem zlecenie, potem Pętlę Jakości.

**Audyt scalonego PR #1** (`git diff 2f9b5e7..7c48013`, 56 plików, plik po
pliku; testy `npm test` 34/34 zielone, `npm run check` spójny):

1. **KRYTYCZNE — CI nie działa.** `.github/workflows/ci.yml` na `main` zaczyna
   się od bloku `<!-- … -->` przeniesionego z przepisu
   `docs/setup/ci-workflow.yml`; to nie jest komentarz YAML, więc GitHub nie
   wczytuje workflow. Runy `33148046060`, `33150562702`, `33155771652`:
   `failure` w 0 s, zero jobs, brak logów. Brama `npm test` + aktualność
   `data/index.json` **nie jest egzekwowana** na `main` ani na PR-ach.
   Naprawa: usunąć blok komentarza HTML z pliku na `main` (agent nie ma prawa
   pisać do `.github/workflows/` — decyzja/łatka właściciela; przepis w repo
   poprawiony w tym PR).
2. `app/geo.js` nie obsługuje antypołudnika. Zmierzono w danych
   `assets/map/countries-50m.json`: Rosja (pierścień 17: 4894 pkt, skoki
   359,87° i 359,93°; pierścień 28: 43 pkt, skok 359,88°), Fidżi (pierścień
   10-pkt na −16,45°, skok 360°), Antarktyda (skok 359,6°). Prosta projekcja
   walcowa zmienia taki skok w cięciwę przez całą mapę ⇒ pozorne pasy
   („rozlana Rosja”) i „gruby równoleżnik” na wysokości Madagaskaru to w
   rzeczywistości sliver Fidżi. Zgłoszenia A3 = ten sam root cause.
3. `app/map.js`: viewBox świata jest stały (3600×1800) z
   `preserveAspectRatio="…slice"`, a `dopusc()` spina przesunięcia do 0 przy
   k=1 ⇒ świat jest przycinany (bieguny przy oknach szerszych niż 2:1,
   długości przy węższych), otwarcie panelu (42 vw) zmienia kontener i powoduje
   skok skali. Zgłoszenie A1.
4. Jednostki renderu: `.etykieta { font-size: 15px }` żyje w jednostkach świata
   (skala ~0,42 px/j.u.) ⇒ ~6 px na ekranie (A4); pinezka `r=11` j.u. ⇒ ~4,6 px
   (A5); `.siatka` bez `vector-effect: non-scaling-stroke` ⇒ siatka grubieje
   przy zbliżeniu.
5. Testy nie pilnowały tego, co się popsuło: `mapa-dane.test.js` nie sprawdzał
   spójności ścieżek z zakresem świata ani skoków długości, `ui.test.js` nie
   pilnował kolejności sekcji. Domknięte w tym PR.
6. Zastrzeżeń merytorycznych brak: zapis wpisów zgodny z PROTOKÓŁ v1.1 i
   ADR 0002/0005/0006 (walidator ramy 21:9, slugi, powiązania, backlinki),
   HTML UI escapowany, indeks deterministyczny, zero zależności runtime (ADR
   0001). Drobne: `docs/setup/ci-workflow.yml` (receptura) zalega w repo po
   włączeniu CI na `main`; ROADMAP F2 dalej pokazuje „deep-linki” jako otwarte, choć
   `#<slug>` działa od sesji M1 (poprawione w tym PR).

**Wnioski dla zasad:** audyt poprzedniego PR musi obejmować **uruchomienie
bram** (CI/status workflow), nie tylko diff — stąd L7/L8 i zmiana w przepisach
`docs/setup/ENVIRONMENT.md` (pkt checklisty).

**Wykonanie M3 (commity `fa45ad7..ff64331`, PR #2):**

- mapa: `potnijPierscien` (A3), `dopasujWidok` + ResizeObserver i viewBox w px
  kontenera (A1), pinezka ø26 px z polem trafienia ø52 px i badgiem 19 px
  liczonym z pomiaru tekstu (A4/A5), `vector-effect` na siatce;
- UI: motyw jasny/ciemny przez tokeni CSS + przełącznik i strażnik w `<head>`
  (A2), kartoteka jako pełnoekranowy `dialog` (B2), sekcje w numeracji =
  kolejność (B1 + uściślenie: v1.3, ADR 0012), linki źródłowe w sekcji III (B3);
- dane: `dokumentacja[].url` w schemacie i walidatorze, adresy wszystkich
  źródeł w obu wpisach zweryfikowane w sieci (ADR 0011), pogłębienie
  lincoln-imp (datowanie Angel Choir 1250–1280, bałda 1897, przysłowie 1562,
  motyw wiatru) i egungun (autor i czasopismo Akande 2019, ará òrun kìn-ìn
  kin-in);
- nowe podsystemy: **Baza Skitów** (dane + walidator + sekcja VI + widok,
  ADR 0013) i **„Co nowego”** (feed z `meta`, ADR 0014); pierwszy SKIT
  „PŁÓTNO I KAMIEŃ” (Egungun × Imp z Lincoln, 241 słów, unikalny skład);
- narzędzia: indeks v2 (`skity`, `manifestacje[].skity`, `aktualizacje`),
  `REZERWOWANE_SLUGI`, testy 88;
- zasady: PROTOKÓŁ v1.3 (§4.1/§4.4/§4.5, §8 SKITy, §9 dziennik), AGENTS
  (C3 w pętli, rygory skitów, obowiązek `meta.modyfikacje`), WORKFLOW
  (procedura skitu, checklista podglądu), ARCHITECTURE, README, ROADMAP,
  BACKLOG, LESSONS L7–L10, ENVIRONMENT (kontrola bramy CI), ADR 0009–0014.

**Zdarzenia operacyjne:** push naprawczego `.github/workflows/ci.yml` odrzucony
przez GitHub (token bez uprawnień `workflows`) — commit wycofany, receptura i
opis łatki w `docs/setup/ci-workflow.yml`, decyzja po stronie właściciela.

**Otwarte po sesji M3:** scalenie PR #2; łatka `ci.yml` na `main`; kolejny SKIT
wymaga nowych materializacji (przy dwóch kartach istnieje jeden dozwolony skład).
