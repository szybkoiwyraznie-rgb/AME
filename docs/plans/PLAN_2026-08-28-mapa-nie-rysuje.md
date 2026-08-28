# PLAN 2026-08-28 (M5) — mapa przestała się rysować po PR #2 + audyt

Gałąź: `arena/01a0482e-ame`. Tryb: ADR 0004 (A plan/PR → B audyt → C praca);
zlecenie właściciela ma priorytet nad Pętlą Jakości (ADR 0007).

## Wejście: zgłoszenie właściciela

> „napraw mapę, która po ostatnim PR przestała w ogóle się rysować”

Zgłoszenie dotyczy PR #2 (M3: A1–A5 mapa, B1–B3 wpis). PR #3 (scalony najpóźniej)
zmieniał wyłącznie `.github/workflows/ci.yml` (jednorazowa naprawa właściciela),
więc audyt kodu obejmuje PR #2, a audyt stanu — także PR #3.

## Diagnoza (ustalona w przeglądarce, nie z czytania kodu)

Objaw: w `#mapa` widać wyłącznie tło oceanu — ani jednego konturu lądu, ani
pinezki, brak błędu w konsoli, `npm test` 108/108 zielone.

Pomiary na żywym DOM (headless Chromium 1440×900, kontener mapy 1440×724):

| Obserwacja | Wartość |
|---|---|
| `path.kraj` w drzewie | 241 (geometria jest) |
| `getBBox()` grupy świata | 0, 0, 3600, 1800 (poprawny świat) |
| `getBoundingClientRect()` grupy świata | 0, 0, **0, 0** |
| `getComputedStyle(g.warstwa).display` | **`none`** |
| `getComputedStyle(g.warstwa).transform` | `matrix(0.4, 0, 0, 0.4, 0, 2)` (poprawny) |
| `elementFromPoint(środek)` | `rect.ocean` (ocean jest dzieckiem `<svg>`, nie grupy) |

**Root cause:** kolizja nazwy klasy między dwoma komponentami.

- `app/map.js:65` — grupa świata wewnątrz SVG dostaje `class: 'warstwa'`
  (warstwa mapy: siatka + kraje + łuki + pinezki);
- `app/styles.css:460` — `.warstwa { position: fixed; inset: 0; display: none; }`
  to **pełnoekranowa nakładka UI** wprowadzona przez ADR 0010 (Baza Skitów /
  „Co nowego” / treść nakładki), a nie warstwa mapy.

Nakładka jest domyślnie ukryta (`display: none`, pokazuje ją `.warstwa.otwarta`),
więc reguła „przykryła” całą zawartość mapy: świat istnieje w drzewie i w
`getBBox()`, ale nie jest malowany. Dlaczego nie złapały tego testy: atrapa DOM
w `test/pinezka.test.js` nie liczy CSS (nie ma kaskady), a niezmienniki
`test/geo.test.js` patrzą na geometrię, nie na render — brakowało testu
sprzęgającego klasy renderu mapy z arkuszem stylów.

## Kolejność pracy (każdy krok = zielony commit + push)

1. `dokumenty:` ten plan + wpis audytu PR #2/#3 w `docs/PROJECT_HISTORY.md`.
2. `testy:` test odtwarzający błąd — kontrakt „żadna klasa nadawana elementom
   renderu mapy nie jest selektorem reguły ukrywającej element” (skan
   `app/styles.css` + `app/map.js`), plus asercja, że grupa świata ma klasę
   nieobecną w regułach układu strony.
3. `aplikacja:` naprawa u źródła — grupa świata zmienia klasę z `warstwa` na
   `swiat`; nazwy zmiennych/komentarzy dostosowane; selektor nakładki
   doprecyzowany do elementu (`div.warstwa`), żeby kolizja nie wróciła z innej
   strony. Bez warunków-specjalnych i bez `!important`.
4. `weryfikacja:` przegląd na żywo (headless Chromium): lądy mają niezerowy
   `getBoundingClientRect()`, pinezki klikalne, zoom/pan/reset działa, oba motywy.
5. `dokumenty:` LESSONS (nowa lekcja o kolizji klas CSS↔SVG i o ślepocie
   testów na atrapie DOM), `docs/setup/HANDOFF_2026-08-28-M5.md`, opis PR.

## Kryteria akceptacji

- `npm test` i `npm run build` zielone po każdym commicie.
- W przeglądarce: ≥ 240 ścieżek krajów z niezerowym `getBoundingClientRect()`,
  6 pinezek, klik w pinezkę otwiera kartotekę, zoom kółkiem i przyciskami
  zmieniają `k`, reset wraca do `k = 1`.
- Nowy test kontraktowy nie przechodzi na kodzie sprzed naprawy (sprawdzone
  przez cofnięcie zmiany w `app/map.js`).
- Żadna reguła CSS z `display: none` nie dotyczy klasy używanej w SVG mapy.
