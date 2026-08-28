# PROTOTYP: pierwsza epoka KRONIKI — „Znak burzy”

> Status: **koncepcyjny prototyp, nie dane produkcyjne.** Wpisuje się w Pętlę
> Jakości (za zgodą właściciela: zamiast nowej featurki — twórczy rozwój idei
> KRONIKI). Nie wpinamy tego do builda ani UI; to materiał do decyzji, czy
> kierunek „SKIT + skutek” (§ KONCEPCJA, P3/P7) naprawdę daje się zrealizować.
> Brak kodu gry zgodnie z M13 — dopóki koncepcja nie zostanie przyjęta.

## 1. Co chcieliśmy sprawdzić

Koncepcja SPLOT/KRONIKA (§2 i §4 `POMYSL_splot-i-kronika-koncepcja.md`)
wskazuje, że wydarzeniem świata powinno być **wcielone spotkanie + skutek**.
Dotąd mieliśmy tylko SKIT-y, czyli warstwę B (rozmowa). Poniżej pierwsza
próba domknięcia pętli na realnym materiale z repozytorium:

1. **P3 (czym jest wydarzenie)** — czy da się opisać „SKIT + skutek” tak, żeby
   dało się to zapisać jako dane i nie wymyślać nowej maszynerii?
2. **P7 (format epoki)** — jak wygląda minimalny rekord `data/kronika/…`?
3. **P9 (kanoniczność)** — czy prototypowe epoki można trzymać jako osobną,
   „narratorską” warstwę, którą wolno odrzucić bez ruszania kart bytów?

Wszystkie trzy odpowiedzi są tu **propozycją do dyskusji**, nie decyzją.

## 2. Wybrany materiał

Używamy SKIT-u **„Znak burzy”** (`data/skity/znak-burzy.json`, C3 z poprzedniej
Pętli Jakości): Indra × Drangue × Barbarossa. To świadome posunięcie — ten
SKIT już był pisany jako prototyp KRONIKI (embodiment, trzy różne dossier),
więc powtórzenie go w roli „epoki” jest najtańszym możliwym testem: **nie
piszemy nowej rozmowy, tylko sprawdzamy, czy z gotowej rozmowy da się wywieść
stan świata A.**

Role uczestników wyliczone z istniejącej mechaniki (`profileKartoteki`):

| byt | archetyp | co to znaczy w tym spotkaniu |
|---|---|---|
| `indra` | Drapieżnik | tnie, atakuje, chce rozstrzygnięcia teraz |
| `drangue-shala` | Pieśniarz | żyje w rozmowach i tradycji; oddaje głos wspólnocie |
| `barbarossa-kyffhaeuser` | Filar | trzyma strukturę; czeka i pilnuje terminu |

## 3. Konkretny rekord (szkic, nie jeszcze plik)

```
data/kronika/epoka-1-znak-burzy.json

{
  "slug": "epoka-1-znak-burzy",
  "epoka": 1,
  "rodzaj": "prototyp",
  "skit": "znak-burzy",
  "uczestnicy": [
    { "slug": "indra", "rola": "Drapieżnik" },
    { "slug": "drangue-shala", "rola": "Pieśniarz" },
    { "slug": "barbarossa-kyffhaeuser", "rola": "Filar" }
  ],
  "iskra": "Trzy doliny milczą — nad Gomati, nad Shali i nad Kyffhäuserem deszcz
            nie pada. Każdy z trzech bytów widzi inny znak: Indra suszę i
            otwarte niebo, drangue cień kulshedry pod wodą, Barbarossa kruki,
            które jeszcze nie odleciały.",
  "przebieg": [
    { "typ": "zrodlo", "sciezka": "data/skity/znak-burzy.json" },
    { "typ": "sad", "tekst": "Indra chce ciąć, Barbarossa czeka; drangue odbiera
            obu prawo do bycia panem burzy i zwraca ją wspólnocie." },
    { "typ": "obserwacja", "tekst": "Grzmot przychodzi trzykrotnie, ale nikt
            nie otwiera nieba. Spotkanie kończy się rozejmem, nie zwycięstwem." }
  ],
  "skutek": {
    "relacje": [
      { "para": ["indra", "drangue-shala"],
        "zmiana": "indeks",
        "opis": "Indra przyjmuje drangue jako równego wysłannika burzy; powstaje
                 zobowiązanie: staną razem, gdy kulshedra naprawdę wyjdzie." },
      { "para": ["indra", "barbarossa-kyffhaeuser"],
        "zmiana": "schlodzenie",
        "opis": "Drwina zostaje, ale Indra przestaje nazywać czekanie tchórzostwem;
                 to pierwszy pęknięty kant, nie przyjaźń." },
      { "para": ["drangue-shala", "barbarossa-kyffhaeuser"],
        "zmiana": "uznanie",
        "opis": "Barbarossa nazywa drangue „domem”; po raz pierwszy widzi w
                 drugim bycie nie wojownika, ale pamięć miejsca." }
    ],
    "tereny": [],
    "zasob": {
      "znak": "nierozstrzygnięty",
      "opis": "Nikt nie zdobywa pola. Świat zostaje w zawieszeniu; rachunek
               burzy wisi nad trzema dolinami."
    }
  },
  "meta": {
    "utworzono": "2026-08-28 23:59",
    "autor": "sesja arena 2026-08-28 (Pętla Jakości, prototyp)",
    "typ": "koncepcyjny",
    "status": "do decyzji właściciela"
  }
}
```

## 4. Kronikarz zapisuje (narratorsko, obok danych)

> Świat, który zobaczyłby obserwator w tej epoce.

Susza nie biła w słońce — biła w milczenie. Trzy doliny czekały na deszcz
i każda czekała inaczej: na Gangesie ktoś rozcinał chmurę, w Albanii
wychodziły się patrzeć w rzekę, a pod Kyffhäuser nie pytano, tylko wsłuchiwano,
czy kruki już zniknęły.

Wtedy usłyszeli siebie nawzajem. Bóg z tysiącem oczu powiedział, że on nie
czeka — on robi. Skrzydlaty mężczyzna z Shali powiedział, że nie robi się
samemu, bo kulshedra tylko na to czeka. Cesarz powiedział, że powrót to nie
pośpiech, tylko posłuszeństwo.

Grzmot przyszedł trzy razy. Nikt nie otworzył nieba. I właśnie w tym było
pierwsze wydarzenie KRONIKI: **nie ten, kto ma moc, rozstrzyga, tylko ten,
kto potrafi czekać razem z miejscem.** Z tego rachunku nie zrodziła się jeszcze
walka, ale zrodził się dług: trzech bytów, które teraz wiedzą o sobie i o
wodzie, że nie należą do nikogo z nich.

## 5. Co to daje koncepcji (wnioski, nie decyzje)

- **P3 — wydarzenie = SKIT + skutek:** działa. SKIT już przechowuje pełny
  „przebieg”; epoka nie musi duplikować replik, wystarczy odwołanie do niego.
  To oszczędza miejsce i trzyma jeden kanoniczny dialog.
- **P7 — minimalny format:** proponowane pola to `skit`, `iskra`, `uczestnicy`
  (z rolami z `profileKartoteki`), `przebieg` (odwołanie + ślad + obserwacja),
  `skutek`, `meta`. Zero nowych typów poza tym, co już mamy (dane w repo,
  `meta` jak w wpisach/skitach — ADR 0017).
- **P9 — kanoniczność:** prototyp trzymamy jako *osobną, opcjonalną warstwę*.
  Nie modyfikuje `powiazania` ani `tagi` kart — skutek jest opisem narracji,
  nie faktem w archiwum. Gdy właściciel odrzuci epokę, wystarczy nie brać
  pliku do indeksu.
- **Czego jeszcze brakuje (do następnych pytań):**
  1. Czy `skutek.relacje` ma być **wolnym tekstem**, czy słownikiem ze
     zbioru `{indeks, schlodzenie, uznanie, zerwanie, ...}`? W prototypie
     wybrałem listę — łatwiej liczyć stan świata, trudniej pisać.
  2. Kto pilnuje, by skutek nie przeczył kolejnym SKIT-om? (Kandydat: sekcja
     „dossier” przy zapisie epoki, nie walidator w buildzie.)
  3. P1/P2 nadal otwarte: czy kolejna epoka startuje z tego długu, czy z
     osobnego seeda? Prototyp podpowiada **dług** (świat ma motyw do kolejnego
     spotkania), ale to nie jest jeszcze decyzja.

## 6. Możliwa następna iskra (pokaz, że świat A się zmienił)

Wypisana ze `skutku` wyżej propozycja na epokę 2 (też tylko prototyp):

> Po „Znaku burzy” drangue ma zobowiązanie wobec Indry, a Barbarossa — wobec
> drangue. Kulshedra schodzi z rzeki. Drangue nie chce wzywać Indry, bo boi się,
> że bóg z tysiącem oczu znowu nie będzie czekał; Barbarossa kładzie na szali
> swój rachunek „powrotu”. Iskra: **czy dług z pierwszej burzy ma być spłacony
> siłą, czy rytuałem?**

To już nie jest luźny pomysł — to konkretne następstwo stanu, który da się
zapisać w `data/kronika/`. Dokładnie o to chodziło w pomyśle „Kronika jako
dane popychane przez kolejne sesje”.
