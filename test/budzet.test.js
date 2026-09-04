/**
 * Budżet lektury startowej (AGENTS.md §0): pozycje 1–5 mają się mieścić
 * w 40 tys. tokenów. Test pilnuje, żeby zbiór obowiązkowych dokumentów
 * nie przekroczył progu ani nie skurczył się do pustki (ochrona przed
 * przypadkowym wykreśleniem pliku z listy lektury).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUDZET_TOKENOW,
  ZNAKOW_NA_TOKEN,
  plikiLektury,
  szacujTokeny,
  zmierzLekture,
} from '../tools/budzet-lektury.mjs';

test('szacunek tokenów: 1 token ≈ 4 znaki, zaokrąglenie w górę', () => {
  assert.equal(szacujTokeny(0), 0);
  assert.equal(szacujTokeny(1), 1);
  assert.equal(szacujTokeny(ZNAKOW_NA_TOKEN * 10), 10);
  assert.equal(szacujTokeny(ZNAKOW_NA_TOKEN * 10 + 1), 11);
});

test('lista lektury = AGENTS, PROTOKÓŁ, wszystkie ADR-y, LESSONS, ENVIRONMENT', async () => {
  const pliki = await plikiLektury();
  assert.equal(pliki[0], 'AGENTS.md');
  assert.equal(pliki[1], 'docs/PROTOKOL.md');
  assert.equal(pliki[2], 'docs/decisions/README.md');
  assert.ok(pliki.includes('docs/decisions/0001-vanilla-static-app-no-build.md'));
  assert.ok(pliki.includes('docs/decisions/0022-usuniecie-sekcji-rezonans-v1-8.md'));
  assert.equal(pliki.at(-2), 'docs/LESSONS.md');
  assert.equal(pliki.at(-1), 'docs/setup/ENVIRONMENT.md');
  // Handoffy są rotacyjne i jednorazowe — nie wchodzą do budżetu trwałego.
  assert.ok(!pliki.some((p) => p.includes('HANDOFF')));
});

test('lektura startowa mieści się w budżecie 40 tys. tokenów', async () => {
  const { pozycje, znaki, tokeny } = await zmierzLekture();
  assert.ok(pozycje.every((p) => p.znaki > 0), 'żaden plik lektury nie może być pusty');
  assert.ok(znaki > 50000, `zbiór podejrzanie mały (${znaki} znaków) — czy coś wypadło z listy?`);
  assert.ok(
    tokeny <= BUDZET_TOKENOW,
    `lektura startowa = ~${tokeny} tokenów > budżet ${BUDZET_TOKENOW} — skróć lub rozdziel dokumenty (AGENTS.md §0)`,
  );
});
