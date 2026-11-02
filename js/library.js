import { loadIndex, escapeHtml, store, initTheme } from './common.js?v=202611021737';

initTheme(document.getElementById('theme-btn'));

const listEl = document.getElementById('list');
const chipsEl = document.getElementById('chips');
const searchEl = document.getElementById('search');

let articles = [];
let active = store.get('library.category', 'All');

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const shown = articles.filter(a =>
    (active === 'All' || a.categories.includes(active)) &&
    (!q || [a.title, a.titleFa, a.author, ...a.categories].join(' ').toLowerCase().includes(q)));

  listEl.innerHTML = shown.length ? shown.map(a => {
    const progress = store.get(`progress.${a.id}`, null);
    return `
    <a class="card" href="read.html?id=${encodeURIComponent(a.id)}">
      <div class="card-title">${escapeHtml(a.title)}</div>
      ${a.titleFa ? `<div class="card-title-fa" lang="fa" dir="rtl">${escapeHtml(a.titleFa)}</div>` : ''}
      <div class="card-meta">${escapeHtml(a.author || '')}${a.year ? ` · ${a.year}` : ''}</div>
      <div class="tags">${a.categories.map(c => `<span class="tag">${escapeHtml(c)}</span>`).join('')}</div>
      ${progress ? `<div class="card-progress">Continue from paragraph ${progress}</div>` : ''}
    </a>`;
  }).join('') : '<p class="empty">No articles match.</p>';
}

function renderChips() {
  const cats = ['All', ...[...new Set(articles.flatMap(a => a.categories))].sort()];
  if (!cats.includes(active)) active = 'All';
  chipsEl.innerHTML = cats.map(c =>
    `<button class="chip" aria-pressed="${c === active}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
}

chipsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  active = b.dataset.cat;
  store.set('library.category', active);
  renderChips(); render();
});
searchEl.addEventListener('input', render);

loadIndex().then(data => {
  articles = data.map(a => ({ categories: [], ...a }));
  renderChips(); render();
}).catch(err => { listEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`; });
