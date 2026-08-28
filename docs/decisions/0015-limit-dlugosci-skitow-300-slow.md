# 0015 — Limit długości SKITa: 300 słów (protokół MFM v1.4)

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: ADR 0013 przejęło limit 250 słów wprost ze zlecenia właściciela. W praxis
  limit okazał się granicą formy, a nie treści: dwa pierwsze szkice SKITa
  „ZNAK I LICZBA” (280 i 251 słów) musiały być cięte, przy czym cięcie szło w
  didaskalia i rytm oddechu między replikami, nie w treść. Właściciel
  (2026-08-28) zmienił rygor: 300 słów.
- Decyzja:
  1. `SKIT_MAX_SLOW` w `tools/rebuild-index.mjs` = **300**; dolna granica
     (`SKIT_MIN_SLOW` = 60) bez zmian, bo pilnuje innego defektu (pozór rozmowy).
  2. `docs/PROTOKOL.md` przechodzi na **v1.4** i podaje nowy limit w §8.2 (poprawka
     liczby w §4.5).
  3. Zmiana dotyczy tylko długości: rygory §8.3 (unikalność składu, 2–4 uczestników,
     każdy zabiera głos, zakaz żargonu gry, faktografia zgodna z kartami) zostają
     nietknięte i nadal są egzekwowane przez walidator.
  4. ADR 0013 pozostaje aktualne w całości poza liczbą 250 (tu zastąpioną);
     istniejące skity (248 i 241 słów) nie wymagają żadnej migracji.
- Konsekwencje:
  - Plus ~50 słów na scenę: więcej miejsca na didaskalia i na drugą myśl w
    odpowiedzi, mniej cięć „dla limitu”.
  - Ryzyko: dłuższy skit trudniej utrzymać w jednym oddechu na ekranie warstwy —
    dlatego limit nadal jest twardy i sprawdzany maszynnie, nie jest umowny.
  - Kolejne sesje nie mogą podnosić limitu samodzielnie: to parametr protokołu,
    więc zmiana = decyzja właściciela + ADR.
- Powiązania: 0011, 0012, 0013
