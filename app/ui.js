/**
 * app/ui.js — kartoteka bytu (warstwa), Baza Skitów, feed „Co nowego", tagi
 * wg kanonu (pasmo po pasmie), pasek wyszukiwania i logika motywu. Cała treść wpisów jest
 * wstawiana jako tekst (esc), nigdy jako HTML.
 */

/** Nazwa kategorii tagu (z kanonu); bez kanonu — surowe id. */
export function nazwaKategorii(indeks, id) {
  if (!id) return '';
  const kat = (indeks?.kanon?.kategorie ?? []).find((k) => k.id === id);
  return kat?.nazwa ?? id;
}

/** Krótka etykieta kategorii do chipa (pełna nazwa zostaje w legendzie i `title`). */
export function skrotKategorii(indeks, id) {
  if (!id) return '';
  const kat = (indeks?.kanon?.kategorie ?? []).find((k) => k.id === id);
  return kat?.skrot ?? kat?.nazwa ?? id;
}

/** Tagi w kolejności kanonu: kategorie po kolei, w kategorii alfabetycznie (pl). */
export function tagiPosortowane(indeks, kategoria = null) {
  return Object.entries(indeks?.tagi ?? {})
    .filter(([tag, meta]) => (kategoria ? meta?.kategoria === kategoria : true) && (meta?.wpisy?.length ?? 0) > 0)
    .map(([tag, meta]) => ({ tag, ...meta }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'pl'));
}

/**
 * Pasek tagów w pasmach po kategoriach kanonu: każda linia ma własny podpis
 * (z opisem kategorii w `title`), więc czytelnik widzi, czym dany filtr jest,
 * zamiast przeglądać alfabetyczną zupę etykiet.
 */
export function htmlTagow(indeks, aktywnyTag) {
  const kategorie = indeks?.kanon?.kategorie?.length
    ? indeks.kanon.kategorie
    : [{ id: null, nazwa: 'Tagi', opis: '' }];
  const pasma = kategorie
    .map((kat) => {
      const tagi = tagiPosortowane(indeks, kat.id);
      if (!tagi.length) return '';
      const chipy = tagi
        .map(
          (t) =>
            `<button class="chip tag${t.tag === aktywnyTag ? ' aktywny' : ''}" data-tag="${esc(t.tag)}" data-kategoria="${esc(kat.id ?? '')}"${
              t.opis ? ` title="${esc(t.opis)}"` : ''
            }>${esc(t.tag)} <span class="licznik">${t.wpisy.length}</span></button>`
        )
        .join('');
      return `<div class="tagi-grupa" data-kategoria="${esc(kat.id ?? '')}">
        <span class="tagi-nazwa"${kat.opis ? ` title="${esc(kat.opis)}"` : ''}>${esc(kat.nazwa ?? kat.id ?? '')}</span>
        <div class="tagi-pas">${chipy}</div>
      </div>`;
    })
    .join('');
  return pasma;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ---- Motyw (A2): logyka niezależna od DOM, żeby dało się przetestować ---- */

export const MOTYWY = ['ciemny', 'jasny'];
export const KLUCZ_MOTYWU = 'ame:motyw';

/** Kolejny motyw w przełączniku: ciemny → jasny → ciemny. */
export function nastepnyMotyw(biezacy) {
  return biezacy === 'jasny' ? 'ciemny' : 'jasny';
}

/**
 * Motyw startowy: zapisany wybór użytkownika wygrywa, potem preferencja
 * systemu, a domyślnie — ciemne archiwum (tożsamość projektu).
 */
export function motywPoczatkowy({ zapisany = null, woliJasny = false } = {}) {
  if (MOTYWY.includes(zapisany)) return zapisany;
  return woliJasny ? 'jasny' : 'ciemny';
}

/** Etykieta + opis przycisku motywu (bez dwuznaczności dla czytnika ekranu). */
export function etykietaMotywu(motyw) {
  return motyw === 'jasny'
    ? { ikona: '☀', tekst: 'jasny', aria: 'Tryb jasny — kliknij, aby przejść do ciemnego' }
    : { ikona: '☾', tekst: 'ciemny', aria: 'Tryb ciemny — kliknij, aby przejść do jasnego' };
}

const TYPY_DOK = {
  'literatura naukowa': 'Literatura naukowa',
  'literatura piękna': 'Literatura piękna',
  'kino/kultura': 'Kino i kultura',
  'prace badawcze': 'Prace badawcze',
  'językoznawstwo': 'Językoznawstwo',
  'reportaż': 'Reportaż',
  'materiały katedry': 'Materiały katedry',
  'materiały archiwalne': 'Materiały archiwalne',
  'teksty źródłowe': 'Teksty źródłowe',
  'przewodnik kulturalny': 'Przewodnik kulturalny',
  'leksykon online': 'Leksykon online',
};

/**
 * Adres widoku do udostępnienia: `baza + #slug` dla kartoteki,
 * `baza + #skit:<slug>` dla skitu. Czyste, żeby dało się zbadać bez przeglądarki.
 */
export function linkWidoku(baza, cel) {
  const czysta = String(baza ?? '').replace(/[#?].*$/, '');
  return `${czysta}#${String(cel ?? '')}`;
}

/**
 * Tag z fragmentu adresu `#tag:<slug>` — deep-link do filtra tagów (C2).
 * Zwraca tag bez prefiksu albo null, gdy fragment nie jest filtrem tagu.
 */
export function tagZFragmantu(fragment) {
  const f = String(fragment ?? '').trim();
  if (!f.startsWith('tag:')) return null;
  const tag = f.slice(4);
  return tag ? tag : null;
}

/**
 * Zamówienia z parametrów zapytania dla startu aplikacji (PR #9):
 * `?q=…` ustawia wyszukiwanie, `?action=wylosuj|powiazania` wykonuje akcję.
 * Nieznane parametry są ignorowane — aplikacja startuje normalnie.
 * Zwraca `{ action, q }`: action ∈ {'wylosuj','powiazania',null}, q — string albo null.
 */
export function akcjeZZapytania(zapytanie) {
  const p = new URLSearchParams(String(zapytanie ?? ''));
  const akcja = p.get('action');
  const action = akcja === 'wylosuj' || akcja === 'powiazania' ? akcja : null;
  const q = (p.get('q') ?? '').trim();
  return { action, q: q || null };
}

/** Przycisk kopiujący adres bieżącego widoku (kartoteka albo skit/feed). */
export function przyciskKopiowania(cel) {
  if (!cel) return '';
  return `<button class="chip kopiuj-link" type="button" data-kopia="${esc(cel)}" title="Kopiuj adres tego widoku">⧉ kopiuj link</button>`;
}

/** Przycisk druku / zapisu PDF kartoteki (widok druku, media print). */
export function przyciskDruku() {
  return `<button class="chip drukuj" type="button" data-druk title="Drukuj / zapisz jako PDF">🖨 drukuj</button>`;
}

/**
 * Stopka wpisu i skitu: wyłącznie data utworzenia oraz data ostatniej
 * modyfikacji. Autor i opisy zmian zostają w pliku JSON oraz w feedzie
 * „Co nowego” — karta nie zasypuje czytelnika notatkami roboczymi
 * (zlecenie właściciela 2026-08-28).
 */
export function htmlStopki(meta) {
  // Stopka pokazuje daty utworzenia i ostatniej modyfikacji razem z godziną,
  // jeśli meta ją niesie (ADR 0017, v1.5; PROTOKÓŁ §8.1 — „wyłącznie daty”).
  // Autorzy i opisy zmian zostają w JSON-ie i w feedzie „Co nowego”.
  const formatujDate = (d) => String(d).replace('T', ' ').trim();
  const daty = (meta?.modyfikacje ?? []).map((m) => m?.data).filter(Boolean).map(formatujDate).sort((a, b) => (a > b) - (a < b));
  const ostatnia = daty[daty.length - 1];
  const pokaz = ostatnia ? ` · zmieniono ${esc(ostatnia)}` : '';
  const utworzono = meta?.utworzono ? formatujDate(meta.utworzono) : '?';
  return `<footer class="meta-wpisu">utworzono ${esc(utworzono)}${pokaz}</footer>`;
}

/** Adres źródła jako link (B3) — tylko http/https, bezpieczny tekst kotwicy. */
export function linkDoZrodla(url) {
  const adres = String(url ?? '').trim();
  if (!/^https?:\/\//i.test(adres)) return '';
  let tekst = adres
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  if (tekst.length > 58) tekst = `${tekst.slice(0, 42)}…${tekst.slice(-14)}`;
  return ` <a class="zrodlo" href="${esc(adres)}" target="_blank" rel="noopener noreferrer external" title="Otwórz źródło w sieci">${esc(tekst)}</a>`;
}

function sekcja(numer, tytul, zawartoscHtml) {
  return `<section class="sekcja"><h3><span class="numer">${numer}</span> ${tytul}</h3>${zawartoscHtml}</section>`;
}

/** Chipy tagów wpisu: kolejność i podpisy kategorii wyznacza kanon (ADR 0016). */
function chipyTagow(w, indeks) {
  const used = new Set(w.tagi ?? []);
  const kategorie = indeks?.kanon?.kategorie?.length
    ? indeks.kanon.kategorie
    : [{ id: null, nazwa: 'Tagi' }];
  const wKolejnosci = kategorie.flatMap((kat) => tagiPosortowane(indeks, kat.id).map((t) => t.tag)).filter((tag) => used.has(tag));
  const poza = [...used].filter((tag) => !wKolejnosci.includes(tag)).sort((a, b) => a.localeCompare(b, 'pl'));
  return [...wKolejnosci, ...poza]
    .map((tag) => {
      const meta = (indeks?.tagi && indeks.tagi[tag]) || {};
      const skrot = skrotKategorii(indeks, meta.kategoria);
      const pelna = nazwaKategorii(indeks, meta.kategoria);
      const legenda = [pelna && pelna !== skrot ? pelna : '', meta.opis].filter(Boolean).join(' — ');
      const tytul = legenda ? ` title="${esc(legenda)}"` : '';
      const etykieta = skrot ? `<span class="kategoria-tagu">${esc(skrot)}</span>` : '';
      return `<button class="chip tag" data-tag="${esc(tag)}"${tytul}>${etykieta}${esc(tag)}</button>`;
    })
    .join('');
}

/** Pełny wpis kartoteki (sekcje I–VII wg protokołu MFM v1.8). `kronika` to
 *  podsumowanie Tomu (summary.json) — jeśli podane, wpis dostaje sekcję
 *  „Tomy i Epoki” (E, 2026-08-30) z linkami do raportów. */
export function htmlWpisu(w, indeks, kronika = null) {
  const rekord = indeks.manifestacje.find((m) => m.slug === w.slug) ?? {};
  const alt = (w.nazwy_alternatywne ?? []).length ? `<p class="alt">znany też jako: ${esc(w.nazwy_alternatywne.join(', '))}</p>` : '';
  const naglowek = `
    <header class="naglowek-wpisu">
      <p class="karta-inspiracja">inspiracja kartą <strong>${esc(w.karta?.nazwa ?? '?')}</strong>${w.karta?.rok ? ` (${esc(w.karta.rok)})` : ''}</p>
      <h2>${esc(w.nazwa)}</h2>
      ${alt}
      <p class="lokalizacja">📍 ${esc(w.lokalizacja.miejscowosc)}, ${esc(w.lokalizacja.kraj)} · ${w.lokalizacja.lat.toFixed(2)}°, ${w.lokalizacja.lon.toFixed(2)}°</p>
      <p class="pochodzenie">${esc(w.pochodzenie_i_kultura)}</p>
      <div class="chipy">${chipyTagow(w, indeks)}</div>
    </header>`;

  const II = sekcja(
    'II',
    'Charakterystyka i natura',
    `<dl class="natura">
      <dt>Wygląd i aura</dt><dd>${esc(w.natura.wyglad_i_aura)}</dd>
      <dt>Charakter i motywacje</dt><dd>${esc(w.natura.charakter_i_motywacje)}</dd>
      <dt>Zdolności</dt><dd>${esc(w.natura.zdolnosci)}</dd>
      <dt>Słabości i metody pokonania</dt><dd>${esc(w.natura.slabosci_i_metody_pokonania)}</dd>
      <dt>Preferencje</dt><dd>${esc(w.natura.preferencje)}</dd>
    </dl>`
  );

  const III = sekcja(
    'III',
    'Dokumentacja (The Source Stack)',
    `<ul class="dokumentacja">${(w.dokumentacja ?? [])
      .map((d) => `<li><span class="typ">${esc(TYPY_DOK[d.typ] ?? d.typ)}</span> — ${esc(d.pozycja)}${linkDoZrodla(d.url)}</li>`)
      .join('')}</ul>`
  );

  const obrazHtml = w.wizualizacja?.obraz
    ? `<img src="${esc(w.wizualizacja.obraz)}" alt="Wizualizacja: ${esc(w.nazwa)}" loading="lazy">`
    : `<div class="brak-wizualizacji"><p>Wizualizacja nieodtworzona.</p><p class="maly">Obraz powstanie z promptu poniżej (21:9).</p></div>`;
  const I = sekcja(
    'I',
    'Wizualizacja',
    `${obrazHtml}
     <details class="prompt">
       <summary>Prompt generatora (21:9)</summary>
       <pre>${esc(w.wizualizacja?.prompt ?? '')}</pre>
       <button class="chip kopiuj" type="button">Skopiuj prompt</button>
     </details>`
  );

  const IV = sekcja(
    'IV',
    'Trofea i dowody eliminacji',
    `<dl class="trofea">
      <dt>Trofeum pierwotne</dt><dd>${esc(w.trofea.pierwotne)}</dd>
      ${w.trofea.wtorne ? `<dt>Trofeum wtórne</dt><dd>${esc(w.trofea.wtorne)}</dd>` : ''}
    </dl>`
  );

  const powiazania = (w.powiazania ?? [])
    .map(
      (p) =>
        `<li><button class="chip link" data-slug="${esc(p.slug)}">${esc(nazwaSluga(p.slug, indeks))}</button><span class="opis">${esc(p.opis)}</span></li>`
    )
    .join('');
  const backlinki = (rekord.backlinki ?? [])
    .map((s) => `<button class="chip link wzmianka" data-slug="${esc(s)}">${esc(nazwaSluga(s, indeks))}</button>`)
    .join(' ');
  const V = htmlSkitowWpisu(rekord.skity, indeks);
  const wiki =
    powiazania || backlinki
      ? sekcja(
          'VII',
          'Powiązania',
          `${powiazania ? `<ul class="powiazania">${powiazania}</ul>` : ''}${
            backlinki ? `<p class="wzmiankowane">wzmiankowany przez: ${backlinki}</p>` : ''
          }`
        )
      : '';

  const tomyIEpoki = htmlTomyIEpoki(w.slug, kronika);
  const meta = htmlStopki(w.meta);

  // Sekcje I–VII w kolejności numeracji (PROTOKÓŁ §4.1, MFM v1.8):
  // numer = pozycja; V = SKITy, VI = Tomy i Epoki, VII = Powiązania.
  return `<div class="wpis">${naglowek}${I}${II}${III}${IV}${V}${tomyIEpoki}${wiki}${meta}</div>`;
}

/**
 * Pełnoekranowa warstwa z wpisem (B2): nakładka na całe okno, dialog z
 * porządną dostępnością i przyciskiem zamknięcia. Treść wklejana jako
 * `htmlWpisu()` — warstwa tylko dodaje rusztowanie.
 */
export function htmlWarstwyWpisu(trescHtml, { slug = '', nazwa = '' } = {}) {
  return `<div class="warstwa-wpisu" role="dialog" aria-modal="true" tabindex="-1" aria-label="Kartoteka: ${esc(nazwa || slug)}">
  <div class="akcje-kartoteki">
    ${przyciskKopiowania(slug)}
    ${przyciskDruku()}
    <button class="zamknij" id="zamknij-wpis" type="button" aria-label="Zamknij kartotekę">✕</button>
  </div>
  ${trescHtml}
</div>`;
}

export function nazwaSluga(slug, indeks) {
  return indeks.manifestacje.find((m) => m.slug === slug)?.nazwa ?? slug;
}

/** Lista manifestacji (wszystkie lub przefiltrowane). Wiersz z polem `obraz`
 *  dostaje miniaturę wizualizacji 21:9 (ładowaną leniwie) — rozpoznanie bytu
 *  po kadrze, nie tylko po nazwie (C2, 2026-09-04). */
export function htmlListy(indeks, widoczne /* Set|null */) {
  const pozycje = indeks.manifestacje
    .filter((m) => widoczne === null || widoczne.has(m.slug))
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
  if (pozycje.length === 0) return '<p class="pusto">Brak manifestacji spełniających kryterium.</p>';
  return `<ul class="lista-manifestacji">${pozycje
    .map(
      (m) => `
      <li>
        <button class="wiersz${m.obraz ? ' ma-miniature' : ''}" data-slug="${esc(m.slug)}">
          ${m.obraz ? `<img class="miniatura" src="${esc(m.obraz)}" alt="" loading="lazy">` : ''}
          <span class="wiersz-tekst">
            <span class="nazwa">${esc(m.nazwa)}</span>
            <span class="opis">insp. ${esc(m.karta)} · ${esc(m.miejscowosc)}, ${esc(m.kraj)}</span>
          </span>
        </button>
      </li>`
    )
    .join('')}</ul>`;
}

/**
 * Strona tagu (F2, C2 2026-08-30): nagłówek z kategorią, opisem i licznikiem
 * + lista manifestacji z tym tagiem (klik → kartoteka). Adresowalna przez
 * `#tag:<slug>`; współpracuje z filtrem mapy (zastosujTag).
 */
export function htmlStronyTagu(indeks, tag) {
  const dane = indeks?.tagi?.[tag];
  if (!dane) return '<p class="pusto">Nieznany tag.</p>';
  const kat = (indeks.kanon?.kategorie || []).find((k) => k.id === dane.kategoria);
  const nazwa = kat?.nazwa || dane.kategoria || 'Tagi';
  const opis = dane.opis || kat?.opis || '';
  const ile = dane.wpisy.length;
  return `
    <p class="naprowadzenie"><strong class="tag-nazwa">${esc(tag)}</strong> — ${esc(nazwa)} · ${
      ile === 1 ? '1 manifestacja' : `${ile} manifestacji`
    }${opis ? ` · ${esc(opis)}` : ''}</p>
    ${htmlListy(indeks, new Set(dane.wpisy))}
  `;
}

/* ---- SKITy i feed „Co nowego" (ADR 0013/0014) ---------------------------- */

/** Nagłówek SKITa w formie z protokołu: `### **SKIT: tytuł**`. */
export function naglowekSkitu(tytul) {
  return `<h3 class="skit-tytul"><strong>SKIT: ${esc(String(tytul ?? '').toUpperCase())}</strong></h3>`;
}

/**
 * Proza-dialogowa treść SKITa → akapity. Replika: „**Imię:** [didaskalia] słowa”.
 * Tekst najpierw jest escapowany, markup dokładamy po esc() — żadna treść
 * wpisu nie trafia do HTML jako HTML.
 */
export function htmlDialogu(tekst) {
  const akapity = String(tekst ?? '').split(/\n{2,}/).map((a) => a.trim()).filter(Boolean);
  return akapity
    .map((a) => {
      const m = a.match(/^\*\*([^*\n]{1,40}):\*\*\s*([\s\S]*)$/);
      if (!m) return `<p class="proza">${esc(a)}</p>`;
      let reszta = m[2].trim();
      const dy = reszta.match(/^\[([^\]\n]{1,400})\]\s*/);
      const didaskalia = dy ? dy[1].trim() : '';
      if (dy) reszta = reszta.slice(dy[0].length);
      const slowa = esc(reszta).replace(/\[([^\]\n]{1,400})\]/g, '<em class="didaskalia w-tekscie">[$1]</em>');
      return `<p class="wypowiedz"><strong class="mowca">${esc(m[1].trim())}</strong>${
        didaskalia ? `<em class="didaskalia">${esc(didaskalia)}</em>` : ''
      }<span class="slowa">${slowa}</span></p>`;
    })
    .join('');
}

/**
 * Treść SKITa → czysty tekst do lektora (Web Speech API).
 * Usuwa znaczniki mówcy (`**Imię:**`), didaskalia `[…],` i białe znaki —
 * zostaje sam dialog: „Nessos. Przewiozę na grzbiecie…”. Czysta funkcja:
 * działa bez DOM, testowana jednostkowo.
 */
export function tekstDoLektora(tekst) {
  const wiersze = String(tekst ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const czesci = [];
  for (const linia of wiersze) {
    const m = linia.match(/^\*\*([^*\n]{1,40}):\*\*\s*([\s\S]*)$/);
    const mowca = m ? m[1].trim() : '';
    const reszta = (m ? m[2] : linia).replace(/\[[^\]\n]{1,400}\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (mowca) czesci.push(`${mowca}.`);
    if (reszta) czesci.push(reszta);
  }
  return czesci.join(' ').trim();
}

/** Widok jednego SKITa (z pełnego pliku) wraz z listą uczestników. */
export function htmlSkitu(s, indeks) {
  const uczestnicy = (s.uczestnicy ?? [])
    .map((u) => `<button class="chip link" data-slug="${esc(u.slug)}">${esc(u.imie)}</button>`)
    .join(' ');
  const meta = htmlStopki(s.meta);
  return `<article class="skit" data-skit="${esc(s.slug)}">
    ${naglowekSkitu(s.tytul)}
    <p class="skit-uczestnicy"><span>Uczestnicy:</span> ${uczestnicy}</p>
    <button class="chip lektor" type="button" data-lektor title="Odsłuchaj skit na głos (Web Speech API)">🔊 odsłuchaj</button>
    <div class="skit-tekst">${htmlDialogu(s.tekst)}</div>
    ${meta}
  </article>`;
}

/** Baza Skitów: lista wszystkich skitów, najnowsze na górze. */
export function htmlBazySkitow(indeks) {
  const skity = [...(indeks.skity ?? [])].sort((a, b) => String(b.data).localeCompare(String(a.data)) || a.slug.localeCompare(b.slug, 'pl'));
  if (skity.length === 0) return '<p class="pusto">Baza skitów jest pusta — pierwszy dopisze następna sesja (PROTOKÓŁ §8).</p>';
  return `<ul class="skit-lista">${skity
    .map(
      (s) => `<li><button class="wiersz" data-skit="${esc(s.slug)}">
        <span class="nazwa">SKIT: ${esc(s.tytul)}</span>
        <span class="opis">skład: ${esc((s.imiona ?? []).join(' × '))} · ${s.slow ?? 0} słów${s.data ? ` · ${esc(s.data)}` : ''}</span>
      </button></li>`
    )
    .join('')}</ul>`;
}

/** Galeria trofeów (C2, 2026-09-04): wszystkie dowody eliminacji z rekordów
 *  indeksu; nazwa bytu otwiera jego kartotekę (data-slug). */
export function htmlTrofeow(indeks) {
  const wpisy = (indeks.manifestacje ?? []).filter((m) => m.trofea?.pierwotne);
  if (wpisy.length === 0) return '<p class="pusto">Brak trofeów w archiwum.</p>';
  return `<ul class="trofea-lista">${wpisy
    .map(
      (m) => `<li class="trofeum">
        <h4><button class="chip link" data-slug="${esc(m.slug)}">${esc(m.nazwa)}</button></h4>
        <p><strong>Trofeum pierwotne:</strong> ${esc(m.trofea.pierwotne)}</p>
        ${m.trofea.wtorne ? `<p><strong>Trofeum wtórne:</strong> ${esc(m.trofea.wtorne)}</p>` : ''}
      </li>`
    )
    .join('')}</ul>`;
}

/** Sekcja V wpisu (MFM v1.8): skity, w których materializacja zabiera głos. */
export function htmlSkitowWpisu(slugi, indeks) {
  if (!slugi?.length) return '';
  const pola = slugi
    .map((slug) => indeks.skity?.find((x) => x.slug === slug))
    .filter(Boolean)
    .map(
      (s) => `<li><button class="chip link" data-skit="${esc(s.slug)}">SKIT: ${esc(s.tytul)}</button>
        <span class="opis">skład: ${esc((s.imiona ?? []).join(', '))} · ${s.slow ?? 0} słów</span></li>`
    )
    .join('');
  if (!pola) return '';
  return sekcja('V', 'SKITy', `<ul class="powiazania skity-wpisu">${pola}</ul>`);
}

/** Feed „Co nowego": najnowsze na górze, każda pozacja linkuje do treści. */
/** Feed Kroniki (U3): karty epok z ramy narracji (pytanie/iskra) i linkiem do raportu. */
export function htmlKronik(podsumowanie, indeks = {}) {
  if (!podsumowanie?.epoki?.length) return '<p class="pusto">Kronika jest jeszcze pusta — uruchom npm run build.</p>';
  const opcje = new Set();
  for (const e of podsumowanie.epoki) for (const u of e.uczestnicy ?? []) opcje.add(u.slug);
  const karty = podsumowanie.epoki
    .map((e) => {
      const ikony = (e.uczestnicy ?? []).map((u) => `<span class="kronika-ikona" title="${esc(u.nazwa ?? u.slug)}">${emojiBytu(u.slug)}</span>`).join(' ');
      const delty = (e.konsekwencje?.zasieg ?? [])
        .map((z) => {
          const d = Math.round((z.po - z.przed) * 100);
          return `<span class="chip ${d > 0 ? 'up' : d < 0 ? 'down' : 'neutral'}">${esc(z.slug)} ${d > 0 ? '+' : ''}${d} pp</span>`;
        })
        .join(' ');
      return `
      <article class="kronika-karta" data-byt="${(e.uczestnicy ?? []).map((u) => esc(u.slug)).join(' ')}" data-slug="${esc(e.slug)}">
        <header>
          <span class="kronika-nr">${esc(e.slug)}</span>
          <h3>${esc(e.tytul)}</h3>
          <span class="kronika-os">MIT ${e.stanPo?.os?.mit ?? 0}% <span class="muted">/ RAC ${e.stanPo?.os?.racjonalizacja ?? 0}%</span></span>
        </header>
        ${e.pytanie ? `<p class="kronika-pytanie">${esc(e.pytanie)}</p>` : ''}
        ${e.iskra ? `<blockquote class="kronika-iskra">„${esc(e.iskra)}”</blockquote>` : ''}
        ${delty ? `<div class="kronika-delty">${delty}</div>` : ''}
        <footer>
          <span class="kronika-ikony">${ikony}</span>
          <button class="przycisk przycisk-maly" data-link="kronika:${esc(e.slug)}">Raport epoki ↗</button>
        </footer>
      </article>`;
    })
    .join('');
  return `
  <p class="naprowadzenie">Tocząca się opowieść świata AME — epoki, rozmowy i przesunięcia granicy między mitem a racjonalizacją. Wybierz byt, żeby przefiltrować epoki, w których grał.</p>
  <div class="filtr-kronika">
    <label for="kronika-filtr">Filtruj wg bytu</label>
    <select id="kronika-filtr">
      <option value="">— wszystkie —</option>
      ${[...opcje].sort().map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
    </select>
  </div>
  <div class="kronika-lista">${karty}</div>
  <p class="naprowadzenie"><a class="link-zewnetrzny" href="docs/kronika.html">Otwórz stronę Kroniki (Tomy i raporty) ↗</a></p>`;
}

/** Sekcja „Tomy i Epoki” w karcie bytu (E, 2026-08-30): linki do raportu Tomu
 *  i do stron Epok, w których byt występuje. Puste, gdy brak danych lub byt
 *  nigdzie nie występuje. */
export function htmlTomyIEpoki(slug, kronika) {
  const epoki = (kronika?.epoki ?? []).filter((e) => (e.uczestnicy ?? []).some((u) => u.slug === slug));
  if (!epoki.length) return '';
  const tomSlug = kronika?.tom || 'tom-1';
  const tytulTomu = kronika?.tytulTomu || tomSlug;
  const chipsy = epoki
    .map((e) => `<a class="chip link" href="docs/kronika-${esc(e.slug)}.html" title="${esc(e.tytul ?? '')}">${esc(e.slug)}${e.tytul ? ` · ${esc(e.tytul)}` : ''}</a>`)
    .join('');
  const slowo = epoki.length === 1 ? 'epoce' : 'epokach';
  // odnośnik do Tomu w tej samej konwencji „brązowego przycisku” co epoki
  // (recenzja właściciela 2026-08-30: niebieski link zewnętrzny był odstępstwem).
  return sekcja(
    'VI',
    'Tomy i Epoki',
    `<p class="maly">Występuje w ${epoki.length} ${slowo} Tomu <a class="chip link" href="docs/kronika-${esc(tomSlug)}.html" title="Raport Tomu">${esc(tytulTomu)} ↗</a>:</p><div class="chipy">${chipsy}</div>`
  );
}

/** Symbol bytu z kartoteki (spójny z mapą; fallback: pierwsza litera emoji-zestawu). */
function emojiBytu(slug) {
  const EMOJI = {
    agni: '🔥', balor: '👁️', 'barbarossa-kyffhaeuser': '👑', 'ben-varrey': '🧜‍♀️', 'drangue-shala': '⚡',
    egungun: '🎭', 'empusa-korynt': '🕷️', indra: '🌩️', 'kannon-hase': '🕊️', 'kentaur-pelion': '🐎',
    'lincoln-imp': '😈', nessos: '🏹', 'selkie-sule-skerry': '🦭', 'sfinks-teby': '🦁', 'talos-kreta': '🗿',
    'knecht-z-koptos': '🪵', pandora: '🏺', protostates: '🛡️', 'syama-i-sarvara': '🐕', 'morowa-panna': '🧣',
  };
  return EMOJI[slug] || '✨';
}

export function htmlNowosci(indeks) {
  const wpisy = indeks.aktualizacje ?? [];
  if (!wpisy.length) return '<p class="pusto">Brak zmian w archiwum.</p>';
  const TYTUL = { manifestacja: 'kartoteka', skit: 'skit' };
  const AKCJA = { nowa: 'dodano', nowy: 'dodano', zmiana: 'zmieniono' };
  return `<ul class="nowosci-lista">${wpisy
    .map((a) => {
      const docel = a.typ === 'skit' ? `skit:${a.slug}` : a.slug;
      return `<li>
        <time datetime="${esc(a.data)}">${esc(a.data)}</time>
        <span class="badge-typ">${esc(TYTUL[a.typ] ?? a.typ)} · ${esc(AKCJA[a.akcja] ?? a.akcja)}</span>
        <button class="tytul" data-link="${esc(docel)}">${esc(a.tytul)}</button>
        <p class="opis">${esc(a.opis)}</p>
      </li>`;
    })
    .join('')}</ul>`;
}
