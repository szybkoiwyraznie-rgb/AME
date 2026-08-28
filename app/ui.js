/**
 * app/ui.js — panel wpisu, lista manifestacji, tagi, pasek wyszukiwania.
 * Cała treść wpisów jest wstawiana jako tekst (esc), nigdy jako HTML.
 */

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
  'leksykon online': 'Leksykon online',
};

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

/** Pełny wpis kartoteki (sekcje I–VI wg protokołu MFM v1.3). */
export function htmlWpisu(w, indeks) {
  const rekord = indeks.manifestacje.find((m) => m.slug === w.slug) ?? {};
  const alt = (w.nazwy_alternatywne ?? []).length ? `<p class="alt">znany też jako: ${esc(w.nazwy_alternatywne.join(', '))}</p>` : '';
  const naglowek = `
    <header class="naglowek-wpisu">
      <p class="karta-inspiracja">inspiracja kartą <strong>${esc(w.karta?.nazwa ?? '?')}</strong>${w.karta?.rok ? ` (${esc(w.karta.rok)})` : ''}</p>
      <h2>${esc(w.nazwa)}</h2>
      ${alt}
      <p class="lokalizacja">📍 ${esc(w.lokalizacja.miejscowosc)}, ${esc(w.lokalizacja.kraj)} · ${w.lokalizacja.lat.toFixed(2)}°, ${w.lokalizacja.lon.toFixed(2)}°</p>
      <p class="pochodzenie">${esc(w.pochodzenie_i_kultura)}</p>
      <div class="chipy">${(w.tagi ?? []).map((t) => `<button class="chip tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    </header>`;

  const tabela = `
    <table class="tabela-translacji">
      <thead><tr><th>Element karty</th><th>Translacja na byt</th></tr></thead>
      <tbody>${(w.rezonans.tabela ?? [])
        .map((r) => `<tr><td>${esc(r.element)}</td><td>${esc(r.translacja)}</td></tr>`)
        .join('')}</tbody>
    </table>`;

  const V = sekcja(
    'V',
    'Rezonans i tożsamość',
    `<p>${esc(w.rezonans.klucz_przywolania)}</p>${tabela}`
  );

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
  const VI = htmlSkitowWpisu(rekord.skity, indeks);
  const wiki =
    powiazania || backlinki
      ? sekcja(
          '∞',
          'Powiązania',
          `${powiazania ? `<ul class="powiazania">${powiazania}</ul>` : ''}${
            backlinki ? `<p class="wzmiankowane">wzmiankowany przez: ${backlinki}</p>` : ''
          }`
        )
      : '';

  const meta = `<footer class="meta-wpisu">utworzono ${esc(w.meta.utworzono)}${w.meta.autor ? ` · ${esc(w.meta.autor)}` : ''}${
    (w.meta.modyfikacje ?? []).length
      ? ` · zmiany: ${w.meta.modyfikacje.map((m) => `${esc(m.data)} (${esc(m.opis)})`).join('; ')}`
      : ''
  }</footer>`;

  // Sekcje I–V w kolejności numeracji (PROTOKÓŁ §4.1, v1.3): numer = pozycja.
  return `<div class="wpis">${naglowek}${I}${II}${III}${IV}${V}${VI}${wiki}${meta}</div>`;
}

/**
 * Pełnoekranowa warstwa z wpisem (B2): nakładka na całe okno, dialog z
 * porządną dostępnością i przyciskiem zamknięcia. Treść wklejana jako
 * `htmlWpisu()` — warstwa tylko dodaje rusztowanie.
 */
export function htmlWarstwyWpisu(trescHtml, { slug = '', nazwa = '' } = {}) {
  return `<div class="warstwa-wpisu" role="dialog" aria-modal="true" tabindex="-1" aria-label="Kartoteka: ${esc(nazwa || slug)}">
  <button class="zamknij" id="zamknij-wpis" type="button" aria-label="Zamknij kartotekę">✕</button>
  ${trescHtml}
</div>`;
}

export function nazwaSluga(slug, indeks) {
  return indeks.manifestacje.find((m) => m.slug === slug)?.nazwa ?? slug;
}

/** Lista manifestacji (wszystkie lub przefiltrowane). */
export function htmlListy(indeks, widoczne /* Set|null */) {
  const pozycje = indeks.manifestacje
    .filter((m) => widoczne === null || widoczne.has(m.slug))
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
  if (pozycje.length === 0) return '<p class="pusto">Brak manifestacji spełniających kryterium.</p>';
  return `<ul class="lista-manifestacji">${pozycje
    .map(
      (m) => `
      <li>
        <button class="wiersz" data-slug="${esc(m.slug)}">
          <span class="nazwa">${esc(m.nazwa)}</span>
          <span class="opis">insp. ${esc(m.karta)} · ${esc(m.miejscowosc)}, ${esc(m.kraj)}</span>
        </button>
      </li>`
    )
    .join('')}</ul>`;
}

/** Pasek tagów (najpopularniejsze + reszta). */
export function htmlTagow(indeks, aktywnyTag) {
  const tagi = Object.entries(indeks.tagi).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'pl'));
  const html = tagi
    .map(
      ([t, slugi]) =>
        `<button class="chip tag${t === aktywnyTag ? ' aktywny' : ''}" data-tag="${esc(t)}">${esc(t)} <span class="licznik">${slugi.length}</span></button>`
    )
    .join('');
  return html || '';
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

/** Widok jednego SKITa (z pełnego pliku) wraz z listą uczestników. */
export function htmlSkitu(s, indeks) {
  const uczestnicy = (s.uczestnicy ?? [])
    .map((u) => `<button class="chip link" data-slug="${esc(u.slug)}">${esc(u.imie)}</button>`)
    .join(' ');
  const temat = s.temat ? `<p class="skit-temat">${esc(s.temat)}</p>` : '';
  const meta = `<footer class="meta-wpisu">utworzono ${esc(s.meta?.utworzono ?? '?')}${s.meta?.autor ? ` · ${esc(s.meta.autor)}` : ''}${
    (s.meta?.modyfikacje ?? []).length ? ` · zmiany: ${s.meta.modyfikacje.map((m) => `${esc(m.data)} (${esc(m.opis)})`).join('; ')}` : ''
  }</footer>`;
  return `<article class="skit" data-skit="${esc(s.slug)}">
    ${naglowekSkitu(s.tytul)}
    <p class="skit-uczestnicy"><span>Uczestnicy:</span> ${uczestnicy}</p>
    ${temat}
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
        <span class="opis">${esc((s.imiona ?? []).join(' × '))} · ${s.slow ?? 0} słów${s.data ? ` · ${esc(s.data)}` : ''}</span>
        ${s.temat ? `<span class="temat">${esc(s.temat)}</span>` : ''}
      </button></li>`
    )
    .join('')}</ul>`;
}

/** Sekcja VI wpisu: skity, w których materializacja zabiera głos. */
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
  return sekcja('VI', 'SKITy', `<ul class="powiazania skity-wpisu">${pola}</ul>
    <p class="wzmiankowane">rozmowy materializacji z tej bazy; pisze je kolejna sesja (PROTOKÓŁ §8).</p>`);
}

/** Feed „Co nowego": najnowsze na górze, każda pozacja linkuje do treści. */
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
