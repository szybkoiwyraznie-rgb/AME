# 0001 — Statyczna aplikacja vanilla HTML+JS (ESM) bez kroku budowania

- Status: Zaakceptowana
- Data: 2026-08-27
- Kontekst: AME ma „wisieć” na GitHub Pages i działać lokalnie. Właściciel
  określił wprost: vanilla HTML+JS, bez frameworków. Sesje agentskie muszą
  móc pracować na repozytorium bez instalowania zależności i bez builda;
  sandbox ma ograniczony egress (npm działa, reszta sieci nie).
- Decyzja: Aplikacja jest zbiorem statycznych plików serwowanych bezpośrednio:
  `index.html`, moduły ES w `app/*.js`, style w `app/styles.css`, assety w
  `assets/`. Zero zależności runtime, zero bundlera, zero frameworka.
  Jedynymi „zależnościami” są vendoring danych mapy (`assets/map/`) i
  narzędzia deweloperskie Node (`tools/`, `test/`), które nie są potrzebne do
  *działania* aplikacji. `npm run build` oznacza wyłącznie przebudowę
  `data/index.json` z plików wpisów — nie generuje kodu aplikacji.
- Konsekwencje:
  - Aplikacja działa identycznie na Pages i z lokalnego serwera statycznego
    (`python3 -m http.server`); otwarcie `index.html` przez `file://` pokazuje
    baner z instrukcją, bo `fetch()` nie działa pod `file://` (ograniczenie
    przeglądarek, nie błąd aplikacji).
  - Każda funkcja UI jest ręcznie pisana (pan/zoom, panel, filtry) — koszt
    utrzymania rośnie, ale projekt pozostaje przenośny i czytelny dla agentów.
  - Zmiana paradigmatu (framework, build) wymaga wyraźnej decyzji właściciela
    i nowego ADR.
- Powiązania: 0002, 0003
