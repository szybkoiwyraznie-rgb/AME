# PLAN 2026-08-28 (M3) — poprawki z testów właściciela + audyt PR #1

Gałąź: `arena/01a0477a-ame`, PR #2. Tryb: ADR 0007 (A plan → B audyt → C praca);
zlecenie właściciela ma priorytet nad Pętlą Jakości.

## Wejście: zgłoszenie testera

| Punkt | Treść zgłoszenia | Root cause (ustalony w audycie) |
|---|---|---|
| A1 | mapa „rozciągnięta w poziomie”, każdy element szerszy niż powinien | stały viewBox 3600×1800 + `preserveAspectRatio="xMidYMid slice"` + `dopusc()` spinające przesunięcie do zera: przy proporcjach okna ≠ 2:1 świat jest przycinany, a otwarcie panelu (42 vw) zmienia kontener i skalę |
| A2 | brak przełącznika jasny/ciemny | paleta zakodowana w `:root`, kolory mapy wpisane na sztywno w regułach (`ocean`, `kraj`, `siatka`, `lista`) |
| A3 | Rosja „rozlewa się” na dwa poziome pasy przez całą szerokość; gruby równoleżnik na wysokości Madagaskaru | pierścienie przekraczające antypołudnik: Rosja ring 17 (4894 pkt, skoki 359,87° przy i=3713 i 359,93° przy i=4035) i ring 28 (43 pkt, skok 359,88°), Fidżi (10-pkt pierścień na −16,45° = „gruby równoleżnik”), Antarktyda (skok 359,6°) — `sciezka()` łączy je cięciwą przez cały świat |
| A4 | badge nazwy na pinezce nieczytelny | `font-size: 15px` w jednostkach świata przy skali ~0,42 px/j.u. ⇒ ~6 px na ekranie |
| A5 | w pinezkę trudno trafić kursorem | głowa `r=11` j.u. ⇒ ~4,6 px pola trafienia, brak obszaru buforowego |
| B1 | nowa standardowa kolejność sekcji: IV → II → III → V → I | `htmlWpisu` buduje sekcje w kolejności protokołu I–V |
| B2 | wpis jako pełnoekranowa warstwa, zdjęcie na całą szerokość opisu | `.panel.otwarty { width: min(480px, 42vw) }` jako kolumna w `.tresc` |
| B3 | Dokumentacja ma linkować do źródeł / ich opisów w www | schemat `dokumentacja: [{typ, pozycja}]` bez pola adresu |

## Kolejność pracy (każdy krok = zielony commit + push)

1. `dokumenty:` plan sesji + wpis audytu PR #1 w `docs/PROJECT_HISTORY.md`.
2. `aplikacja:` cięcie geometrii na antypołudniku w `app/geo.js` (A3) + testy niezmienników.
3. `aplikacja:` adaptacyjny widok mapy w pikselach kontenera (A1) + czysta `dopasujWidok` + testy; ADR 0009.
4. `aplikacja:` powiększona pinezka + czytelny badge nazwy (A4, A5) + test szerokości badge.
5. `aplikacja:` motyw jasny/ciemny z przełącznikiem w topbarze i tokenami palety (A2) + testy resolvera motywu.
6. `aplikacja + protokół:` kolejność sekcji IV→II→III→V→I jako standard (B1): UI, `docs/PROTOKOL.md`, `docs/WORKFLOW.md`, przykłady, test kolejności.
7. `aplikacja:` pełnoekranowa warstwa wpisu (B2) + `role=dialog` / `aria-modal` + ADR 0010.
8. `narzędzia + dane:` `dokumentacja[].url` w schemacie i walidatorze (B3), linki w UI, adresy zweryfikowane w www (ADR 0008) + pogłębienie wpisów (C1).
9. `ci:` naprawa przepisu workflow (komentarz HTML łamał YAML — punkt 1 audytu) + łatka do ręcznego wklejenia na `main`.
10. `dokumenty:` LESSONS L7/L8, ARCHITECTURE, README, ROADMAP, BACKLOG, handoff M3, domknięcie opisu PR.

## Kryteria akceptacji

- `npm test` i `npm run build` zielone po każdym commicie; indeks zcommitowany razem ze zmianami wpisów.
- Mapa: żaden odcinek ścieżki kraju nie przekracza połowy szerokości świata; 1° szerokości = 1° długości na ekranie przy każdym rozmiarze okna; brak przycinania biegunów przy zoomie 1.
- Wpis: pełnoekranowa warstwa, sekcje w kolejności IV→II→III→V→I, obraz na całą szerokość opisu, Dokumentacja z klikalnymi adresami.
- Przełącznik motywu działa na żywo, wybór przeżywa odświeżenie strony.
