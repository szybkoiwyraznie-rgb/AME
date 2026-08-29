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
