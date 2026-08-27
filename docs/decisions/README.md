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
| [0003](0003-mapa-samowystarczalna-wektorowa.md) | Samowystarczalna wektorowa mapa świata (Natural Earth/TopoJSON, projekcja walcowa równoodległa) | Zaakceptowana |
| [0004](0004-model-sesji-pr-audyt-inkrementalne-commity.md) | Model sesji: PR, audyt poprzedniego PR, inkrementalne commity | Zaakceptowana |
| [0005](0005-protokol-mfm-i-rama-promptu-21-9.md) | Protokół MFM jako obowiązujący format treści; rama promptu wizualizacji 21:9 | Zaakceptowana |
| [0006](0006-warstwa-wiki-tagi-powiazania.md) | Warstwa wiki: tagi, powiązania przez slugi, backlinki liczone w indeksie | Zaakceptowana |

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
