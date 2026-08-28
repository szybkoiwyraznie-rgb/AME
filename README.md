# AME — Archiwum Manifestacji Eterycznych

Interaktywna mapa świata z kartoteką **manifestacji eterycznych** — bytów z
mitologii, folkloru i legend miejskich, zidentyfikowanych za pomocą kart
Magic: The Gathering. Każda karta jest traktowana jako „odcisk” pozwalający
namierzyć realną emanację w naszym świecie; wynikiem jest wpis w kartotece
(zob. `docs/PROTOKOL.md`).

## Cechy

- **Mapa świata bez zewnętrznych serwerów** — wektorowa (Natural Earth),
  własny pan/zoom: przeciąganie, kółko myszy, pinch na telefonie, dwuklik.
- **Pinezki manifestacji** — kliknięcie otwiera pełną kartotekę bytu
  (rezonans z kartą, natura i słabości, źródła, prompt wizualizacji, trofea).
- **Warstwa wiki** — tagi, powiązania między bytami (łuki na mapie) i
  backlinki liczone automatycznie.
- **Wizualizacje 21:9** — kinowe, hiperrealistyczne portęty środowiskowe
  generowane z promptów zapisanych w wpisach.
- **Czysta statyka** — vanilla HTML+JS+CSS, zero zależności, zero builda
  aplikacji; działa na GitHub Pages i lokalnie.

## Uruchomienie lokalne

```bash
npm run build                              # przebuduj data/index.json (opcjonalnie na start)
python3 -m http.server 8000 --bind 0.0.0.0
# otwórz http://localhost:8000
```

Bez serwera (`file://`) aplikacja pokaże baner z instrukcją — przeglądarki
blokują `fetch()` dla plików lokalnych.

## Repozytorium

| Ścieżka | Zawartość |
|---|---|
| `AGENTS.md` | **zasady pracy agentów — lektura startowa każdej sesji** |
| `docs/PROTOKOL.md` | protokół MFM: format wpisów, rama promptu 21:9 |
| `docs/decisions/` | rejestr decyzji architektonicznych (ADR) |
| `docs/ROADMAP.md` | fazy prac i status (+ Pętla Jakości) |
| `docs/WORKFLOW.md` | **procedura: dodanie manifestacji z karty, krok po kroku** |
| `data/manifestations/` | wpisy manifestacji (źródło prawdy treści) |
| `data/index.json` | indeks GENEROWANY (`npm run build`) |
| `app/`, `index.html` | aplikacja |
| `assets/` | mapa, wizualizacje (licencje: `docs/ASSETS.md`) |
| `tools/`, `test/` | walidacja danych + testy (`npm test`) |

## GitHub Pages (aktywne)

Aplikacja jest publikowana z gałęzi `main`:
<https://szybkoiwyraznie-rgb.github.io/AME/>.
CI (`.github/workflows/ci.yml`) na każdym PR uruchamia `npm test` + build
i pilnuje aktualności `data/index.json`.
