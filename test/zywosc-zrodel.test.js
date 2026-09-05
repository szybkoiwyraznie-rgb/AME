/**
 * Kontrola żywości adresów źródłowych (tools/zywosc-zrodel.mjs, C2+5 obrotu 7).
 * Narzędzie sesji, nie CI — więc testy nigdy nie dotykają sieci: cały ruch idzie
 * przez wstrzyknięty `fetchImpl`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ocenOdpowiedz,
  adresyKartoteki,
  sprawdzAdres,
  raportZywosci,
  sformatujRaport,
  wczytajWpisy,
  STATUSY,
} from '../tools/zywosc-zrodel.mjs';

const wpisyTestowe = [
  {
    slug: 'a',
    dokumentacja: [
      { typ: 't', pozycja: 'żywe', url: 'https://ok.example/1' },
      { typ: 't', pozycja: 'druk bez adresu, 1891' },
      { typ: 't', pozycja: 'martwe', url: 'https://brak.example/2' },
    ],
  },
  { slug: 'b', dokumentacja: [{ typ: 't', pozycja: 'przeniesione', url: 'https://ruch.example/3' }] },
];

const fetchUdawany = async (url, { method } = {}) => {
  if (url.startsWith('https://ok.example')) return { status: 200, redirected: false, url };
  if (url.startsWith('https://brak.example')) return { status: 404, redirected: false, url };
  if (url.startsWith('https://ruch.example')) return { status: 200, redirected: true, url: 'https://ruch.example/nowy' };
  if (url.startsWith('https://tylko-get.example')) {
    return method === 'HEAD' ? { status: 405, redirected: false, url } : { status: 200, redirected: false, url };
  }
  throw new Error('ECONNRESET');
};

test('ocena odpowiedzi: martwy tylko przy 404/410, blokada robotów to niepewność', () => {
  assert.equal(ocenOdpowiedz({ status: 200 }).status, 'zywy');
  assert.equal(ocenOdpowiedz({ status: 404 }).status, 'martwy');
  assert.equal(ocenOdpowiedz({ status: 410 }).status, 'martwy');
  assert.equal(ocenOdpowiedz({ status: 403 }).status, 'niepewny');
  assert.equal(ocenOdpowiedz({ status: 429 }).status, 'niepewny');
  assert.equal(ocenOdpowiedz({ status: 503 }).status, 'niepewny');
  assert.equal(ocenOdpowiedz({}).status, 'niepewny');
  const ruch = ocenOdpowiedz({ status: 200, redirected: true, url: 'https://a/1', finalUrl: 'https://a/2' });
  assert.equal(ruch.status, 'przekierowany');
  assert.match(ruch.powod, /https:\/\/a\/2/);
  for (const s of STATUSY) assert.equal(typeof s, 'string');
});

test('adresyKartoteki: bierze tylko pozycje z adresem i zapamiętuje ich numer', () => {
  const adresy = adresyKartoteki(wpisyTestowe);
  assert.equal(adresy.length, 3, 'źródło drukowane bez adresu nie jest sprawdzane');
  assert.deepEqual(adresy.map((a) => [a.slug, a.numer]), [['a', 1], ['a', 3], ['b', 1]]);
  assert.deepEqual(adresyKartoteki(undefined), []);
});

test('sprawdzAdres: HEAD, a gdy serwer go odrzuca — GET; błąd sieci to niepewność', async () => {
  assert.equal((await sprawdzAdres('https://ok.example/1', { fetchImpl: fetchUdawany })).status, 'zywy');
  assert.equal((await sprawdzAdres('https://tylko-get.example/x', { fetchImpl: fetchUdawany })).status, 'zywy');
  const padniete = await sprawdzAdres('https://nieznane.example/x', { fetchImpl: fetchUdawany });
  assert.equal(padniete.status, 'niepewny');
  assert.match(padniete.powod, /sieć: ECONNRESET/);
  const bezFetch = globalThis.fetch;
  try {
    delete globalThis.fetch;
    await assert.rejects(() => sprawdzAdres('https://x/'), /brak fetch/);
  } finally {
    globalThis.fetch = bezFetch;
  }
});

test('raport: liczy statusy, a tekst milczy o adresach żywych', async () => {
  const raport = await raportZywosci(wpisyTestowe, { fetchImpl: fetchUdawany, rownolegle: 2 });
  assert.equal(raport.sprawdzone, 3);
  assert.deepEqual(raport.licznik, { zywy: 1, przekierowany: 1, niepewny: 0, martwy: 1 });
  const tekst = sformatujRaport(raport);
  assert.ok(!tekst.includes('ok.example'), 'żywe adresy nie zaśmiecają raportu');
  assert.ok(tekst.includes('brak.example'));
  assert.ok(tekst.includes('OSTRZEŻENIE'), 'martwy link jest ostrzeżeniem, nie błędem');
  const jeden = await raportZywosci(wpisyTestowe, { fetchImpl: fetchUdawany, wpis: 'b' });
  assert.equal(jeden.sprawdzone, 1);
});

test('narzędzie nie jest wpięte w bramki jakości (sandbox nie ma egressu)', async () => {
  const pakiet = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8'));
  assert.equal(pakiet.scripts['zywosc-zrodel'], 'node tools/zywosc-zrodel.mjs');
  assert.ok(!pakiet.scripts.check.includes('zywosc-zrodel'), 'check zostaje bez sieci (ADR 0003)');
  assert.ok(!pakiet.scripts.build.includes('zywosc-zrodel'));
});

test('kartoteka na dysku daje narzędziu adresy do sprawdzenia', async () => {
  const wpisy = await wczytajWpisy();
  const adresy = adresyKartoteki(wpisy);
  assert.ok(wpisy.length >= 30);
  assert.ok(adresy.length >= 60, `każdy wpis ma co najmniej dwa źródła: ${adresy.length}`);
  assert.ok(adresy.every((a) => a.url.startsWith('https://')));
});
