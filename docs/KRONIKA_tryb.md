# Tryb KRONIKA — dokumentacja koncepcji

> **Status:** koncepcja w opracowaniu, **niezaakceptowana** (zgodnie z M13).
> Bez kodu gry, bez pilota produkcyjnego, dopóki właściciel nie zatwierdzi
> spójnej wizji. Ten plik jest **jednym miejscem**, w którym opisany jest cały
> tryb — nie trzeba szukać po repo.
>
> **Co znajdziesz:** jedną spójną propozycję trybu „Kronika”, jej fundamenty,
> decyzje już podjęte, model danych z przykładem, reguły treści, granice oraz
> otwarte pytania z proponowanymi odpowiedziami. Wszystkie propozycje są
> oznaczone jako *propozycja* — nie są decyzjami właściciela.

---

## 0. Tryb Kroniki w jednym zdaniu

**Kronika to fabularna oś czasu świata AME: kolejne „epoki” to wcielone
spotkania bytów z kartoteki, a każde spotkanie zostawia w danych krótki
`skutek` — to, co zmienia się w relacjach między bytami.** Widz nie steruje
nikim; czyta kronikę świata, który toczy się sam.

---

## 1. Po co ten tryb

AME jest archiwum bytów, które „istnieją, dopóki wspólnota je pamięta i
nazywa”. Dotąd mamy trzy rzeczy:

- **kartotekę** (pełne wpisy o bytach),
- **mapę** (gdzie byty mieszkają),
- **SKIT-y** (krótkie wcielone rozmowy bytów).

Kronika jest następnym krokiem: **łączy SKIT-y w ciągłą opowieść świata**.
Zamiast pojedynczych dialogów czytelnik dostaje historię, w której
każde spotkanie ma przyczynę (`iskra`) i konsekwencję (`skutek`). Dzięki temu
archiwum przestaje być zbiorem ciekawostek, a staje się **światem, który ma
pamięć i następstwo**.

---

## 2. Fundamenty (nie do podważania bez wyraźnego powodu)

Te rzeczy są już ustalone w projekcie i tryb Kroniki się na nich opiera:

- **U1. Statystyki z gęstości rekordu.** Siła bytu wynika z tego, jak głęboko
  jest osadzony w sieci (backlinki, powiązania, SKIT-y, epitety, motywy).
  Gotowe i przetestowane: `app/arena.js` — `statyManifestacji`,
  `profileKartoteki`, `archetypBytu` (Filar / Drapieżnik / Splotca /
  Pieśniarz / Samotnik), znormalizowane percentylami.
- **U2. Rola widza = OBSERWATOR.** Świat toczy się sam; widz czyta, nie steruje.
  Sprawiedliwość spoczywa na systemie i bytach, nie na graczu.
- **U3. Determinizm i brak sekretów w artefakcie** (ADR 0001–0003). Artefakt
  pozostaje vanilla static; losowość tylko ze wstrzykiwanego RNG (seed z daty).
- **U4. Runner wymienny.** Kto buduje, jest podmienialne (Arena / Meta / inny);
  granicą przekazania jest git PR. „Głos pojedynczego bytu” wykonują odizolowani
  subagenci (priorytet) albo symulowani subagenci przez jednego agenta sesji.
- **U5. Każdy nowy SKIT to darmowy prototyp Kroniki.** Pisujemy je metodą
  embodimentu, więc każdy SKIT jest zarazem testem metody.

---

## 3. Co już rozstrzygnięte (decyzje właściciela)

| Decyzja | Treść |
|---|---|
| Rola widza | **Obserwator** — domyślny i główny tryb (M11). |
| Realia AI | Agent Areny to **jeden proces**; „subagenci-postacie” to dziś metafora metody (blind-draft). Twarda izolacja wymaga osobnych wywołań modeli. |
| Architektura AI | Start od **3b**: Kronika jako **dane w repo popychane przez kolejne sesje agenta**, bez kluczy w runtime. |
| Runner | Platforma budowy jest **wymienna**; granica = git PR. |
| Aksjomat metagry | Metagra **niezaakceptowana / w opracowaniu** — najpierw koncepcja, potem ADR i plan. |
| Kierunek „walki” | Arena Rezonansu (idle battler 1:1) **odłożona** — płaska, bez pętli decyzyjnej. |

---

## 4. Dwa czasy: budowa i odbiór

Krytyczne rozróżnienie, które porządkuje całość:

- **BUILD-TIME** — kto *tworzy* Kronikę (pisze epoki, dobiera skład, generuje
  ilustracje). To robi agent w sesji (Arena, Meta, inny runner). Wynik wraca do
  repo jako dane.
- **RUN-TIME** — co widzi odbiorca w przeglądarce. **Zero AI, zero sieci**:
  to statyczna prezentacja danych z repo (zgodnie z ADR 0003).

Konsekwencja: cała „magia” Kroniki dzieje się na etapie budowy, a odbiorca
dostaje gotowy, deterministyczny zapis.

---

## 5. Trzy warstwy świata

Kronika nie jest osobną grą — jest jedną z trzech warstw tego samego świata.

| Warstwa | Nazwa robocza | Co zawiera | Kto tworzy |
|---|---|---|---|
| Wiki / kartoteka | **ARKADIA** | wpisy bytów, tagi, powiązania, źródła, wizualizacje | agent sesji (C1) |
| Świat, który się zmienia | **SPLOT** | stan relacji i „długów” między bytami, na którym rodzą się spotkania | wynika z Kroniki |
| Opowieść | **KRONIKA** | epoki: wcielone spotkania + skutek dla świata | agent sesji (C3, prototyp) |

**ARKADIA** to statyczna baza wiedzy. **SPLOT** to warstwa stanu — nie musi być
od razu osobnym widokiem; na start wystarcza, że rośnie z każdym `skutek`
epoki. **KRONIKA** to fasada: to, co czyta obserwator.

---

## 6. Pętla Kroniki — jak powstaje epoka

Epoka to najmniejsza jednostka opowieści. Powstaje w pięciu krokach:

1. **Iskra.** Coś w świecie daje powód do spotkania: susza, spór o teren,
   wspólne zagrożenie, dług z poprzedniej epoki, święto, przepowiednia.
   (*Propozycja P5 niżej.*)
2. **Dobór składu.** 2–4 byty, których spotkanie ma sens w świetle `powiazania`
   i `iskra`. Preferowany skład 3-osobowy (ADR 0019). Do tego narzędzie
   `podpowiedzSkladySkitow` podpowiada nieużyte kombinacje.
3. **Role.** Każdy uczestnik dostaje rolę z `profileKartoteki` (archetyp):
   Filar trzyma strukturę, Drapieżnik tnie, Splotca nawiązuje, Pieśniarz żyje
   w rozmowie, Samotnik działa poza siecią. Rola kieruje głosem.
4. **Odegranie (embodiment).** Każdy głos pisany jest z własnego *dossier*
   (§8.2 poniżej) i **nie zna cudzego** — rozmawia z tego, co sam widzi i wie.
   (Zależnie od runnera: odizolowani subagenci albo blind-draft jednym agentem.)
5. **Kronikarz spisuje wynik.** Nadrzędny głos pilnuje reguł (fakty z kart,
   brak anachronizmów, unikalność składu, limity) i zapisuje epokę jako dane:
   SKIT + pole `skutek`.

## 6.1 Dossier postaci (to, co dostaje głos bytu)

Sedno wcielenia to **ograniczona karta wiedzy**. Głos NIE dostaje całego
archiwum — dostaje dossier wycięte z wpisu:

- **Tożsamość i głos:** nazwa, epitety, kultura, epoka, rejestr mowy.
- **Percepcja świata:** czego byt szuka, czego się boi, co uznaje za oczywiste.
- **Wiedza i granice:** co wie (fakty ze swojego wpisu), a czego wiedzieć NIE
  może (nic o kartach MtG, nic o bytach spoza jego kultury, nic z przyszłości).
- **Słabość / „szew”:** jak można go pokonać lub zdemaskować.
- **Zakazy stylu:** żargon gry, anachronizmy, pisma spoza alfabetu łacińskiego.

To deterministyczne: dossier powstaje z pliku wpisu, więc dwie sesje z tego
samego bytu dostają tę samą kartę. (*Kandydat na przyszłą czystą funkcję
`dossierBytu(wpis)` — dziś tylko projekt, bez kodu.*)

---

## 7. Element epoki — model danych

Epoka jest **osobnym typem danych** w `data/kronika/`. Nie duplikuje dialogu:
odwołuje się do SKIT-u, a dodaje kontekst i skutek.

### 7.1 Schemat (propozycja, nie jeszcze plik)

```jsonc
{
  "slug": "epoka-2-linia-dlugu",
  "epoka": 2,
  "tytul": "LINIA DŁUGU",
  "skit": "cena-znaku",              // odwołanie do data/skity/<slug>.json
  "iskra": "Dług z pierwszej burzy wisi nad trzema dolinami.",  // 1–2 zdania
  "uczestnicy": [
    { "slug": "indra",                 "rola": "Drapieżnik" },
    { "slug": "barbarossa-kyffhaeuser","rola": "Filar" },
    { "slug": "nessos",                "rola": "Splotca" }
  ],
  "przebieg": [
    { "typ": "zrodlo", "sciezka": "data/skity/cena-znaku.json" },
    { "typ": "sad", "tekst": "Nikt nie płaci wprost; każdy inaczej rozumie znak." },
    { "typ": "obserwacja", "tekst": "Trzej byty rozchodzą się bez rozstrzygnięcia." }
  ],
  "skutek": {
    "relacje": [
      { "para": ["indra", "barbarossa-kyffhaeuser"], "zmiana": "schlodzenie",
        "opis": "Indra przestaje kpić z czekania, ale nie uznaje go za mądrość." },
      { "para": ["indra", "nessos"], "zmiana": "uwaga",
        "opis": "Indra widzi w Nessos własne ryzyko: moc wzięta bez pytania o cenę." },
      { "para": ["barbarossa-kyffhaeuser", "nessos"], "zmiana": "brak",
        "opis": "Brak ruchu — obaj stoją po swojej stronie rzeki." }
    ],
    "tereny": [],
    "zasob": { "znak": "nierozstrzygnięty" }
  },
  "meta": {
    "utworzono": "2026-08-28 23:59",
    "autor": "sesja arena 2026-08-28",
    "typ": "prototyp"
  }
}
```

### 7.2 Uczestnicy i rola

`uczestnicy[].rola` to archetyp z `profileKartoteki`. Rola determinuje głos i
sposób reagowania na `iskra`. To **nie** nowa mechanika — to czytelna etykieta
nad statystykami, które już liczymy.

### 7.3 Skutek — słownik zmian (propozycja, do akceptacji)

Żeby SPLOT dało się liczyć, `skutek.relacje[].zmiana` powinno być **słownikiem
kontrolowanym**, nie wolnym tekstem. Propozycja wartości:

| wartość | znaczenie |
|---|---|
| `indeks` | relacja rośnie / zobowiązanie |
| `schlodzenie` | relacja chłodnieje |
| `uwaga` | jeden byt zaczyna obserwować drugiego |
| `brak` | bez zmiany |
| `zerwanie` | relacja się zrywa |
| `spor` | powstaje otwarty konflikt |

`tereny[]` rezerwujemy na przyszłość (przejmowanie/utrata obszaru) — na start
puste. `zasob` to jedno krótkie pole „co wisi nad światem” (nierozstrzygnięte
pytanie, dług, znak).

---

## 8. Reguły jakości epoki

Analogiczne do SKIT-ów, z jednym rozszerzeniem:

1. **Uczestnicy istnieją** w kartotece; `slug` musi być w `data/index.json`.
2. **Unikalny skład** w obrębie Kroniki (nie powtarzamy tego samego trio).
3. **Wierność źródłom** — fakty z `dokumentacja` (ADR 0008), zakaz anachronizmów.
4. **Limit długości** — SKIT 60–300 słów; `iskra` i `skutek` po 1–2 zdania.
5. **Brak żargonu gry** — byty nie wiedzą, że są „materializacjami”.
6. **Spójność skutku** — `skutek` nie może przeczyć wcześniejszym epokom ani
   faktom z kart; audyt „długu” robi agent przed zapisem.
7. **Determinizm** — `data/index.json` pozostaje identyczny po buildzie; epoki
   są osobnym typem i **nie** modyfikują pól `powiazania`/`tagi` w kartach.

---

## 9. Kanoniczność

**Propozycja:** Kronika jest **opcjonalną warstwą narratorską**, nie twardą
prawdą archiwum.

- Epoki **nie zmieniają** kart bytów — `skutek` jest opisem narracji, nie
  faktem w `powiazania`.
- Da się epokę **odrzucić bez psucia wpisów** — wystarczy nie brać pliku do
  indeksu.
- Kolejne sesje mogą się do skutku **odwoływać** („dług z pierwszej burzy”),
  ale nie muszą go respektować — to daje swobodę rozgałęziania, a nie
  konieczność trzymania jednej linii.

---

## 10. Co widzi obserwator (opis UI, nie implementacja)

Tryb Obserwatora otwiera się jako **trzeci widok** obok mapy i kartoteki
(spójny z istniejącym wzorcem przycisków „✎ skity”, „✚ nowości”):

1. **Feed epok** — jak „Co nowego”, ale fabularny: `tytul`, uczestnicy (linki
   do kart), `iskra`, zwięzły opis `skutek`. Najnowsze na górze.
2. **Karta epoki** — pełny SKIT + skutek + linki do uczestników / powiązanych
   epok; przycisk „⧉ kopiuj link” (deep-link `#kronika:<slug>`).
3. **Oś czasu** — pionowa lista epok; *propozycja:* najpierw **jedna liniowa
   oś** (P8), graf wątków później.
4. **Filtr bytów** — wybranie bytu pokazuje epoki, w których uczestniczył
   (naturalne rozszerzenie tagów).

Całość statyczna, bez sieci, deterministyczna.

---

## 11. Oś czasu i graf wątków (P8)

Propozycja etapowa, żeby nie przepłacić:

- **Krok 1 (liniowa oś).** Każda epoka ma `epoka` (kolejność) i `slug`.
  Widok pokazuje chronologię. Zero nowej maszynerii.
- **Krok 2 (odwołania).** Epoka może wskazywać `poprzednik`/`kontynuacja`
  (slugi) — to już wystarcza, by czytać „gałąź” bez budowania grafu.
- **Krok 3 (graf).** Dopiero gdy epok jest >~15, budujemy widok grafu
  (rozszczepienie, dead-end, skrzyżowanie — pomysł 11). Wymaga UI i walidacji;
  świadomie odłożone.

---

## 12. Prototypy w repo

Dwa istniejące materiały służą jako dowód koncepcji (dokumenty, nie dane
produkcyjne):

1. `docs/plans/PROTOTYP_kroniki-epoka-1.md` — epoka 1 „Znak burzy”
   (Indra × Drangue × Barbarossa), zbudowana na SKICIE `znak-burzy`.
2. `data/skity/cena-znaku.json` — SKIT „Cena znaku” (Indra × Barbarossa ×
   Nessos), napisany metodą embodimentu; w tej dokumentacji użyty jako
   podstawa przykładowej epoki 2 (zob. §7.1).

Oba pokazują, że model „SKIT + skutek” **działa na realnym materiale** i nie
wymaga nowej maszynerii.

---

## 13. Czego Kronika NIE jest (granice)

- **Nie jest grą sterowaną przez widza** — rola obserwatora jest niezmienna.
- **Nie jest walką** — Arena Rezonansu odłożona; Kronika to fabuła, nie turniej.
- **Nie jest runtime AI** — zero kluczy, zero sieci u odbiorcy.
- **Nie jest koalicją / przejmowaniem terenów** — `tereny` rezerwujemy, ale nie
  wprowadzamy na start (za duże przy 10–15 wpisach).
- **Nie jest osobną kartoteką** — byty i fakty pochodzą z ARKADII; Kronika tylko
  opowiada, co się z nimi dzieje.

---

## 14. Propozycje rozstrzygnięć otwartych pytań (P1–P11)

Poniżej **propozycje** do decyzji właściciela — nie są jeszcze przyjęte.

| Pytanie | Propozycja |
|---|---|
| **P1** Co widz widzi? | Feed epok (fabularne „Co nowego”) + karta epoki + oś czasu. |
| **P2** Co napędza kolejną epokę? | Agent sesji dokłada epokę przy okazji Pętli Jakości; bez runtime automatu. |
| **P3** Czym jest wydarzenie? | SKIT + `skutek`; epoka odwołuje się do SKIT-u. |
| **P4** Stan świata? | Min. zestaw: `relacje` (słownik zmian), `zasob`, `tereny` (rezerwa). |
| **P5** Skąd iskry? | Z powiązań, mapy i **długu z poprzedniej epoki** (`skutek.zasob`); nie z czystego losu. |
| **P6** Normalizacja siły? | Percentyle (już w `profileKartoteki`) + świadome „zmęczenie” epok (byt nie występuje co epokę). |
| **P7** Format epoki? | `data/kronika/epoka-N-slug.json` wg §7.1; odwołanie do SKIT-u. |
| **P8** Graf wątków? | Najpierw oś liniowa + odwołania, graf po >15 epokach. |
| **P9** Kanoniczność? | Opcjonalna warstwa narratorska; nie modyfikuje kart. |
| **P10** Ile bytów? | Nie blokować startu; budować równolegle z Pętlą Jakości (dziś 10, cel ~15–20). |
| **P11** MVP? | „Jedna epoka = jeden SKIT + skutek + widok osi”, plus `#kronika:<slug>`. |

---

## 15. Kolejność wdrożenia (po akceptacji koncepcji)

1. **Akceptacja** — właściciel zatwierdza tę dokumentację (albo wskazuje zmiany).
2. **ADR** — „Kronika: rozgrywka jako dane popychane przez agentów (model 3b)” +
   wpis do `docs/decisions/`.
3. **Plan MVP** — `docs/plans/PLAN_kronika-mvp.md` z pierwszą epoką.
4. **Walidator Kroniki** — czysta funkcja sprawdzająca `data/kronika/*.json`
   (istnienie bytów, słownik `zmiana`, odwołanie do SKIT-u, limity).
5. **Widok `#kronika`** — feed epok + karta epoki + deep-link; spójny z UI.
6. **Rozbudowa treści** — kolejne epoki w Pętli Jakości (C3), aż świat ma
   sens (~15–20 bytów, >6 epok).

---

## 16. Pytania do właściciela

1. Czy akceptujesz model **„SKIT + skutek”** jako definicję wydarzenia (P3/P7)?
2. Czy akceptujesz słownik zmian `relacje[].zmiana` (§7.3) zamiast wolnego tekstu?
3. Czy Kronika ma być **opcjonalną warstwą narratorską** (P9), czy twardą
   kontynuacją kanonu?
4. Czy startujemy od **liniowej osi** (P8), czy chcesz od razu graf wątków?
5. Czy mogę, po Twojej akceptacji, napisać **ADR + plan MVP** i zacząć od
   walidatora (bez widoku UI), czy najpierw pokazać więcej epok?

---

## 17. Skąd pochodzą materiały (minimalne odnośniki)

Dla czytelnika chcącego pogłębić (nie trzeba tego czytać do zrozumienia trybu):

- `docs/plans/POMYSL_splot-i-kronika-koncepcja.md` — źródłowa koncepcja SPLOT/KRONIKA.
- `docs/plans/KONCEPCJA_metagra_pytania-otwarte.md` — mapa otwartych pytań metagry.
- `docs/plans/PROTOTYP_kroniki-epoka-1.md` — prototyp epoki 1 na „Znaku burzy”.
- `docs/plans/POMYSL_kierunki-grywalizacji-analiza.md` — ocena 10 pomysłów (A/B/C).
- `docs/plans/POMYSL_platforma-budowy-przenosnosc.md` — build-time vs run-time,
  decyzja o wymiennym runnerze.
- `docs/plans/POMYSL_arena-rezonansu-idle-battler.md` — odłożona Arena Rezonansu.

---

## 18. Praca nad koncepcją po przemyśleniach właściciela (2026-08-29)

Właściciel przeczytał dokumentację i zgłosił sześć obszarów do dopracowania.
Poniżej odpowiedzi + propozycje. Wszystkie „propozycje” są nadal do akceptacji;
§7 i §14 zostają jako stan pierwotny, a te sekcje są aktualizacją koncepcji.

### 18.1 Jak wygląda podstrona Epoki (odpowiedź na pkt 1)

Propozycja układu — a konkretny, statyczny podgląd: **`docs/kronika-epoka-podglad.html`**.

| Blok | Co widać | Po co |
|---|---|---|
| Nagłówek | tytuł, `#epoka`, badge „kanon/szkic”, data + agent-sesja, deep-link `#kronika:<slug>` | tożsamość i pochodzenie wpisu |
| „Iskra + pytanie epoki” | 1–2 zdania, co sprowadza byty do stołu + formułuje pytań | czytelne „o co ta epoka” |
| Uczestnicy | karty bytów: kultura, rola (archetyp), paliwo, tagi, link do kartoteki | widz wie, kto gra |
| Przebieg | dialog z Bazy Skitów + jednoliterowy zapis „Kronikarz zapisuje” | narracja, nie teoria |
| **Konsekwencje** | oś „rząd dusz”, mapa wpływów, wykres zasięgu, tabela zmian relacji | świat widać, że idzie do przodu |
| Ledger paliwa | kto zapłacił ile za wpływ | koszt ma widoczną rękę |
| Słabości / exploity | płytka „szew” + efekt dla bytu i świata | jakie wybory się dokonały |
| Wątki otwarte | długi / następne iskry | paliwo do kolejnych epok |

**Zasada prezentacji:** wszystko jest *read-only* i statyczne (ADR 0003) — widz
widzi, że świat się zmienił, ale nie może tego samodzielnie kupić.

### 18.2 Co popycha Kronikę + budżet „paliwa” (pkt 2)

**Wyzwalacz (bez zmian):** Pętla Jakości (C3 → nowa epoka przy okazji nowego
SKIT-u) albo **jawna komenda właściciela** „dodaj epokę”. Nie ma runtime
automatu; Kronika rośnie, gdy świat ma się czym napędzać.

**Nowe: budżet pamięci („paliwo”).** Byty nie mogą bez końca wpływać na świat.
Paliwo to metaforyczna „pamięć społeczna” — ile o bycie mówi archiwum i
wspólnota. Propozycja (P12/P13):

- **Źródła paliwa** (liczone deterministicznie z indeksu, bez nowej symulacji):
  - wzmianka/backlink w innej karcie: **+2** każda,
  - udział w SKICIE: **+3** każdy,
  - wzmianka we wcześniejszej epoce Kroniki: **+4** każda,
  - bonus kulturowy/zasięg: **+1–3** (pole w `meta` wpisu albo wynik zasięgu).
- **Koszt epoki** = `1` (baza) + liczba uczestników + „ciężar” skutków
  (rozbudowa kultury/zerwanie/eksploatacja słabości = +1–2 każda).
- **Warunek:** suma paliwa uczestników ≥ koszt. Po epoce każdy uczestnik
  oddaje swój udział (`1` + ciężar jego skutków; zaokrąglane w górę).
- **Brak paliwa → byt nie może być uczestnikiem** — może co najwyżej
  występować w tle (wzmianka), ale nie zmienia świata.
- **Odbudowa paliwa = praca treściowa:** nowe źródła/backlinki (C1), nowy SKIT
  (C3), bycie „tłem” w epoce. To bardzo ważne: **ekonomia Kroniki jest
  sprzężona z Pętlą Jakości, nie z losem.** Trzeba najpierw zbudować byta w
  kartotece, żeby potem mógł wpłynąć na świat.

**Pytanie do właściciela:** czy paliwo ma być tylko *bramką* (tak/nie), czy
*walutą* — tzn. byt może „kupić” cięższy skutek (rozbudowa kultury, zerwanie,
eksploit), płacąc więcej. Propozycja: **bramka + koszt ciężkich skutków**.

### 18.3 Konsekwencje i warstwa prezentacji (pkt 3)

To najważniejsza część — żeby Kronika nie była „gadkami”, skutek musi być
**obserwowalny**. Propozycja rozszerzenia danych o `konsekwencje` (P14):

```jsonc
"skutek": {
  "relacje": [ /* jak §7.3 */ ],
  "tereny": [],
  "zasob": { "znak": "nierozstrzygnięty" },
  "konsekwencje": {
    "os": { "mit": -4, "racjonalizacja": +3, "opis": "…" },
    "kultury": [{ "kultura": "indie", "kierunek": "ekspansja", "opis": "…" }],
    "zasieg":  [{ "slug": "agni", "przed": 0.34, "po": 0.41, "opis": "…" }],
    "pozycje": [{ "slug": "talos-kreta", "status": "zmarginalizowany", "opis": "…" }],
    "watki":   [{ "id": "maszyna-bez-duszy", "opis": "…" }]
  }
}
```

**Warstwa wizualna (run-time, statyczna):**

1. **Oś „rząd dusz”** — pasek *mit ⟷ racjonalizacja*; globalny + lokalny per epoka.
   To wspólna metryka, żeby było widać, w którą stronę dryfuje świat.
2. **Mapa wpływów** — punkty bytów + halo ekspansji/kurczenia wierzeń.
   Docelowo na prawdziwej projekcji z `geo.js`; w mockupie poglądowo.
3. **Wykres zasięgu wierzeń** — słupki *przed → po* dla bytów/kultur
   („walka o rząd dusz”).
4. **Tabela konsekwencji** — zmiany relacji + statusów (czytelny dziennik świata).
5. **Ledger paliwa** — kto zapłacił ile.

To odpowiada wprost na „świat idzie do przodu”: święto nie może się skończyć
bez widocznej delty **zasięgu, pozycji bytu albo osi mit/racjonalizacja**.

### 18.4 Słabości / wrażliwości — o co chodzi (pkt 4)

W kartach już jest `natura.slabosci_i_metody_pokonania`. W Kronice robią z tego
**punkty zaczepienia narracji** (P16):

- **Słabość** = co bytowi zagraża; **wrażliwość** = na co reaguje (przeważnie
  jedno i to samo pole).
- **Exploit** w epoce wymaga: (a) ktoś w fabule *wie* o słabości (musi mieć ją
  w dossier / źródle), (b) koszt paliwa (cięższy niż zwykły udział), (c) akcja
  „klucz” zamiast zwykłej rozmowy.
- **Efekty** (do wyboru w `konsekwencje.pozycje`):
  - **zmarginalizowany** — byt traci zasięg, „schodzi do legendy”,
  - **zraniony** — traci paliwo, ale zostaje w grze,
  - **przemieniony** — słabość rozwiązana → byt zyskuje nową jakość,
  - **odporny** — słabość nie działa → moc/wiara rośnie.
- **Konsekwencja dla świata:** exploit zwykle podbija *racjonalizację* (ludzie
  zrozumieli mechanizm); bywa też tragiczny i *współczucie* = mit.
- **Zasada:** nie każdą słabość trzeba eksploatować. W niektórych liniach czasu
  nikt jej nie odkryje — a wtedy świat wygląda inaczej. To jest wybór, który
  odróżnia Kronikę od zwykłych dialogów.

### 18.5 Cel ostateczny (pkt 5)

**Propozycja:** brak jednego sztywnego celu — ale każda Kronika może dojść do
**stanu końcowego** zadeklarowanego w tomie:

| Stan końcowy | Znaczenie |
|---|---|
| „Świat za mgłą” | mit wygrywa: byty przejmują wyobraźnię ludzi |
| „Świat odczarowany” | racjonalizacja wygrywa: byty zostają legendami/sztuką |
| „Równowaga” | kompromis: kultura żyje, cywilizacja postępuje, byty są symbolami |
| „Pętla” | oś może być cykliczna — świat wraca do tego samego pytania |

**Docelowo:** obserwowanie, jak *mit* i *cywilizacja* rozstrzygają między sobą
o „rząd dusz”. Ten wskaźnik jest celowo widoczny w każdej epoce, więc cel nie
jest ukryty — on się **mierzy**.

### 18.6 Oś: cywilizacja kontra byty niematerialne (pkt 6)

To **mocny kandydat na główną oś** (P17):

- **Strona MITU (byty):** lęki, wierzenia, rytuały, sny, „pamięć wspólnoty”.
- **Strona CYWILIZACJI (człowiek):** nauka, urbanizacja, technika,
  racjonalizacja, archiwizacja.
- **Walka o rząd dusz:** byty chcą być dalej wierzone; cywilizacja chce je
  sprowadzić do legendy/symbolu (wytłumaczyć, zarchiwizować, odczarować).
- **Wskaźniki:** `mit` (zasięg wierzeń), `racjonalizacja` (wiedza, „wyjaśnione”
  mity), tempo zmian.

**Meta-napięcie, które bardzo pasuje do AME:** samo archiwum jest narzędziem
cywilizacji — spisujemy byty, źródła, mechanizmy, odczarowujemy je. **Ale**
każde zapisanie, wzmianka, SKIT czy epoka **dodaje im paliwo** (pamięć).
Badacz jednocześnie demistyfikuje i podsyła. To jest naturalny, nierozwiązywalny
konflikt — idealny jako główna oś Kroniki.

### 18.7 Nowe propozycje do decyzji (P12–P17)

| Pytanie | Propozycja |
|---|---|
| **P12** Budżet | Paliwo jako **bramka + koszt ciężkich skutków** (18.2). |
| **P13** Wzór paliwa | `2×backlinki + 3×skity + 4×wzmianki_kroniki + bonus_kulturowy`; liczony w buildzie, deterministyczny. |
| **P14** Model skutku | `skutek.konsekwencje` (oś, kultury, zasięg, pozycje, wątki) — 18.3. |
| **P15** Warstwa prezentacji | Oś „rząd dusz” + mapa wpływów + wykres zasięgu + tabela + ledger — 18.3. |
| **P16** Słabości | Jawnie **eksploatowalne leverage** (marginalizacja / zranienie / przemiana / odporność) — 18.4. |
| **P17** Główna oś | „Cywilizacja kontra byty niematerialne” jako wspólny wskaźnik; stany końcowe per Kronika — 18.5–18.6. |

---

## 19. Pytania do właściciela po 2026-08-29

1. Czy główną osią Kroniki ma być **„cywilizacja kontra byty niematerialne”** (P17)?
2. Czy paliwo jest tylko **bramką** (tak/nie), czy też **walutą** na cięższe
   skutki (P12)?
3. Czy akceptujesz `skutek.konsekwencje` (P14) i warstwę wizualną (P15) jako
   część MVP — czy najpierw chcesz zobaczyć samą epokę bez wykresów?
4. Czy słabości mają być **jawnie eksploatowalne** w narracji (P16), czy zostawać
   „charakterystyką” bez aktywnego użycia?
5. Czy mam z tego przygotować **ADR + plan MVP** (widok epoki + walidator +
   budżet), czy najpierw dopracować oś i przykładowe 2–3 epoki?
## 20. Odpowiedzi właściciela (2026-08-29) — szlif mechanizmu, strona główna Tomu

Właściciel przeczytał mockup i odpowiedział na pytania z §19. Rozstrzygnięcia
i zmiany poniżej **nadpisują odpowiednie propozycje z §18**, gdzie są sprzeczne.

### 20.1 Paliwo — korekta: udział nie może być źródłem (odpowiedź P12/P13)

Właściciel trafnie zauważył: **skoro udział w skicie daje +3, a każda epoka
jest nowym skitem, to uczestnicy automatycznie pomnażają kapitał zamiast
wydawać.** To psuje ekonomię. Usunięte.

**Nowa zasada:** samo siedzenie przy stole nie tworzy pamięci. Paliwo powstaje
z tego, co byt **zostawił w archiwum** i co **realnie zmienił w świecie**.
Udział jest **kosztem**, a nie nagrodą.

| Część | Wzór (propozycja deterministyczna) | Uwagi |
|---|---|---|
| **Pasywne paliwo** (archiwum, build-time) | `2×backlinki + 1×tagi_kanonu + bonus_kulturowy (0–3)` | rośnie przez C1/C3, nie przez uczestnictwo |
| **Koszt udziału** | `1 + ceil(liczba_naruszonych_wątków / 2)` | płacony na wejściu do epoki |
| **Koszt klucza/ciężkiego skutku** | `1 + ciężar` (rozbudowa/zerwanie/exploit 1–2) | byt dopłaca, jeśli chce zmienić świat mocniej |
| **Bonus/boost skutku** | `2×|delta_osi| + 2×|delta_dominacji|` | można wzmocnić zmianę **na plus albo minus** |
| **Zwrot po skutku** | `3×delta_osi + 2×delta_dominacji` tylko przy realnej zmianie | przegrany **traci** (zasięg/status), nie odzyskuje |
| **Saldo bytu** | `pasywne + Σ zwroty − Σ koszty − Σ boosty` | stąd ledger paliwa |

Przykład, który pokazuje różnicę:

- **Byt, który tylko „był”** w epokach: płaci `1+…`, nie zmienia świata → paliwo
  spada, w końcu schodzi do tła.
- **Byt, który przechylił oś lub dominację:** płaci koszt wejścia i ewentualny
  boost, ale na końcu odzyskuje część (lub całość) jako zwrot. Czysty zysk jest
  możliwy **tylko po realnej zmianie świata**.

**Konsekwencja dla C3:** nowy skit to *koszt* (praca nad kanonem), nie automatic
„dokładanie paliwa”. Kronika może też **odtworzyć** stary skit z nowym pytaniem —
wtedy to nie tworzy nowego zasobu, tylko okazję do wydatku.

### 20.2 Osie — potwierdzone i doprecyzowane (P17)

- **Główna oś:** „cywilizacja kontra byty niematerialne” — **zatwierdzona.**
- **Osie poboczne:** dominacja poszczególnych kultów/kultur (to, co już mamy
  w tagach). Modelujemy jako `dominacje[]` per kultura/kult, z trendem i zasięgiem.

```jsonc
"dominacje": [
  { "kultura": "Japonia", "kult": "kannon", "zasieg": 0.35, "trend": +0.02 },
  { "kultura": "Indie",   "kult": "agni",   "zasieg": 0.41, "trend": +0.05 }
]
```

Widok: na stronie głównej Tomu słupki dominacji obok osi głównej; w epoce — mapa
halo + wykres zasięgu.

### 20.3 Strona główna Kroniki (odpowiedź pkt 9)

Właściciel: *„Poza stroną Epoki potrzebna jest strona główna danej Kroniki
(nadrzędna wobec Epok)”*. Powstał mockup:
**`docs/kronika-glowna-podglad.html`.**

Bloki strony głównej:

| Blok | Co pokazuje |
|---|---|
| Nagłówek Tomu | `tom`, liczba epok, status (otwarta/zamknięta), paliwo w obiegu, liczba uczestników |
| Aktualny stan | oś główna „rząd dusz” + słupki **dominacji kultur/kultów** (osie poboczne) |
| Chronologia epok | klikalne epoki: nr, tytuł, status, kluczowa delta |
| Wątki | dwie kolumny: **zamknięte** i **otwarte** |
| Uczestnicy | klikalne karty bytów (→ kartoteka `#slug`) |
| Skity | lista „kostek” budujących Tom (→ `#skit:<slug>`) |
| Strefy wpływów | geo-podgląd hal wpływów; docelowo prawdziwa projekcja z mapy |
| Ledger paliwa | kto naprawdę płaci; start → koszty → skutek → teraz |
| Rozstaje | warunki końcowe Tomu (mgła / odczarowanie / równowaga / pętla) |

**Powiązanie:** Epoki żyją pod Tomem; Kronika może mieć wiele tomów, a każdy
Tom może się rozgałęziać w nowe linie czasu („rozstaje”).

### 20.4 Klikalność uczestników (odpowiedź pkt 6)

- W mockupie epoki i strony głównej uczestnicy są **linkami** do
  `../index.html#<slug>` (pełnoekranowa kartoteka).
- W podglądzie z portu 8001 mały helper przekierowuje na mapę (port 8000);
  w realnej aplikacji wystarczy zwykły link `#<slug>`.
- Karta bytu w epoce pokazuje też „kartoteka ↗”.

### 20.5 Status propozycji z §18 po odpowiedziach

| ID | Status |
|---|---|
| **P12** Budżet | **Rozstrzygnięte:** paliwo jest i bramką, i walutą — udział kosztuje, skutek boostuje zmianę na plus/minus (20.1). |
| **P13** Wzór paliwa | **Poprawiony:** bez `+3/udział w skicie`; pasywne z archiwum + zwrot z realnych skutków (20.1). |
| **P14** Model skutku | **Zaakceptowane** jako część MVP. |
| **P15** Warstwa wizualna | **Zaakceptowana** jako część MVP („SUPER”). |
| **P16** Słabości jako exploitable | **Do potwierdzenia** — właściciel nie odniósł się wprost; sugerowane „jawnie” zostaje wg 18.4. |
| **P17** Główna oś | **Zatwierdzona** + osie poboczne = dominacje kultur/kultów (20.2). |

### 20.6 Następny krok (zgodnie z pkt 8 właściciela: „najpierw mechanizm”)

Nie przechodzimy jeszcze do pełnego ADR/planu MVP. Najpierw doszlifowanie
mechanizmu w koncepcie:

1. **Dopisać zasadę bilansu** — paliwo bytu nigdy nie może być ujemne przy
   wejściu do epoki; jeśli byt nie ma paliwa, może być tylko tłem.
2. **Dopisać walidator** — `koszt_udziału + koszty_kluczy ≤ paliwo`; każdy
   uczestnik ma wiersz w ledgerze; suma zwrotów ≤ suma zmian świata.
3. **Wybrać 1–2 epoki „kontrolne”** i przeliczyć paliwo ręcznie — sprawdzić,
   że byt-statysta traci, a byt-bohater może odrobić.
4. **Ustalić szkielet danych** dla strony głównej Tomu (20.3) obok epoki.
5. **Pytanie do właściciela:** czy P16 (słabości jawnie eksploatowalne) do
   akceptu, i czy po wyżej wymienionym mam wejść w ADR/plan czy jeszcze rozszerzyć
   mechanizm.
## 21. Realny mechanizm + pierwsza epoka (2026-08-29)

Właściciel doprecyzował P16 i polecił: *„na razie Rozstaje zostawmy w pomysłach.
Zacznijmy od budowy faktycznie działującego mechanizmu i odpalenia na nim
pierwszej epoki w pierwszej kronice”*. Zrobione.

### 21.1 P16 — słabości nie są „przyciskiem exploitu” (odpowiedź właściciela)

Właściciel: *„Nie wiem co rozumiesz przez jawnie eksploatowane? «komentarz
w skicie mechaniczny? X eksploatuje słabość Y?» To nie. Raczej na zasadzie
oceny agenta-narratora, na ile działania/słowa jednych bytów eksploatowały /
wykorzystywały w retoryce słabości innych.”*

**Rozumiem to tak:**

- **Nie** ma być pola `exploit: true` ani komentarza „X wykorzystał słabość Y”
  przyporządkowanego do akcji.
- Ma być **ocena narracyjna** (`narrator.ocena[]`): `kto → kogo`, `stopień 0–3`,
  `kontekst` (np. „retoryka gościnności”) i `komentarz` narratora.
- Ta ocena **nie nakłada kosztu** w ledgerze; może jedynie wpływać na
  konsekwencje świata (status „zraniony”/„odporny”/„wyjaśniony”) przez to, jak
  narrator ją opowie.
- W danych **pierwszej epoki** są dwie takie oceny — Kentaur→Barbarossa (2/3,
  retoryka), Egungun→Kentaur (1/3, łagodna). Zero mechanicznego flagowania.

### 21.2 Rozstaje — zostają pomysłem

Zgodnie z poleceniem: `rozstaje` **nie** wchodzą do mechanizmu ani do pierwszej
epoki. W mockupie strony Tomu są oznaczone jako kierunek docelowy, nie jako
działający blok.

### 21.3 Co działa (implementacja)

- **`data/kronika/tom-1.json`** — Tom I „Kronika trzech stołów” (stanStart:
  oś mit/racjonalizacja, zasięg bytów, dominacje kultur).
- **`data/kronika/epoka-1.json`** — Epoka I „Trzy stoły: przodek, gospodarz
  i gość” na skicie `trzy-stoly` (Egungun, Barbarossa, Kentaur).
- **`data/kronika/epoka-2.json`** — Epoka II „Nieproszeni goście: psuj,
  zaproszony i zaproszenie” na skicie `nieproszeni-goscie` (Lincoln Imp,
  Kentaur, Empusa) — **kontynuacja stanPo** z Epoki I.
- **`tools/kronika.mjs`** — mechanizm:
  - paliwo pasywne = `2×backlinki + tagi kanonu + sieć powiązań (max 3)`,
  - **gate na bieżącym paliwie** `saldoPrzed ≥ kosztUdzialu + kosztKlucza + boost`,
  - ledger z **ciągłością** (`stanPo.paliwo` przechodzi między epokami:
    Kentaur w Epoka II startuje z 14, nie z pasywnego 16),
  - zwrot dozwolony **tylko** przy dodatniej zmianie zasięgu (z capem),
  - **oś zamknięta**: `mit + racjonalizacja = 100`, a delty sumują się do 0
    (walidator odrzuca 101),
  - walidator struktury: skit = uczestnicy epoki; konsekwencje zgodne ze
    stanem (także z bieżącym `stanPo`, nie tylko `stanStart`); statusy/wątki
    z dozwolonych zbiorów; ocena narratora 0–3,
  - zapis `data/kronika/summary.json` + **raporty generowane**:
    `docs/kronika-tom-1.html` (strona główna Tomu), `docs/kronika-epoka-1.html`,
    `docs/kronika-epoka-2.html`.
- **Npm** — `npm run kronika`, `npm run kronika:check`, **`npm run kronika:seed`**
  (kalibracja seedów z kartoteki); **Testy** — `test/kronika.test.js` (7 testów):
  seed z kartoteki, wzór paliwa, dwie epoki sekwencyjnie, oś zamknięta, gate,
  zwrot bez zmiany, struktura podsumowania.

Kalibracja seedów (`--seed`): `obecność = 2×backlinki + tagi kanonu +
2×skity + min(3, powiązania)`; `zasięg = 0.10 + 0.40×(obecność/max)`; oś
`mit% = średnia zasięgów`. Seed obejmuje **15 bytów** z kartoteki, nie tylko
uczestników Tomu.

### 21.4 Wynik Tomu I (trzy epoki)

**Epoka I — „Trzy stoły”**

| Byty | saldo start | koszt | zwrot | saldo |
|---|---|---|---|---|
| Egungun | 18 | −2 | +5 | **21** |
| Barbarossa | 17 | −2 | 0 | **15** |
| Kentaur | 16 | −2 | 0 | **14** |

**Epoka II — „Nieproszeni goście”** (ciągłość: Kentaur startuje z 14)

| Byty | saldo start | koszt | zwrot | saldo |
|---|---|---|---|---|
| Lincoln Imp | 12 | −2 | 0 | **10** |
| Kentaur | 14 | −2 | 0 | **12** |
| Empusa | 17 | −2 | +4 | **19** |

**Epoka III — „Odźwierni: zapraszany, otwierany i ten, który jest drzwiami”**
(skit `odzwierni`: Egungun × Balor × Empusa; Egungun i Empusa kontynuują saldo)

| Byty | saldo start | koszt | zwrot | saldo |
|---|---|---|---|---|
| Egungun | 21 | −2 | +5 | **24** |
| Balor | 15 | −2 | 0 | **13** |
| Empusa | 19 | −2 | 0 | **17** |

- **oś całego Tomu (po kalibracji seedów 37/63):** MIT 37→**31**,
  RACJONALIZACJA 63→**69** (Epoka I 35/65, Epoka II 33/67, Epoka III 31/69;
  każda epoka utrzymuje sumę 100).
- **zasięg po Tomie (po kalibracji):** Egungun 47.3%→52.3% (+5 przez dwie
  epoki), Empusa 46%→48% (+2), Kentaur 44.7%→40.7% (uczta wyjaśniona), Balor
  46%, Barbarossa 46%, Imp 39.3% (bez zmian).
- **wątki zamknięte:** `wino-w-uczcie`, `pogrzeb-zamiast-wesela`, `odzwierni`;
  **otwarte:** `czwarty-stol`, `warunek-barbarossy`, `wedrowny-dom-empusy`,
  `imie-na-progu`.
- **Czego dowodzi:** byt-statysta **traci**; byt, który realnie zmienił świat
  (Egungun, Empusa w Ep II) może odzyskać paliwo; Balor i Empusa płacą za
  wyjaśnienie świata (racjonalizacja rośnie). Skit **nie** dodaje paliwa.

### 21.5 Ciągłość wątków (nowy walidator)

Epoki nie mogą „gubić” wątków. Do mechanizmu doszedł `walidujCiągłośćWątków`:
wątek z poprzedniej epoki, który był **otwarty**, musi być w kolejnej
**przeniesiony** (`stan: otwarty`) albo **domknięty** (`stan: zamkniety`);
wątek **zamknięty** nie może się z powrotem otworzyć.

Przykładowe wyniki walidacji w Tomie I:
- `czwarty-stol` i `warunek-barbarossy` z Epoki I **brakowało** w Epoce II —
  zostały dopisane jako przeniesione (to była realna usterka, wykryta przez
  nowy test).
- Wątek `odzwierni` z Epoki II jest domknięty w Epoce III.
- Nowy `imie-na-progu` otwiera się w Epoce III (dozwolone).

### 21.6 Następny krok (stan po tej iteracji)

1. **Trzy epoki zrobione** — mechanizm utrzymuje ciągłość stanu i wątków.
2. **Prawdziwa strona główna Tomu** — `docs/kronika-tom-1.html`
   (oś, dominacje, chronologia, wątki, uczestnicy, ledger) z `summary.json`.
3. **Kalibracja seedów zrobiona** — `npm run kronika:seed` liczy je z
   kartoteki deterministycznie (15 bytów); test pilnuje spójności
   `tom-1.json` z narzędziem.
4. Kolejna epoka może iść w stronę otwartego wątku `imie-na-progu` albo
   `czwarty-stol`, gdy właściciel potwierdzi temat.
