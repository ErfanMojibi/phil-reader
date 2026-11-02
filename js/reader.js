import { loadIndex, parseArticle, inline, escapeHtml, store, initTheme } from './common.js';
import { showDictionary, hideDictionary } from './dictionary.js';

initTheme(document.getElementById('theme-btn'));

const id = new URLSearchParams(location.search).get('id');
const bodyEl = document.getElementById('article');
const headEl = document.getElementById('article-head');
const modeBtns = document.querySelectorAll('[data-mode]');
const dictToggle = document.getElementById('dict-toggle');

let mode = store.get('reader.mode', 'en'); // 'en' | 'fa' | 'both'
let dictOn = store.get('reader.dict', true);

function setMode(m) {
  mode = m;
  store.set('reader.mode', m);
  document.body.dataset.mode = m;
  modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  // Collapse any opened single-paragraph translations when switching mode.
  document.querySelectorAll('.para.open').forEach(p => p.classList.remove('open'));
}

function renderPara(p) {
  const tag = p.heading ? 'h2' : 'p';
  const en = `<${tag} class="txt en" lang="en">${inline(p.en) || '<span class="missing">— English missing —</span>'}</${tag}>`;
  const fa = `<${tag} class="txt fa" lang="fa" dir="rtl">${inline(p.fa) || '<span class="missing">— ترجمه موجود نیست —</span>'}</${tag}>`;
  return `
    <div class="para${p.heading ? ' heading' : ''}" id="p${p.n}" data-n="${p.n}">
      <span class="pnum" aria-hidden="true">${p.n}</span>
      <div class="cols">${en}${fa}</div>
      <button class="peek" aria-label="Show this paragraph in the other language" title="Show translation of this paragraph">
        <span class="peek-en">فا</span><span class="peek-fa">EN</span>
      </button>
      ${p.warning ? `<div class="warn">${escapeHtml(p.warning)}</div>` : ''}
    </div>`;
}

async function init() {
  if (!id) { bodyEl.innerHTML = '<p class="empty">No article selected. <a href="./">Back to library</a></p>'; return; }
  const index = await loadIndex();
  const meta = index.find(a => a.id === id);
  if (!meta) throw new Error(`Article “${id}” not found in articles/index.json`);
  document.title = `${meta.title} · Philosophy Reader`;

  const res = await fetch(`articles/${meta.file}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load articles/${meta.file}`);
  const paras = parseArticle(await res.text());

  headEl.innerHTML = `
    <h1>${escapeHtml(meta.title)}</h1>
    ${meta.titleFa ? `<div class="title-fa" lang="fa" dir="rtl">${escapeHtml(meta.titleFa)}</div>` : ''}
    <div class="meta">${escapeHtml(meta.author || '')}${meta.year ? ` · ${meta.year}` : ''}${meta.translator ? ` · ${escapeHtml(meta.translator)}` : ''}</div>
    <div class="tags">${(meta.categories || []).map(c => `<span class="tag">${escapeHtml(c)}</span>`).join('')}</div>`;
  bodyEl.innerHTML = paras.map(renderPara).join('');

  // Resume reading position.
  const saved = store.get(`progress.${id}`, null);
  const target = location.hash ? document.querySelector(location.hash) : saved && document.getElementById(`p${saved}`);
  if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 50);

  // Track progress.
  const obs = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting).map(e => +e.target.dataset.n);
    if (vis.length) store.set(`progress.${id}`, Math.min(...vis));
  }, { rootMargin: '0px 0px -70% 0px' });
  document.querySelectorAll('.para').forEach(p => obs.observe(p));
}

// Per-paragraph translation toggle.
bodyEl.addEventListener('click', e => {
  const btn = e.target.closest('.peek');
  if (!btn) return;
  const para = btn.closest('.para');
  para.classList.toggle('open');
  btn.setAttribute('aria-expanded', para.classList.contains('open'));
});

// Dictionary: double-click a word, or select a phrase, in English text.
function handleSelection() {
  if (!dictOn) return;
  const sel = window.getSelection();
  const text = sel?.toString().trim();
  if (!text || text.length > 300) return;
  const node = sel.anchorNode?.parentElement;
  if (!node?.closest('.txt.en, .card-title, h1')) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  showDictionary(text, rect);
}
bodyEl.addEventListener('mouseup', e => { if (!e.target.closest('.peek')) setTimeout(handleSelection, 10); });
bodyEl.addEventListener('touchend', () => setTimeout(handleSelection, 300));

modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
dictToggle.checked = dictOn;
dictToggle.addEventListener('change', () => { dictOn = dictToggle.checked; store.set('reader.dict', dictOn); if (!dictOn) hideDictionary(); });

setMode(mode);
init().catch(err => { bodyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`; });
