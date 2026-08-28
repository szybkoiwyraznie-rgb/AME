# Przenośność platformy BUDOWY (Meta.ai / agent swarm) — analiza

> Odpowiedź na pytanie właściciela (M12): przenieść rozwój projektu na Meta.ai
> (czat z wieloagentowością), kończąc sesje patchem/PR wgrywanym ręcznie na
> GitHub. Etap myślenia; żadnego kodu gry.
>
> **Uczciwe zastrzeżenie:** nie zweryfikowałem samodzielnie, co dokładnie potrafi
> „agent swarm" w czacie Meta.ai (nie mam dostępu do tego produktu; wyszukiwanie
> nie potwierdziło szczegółów tej funkcji). Poniżej analizuję na poziomie
> architektury, przyjmując opis właściciela jako założenie roboczo prawdziwe.

## 1. Najważniejsze rozróżnienie: BUDOWA vs URUCHOMIENIE

Mieszają się nam dwa różne „gdzie działa AI":

- **BUILD-TIME — kto BUDUJE projekt** (pisze wpisy, skity, kod, generuje
  ilustracje, dogrywa epoki Kroniki). Dziś: agent Areny w sandboxie → push.
- **RUN-TIME — co NAPĘDZA grę u ODBIORCY** (czy w przeglądarce widza działa AI,
  która ożywia byty na żywo). Dziś: nic — artefakt jest czystą statyką (ADR 0003).

Pytanie o Meta.ai dotyczy **wyłącznie build-time**. I to jest dobra wiadomość:
**build-time jest z założenia wymienny.**

## 2. Dlaczego platforma budowy jest wymienna (i już tak zaprojektowana)

Projekt od początku traktuje „kto buduje" jako rzecz podmienialną:

- **Granicą przekazania jest git** (ADR 0004): każda sesja czyta stan z repo i
  zostawia commity/PR. Nowa sesja widzi tylko `main` + prompt startowy
  (`ENVIRONMENT §1`). To jest kontrakt niezależny od tego, KTO/CO jest agentem.
- **`AGENTS.md` to instrukcja dla dowolnego runnera** — pierwszy akapit mówi
  wprost: „Runner (Arena i **każdy inny**) wczytuje ten plik jako pierwszy".
  Projekt już zakłada obcych wykonawców.
- **Brama jakości jest w repo, nie w platformie:** `npm test` + `npm run build`
  + `npm run check`. Ktokolwiek buduje — musi je przejść. To chroni spójność
  niezależnie od narzędzia.

Wniosek: **Meta.ai (albo cokolwiek) MOŻE budować AME**, o ile trzyma się
`AGENTS.md` i zielonej bramy, a wynik wraca jako git patch/PR. Brak connectora do
GitHuba to niedogodność operacyjna (ręczne wgranie PR), nie przeszkoda
architektoniczna.

## 3. Co „agent swarm" realnie zmienia — i to jest cenne

Wieloagentowość na etapie BUDOWY rozwiązuje problem, który w M11 nazwaliśmy
uczciwie (§1a koncepcji SPLOT/KRONIKA): **agent Areny to jeden proces w turze,
więc „subagenci-postacie" byli tylko metaforą (blind-draft), bez twardej
izolacji wiedzy.** Platforma z prawdziwą wieloagentowością daje:

- **Prawdziwą izolację przy GENEROWANIU treści** — każdy byt może mieć osobnego
  agenta z własnym dossier i bez dostępu do cudzej wiedzy, więc wcielone
  spotkania (KRONIKA) stają się autentycznie „wybuchowe", bez wycieków.
- **Bez kluczy API w artefakcie** — bo to dzieje się na etapie budowy, na
  platformie budującej, a nie w przeglądarce odbiorcy. Wynik to zwykłe dane
  (JSON epoki Kroniki) + ewentualne pregenerowane ilustracje, dogrywane do repo.
- To dokładnie **model 3b z koncepcji, wzmocniony**: „rozgrywka jako dane
  popychane przez agentów" — tyle że agentów jest wielu i są odizolowani.

Czyli: Meta.ai nie jest alternatywą dla „subagentów w grze" — jest **sposobem,
by subagenci mieli sens już teraz**, na etapie tworzenia Kroniki, bez łamania
ADR 0003 i bez kluczy u odbiorcy.

## 4. Czego to NIE zmienia

- **Artefakt (to, co dostaje widz) zostaje vanilla static** (ADR 0001–0003).
  Gra u odbiorcy nadal jest deterministyczną prezentacją danych; jeśli kiedyś ma
  reagować na żywo cudzym AI — to wciąż osobna decyzja (3a, klucze, nowy ADR).
- **Reguły treści i jakości bez zmian** — protokół MFM, kanon tagów, walidatory,
  determinizm indeksu. Inna platforma budowy MUSI je respektować (są w repo).
- **Model sesji** (PR, audyt poprzedniego PR, inkrementalne commity) obowiązuje
  każdą platformę; przy ręcznym wgrywaniu PR właściciel przejmuje rolę „mergera".

## 5. Warunki przenośności (checklista dla dowolnej platformy budowy)

Żeby AME dało się budować gdziekolwiek bez utraty spójności:

1. **Repo neutralne wobec platformy** — żadnych założeń „to musi być Arena".
   (Dziś w większości spełnione; do przejrzenia twarde odniesienia do „Areny".)
2. **`AGENTS.md` = jedyne źródło procedury** dla runnera; brama jakości w `npm`.
3. **Git patch/PR = granica przekazania** — platforma pracuje w swoim sandboxie,
   oddaje diff; właściciel (lub connector) wgrywa na `main`.
4. **Sekrety nigdy w patchu** — ta sama zasada co zawsze; przy obcej platformie
   tym ważniejsze (nie wiemy, co loguje).
5. **Determinizm zachowany** — build musi dać identyczny `data/index.json`
   niezależnie od platformy (to już pilnują testy).

## 6. Ryzyka / koszty

- **Utrata connectora GitHuba = tarcie operacyjne:** ręczne wgrywanie PR,
  łatwiej o pomyłkę, brak automatycznego CI na PR danej platformy (choć CI na
  `main` w naszym repo i tak zadziała po wgraniu).
- **Nieznane środowisko sandboxa:** inne wersje node, brak `sharp`/narzędzi,
  inny egress. Trzeba by zweryfikować, że `npm test`/`build` przechodzą tam
  tak samo (ENVIRONMENT opisuje założenia sandboxa Areny — obca platforma może
  się różnić).
- **Weryfikacja zdolności:** deklarowany „agent swarm" trzeba realnie
  sprawdzić na małym zadaniu (np. wygenerować jedną epokę Kroniki z 3
  odizolowanymi bytami) przed przenoszeniem całego rozwoju.
- **Spójność stylu/treści:** różne platformy = różny „głos"; protokół i
  walidatory to łagodzą, ale nie wszystko (np. jakość prozy skitów).

## 7. Rekomendacja

1. **Nie „albo–albo".** Platforma budowy jest wymienna z definicji — można
   używać Meta.ai, Areny albo obu, bo granicą jest git PR. Nic w projekcie tego
   nie blokuje; ewentualne twarde odniesienia do „Areny" warto zneutralizować
   (drobne zadanie porządkowe, nie teraz kluczowe).
2. **Najlepsze zastosowanie Meta.ai/swarm = generowanie KRONIKI** z prawdziwie
   odizolowanymi agentami-bytami (realizacja §1a opcji, których pojedynczy agent
   nie daje). To mocny argument ZA — ale na etapie budowy, nie w artefakcie.
3. **Zanim przeniesiemy rozwój:** mały test pilotażowy na Meta.ai —
   (a) czy przejdzie `npm test`/`build` w jego sandboxie; (b) czy odda czysty
   git patch; (c) czy „swarm" faktycznie utrzyma izolację wiedzy między bytami.
   Wynik tego pilota rozstrzyga, czy to droga produkcyjna.
4. **Artefakt i reguły bez zmian** — cokolwiek buduje, oddaje vanilla static
   zgodny z ADR i zieloną bramą.

## 8. Pytania do właściciela

1. Traktujemy Meta.ai jako **dodatkową platformę budowy** (git PR jako granica),
   nie zamiennik reguł — zgoda?
2. Czy chcesz, żebym przygotował **„paczkę startową dla obcej platformy"**
   (krótki brief: co przeczytać, jak zbudować, jak oddać patch) — tak, aby
   dowolny runner mógł usiąść do AME bez connectora?
3. Czy pilotem ma być **jedna epoka KRONIKI** (3 odizolowane byty) — najlepszy
   test tego, czy swarm daje to, czego pojedynczy agent nie daje?

## 9. ROZSTRZYGNIĘCIE właściciela (M13) — stanowisko na dziś

Właściciel zatrzymał wątek pilota jako **przedwczesny**: nie ma jeszcze
zaakceptowanej koncepcji metagry (Kroniki), więc nie ma czego testować. Pilot na
Meta.ai został wycofany. Z całego wątku zostają **dwie trwałe reguły**:

1. **Projekt może prowadzić runner inny niż Arena.** Build-time jest wymienny;
   granicą przekazania jest git (PR). Każdy runner respektuje `AGENTS.md`,
   protokół, walidatory i zieloną bramę (`npm test`/`build`/`check`). Wybór
   platformy na daną sesję należy do właściciela (Arena domyślnie; Meta.ai gdy
   właściciel uzna, że warto — np. dla izolacji).

2. **Zasada wykonania „głosu pojedynczego bytu".** Jeśli procedura generowania
   treści (w Kronice lub czymkolwiek innym) będzie wymagać decyzji/narracji
   pojedynczego bytu / manifestacji / gracza, to — zależnie od architektury
   aktualnego runnera — wykonają to:
   - **odizolowani subagenci** (prawdziwy agent swarm, np. Meta.ai) — PRIORYTET,
     albo
   - **symulowani subagenci** przez głównego agenta sesji (blind-draft, gdy
     runner jest pojedynczym procesem, np. Arena).
   Dzięki temu koncepcja pozostaje **uniwersalna** i niezależna od platformy:
   ta sama treść daje się wyprodukować oboma sposobami, tylko z inną siłą izolacji.

**Status metagry:** KONCEPCJA NIEZAAKCEPTOWANA / W OPRACOWANIU. Mamy tropy i
pomysły (SPLOT/KRONIKA, timeline'y, staty z gęstości, archetypy) — trzeba nad
nimi pracować, nie testować. Żadnych pilotów ani kodu gry do czasu, aż
właściciel zaakceptuje spójną koncepcję.
