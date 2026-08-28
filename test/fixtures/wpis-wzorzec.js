/** Fabryka poprawnego wpisu do testów walidatora (modyfikowany klon). */
export function wpisWzorzec(nadpisania = {}) {
  const w = {
    slug: 'byt-testowy',
    nazwa: 'Byt Testowy',
    nazwy_alternatywne: ['Testownik'],
    karta: { nazwa: 'Grizzly Bears', wydanie: 'Alpha', rok: 1993 },
    lokalizacja: { miejscowosc: 'Białowieża', kraj: 'Polska', lat: 52.7, lon: 23.85 },
    pochodzenie_i_kultura: 'folklor testowy',
    rezonans: {
      klucz_przywolania: 'Testowy klucz przywołania wyjaśniający korelację karty z bytem.',
      tabela: [
        { element: 'Nazwa', translacja: 'test' },
        { element: 'Mechanika', translacja: 'test' },
        { element: 'Ilustracja', translacja: 'test' },
        { element: 'Flavor text', translacja: 'test' },
        { element: 'Lore/Tło', translacja: 'test' },
      ],
    },
    natura: {
      wyglad_i_aura: 'opis',
      charakter_i_motywacje: 'opis',
      zdolnosci: 'opis',
      slabosci_i_metody_pokonania: 'opis',
      preferencje: 'opis',
    },
    dokumentacja: [{ typ: 'literatura naukowa', pozycja: 'Autor, Tytuł (2000)' }],
    wizualizacja: {
      prompt:
        'Style: A wide-angle full-body cinematic photograph. The central objects/persons of the photo are visible from head to toe, standing centrally in the frame. No parts of the body are cropped.\n\n' +
        'A gaunt, grey-skinned humanoid standing knee-deep in a misty primeval forest at dawn, moss on its shoulders, cold blue light between the trunks, breath visible in the air.\n\n' +
        'Captured with a 35mm anamorphic lens at f/1.8. Shallow depth of field with a heavy, creamy bokeh background. Environmental portraiture. Dramatic cinematic lighting, sharp focus on the character, hyper-realistic textures of clothing and skin. Shot on 70mm film stock, ultra-wide 21:9 aspect ratio. --ar 21:9',
      obraz: null,
    },
    trofea: { pierwotne: 'kłącze', wtorne: null },
    tagi: ['byt-nocny', 'las'],
    powiazania: [],
    meta: { utworzono: '2026-08-27', autor: 'test', modyfikacje: [] },
  };
  return ustaw(w, nadpisania);
}

/** Głębokie ustawienie zagnieżdżonych kluczy, np. ustaw(w, {'natura.zdolnosci': ''}). */
export function ustaw(obj, sciezki) {
  for (const [sciezka, wartosc] of Object.entries(sciezki)) {
    const czesci = sciezka.split('.');
    let o = obj;
    for (const c of czesci.slice(0, -1)) o = (o[c] ??= {});
    o[czesci.at(-1)] = wartosc;
  }
  return obj;
}
