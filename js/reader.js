import { loadIndex, parseArticle, inline, escapeHtml, store, initTheme } from './common.js?v=202611031556';
import { showDictionary, hideDictionary, showChip, hideChip } from './dictionary.js?v=202611031556';

initTheme(document.getElementById('theme-btn'));

const id = new URLSearchParams(location.search).get('id');
const bodyEl = document.getElementById('article');
const headEl = document.getElementById('article-head');
const modeBtns = document.querySelectorAll('.seg [data-mode]');
const dictToggle = document.getElementById('dict-toggle');
const tocEl = document.getElementById('toc');
const tocBtn = document.getElementById('toc-btn');
const tocScrim = document.getElementById('toc-scrim');
const wide = matchMedia('(min-width: 1100px)');

let mode = store.get('reader.mode', 'en'); // 'en' | 'fa' | 'both'
let dictOn = store.get('reader.dict', true);
let tocItems = [];

function setMode(m) {
  mode = m;
  store.set('reader.mode', m);
  document.body.dataset.mode = m;
  modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  // Collapse any opened single-paragraph translations when switching mode.
  document.querySelectorAll('.para.open').forEach(p => p.classList.remove('open'));
  renderToc();
}

function renderPara(p) {
  const tag = p.heading ? `h${p.level}` : 'p';
  const en = p.en ? `<${tag} class="txt en" lang="en">${inline(p.en)}</${tag}>` : '';
  const fa = p.fa ? `<${tag} class="txt fa" lang="fa" dir="rtl">${inline(p.fa)}</${tag}>` : '';
  const cls = ['para', p.heading && 'heading', p.only && `only-${p.only}`].filter(Boolean).join(' ');
  return `
    <div class="${cls}" id="p${p.n}" data-n="${p.n}">
      <span class="pnum" aria-hidden="true">${p.n}</span>
      <div class="cols">${en}${fa}</div>
      ${p.only ? `<div class="only-note">${p.only === 'fa' ? 'Persian only · فقط فارسی' : 'English only · فقط انگلیسی'}</div>` : `
      <button class="peek" aria-label="Show this paragraph in the other language" title="Show translation of this paragraph">
        <span class="peek-en">فا</span><span class="peek-fa">EN</span>
      </button>`}
      ${p.warning ? `<div class="warn">${escapeHtml(p.warning)}</div>` : ''}
    </div>`;
}

// ---- Table of contents -------------------------------------------------

function renderToc() {
  if (!tocItems.length) { tocEl.innerHTML = ''; return; }
  const fa = mode === 'fa';
  tocEl.dir = fa ? 'rtl' : 'ltr';
  tocEl.innerHTML = `
    <div class="toc-title">${fa ? 'فهرست' : 'Contents'} <span class="toc-pct"></span></div>
    <ol>${tocItems.map(p => {
      const text = (fa ? p.fa : p.en) || p.en || p.fa;
      return `<li class="lvl${p.level}"><a href="#p${p.n}" data-n="${p.n}"${fa ? ' lang="fa"' : ''}>${inline(text)}</a></li>`;
    }).join('')}</ol>`;
  updateActiveToc();
  updateProgress();
}

function updateActiveToc() {
  let current = null;
  for (const p of tocItems) {
    const el = document.getElementById(`p${p.n}`);
    if (el && el.getBoundingClientRect().top < 140) current = p.n; else break;
  }
  tocEl.querySelectorAll('a').forEach(a => {
    const on = +a.dataset.n === current;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
}

function setTocOpen(open, remember = true) {
  document.body.classList.toggle('toc-open', open);
  tocBtn.setAttribute('aria-expanded', open);
  tocScrim.hidden = !(open && !wide.matches);
  if (remember && wide.matches) store.set('reader.toc', open);
}

tocBtn.addEventListener('click', () => setTocOpen(!document.body.classList.contains('toc-open')));
tocScrim.addEventListener('click', () => setTocOpen(false, false));
tocEl.addEventListener('click', e => {
  const a = e.target.closest('a[data-n]');
  if (!a) return;
  e.preventDefault();
  document.getElementById(`p${a.dataset.n}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  history.replaceState(null, '', `#p${a.dataset.n}`);
  if (!wide.matches) setTocOpen(false, false);
});
wide.addEventListener('change', () => setTocOpen(wide.matches && tocItems.length > 0 && store.get('reader.toc', true), false));

// ---- Reading progress ----------------------------------------------------
// 0% when the article starts at the top of the screen, 100% when its end is
// in view. Shown as a bar under the top bar and as a percentage.
const progressFill = document.getElementById('progress-fill');
function updateProgress() {
  const r = bodyEl.getBoundingClientRect();
  const barH = document.querySelector('.bar').offsetHeight;
  const total = r.height - (innerHeight - barH);
  const done = total > 0 ? Math.min(1, Math.max(0, (barH - r.top) / total)) : 1;
  const pct = Math.round(done * 100);
  progressFill.style.transform = `scaleX(${done})`;
  progressFill.parentElement.setAttribute('aria-valuenow', pct);
  document.querySelectorAll('.toc-pct').forEach(el => { el.textContent = `· ${pct}%`; });
}

let scrollTick = false;
addEventListener('scroll', () => {
  if (scrollTick) return;
  scrollTick = true;
  requestAnimationFrame(() => { scrollTick = false; updateActiveToc(); updateProgress(); });
}, { passive: true });

// Keep the sidebar just below the top bar (which wraps on small screens).
const bar = document.querySelector('.bar');
new ResizeObserver(() => document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px')).observe(bar);

// ---- Article -------------------------------------------------------------

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

  tocItems = paras.filter(p => p.heading);
  tocBtn.hidden = !tocItems.length;
  setTocOpen(tocItems.length > 0 && wide.matches && store.get('reader.toc', true), false);
  renderToc();
  addEventListener('resize', updateProgress);

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

// ---- Dictionary, only when asked for -------------------------------------
//  - double-click a word in the English text -> dictionary popup right away
//  - select text by dragging (or long-press on touch) -> a small "Translate"
//    button appears; the popup opens only if it is pressed. Copying is unaffected.

const MAX_SELECTION = 2000; // characters sent for translation

// The English text inside the current selection, or null. Only the English
// paragraphs count: paragraph numbers, the فا/EN buttons and hidden Persian
// text are left out, and paragraphs are joined with blank lines.
function currentSelection() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const parts = [];
  for (const el of bodyEl.querySelectorAll('.txt.en')) {
    if (!range.intersectsNode(el)) continue;
    const r = document.createRange();
    r.selectNodeContents(el);
    if (el.contains(range.startContainer)) r.setStart(range.startContainer, range.startOffset);
    if (el.contains(range.endContainer)) r.setEnd(range.endContainer, range.endOffset);
    const t = r.toString().replace(/\s+/g, ' ').trim();
    if (t) parts.push(t);
  }
  let text = parts.join('\n\n');
  if (!text) return null;
  if (text.length > MAX_SELECTION) text = text.slice(0, MAX_SELECTION).replace(/\s+\S*$/, '') + '…';
  return { text, rect: range.getBoundingClientRect() };
}

// For long selections the selection's box can run off screen, so anchor the
// button and popup at the point where the mouse was released.
const pointRect = (x, y) => ({ left: x, right: x, width: 0, top: y - 12, bottom: y + 12, height: 24 });
const isWord = t => /^[A-Za-z][A-Za-z'’-]*$/.test(t);

// Listen on the whole document: a drag-selection often ends outside the text
// column (past the end of a line, in the margin, over the sidebar).
document.addEventListener('mouseup', e => {
  if (!dictOn || e.button !== 0) return;
  if (e.target.closest('.peek, .dict, .dict-chip, .bar, .toc')) return;
  const clicks = e.detail;
  const { clientX: x, clientY: y } = e;
  setTimeout(() => {
    const s = currentSelection();
    if (!s) return;
    if (clicks === 2 && isWord(s.text)) { hideChip(); showDictionary(s.text, s.rect); }
    else showChip(s.text, s.rect.height > 80 ? pointRect(x, y) : s.rect);
  }, 10);
});

// Touch devices: show the button once a selection settles.
let lastPointer = 'mouse';
let selTimer;
addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, { capture: true, passive: true });
document.addEventListener('selectionchange', () => {
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    const s = currentSelection();
    if (!s) { hideChip(); return; }
    if (dictOn && lastPointer !== 'mouse') showChip(s.text, s.rect, { touch: true });
  }, 350);
});

modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
dictToggle.checked = dictOn;
dictToggle.addEventListener('change', () => {
  dictOn = dictToggle.checked;
  store.set('reader.dict', dictOn);
  if (!dictOn) { hideDictionary(); hideChip(true); }
});

setMode(mode);
init().catch(err => { bodyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`; });
