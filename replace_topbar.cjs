const fs = require('fs');
let c = fs.readFileSync('tools/kronika.mjs', 'utf8');

const html = `export function generujTopbarHTML(aktywny = 'kronika') {
  return \`  <header class="gora">
    <div class="tytul">
      <h1><a href="../index.html" style="text-decoration:none;color:inherit">AME</a></h1>
      <p>Archiwum Manifestacji Eterycznych</p>
    </div>
    <input id="szukaj" type="search" placeholder="Szukaj: nazwa, karta, tag, kraj…" autocomplete="off" aria-label="Szukaj manifestacji" onkeypress="if(event.key === 'Enter') window.location.href='../index.html?q='+encodeURIComponent(this.value)">
    <div class="akcje">
      <a id="przycisk-los" class="przycisk" href="../index.html?action=wylosuj" title="Wylosuj manifestację i przeleć do niej na mapie">🎲 wylosuj</a>
      <a id="przycisk-luki" class="przycisk" href="../index.html?action=powiazania" title="Pokaż powiązania na mapie">∞ powiązania</a>
      <a id="przycisk-lista" class="przycisk" href="../index.html#lista" title="Lista wszystkich manifestacji">☰ kartoteka</a>
      <a id="przycisk-skity" class="przycisk" href="../index.html#skity" title="Baza Skitów — rozmowy materializacji">✎ skity</a>
      <a id="przycisk-nowosci" class="przycisk" href="../index.html#nowosci" title="Co nowego — aktualizacje archiwum">✚ nowości</a>
      <a id="przycisk-kronika" class="przycisk \${aktywny === 'tom-1' ? 'aktywny' : ''}" href="kronika-tom-1.html" title="Kronika świata AME — tocząca się opowieść epok">📜 kronika</a>
      <button id="przycisk-motyw" class="przycisk przycisk-motyw" type="button" aria-pressed="false" title="Przełącz tryb ciemny/jasny" onclick="const m = document.documentElement.dataset.motyw === 'jasny' ? 'ciemny' : 'jasny'; document.documentElement.dataset.motyw = m; localStorage.setItem('ame:motyw', m); this.innerHTML = m === 'jasny' ? '☀ jasny' : '☾ ciemny';">☾ motyw</button>
    </div>
  </header>
  <script>
    (function() {
      const m = localStorage.getItem('ame:motyw') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ciemny' : 'jasny');
      document.documentElement.dataset.motyw = m;
      const btn = document.getElementById('przycisk-motyw');
      if (btn) btn.innerHTML = m === 'jasny' ? '☀ jasny' : '☾ ciemny';
    })();
  </script>\`;
}`;

c = c.replace(/export function generujTopbarHTML[\s\S]*?<\/header>`;\n}/, html);

const css = `html[data-motyw="ciemny"] {
  --bg: #0d1015;
  --bg-subtle: #141922;
  --fg: #d8d2c4;
  --muted: #8b877c;
  --line: #2a3140;
  --card: #1b2230;
  --card-alt: #232c3c;
  --accent: #c9a86a;
  --accent-light: #e0ca9a;
  --accent-glow: rgba(201, 168, 106, 0.15);
  --mit: #5ab57a;
  --mit-bg: #22382c;
  --rac: #6ea3c2;
  --rac-bg: #23344a;
  --code: #161b24;
}

/* Zastąpione klasy .topbar z głównego menu */
.gora {
  display: flex; align-items: center; gap: 14px; padding: 10px 16px;
  background: var(--bg-subtle); border-bottom: 1px solid var(--line);
  margin: -40px -40px 40px -40px;
  flex-wrap: wrap;
}
.tytul { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; }
.tytul h1 { margin: 0; font-family: inherit; font-size: 22px; letter-spacing: 0.12em; color: var(--accent); }
.tytul h1 a { text-decoration: none; color: inherit; }
.tytul p { margin: 0; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted); }
#szukaj {
  flex: 1; min-width: 120px; max-width: 520px; padding: 8px 14px;
  border-radius: 999px; border: 1px solid var(--line);
  background: var(--card); color: var(--fg); font-size: 14px;
}
.akcje { display: flex; gap: 8px; flex-wrap: wrap; }
.przycisk {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 7px 12px; border-radius: 8px; border: 1px solid var(--line);
  background: var(--card); color: var(--fg); font-size: 13px;
  cursor: pointer; text-decoration: none;
}
.przycisk:hover { background: var(--card-alt); border-color: var(--accent-light); }
.przycisk.aktywny { border-color: var(--accent); color: var(--accent); }

@media (max-width: 900px) {
  .gora { flex-wrap: wrap; margin: -20px -20px 20px -20px; }
  #szukaj { order: 3; flex-basis: 100%; max-width: none; }
  .tytul p { display: none; }
}
`;

// Remove the old topbar rules and append the new ones
c = c.replace(/\.topbar \{[\s\S]*?transition: all \.15s ease;\n\}/, css);
fs.writeFileSync('tools/kronika.mjs', c);
