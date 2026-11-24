/* Ortak arayüz yardımcıları: DOM, api, pencere, emoji çizimi, zarf, kâğıt, emoji atölyesi. */
(function () {
  'use strict';
  const C = window.CONFIG;
  const U = (window.UI = {});

  /* ---------------------------------------------------------------- DOM */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  U.h = h;

  U.field = (label, input, hint) =>
    h('div', { class: 'field' }, h('label', null, label), input, hint ? h('span', { class: 'muted small' }, hint) : null);

  /* ---------------------------------------------------------------- api */
  U.api = async function api(path, method = 'GET', body) {
    let res;
    try {
      res = await fetch('/api' + path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'same-origin'
      });
    } catch {
      const e = new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
      e.status = 0;
      throw e;
    }
    let data = null;
    try { data = await res.json(); } catch { /* boş yanıt */ }
    if (!res.ok) {
      const e = new Error((data && data.error) || 'Bir hata oluştu');
      e.status = res.status;
      e.data = data;
      throw e;
    }
    return data;
  };

  /* ---------------------------------------------------------------- bildirimler */
  U.toast = function (msg, kind) {
    const box = document.getElementById('toasts');
    const t = h('div', { class: 'toast' + (kind === 'err' ? ' err' : ''), role: 'status' }, msg);
    box.append(t);
    setTimeout(() => t.remove(), kind === 'err' ? 5000 : 3000);
  };

  U.openModal = function (title, content) {
    const prev = document.activeElement;
    const overlay = h('div', { class: 'overlay' });
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      overlay.remove();
      if (!document.querySelector('.overlay')) document.body.classList.remove('noscroll');
      if (prev && prev.isConnected && typeof prev.focus === 'function') { try { prev.focus(); } catch { /* yoksay */ } }
      if (typeof close.onclose === 'function') close.onclose();
    };
    overlay._close = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' },
      h('div', { class: 'modal-head' }, h('h3', null, title), h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Kapat', onclick: close }, '✕')),
      content);
    const focusables = () => [...overlay.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null || el === document.activeElement);
    overlay.addEventListener('keydown', (e) => {          // Tab modal içinde döner
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modal)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    overlay.append(modal);
    document.body.append(overlay);
    document.body.classList.add('noscroll');
    const inner = [...modal.querySelectorAll('input:not([disabled]),textarea,select,a[href],.btn,button:not(.iconbtn)')].find((el) => !el.closest('.modal-head'));
    (inner || modal.querySelector('.iconbtn') || modal).focus({ preventScroll: true });
    return close;
  };
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const overlays = document.querySelectorAll('.overlay');
    const top = overlays[overlays.length - 1];
    if (top) { if (top._close) top._close(); else top.remove(); }
    if (!document.querySelector('.overlay')) document.body.classList.remove('noscroll');
  });

  /* ---------------------------------------------------------------- biçimlendirme */
  const pad = (n) => String(n).padStart(2, '0');
  U.pad = pad;
  U.fmtDate = (ms) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(ms);
  U.fmtDateTime = (ms) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(ms);
  U.toLocalInput = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  U.countdown = (ms) => {
    const diff = ms - Date.now();
    if (diff <= 0) return 'şimdi açılıyor…';
    const m = Math.floor(diff / 60000), hr = Math.floor(m / 60), d = Math.floor(hr / 24);
    if (d >= 1) return `${d} gün ${hr % 24} saat`;
    if (hr >= 1) return `${hr} saat ${m % 60} dk`;
    if (m >= 1) return `${m} dk`;
    return 'birkaç saniye';
  };

  /* ---------------------------------------------------------------- emoji çizimi */
  const TONES = ['#ffd95a', '#ffc86b', '#ffb3a7', '#f7a8c8', '#b8e6c1', '#b9d7ff', '#d4c1f5', '#ff9b5e', '#f26d6d', '#c9a27e', '#f4f1ea', '#8fb7ff'];
  const BGS = ['none', '#ffe3ea', '#d9f5e5', '#e8dcff', '#fff3c4', '#d8ecff', '#ffe0cc', '#2d2a3e'];
  const INK = '#3b2a2a';
  const pick = (p, k) => {
    const v = Number(p && p[k]);
    return Number.isInteger(v) && v >= 0 && v < C.EMOJI.ranges[k] ? v : 0;
  };
  const star = (cx, cy, spikes, outer, inner) => {
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 ? inner : outer, a = (Math.PI * i) / spikes - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  };
  const heart = (cx, cy, k, fill) =>
    `<path transform="translate(${cx} ${cy}) scale(${k})" d="M0 8C-9 1-6-6-2-6C-1-6 0-5 0-4C0-5 1-6 2-6C6-6 9 1 0 8Z" fill="${fill}"/>`;
  const flower = (cx, cy) =>
    [0, 1, 2, 3, 4].map((i) => {
      const a = (i * Math.PI * 2) / 5;
      return `<circle cx="${(cx + 6 * Math.cos(a)).toFixed(1)}" cy="${(cy + 6 * Math.sin(a)).toFixed(1)}" r="5" fill="#ff8fb1"/>`;
    }).join('') + `<circle cx="${cx}" cy="${cy}" r="4" fill="#ffd95a"/>`;
  const line = `stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

  U.emojiSVG = function (p, size = 64) {
    const g = (k) => pick(p, k);
    const tone = TONES[g('tone')];
    const fs = 'stroke="rgba(0,0,0,.22)" stroke-width="2"';
    const bg = BGS[g('bg')] === 'none' ? '' : `<circle cx="50" cy="50" r="49" fill="${BGS[g('bg')]}"/>`;
    const face = [
      `<circle cx="50" cy="52" r="36" fill="${tone}" ${fs}/>`,
      `<rect x="14" y="16" width="72" height="72" rx="24" fill="${tone}" ${fs}/>`,
      `<path d="M50 90C8 62 6 28 30 21C42 18 50 27 50 33C50 27 58 18 70 21C94 28 92 62 50 90Z" fill="${tone}" ${fs}/>`,
      `<ellipse cx="50" cy="52" rx="34" ry="40" fill="${tone}" ${fs}/>`,
      `<polygon points="${star(50, 52, 12, 43, 35)}" fill="${tone}" ${fs} stroke-linejoin="round"/>`
    ][g('face')];
    const eyes = [
      `<circle cx="37" cy="48" r="4" fill="${INK}"/><circle cx="63" cy="48" r="4" fill="${INK}"/>`,
      `<circle cx="37" cy="48" r="7" fill="${INK}"/><circle cx="63" cy="48" r="7" fill="${INK}"/><circle cx="39.5" cy="45.5" r="2.4" fill="#fff"/><circle cx="65.5" cy="45.5" r="2.4" fill="#fff"/>`,
      `<path d="M30 50Q37 41 44 50M56 50Q63 41 70 50" ${line}/>`,
      heart(37, 47, 1.15, '#e0315a') + heart(63, 47, 1.15, '#e0315a'),
      `<polygon points="${star(37, 48, 5, 8.5, 3.6)}" fill="#ffb400" stroke="#b37a00" stroke-width="1"/><polygon points="${star(63, 48, 5, 8.5, 3.6)}" fill="#ffb400" stroke="#b37a00" stroke-width="1"/>`,
      `<circle cx="37" cy="48" r="4" fill="${INK}"/><path d="M56 49Q63 41 70 49" ${line}/>`,
      `<path d="M30 49H44M56 49H70" ${line}/>`,
      `<circle cx="37" cy="48" r="7" fill="${INK}"/><circle cx="63" cy="48" r="7" fill="${INK}"/><circle cx="39.5" cy="45" r="2.5" fill="#fff"/><circle cx="34.5" cy="51" r="1.4" fill="#fff"/><circle cx="65.5" cy="45" r="2.5" fill="#fff"/><circle cx="60.5" cy="51" r="1.4" fill="#fff"/>`,
      `<path d="M32 43L42 53M42 43L32 53M58 43L68 53M68 43L58 53" ${line}/>`,
      `<path d="M30 50Q37 44 44 50M56 50Q63 44 70 50M31 48L28 45M37 45.5L37 41.5M43 48L46 45M57 48L54 45M63 45.5L63 41.5M69 48L72 45" ${line} stroke-width="2.6"/>`,
      `<circle cx="37" cy="48" r="6.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="40" cy="48" r="3.2" fill="${INK}"/><circle cx="63" cy="48" r="6.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="66" cy="48" r="3.2" fill="${INK}"/>`,
      `<circle cx="37" cy="48" r="7" fill="#5b3b8c"/><circle cx="63" cy="48" r="7" fill="#5b3b8c"/><circle cx="39.5" cy="45.5" r="2.4" fill="#fff"/><circle cx="65.5" cy="45.5" r="2.4" fill="#fff"/><circle cx="35" cy="51" r="1.3" fill="#ffd1e8"/><circle cx="61" cy="51" r="1.3" fill="#ffd1e8"/>`
    ][g('eyes')];
    const brows = [
      '',
      `<path d="M30 37H44M56 37H70" ${line} stroke-width="3"/>`,
      `<path d="M30 34L44 39M70 34L56 39" ${line} stroke-width="3"/>`,
      `<path d="M30 37Q37 31 44 37M56 37Q63 31 70 37" ${line} stroke-width="3"/>`,
      `<path d="M30 39L44 34M70 39L56 34" ${line} stroke-width="3"/>`,
      `<path d="M30 37H44M56 37H70" ${line} stroke-width="5.5"/>`
    ][g('brows')];
    const mouth = [
      `<path d="M37 63Q50 76 63 63" ${line}/>`,
      `<path d="M36 62Q50 84 64 62Z" fill="#7a2530" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M42 72Q50 79 58 72Q50 69 42 72Z" fill="#ff8aa0"/>`,
      `<path d="M40 68Q54 72 63 62" ${line}/>`,
      `<ellipse cx="50" cy="68" rx="5" ry="6.5" fill="#7a2530"/>`,
      `<path d="M41 68H59" ${line}/>`,
      `<path d="M50 72C42 66 44 60 48 60C49 60 50 61 50 62C50 61 51 60 52 60C56 60 58 66 50 72Z" fill="#e0315a"/>`,
      `<path d="M38 63Q50 74 62 63" ${line}/><path d="M45 69Q50 80 55 69Z" fill="#ff7a93" stroke="${INK}" stroke-width="2"/>`,
      `<path d="M39 71Q50 61 61 71" ${line}/>`,
      `<path d="M34 61H66Q64 83 50 83Q36 83 34 61Z" fill="#7a2530" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M36 62H64V66H36Z" fill="#fff"/>`,
      `<path d="M38 64Q44 71 50 64Q56 71 62 64" ${line}/>`,
      `<rect x="37" y="62" width="26" height="12" rx="6" fill="#fff" stroke="${INK}" stroke-width="2.5"/><path d="M37 68H63M45 62V74M55 62V74" stroke="${INK}" stroke-width="1.5"/>`,
      `<circle cx="50" cy="68" r="3.5" fill="#7a2530"/><path d="M58 61q5-4 8 0" ${line} stroke-width="2.5"/>`
    ][g('mouth')];
    const acc = [
      '',
      `<circle cx="37" cy="48" r="10" fill="rgba(255,255,255,.28)" stroke="${INK}" stroke-width="2.5"/><circle cx="63" cy="48" r="10" fill="rgba(255,255,255,.28)" stroke="${INK}" stroke-width="2.5"/><path d="M47 48H53" stroke="${INK}" stroke-width="2.5"/>`,
      `<rect x="26" y="41" width="20" height="13" rx="5" fill="#222"/><rect x="54" y="41" width="20" height="13" rx="5" fill="#222"/><path d="M46 46H54" stroke="#222" stroke-width="3"/>`,
      `<path d="M30 26L35 8L44 20L50 6L56 20L65 8L70 26Z" fill="#ffc400" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M50 17L35 8V26Z M50 17L65 8V26Z" fill="#ff5c8a"/><circle cx="50" cy="17" r="4.5" fill="#d63a69"/>`,
      flower(76, 24),
      `<path d="M36 24L50 2L64 24Z" fill="#7c5cff"/><circle cx="50" cy="3" r="3.5" fill="#ffd95a"/><path d="M42 16L58 16" stroke="#ffd95a" stroke-width="2"/>`,
      `<path d="M16 54C14 18 86 18 84 54" fill="none" stroke="#444" stroke-width="5"/><rect x="9" y="48" width="13" height="22" rx="5" fill="#ff5c8a"/><rect x="78" y="48" width="13" height="22" rx="5" fill="#ff5c8a"/>`,
      `<ellipse cx="27" cy="60" rx="6.5" ry="4.2" fill="#ff7a93" opacity=".55"/><ellipse cx="73" cy="60" rx="6.5" ry="4.2" fill="#ff7a93" opacity=".55"/>`,
      `<path d="M50 60Q42 54 33 60Q42 67 50 61Q58 67 67 60Q58 54 50 60Z" fill="#4a2c1a"/>`
    ][g('acc')];
    const extra = [
      '',
      `<polygon points="${star(13, 18, 4, 8, 2.6)}" fill="#ffc400"/><polygon points="${star(89, 32, 4, 6, 2)}" fill="#ffc400"/><polygon points="${star(85, 88, 4, 7, 2.3)}" fill="#ffc400"/>`,
      heart(87, 18, 1, '#ff5c8a') + heart(12, 32, .8, '#ff8fb1'),
      `<path d="M64 54Q70 64 64 70Q58 64 64 54Z" fill="#6ec1ff"/>`,
      `<path d="M80 30Q85 38 80 43Q75 38 80 30Z" fill="#6ec1ff"/>`,
      `<text x="70" y="24" font-size="15" font-weight="700" fill="#7c5cff" font-family="sans-serif">z</text><text x="82" y="12" font-size="10" font-weight="700" fill="#7c5cff" font-family="sans-serif">z</text>`
    ][g('extra')];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${bg}${face}${brows}${eyes}${mouth}${acc}${extra}</svg>`;
  };

  U.randomEmoji = function () {
    const r = (k) => Math.floor(Math.random() * C.EMOJI.ranges[k]);
    return { tone: r('tone'), face: r('face'), eyes: r('eyes'), mouth: r('mouth'), brows: r('brows'), acc: Math.random() < 0.35 ? 0 : r('acc'), extra: Math.random() < 0.4 ? 0 : r('extra'), bg: r('bg') };
  };

  /* mektup metnindeki :e12: belirteçlerini çizilmiş çıkartmalara çevirir (güvenli: yalnızca metin düğümü + doğrulanmış SVG) */
  U.renderBody = function (text, map) {
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const m of String(text).matchAll(/:e(\d+):/g)) {
      if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
      const e = map && map.get(Number(m[1]));
      const span = h('span', { class: 'sticker', title: e ? e.name : '' });
      if (e) span.innerHTML = U.emojiSVG(e.params, 64);
      else span.textContent = '🙂';
      frag.append(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    return frag;
  };

  /* ---------------------------------------------------------------- zarf ve kâğıt */
  function patternSVG(kind, color) {
    const c = color;
    return {
      dots: `<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18'><circle cx='5' cy='5' r='1.8' fill='${c}' fill-opacity='.4'/><circle cx='14' cy='14' r='1.8' fill='${c}' fill-opacity='.4'/></svg>`,
      hearts: `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><path d='M14 22C5 15 6 8 10.5 8c2 0 3 1.3 3.5 2.3C14.5 9.3 15.5 8 17.5 8 22 8 23 15 14 22z' fill='${c}' fill-opacity='.3'/></svg>`,
      stars: `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><path d='M15 5l2.2 6.5 6.8.2-5.4 4.2 1.9 6.6L15 18.6 9.5 22.5l1.9-6.6L6 11.7l6.8-.2z' fill='${c}' fill-opacity='.35'/></svg>`,
      stripes: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><path d='M0 14L14 0' stroke='${c}' stroke-opacity='.25' stroke-width='3'/></svg>`,
      flowers: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><g fill='${c}' fill-opacity='.3'><circle cx='16' cy='9' r='4'/><circle cx='23' cy='14' r='4'/><circle cx='20' cy='22' r='4'/><circle cx='12' cy='22' r='4'/><circle cx='9' cy='14' r='4'/></g><circle cx='16' cy='16' r='3' fill='${c}' fill-opacity='.45'/></svg>`,
      waves: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='12'><path d='M0 6Q6 0 12 6T24 6' fill='none' stroke='${c}' stroke-opacity='.32' stroke-width='1.6'/></svg>`,
      diamonds: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M10 2L18 10L10 18L2 10z' fill='none' stroke='${c}' stroke-opacity='.32' stroke-width='1.4'/></svg>`,
      snow: `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><path d='M13 5v16M5 13h16M7.3 7.3l11.4 11.4M18.7 7.3L7.3 18.7' stroke='${c}' stroke-opacity='.4' stroke-width='1.4' stroke-linecap='round' fill='none'/></svg>`,
      clouds: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='24'><path d='M8 18a5 5 0 0 1 1-9.9A6.5 6.5 0 0 1 21.5 9 4.5 4.5 0 0 1 22 18z' fill='${c}' fill-opacity='.25'/></svg>`,
      sparks: `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><path d='M11 2L12.6 9.4 20 11 12.6 12.6 11 20 9.4 12.6 2 11 9.4 9.4z' fill='${c}' fill-opacity='.38'/></svg>`
    }[kind] || null;
  }
  U.patternSVG = patternSVG;
  function patternURL(kind, color) {
    const svg = patternSVG(kind, color);
    return svg ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : 'none';
  }

  U.envelopeEl = function (envId, seal, o = {}) {
    const e = C.ENVELOPES.find((x) => x.id === envId) || C.ENVELOPES[0];
    const el = h('div', { class: 'env' + (o.open ? ' open' : '') + (o.wiggle ? ' wiggle' : ''), role: 'img', 'aria-label': `${e.name} zarf` },
      h('div', { class: 'env-back' }), h('div', { class: 'env-paper' }), h('div', { class: 'env-front' }), h('div', { class: 'env-flap' }),
      h('div', { class: 'env-seal' }, o.mystery ? '?' : seal),
      o.locked ? h('div', { class: 'env-lock' }, '🔒') : null);
    el.style.setProperty('--w', (o.w || 260) + 'px');
    el.style.setProperty('--e-back', e.back);
    el.style.setProperty('--e-front', e.front);
    el.style.setProperty('--e-flap', e.flap);
    el.style.setProperty('--e-accent', e.accent);
    el.style.setProperty('--e-pattern', patternURL(e.pattern, e.accent));
    return el;
  };

  U.sheetEl = function (l, map) {
    const sheet = h('article', { class: 'sheet', 'data-paper': l.paper || 'krem' });
    if (l.date) sheet.append(h('div', { class: 'sheet-date' }, l.date));
    if (l.title) sheet.append(h('h2', null, l.title));
    sheet.append(h('div', { class: 'sheet-body' }, U.renderBody(l.body || '', map)));
    if (l.photos && l.photos.length) {
      sheet.append(h('div', { class: 'sheet-photos' }, l.photos.map((u) => h('button', {
        type: 'button', class: 'polaroid', 'aria-label': 'Fotoğrafı büyüt',
        onclick: () => U.openModal('Fotoğraf', h('img', { src: u, alt: 'Mektuba eklenmiş fotoğraf', style: 'width:100%;border-radius:12px;display:block' }))
      }, h('img', { src: u, alt: 'Mektuba eklenmiş fotoğraf', loading: 'lazy' })))));
    }
    if (l.from) sheet.append(h('div', { class: 'sheet-from' }, '— ' + l.from));
    return sheet;
  };

  U.confetti = function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#c8586c', '#e5c46b', '#8fc4ae', '#a994d1', '#f7b784'];
    const box = h('div', { class: 'confetti' });
    for (let i = 0; i < 44; i++) {
      const s = h('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.5 + 's';
      s.style.animationDuration = 1.5 + Math.random() * 1.3 + 's';
      s.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
      box.append(s);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 3600);
  };

  /* ---------------------------------------------------------------- fotoğraf */
  // Seçilen fotoğrafı tarayıcıda küçültüp JPEG'e çevirir (sunucu sınırı 500 KB).
  U.resizeToJpeg = async function (file, maxDim = 1400, maxBytes = 450 * 1024) {
    if (!/^image\//.test(file.type)) throw new Error('Bu dosya bir fotoğraf değil');
    let bmp;
    try {
      bmp = await createImageBitmap(file);
    } catch {
      bmp = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotoğraf okunamadı')); };
        img.src = url;
      });
    }
    const sw = bmp.width || bmp.naturalWidth, sh = bmp.height || bmp.naturalHeight;
    let scale = Math.min(1, maxDim / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const g = canvas.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      for (const q of [0.85, 0.75, 0.65, 0.55]) {
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
        if (blob && blob.size <= maxBytes) return blob;
      }
      scale *= 0.8;
    }
    throw new Error('Fotoğraf yeterince küçültülemedi');
  };

  U.upload = async function (path, blob) {
    let res;
    try {
      res = await fetch('/api' + path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Requested-With': 'fetch' }, body: blob, credentials: 'same-origin' });
    } catch {
      const e = new Error('Sunucuya ulaşılamadı'); e.status = 0; throw e;
    }
    let data = null;
    try { data = await res.json(); } catch { /* boş yanıt */ }
    if (!res.ok) { const e = new Error((data && data.error) || 'Yükleme başarısız'); e.status = res.status; throw e; }
    return data;
  };

  /* ---------------------------------------------------------------- emoji atölyesi */
  U.emojiMaker = function ({ onSave, saveLabel = '💾 Kaydet' }) {
    let p = U.randomEmoji();
    const parts = [['face', 'Yüz şekli'], ['tone', 'Renk'], ['eyes', 'Gözler'], ['brows', 'Kaşlar'], ['mouth', 'Ağız'], ['acc', 'Aksesuar'], ['extra', 'Süs'], ['bg', 'Arka plan']];
    const preview = h('div', { class: 'em-preview', role: 'img', 'aria-label': 'Emoji önizlemesi' });
    const name = h('input', { type: 'text', maxlength: '30', placeholder: 'İsim ver (ör. Kıskanç Safi)', 'aria-label': 'Emoji adı' });
    const buttons = [];
    const rows = h('div', { class: 'em-rows' });
    for (const [key, label] of parts) {
      const picker = h('div', { class: 'picker' });
      for (let i = 0; i < C.EMOJI.ranges[key]; i++) {
        const b = h('button', { type: 'button', 'aria-label': `${label} ${i + 1}`, onclick: () => { p[key] = i; draw(); } });
        buttons.push({ b, key, i });
        picker.append(b);
      }
      rows.append(h('div', { class: 'label' }, label), picker);
    }
    function draw() {
      preview.innerHTML = U.emojiSVG(p, 130);
      for (const x of buttons) {
        x.b.innerHTML = U.emojiSVG({ ...p, [x.key]: x.i }, 44);
        x.b.setAttribute('aria-pressed', p[x.key] === x.i ? 'true' : 'false');
      }
    }
    const rnd = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { p = U.randomEmoji(); draw(); } }, '🎲 Rastgele');
    const save = h('button', { class: 'btn small', type: 'button' }, saveLabel);
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        await onSave({ name: name.value.trim(), params: { ...p } });
        name.value = '';
        p = U.randomEmoji();
        draw();
      } catch (e) {
        U.toast(e.message, 'err');
      } finally {
        save.disabled = false;
      }
    });
    draw();
    return h('div', { class: 'em-maker' },
      h('div', { class: 'em-top' }, preview, h('div', { style: 'display:grid;gap:10px;flex:1;min-width:200px' }, name, h('div', { class: 'btn-row', style: 'margin:0' }, rnd, save))),
      rows);
  };
})();
