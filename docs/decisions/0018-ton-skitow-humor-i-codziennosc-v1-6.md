# 0018 — Ton SKITów: humor, luz i codzienność jako pełnoprawny rejestr (protokół MFM v1.6)

- Status: Zaakceptowana
- Data: 2026-08-28
- Kontekst: Pierwsze cztery SKIT-y przechodzą rygory §8.3, ale tonowo są
  jednowarstwowe — poważne, „srogie”, w rejestrze elegii. Właściciel
  (2026-08-28): skity są „strasznie poważne i jakby srogie”; w wytycznych
  powinna być sugestia, żeby były „też humorystyczne i na luzie, przy
  ognisku, o prostych, codziennych sprawach”, a nie tylko „sążniste elegie”.
  Skoro zmiana dotyka rygorów treści protokołu, idzie przez ADR (nagłówek
  `docs/PROTOKOL.md`: „Zmiany protokołu wymagają ADR”).
- Decyzja:
  1. `docs/PROTOKOL.md` przechodzi na **v1.6**. §8 (wstęp i §8.3 pkt 3)
     dopowiada **rejestr tonu**: obok rozmów mądrych i poważnych pełnoprawnym
     rejestrem są rozmowy luźne — humorystyczne, ciepłe, o prostych,
     codziennych sprawach (jedzenie, sen, pogoda na jutro, kurz, pranie,
     zwierzęta pod dachem, sąsiedzi, drobiazgi); klimat rozmowy
     „przy ognisku, po robocie”. Po serii poważnych rozmów następna
     powinna być lekka.
  2. Sugestia jest **autorska, nie walidowana**: brak maszynowego miernika
     „śmieszności”. Rygory twarde zostają nietknięte — in-character (§8.3.1),
     faktografia z lore kartoteki (§8.3.2), unikalność składu (§8.3.4),
     uczestnicy i głosy (§8.3.5), limit 300 słów (ADR 0015). Humor nie
     łamie charakteru bytu: Balor żartuje jak tyran, imp jak łobuz.
  3. Istniejące SKIT-y nie wymagają migracji; rygor dotyczy nowo pisanych
     (Pętla Jakości C3 dobiera tematy z oboju rejestrów).
- Konsekwencje:
  - C3 przestaje premiuje wyłącznie powagę: karta tematów się rozszerza
    o codzienność, co przy rosnącej bazie ułatwia niepowtarzalność tematów.
  - Ryzyko banalności ograniczają istniejące progi: minimum 60 słów,
    „każda replika ma swoje miejsce”, faktografia i in-character.
  - Walidator i indeks bez zmian (zero różnic w kodzie).
- Powiązania: 0007 (krok C3), 0013, 0015
