# 0010 — Motyw jasny/ciemny przez tokeny CSS i kartoteka jako pełnoekranowa warstwa

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Aplikacja była pisana w jednej, ciemnej palecie z barwami wpisanymi
  w reguły (mapa: ocean, ląd, siatka; nakładki: `#0d1015e6` itd.). Właściciel
  (testy 2026-08-28) prosił o (A2) przełącznik trybu jasny/ciemny w prawym
  górnym rogu, zmieniający CSS na żywo, oraz (B2) otwieranie kartoteki jako
  warstwy przykrywającej całe okno — dotychczasowa kolumna `min(480px, 42vw)`
  nie dawała miejsca na wizualizację 21:9 i jednocześnie zawężała kontener mapy
  (por. ADR 0009).
- Decyzja:
  1. **Paleta wyłącznie przez tokeny.** Wszystkie barwy (także barvy SVG mapy)
     są zmiennymi CSS na `:root`; motyw jasny to nadpisanie tokenów w
     `html[data-motyw='jasny']` wraz z `color-scheme: light`. Brak drugiego
     arkusza, brak reguł zależnych od kolejności, zero zależności runtime
     (ADR 0001).
  2. **Przełącznik**: przycisk w `.akcje` (prawa strona górnego paska), logika
     rozstrzygająca motyw jest czysta i testowana w Node (`nastepnyMotyw`,
     `motywPoczatkowy`, `etykietaMotywu` w `app/ui.js`). Domyślnie ciemny
     (tożsamość „archiwum”), wybór użytkownika w `localStorage` pod
     `ame:motyw`, start od `prefers-color-scheme`, zapisanie decyzji usuwa
     posłuszeństwo systemowi. Strażnik w `<head>` (przed arkuszem stylów)
     ustawia atrybut przed pierwszym malowaniem, żeby przeładowanie nie mignęło
     złym tłem; pamięć niedostępna (tryb prywatny) nie psuje UI.
  3. **Kartoteka = warstwa.** `#panel` to `position: fixed; inset: 0` z rolą
     `dialog`, `aria-modal="true"`, własnym przyciskiem zamknięcia i animacją
     wejścia poszanowaną `prefers-reduced-motion`. Rusztowanie warstwy buduje
     czysty `htmlWarstwyWpisu()` (testowane), treść — `htmlWpisu()`.
     Głębokie linki `#<slug>` działają jak dotąd; fokus wraca do elementu,
     który otworzył wpis.
  4. **Wizualizacja w pełni**: w warstwie obraz ma szerokość opisu (do
     1180 px), typografia rośnie (16 px, nagłówek 46 px). Na małych ekranach
     warstwa zastępuje bottom-sheet.
- Konsekwencje:
  - Każdy nowy kolor w UI musi iść przez token — w innym razie zniknie albo
    będzie nieczytelny w drugim motywie (reguła w `docs/ARCHITECTURE.md`).
  - Mapa pod warstwą przestaje być widoczna podczas czytania wpisu, więc
    środkowanie pinezki robimy „na zapas” — po zamknięciu wpis jest tam, gdzie
    był kliknięty.
  - Testy jednostkowe nie widzą CSS: wygląd drugiego motywu sprawdzamy
    kontraktami w `test/ui.test.js` (obecność tokenów, `color-scheme`, atrybut
     warstwy) i podglądem właściciela; pełny przegląd wizualny pozostaje w
    F2/backlogu.
- Powiązania: 0001, 0003, 0009, 0011
