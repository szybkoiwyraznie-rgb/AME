# AME — Archiwum Manifestacji Eterycznych

Interaktywna mapa świata z kartoteką **manifestacji eterycznych** — bytów z
mitologii, folkloru i legend miejskich, zidentyfikowanych za pomocą kart
Magic: The Gathering. Każda karta jest traktowana jako „odcisk” pozwalający
namierzyć realną emanację w naszym świecie; wynikiem jest wpis w kartotece
(zob. `docs/PROTOKOL.md`).

## Cechy

- **Mapa świata bez zewnętrznych serwerów** — wektorowa (Natural Earth),
  własny pan/zoom: przeciąganie, kółko myszy, pinch na telefonie, dwuklik.
  Uczciwe proporcje w Web Mercator (jak Google Maps — Polska nie jest
  „spłaszczona”), geometria krajów cięta na antypołudniku (ADR 0003/0009),
  klik w miasto pokazuje jego nazwę.
- **Motyw jasny i ciemny** — przełącznik w górnym pasku zmienia CSS na żywo;
  wybór zapamiętywany, start od preferencji systemu (ADR 0010).
- **Pinezki manifestacji** — kliknięcie otwiera kartotekę bytu jako
  pełnoekranową warstwę: wizualizacja na całą szerokość, natura i słabości,
  źródła, trofea, na końcu klucz przywołania (PROTOKÓŁ §4.1).
- **Źródła z adresami** — sekcja Dokumentacja linkuje do źródeł lub ich opisów
  w sieci; walidator wymaga co najmniej jednego adresu na wpis (ADR 0011).
- **Warstwa wiki** — tagi z kanonu (pasek ułożony pasmami: kultura źródłowa,
  typ bytu, motyw, postać — z licznikami i opisami w podpowiedziach), powiązania
  między bytami (łuki na mapie) i backlinki liczone automatycznie. Deep-link: `/#<slug>`, a w kartotece i w
  widoku skitu przycisk „⧉ kopiuj link" do wysłania adresu dalej.
- **Baza Skitów** — krótkie dialogi materializacji (proza w stylu przerywników
  z gier fabularnych): przycisk „✎ skity", pod każdym bytem sekcja VI z jego
  rozmowami, deep-link `#skit:<slug>`. Walidator pilnuje limitu 300 słów i
  tego, by żadne dwa skity nie miały tego samego składu (ADR 0013).
- **Co nowego** — przycisk „✚ nowości": dziennik zmian wyliczany z pola `meta`
  wpisów i skitów, najnowsze na górze, każda pozycja linkuje do treści
  (ADR 0014).
- **Wizualizacje 21:9** — kinowe, hiperrealistyczne portęty środowiskowe
  generowane z promptów zapisanych w wpisach.
- **Czysta statyka** — vanilla HTML+JS+CSS, zero zależności, zero builda
  aplikacji; działa na GitHub Pages i lokalnie.

## Uruchomienie lokalne

```bash
npm run build                              # przebuduj data/index.json (opcjonalnie na start)
python3 -m http.server 8000 --bind 0.0.0.0
# otwórz http://localhost:8000   (widoki: /#egungun, /#skit:<slug>, /#nowosci)
```

Bez serwera (`file://`) aplikacja pokaże baner z instrukcją — przeglądarki
blokują `fetch()` dla plików lokalnych.

## Repozytorium

| Ścieżka | Zawartość |
|---|---|
| `AGENTS.md` | **zasady pracy agentów — lektura startowa każdej sesji** |
| `docs/PROTOKOL.md` | protokół MFM v1.7: format i kolejność sekcji, rama promptu 21:9 |
| `docs/decisions/` | rejestr decyzji architektonicznych (ADR) |
| `docs/ROADMAP.md` | fazy prac i status (+ Pętla Jakości) |
| `docs/WORKFLOW.md` | **procedura: dodanie manifestacji z karty, krok po kroku** |
| `data/manifestations/` | wpisy manifestacji (źródło prawdy treści) |
| `data/skity/` | Baza Skitów — dialogi materializacji (sekcja VI kart) |
| `data/index.json` | indeks GENEROWANY (`npm run build`) |
| `app/`, `index.html` | aplikacja |
| `assets/` | mapa, wizualizacje (licencje: `docs/ASSETS.md`) |
| `data/kanon-tagow.json` | słownik tagów (kategorie, limity, opisy) |
| `tools/`, `test/` | walidacja danych + testy (`npm test`) |

## GitHub Pages (aktywne)

Aplikacja jest publikowana z gałęzi `main`:
<https://szybkoiwyraznie-rgb.github.io/AME/>.
CI (`.github/workflows/ci.yml`) na każdym PR uruchamia `npm test` + build
i pilnuje aktualności `data/index.json`.
