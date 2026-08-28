# PLAN sesji M6 (2026-08-28) — badge pinezek A1–A3 + godzina w „Co nowego” (B)

Zlecenie właściciela (czat sesji). Gałąź: `arena/01a04853-ame`, PR: [M6].

## Zakres

### A. Mapa

| Nr | Zgłoszenie | Kierunek naprawy |
|---|---|---|
| A1 | Badge z nazwą manifestacji pojawia się na stałe od pewnego zoomu (k≥2, klasa `przyblizona`); ma się pokazywać tylko po najechaniu | usunięcie reguły `.mapa-svg.przyblizona …` i toggle klasy w `app/map.js`; etykieta = hover / fokus / zaznaczenie |
| A2 | Click-and-drag po mapie zaznacza teksty badge'ów | `user-select: none` (z prefiksem `-webkit-`) na `.mapa-svg` — tekst w SVG mapy nie jest dokumentem do zaznaczania |
| A3 | Badge jednej pinezki chowa się pod inną pinezką; ma być odwrotnie | grupa malowania: nowa grupa `etykiety` jako **ostatnie dziecko** grupy świata (SVG maluje w kolejności dokumentu) — wszystkie badge nad wszystkimi pinezkami; stany (hover/fokus/wybrana/przygaszona) przenoszone klasami na element etykiety |

### B. „Co nowego”

Data **i godzina** aktualizacji: `meta.utworzono` / `meta.modyfikacje[].data`
przyjmują `RRRR-MM-DD` albo `RRRR-MM-DD GG:MM` (walidator, kompatybilnie
wstecz), feed sortuje czasem przed sekwencją, `htmlNowosci` renderuje
datę+godzinę. Decyzja formatowa → **ADR 0017** + PROTOKÓŁ §9 + `AGENTS.md` §3.

## Kolejność commitów

1. Ten plan (porządkowy) → push → PR.
2. A1+A2+A3: najpierw kontrakty testowe, potem `app/map.js` + `app/styles.css`.
3. B: ADR 0017, walidator + sort, render UI, dokumenty zasad (PROTOKÓŁ, AGENTS).
4. `docs/PROJECT_HISTORY.md` (sekcja M6), handoff, ewentualne LESSONS.

Każdy commit: `npm test` + `npm run build` zielone, push natychmiast (ADR 0004).
