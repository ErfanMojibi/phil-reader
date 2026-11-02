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
  Article format (Markdown):

    # Article title            <- optional, ignored by the reader (for GitHub)

    ## English heading          (## = section, ### = sub-section)

    > ## Persian heading

    English paragraph

    > Persian paragraph

  Paragraphs are separated by blank lines. A paragraph starting with ">" is
  the Persian translation of the English paragraph just before it.
*/
export function parseArticle(text) {
  const chunks = text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/)
    .map(c => c.trim()).filter(Boolean);
  const heading = s => {
    const m = s.match(/^(#{1,3})\s+/);
    return { text: m ? s.slice(m[0].length) : s, level: m ? m[1].length : 0 };
  };
  const items = [];
  for (const chunk of chunks) {
    const isFa = chunk.startsWith('>');
    const body = isFa ? chunk.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ').trim()
                      : chunk.split('\n').join(' ').trim();
    const h = heading(body);
    if (!isFa && h.level === 1) continue; // file title
    const last = items[items.length - 1];
    if (isFa && last && !last.fa) {
      last.fa = h.text;
      last.level = last.level || h.level;
    } else if (isFa) {
      items.push({ en: '', fa: h.text, level: h.level });
    } else {
      items.push({ en: h.text, fa: '', level: h.level });
    }
  }
  return items.map((it, i) => ({
    n: i + 1,
    heading: it.level > 0,
    level: Math.max(it.level, 2),
    only: !it.en ? 'fa' : (!it.fa ? 'en' : null),
    en: it.en,
    fa: it.fa,
    warning: null,
  }));
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
