# Rejestr decyzji architektonicznych (ADR)

ADR zapisują decyzje, których nie powinno się odtwarzać z historii czatu.
Każdy dokument opisuje kontekst, wybór i jego konsekwencje.

## Statusy

- **Proponowana** — kierunek do dyskusji; nie jest jeszcze zobowiązaniem.
- **Zaakceptowana** — obowiązuje w projekcie.
- **Odrzucona** — rozważona, ale nieprzyjęta.
- **Zastąpiona** — historyczna; nowszy ADR wskazuje aktualną decyzję.
- **Wycofana** — nie ma już zastosowania.

## Decyzje

| ADR | Tytuł | Status |
| --- | --- | --- |
| [0001](0001-vanilla-static-app-no-build.md) | Statyczna aplikacja vanilla HTML+JS (ESM) bez kroku budowania (Pages + wersja lokalna) | Zaakceptowana |
| [0002](0002-dane-wpisow-json-generowany-indeks.md) | Wpisy jako pliki JSON + generowany `data/index.json` | Zaakceptowana |
| [0003](0003-mapa-samowystarczalna-wektorowa.md) | Samowystarczalna wektorowa mapa świata (Natural Earth/TopoJSON, Web Mercator) | Zaakceptowana |
| [0004](0004-model-sesji-pr-audyt-inkrementalne-commity.md) | Model sesji: PR, audyt poprzedniego PR, inkrementalne commity | Zaakceptowana |
| [0005](0005-protokol-mfm-i-rama-promptu-21-9.md) | Protokół MFM jako obowiązujący format treści; rama promptu wizualizacji 21:9 | Zaakceptowana |
| [0006](0006-warstwa-wiki-tagi-powiazania.md) | Warstwa wiki: tagi, powiązania przez slugi, backlinki liczone w indeksie | Zaakceptowana |
| [0007](0007-domyslna-petla-jakosci-c1-c2.md) | Domyślna pętla sesji: Pętla Jakości (C1 treść ↔ C2 featury) do wyczerpania budżetu | Zaakceptowana |
| [0008](0008-obowiazkowa-weryfikacja-scryfall-www.md) | Obowiązkowa weryfikacja zewnętrzna: Scryfall dla kart, źródła www dla wpisów | Zaakceptowana |
| [0009](0009-adaptacyjny-widok-mapy-i-ciecie-na-szwie.md) | Adaptacyjny widok mapy w pikselach kontenera i cięcie geometrii na antypołudniku | Zaakceptowana |
| [0010](0010-motyw-jasny-ciemny-i-pelnoekranowa-warstwa-kartoteki.md) | Motyw jasny/ciemny przez tokeny CSS i kartoteka jako pełnoekranowa warstwa | Zaakceptowana |
| [0011](0011-protokol-v1-2-kolejnosc-sekcji-i-adresy-zrodel.md) | Protokół MFM v1.2: kolejność prezentacji sekcji i adres źródła w dokumentacji | Zaakceptowana (pkt o numerach zastąpiony przez 0012) |
| [0012](0012-numeracja-sekcji-zgodna-z-kolejnoscia.md) | Numeracja sekcji wpisu zgodna z ich kolejnością (protokół MFM v1.3) | Zaakceptowana |
| [0013](0013-baza-skitow-i-sekcja-vi.md) | Baza Skitów: nowy typ danych, sekcja VI wpisu i krok C3 pętli | Zaakceptowana |
| [0014](0014-co-nowego-feed-z-meta.md) | „Co nowego”: dziennik zmian wyliczany z pola meta | Zaakceptowana |
| [0015](0015-limit-dlugosci-skitow-300-slow.md) | Limit długości SKITa: 300 słów (protokół MFM v1.4) | Zaakceptowana |
| [0016](0016-kanon-tagow-i-prezentacja-pasmami.md) | Kanon tagów jako dane źródłowe i prezentacja pasmami kategorii | Zaakceptowana |
| [0017](0017-data-z-godzina-w-meta-co-nowego-v1-5.md) | Data zdarzeń w meta z godziną; „Co nowego” podaje datę i godzinę (protokół MFM v1.5) | Zaakceptowana |
| [0018](0018-ton-skitow-humor-i-codziennosc-v1-6.md) | Ton SKITów: humor, luz i codzienność jako pełnoprawny rejestr (protokół MFM v1.6) | Zaakceptowana |
| [0019](0019-skity-wieloosobowe-i-opis-powiazania.md) | SKITy 3–4-osobowe jako preferowane i twardy wymóg opisu powiązania (protokół MFM v1.7) | Zaakceptowana |
| [0020](0020-warstwy-tematyczne-mapy.md) | Warstwy tematyczne mapy (woda, miasta) i LOD treści | Zaakceptowana |
| [0021](0021-kronika-mechanizm-paliwa-i-konsekwencji.md) | Kronika: mechanizm paliwa, konsekwencje i pierwsza epoka | Zaakceptowana |

## Szablon ADR

```markdown
# NNNN — <tytuł>

- Status: <Proponowana | Zaakceptowana | Odrzucona | Zastąpiona | Wycofana>
- Data: <RRRR-MM-DD>
- Kontekst: <siły, problem, ograniczenia>
- Decyzja: <co przyjmujemy>
- Konsekwencje: <co z tego wynika, w tym koszty i ryzyka>
- Powiązania: <numery innych ADR-ów>
```

Numeracja: kolejna wolna liczba czterocyfrowa. Rejestr aktualizuj w tej tabeli
w tym samym commicie, w którym dodajesz ADR.

## Gdzie zapisać regułę (ADR vs PROTOKÓŁ vs LESSONS vs handoff)

Reguły trwałe nie mogą mieszkać w handoffie — handoff opisuje JEDNĄ sesję
i traci aktualność. Podział:

| Rodzaj treści | Miejsce |
| --- | --- |
| Wiążąca decyzja o granicach, danych, mapie, deploymencie | **ADR** (`docs/decisions/`) |
| Format wpisu, szablon promptu, rygory treści | **`docs/PROTOKOL.md`** |
| Powtarzalna pułapka, wniosek diagnostyczny | **`docs/LESSONS.md`** |
| Zasada obowiązująca każdego agenta | **`AGENTS.md`** |
| Stałe ograniczenie środowiska | **`docs/setup/ENVIRONMENT.md`** |
| Stan jednej sesji | `docs/setup/HANDOFF_*.md` |
| Pomysł „może kiedyś” | `docs/BACKLOG.md` |
