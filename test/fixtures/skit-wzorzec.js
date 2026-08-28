/** Fabryka poprawnego SKITa do testów walidatora (modyfikowany klon). */
export function skitWzorzec(nadpisania = {}) {
  const s = {
    slug: 'rozmowa-testowa',
    tytul: 'ROZMOWA TESTOWA',
    temat: 'testowy spór o gościnność',
    uczestnicy: [
      { imie: 'Byt Testowy', slug: 'byt-testowy' },
      { imie: 'Zorza', slug: 'zorza' },
    ],
    tekst:
      '**Byt Testowy:** [wdech mrozu] Nie wchodź do domu, dopóki cię nie wypowiedzą po imieniu. Inaczej jesteś ' +
      'tylko złem, które się pomyliło adresem.\n\n' +
      '**Zorza:** [Światło łamie się na gałęziach] Nikt mnie nie wzywa. Przychodzę, bo noc jest długa, a wasze ' +
      'psy i tak nie śpią. Wystarczy jedna cisza za dużo i cała wieś liczy, ile nas jest.\n\n' +
      '**Byt Testowy:** Licz więc. Za każdy raz, gdy kogoś policzycie, ktoś wróci do izby z pochodnią. ' +
      'Nie dlatego, że się boi — dlatego, że woli wiedzieć, kto stoi za drzwiami.',
    meta: { utworzono: '2026-08-28', autor: 'test', modyfikacje: [] },
  };
  const ustaw = (obj, sciezki) => {
    for (const [sciezka, wartosc] of Object.entries(sciezki)) {
      const czesci = sciezka.split('.');
      let o = obj;
      for (const c of czesci.slice(0, -1)) o = (o[c] ??= {});
      o[czesci.at(-1)] = wartosc;
    }
    return obj;
  };
  return ustaw(s, nadpisania);
}

/** Zbiór slugów manifestacji przyjęty w teście (zgodnie z fixtures). */
export const SLUGI_WPISOW = new Set(['byt-testowy', 'zorza', 'egungun', 'lincoln-imp']);
