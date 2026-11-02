// Shared helpers: storage, data loading, article-format parser.

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Minimal inline formatting: *italic* and **bold**.
export function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

export async function loadIndex() {
  const res = await fetch('articles/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load articles/index.json');
  return res.json();
}

/*
  Article format (plain text):

    ===
    English paragraph
    ---
    Persian paragraph

    ===
    ## English heading          (## = section, ### = sub-section)
    ---
    ## Persian heading

    ===
    ---
    A Persian-only paragraph (leave the English side empty, or vice versa)

  Every block starts with a line "===". Inside a block, a line "---"
  separates English (above) from Persian (below).
*/
export function parseArticle(text) {
  const blocks = text.replace(/\r\n?/g, '\n').split(/^===[ \t]*$/m)
    .map(b => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const parts = block.split(/^---[ \t]*$/m);
    const read = s => {
      s = (s || '').trim();
      const m = s.match(/^(#{1,3})\s+/);
      return { text: m ? s.slice(m[0].length) : s, level: m ? m[1].length : 0 };
    };
    const en = read(parts[0]);
    const fa = read(parts[1]);
    const level = en.level || fa.level;
    return {
      n: i + 1,
      heading: level > 0,
      level: Math.max(level, 2),
      only: !en.text && fa.text ? 'fa' : (en.text && !fa.text ? 'en' : null),
      en: en.text,
      fa: fa.text,
      warning: parts.length !== 2 ? `Block ${i + 1}: expected exactly one "---" separator, found ${parts.length - 1}` : null,
    };
  });
}

// Theme toggle shared by both pages.
export function initTheme(button) {
  const apply = t => {
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  };
  apply(store.get('theme', null));
  button?.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    store.set('theme', next);
    apply(next);
  });
}
