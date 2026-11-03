// Dictionary popup: English definitions (dictionaryapi.dev, free, no key),
// English→Persian translation (Google Translate, falling back to MyMemory) and
// links to Google Translate / Abadis / Fastdic.

import { escapeHtml } from './common.js?v=202611031528';

const popup = document.createElement('div');
popup.className = 'dict';
popup.hidden = true;
popup.setAttribute('role', 'dialog');
document.body.appendChild(popup);

let token = 0;

export function hideDictionary() { popup.hidden = true; token++; }

// Small "Translate" button shown next to a selection. Nothing else happens
// unless it is pressed, so selecting text to copy stays undisturbed.
const chip = document.createElement('button');
chip.className = 'dict-chip';
chip.type = 'button';
chip.hidden = true;
chip.innerHTML = '<span lang="fa">ترجمه</span> · Translate';
document.body.appendChild(chip);
let chipData = null;

// On touch screens the phone's own Copy/Select menu appears right next to the
// selection and would cover the button, so there it sits at the bottom of the
// screen instead (class "touch", positioned by CSS).
export function showChip(text, rect, { touch = false } = {}) {
  chipData = { text, rect, touch };
  chip.classList.toggle('touch', touch);
  chip.hidden = false;
  if (touch) { chip.style.left = chip.style.top = ''; return; }
  const w = chip.offsetWidth, h = chip.offsetHeight;
  let left = rect.left + window.scrollX + rect.width / 2 - w / 2;
  left = Math.max(8 + window.scrollX, Math.min(left, window.scrollX + window.innerWidth - w - 8));
  let top = rect.top + window.scrollY - h - 8;
  if (rect.top < h + 70) top = rect.bottom + window.scrollY + 8; // no room above (under the top bar)
  chip.style.left = left + 'px';
  chip.style.top = top + 'px';
}
// Tapping the button can clear the selection before the tap's click arrives;
// don't let that selection change hide the button out from under the tap.
let pressedAt = 0;
export function hideChip(force = false) {
  if (!force && Date.now() - pressedAt < 1000) return;
  chip.hidden = true;
  chipData = null;
}

chip.addEventListener('pointerdown', () => { pressedAt = Date.now(); });
chip.addEventListener('mousedown', e => e.preventDefault()); // keep the selection
chip.addEventListener('click', () => {
  if (!chipData) return;
  const { text, rect, touch } = chipData;
  hideChip(true);
  if (touch) window.getSelection()?.removeAllRanges(); // dismiss the phone's menu
  showDictionary(text, rect);
});

async function definitions(word) {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data[0];
  const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
  const audio = data.flatMap(e => e.phonetics || []).find(p => p.audio)?.audio || '';
  const meanings = data.flatMap(e => e.meanings).slice(0, 4).map(m => ({
    pos: m.partOfSpeech,
    defs: m.definitions.slice(0, 3).map(d => ({ def: d.definition, ex: d.example })),
  }));
  return { phonetic, audio, meanings };
}

// Google Translate's public web endpoint (the one its own widgets use). It is
// free and needs no key, but it is unofficial, so MyMemory is the fallback.
async function googlePersian(text) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&dt=bd&q='
    + encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const main = (data[0] || []).map(seg => seg[0]).filter(Boolean).join('').trim();
  // For single words Google also returns alternatives grouped by part of speech.
  const groups = (Array.isArray(data[1]) ? data[1] : [])
    .filter(g => Array.isArray(g) && Array.isArray(g[1]))
    .map(g => ({ pos: g[0], words: g[1].slice(0, 6) }));
  return main ? { main, groups, source: 'Google Translate' } : null;
}

async function myMemoryPersian(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fa`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const main = data.responseData?.translatedText;
  const alts = [...new Set((data.matches || []).map(m => m.translation).filter(t => t && t !== main))].slice(0, 3);
  return main ? { main, groups: alts.length ? [{ pos: '', words: alts }] : [], source: 'MyMemory' } : null;
}

async function toPersian(text) {
  try {
    const g = await googlePersian(text);
    if (g) return g;
  } catch { /* fall through */ }
  return myMemoryPersian(text);
}

const POS_FA = { noun: 'اسم', verb: 'فعل', adjective: 'صفت', adverb: 'قید', preposition: 'حرف اضافه', conjunction: 'حرف ربط', pronoun: 'ضمیر' };

function links(text, isWord) {
  const q = encodeURIComponent(text);
  const items = [
    ['Google Translate', `https://translate.google.com/?sl=en&tl=fa&text=${q}&op=translate`],
  ];
  if (isWord) {
    items.push(['Abadis', `https://abadis.ir/entofa/${q}/`]);
    items.push(['Fastdic', `https://fastdic.com/word/${q}`]);
    items.push(['Cambridge', `https://dictionary.cambridge.org/dictionary/english/${q}`]);
  }
  return items.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join('');
}

function position(rect) {
  popup.hidden = false;
  const w = Math.min(380, window.innerWidth - 32);
  popup.style.width = w + 'px';
  let left = rect.left + window.scrollX + rect.width / 2 - w / 2;
  left = Math.max(16 + window.scrollX, Math.min(left, window.scrollX + window.innerWidth - w - 16));
  popup.style.left = left + 'px';
  popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
}

export async function showDictionary(text, rect) {
  const my = ++token;
  text = text.trim().replace(/\s+/g, ' ');
  const isWord = /^[A-Za-z][A-Za-z'-]*$/.test(text);
  const word = isWord ? text.toLowerCase().replace(/'s$/, '') : text;

  popup.innerHTML = `
    <div class="dict-head">
      <strong class="dict-word">${escapeHtml(text.length > 60 ? text.slice(0, 60) + '…' : text)}</strong>
      <button class="icon-btn dict-close" aria-label="Close">✕</button>
    </div>
    <section class="dict-fa" lang="fa" dir="rtl"><span class="muted">در حال ترجمه…</span></section>
    ${isWord ? '<section class="dict-en"><span class="muted">Looking up…</span></section>' : ''}
    <div class="dict-links">${links(text, isWord)}</div>`;
  popup.querySelector('.dict-close').onclick = hideDictionary;
  position(rect);

  toPersian(word).then(r => {
    if (my !== token) return;
    const el = popup.querySelector('.dict-fa');
    el.innerHTML = r
      ? `<div class="fa-main">${escapeHtml(r.main)}</div>
         ${r.groups.map(g => `<div class="fa-alts">${g.pos ? `<span class="fa-pos">${escapeHtml(POS_FA[g.pos] || g.pos)}:</span> ` : ''}${g.words.map(escapeHtml).join('، ')}</div>`).join('')}
         <div class="fa-src" dir="ltr">${escapeHtml(r.source)}</div>`
      : '<span class="muted">ترجمه در دسترس نیست — از پیوند گوگل ترنسلیت استفاده کنید.</span>';
  }).catch(() => {
    if (my === token) popup.querySelector('.dict-fa').innerHTML = '<span class="muted">ترجمه در دسترس نیست.</span>';
  });

  if (isWord) {
    definitions(word).then(d => {
      if (my !== token) return;
      const el = popup.querySelector('.dict-en');
      if (!d) { el.innerHTML = '<span class="muted">No English definition found.</span>'; return; }
      el.innerHTML = `
        ${d.phonetic || d.audio ? `<div class="phon">${escapeHtml(d.phonetic)} ${d.audio ? '<button class="icon-btn play" aria-label="Pronounce">🔊</button>' : ''}</div>` : ''}
        ${d.meanings.map(m => `
          <div class="pos">${escapeHtml(m.pos)}</div>
          <ol>${m.defs.map(x => `<li>${escapeHtml(x.def)}${x.ex ? `<div class="ex">“${escapeHtml(x.ex)}”</div>` : ''}</li>`).join('')}</ol>`).join('')}`;
      el.querySelector('.play')?.addEventListener('click', () => new Audio(d.audio).play());
    }).catch(() => {
      if (my === token) popup.querySelector('.dict-en').innerHTML = '<span class="muted">Dictionary unavailable.</span>';
    });
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideDictionary(); hideChip(); } });
document.addEventListener('mousedown', e => {
  if (!popup.hidden && !popup.contains(e.target)) hideDictionary();
  if (!chip.hidden && e.target !== chip && !chip.contains(e.target)) hideChip();
});
