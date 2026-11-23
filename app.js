/* Mektup Gönder: hesap ve sunucu yok. Mektubu yaz, e-posta olarak gönder.
   Gönderim: EmailJS ayarlıysa uygulama kendisi gönderir; değilse mail uygulaması açılır. */
(function () {
  'use strict';
  const { h, field, toast, openModal, emojiSVG, envelopeEl, sheetEl, confetti, emojiMaker } = window.UI;
  const C = window.CONFIG;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DRAFT = 'gonder-taslak', EMOJIS = 'gonder-emojis', CFG = 'gonder-emailjs';

  const f = Object.assign({ to: '', from: '', title: '', body: '', envelope: 'klasik', paper: 'krem', seal: C.SEALS[0] }, LS.get(DRAFT, {}));
  let emojis = LS.get(EMOJIS, []);
  const persist = () => LS.set(DRAFT, f);
  const emojiMap = () => new Map(emojis.map((e) => [e.id, e]));
  const cleanTitle = (s) => String(s).replace(/\s+/g, ' ').trim();

  /* özel emojiler e-postada Unicode karşılığına döner */
  const plainBody = () => f.body.replace(/:e(\d+):/g, (m, id) => { const e = emojis.find((x) => x.id === Number(id)); return e ? e.fallback : '🙂'; });
  const subject = () => `💌 ${cleanTitle(f.from) || 'Biri'} sana bir mektup gönderdi${cleanTitle(f.title) ? ': ' + cleanTitle(f.title) : ''}`;
  const PAPER = { krem: ['#fffdf7', '#3b2a2a'], cizgili: ['#fffdf7', '#3b2a2a'], kareli: ['#fffdf7', '#3b2a2a'], pembe: ['#fff0f4', '#3b2a2a'], gece: ['#26304f', '#f4ecdc'] };
  function htmlEmail() {
    const [bg, fg] = PAPER[f.paper] || PAPER.krem;
    const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `<div style="margin:0;background:#fbf4ec;padding:24px;font-family:Georgia,serif;color:#3b2a2a"><div style="max-width:560px;margin:0 auto">
<div style="text-align:center;font-size:44px;line-height:1">${esc(f.seal)}</div>
<p style="text-align:center;color:#8a6f6f;font-size:14px;margin:8px 0 18px">${esc(cleanTitle(f.from))}${f.from.trim() ? ' · ' : ''}${esc(date)}</p>
<div style="background:${bg};color:${fg};border:1px solid #ecdcc4;border-radius:14px;padding:26px 24px">
${f.title.trim() ? `<h2 style="margin:0 0 14px;font-size:22px">${esc(f.title.trim())}</h2>` : ''}
<div style="font-size:17px;line-height:1.7;white-space:pre-wrap">${esc(plainBody())}</div></div>
<p style="text-align:center;color:#a58c8c;font-size:12px;font-family:Arial,sans-serif;margin-top:20px">On İki Mektup ile gönderildi</p></div></div>`;
  }
  const plainEmail = () => `${f.title.trim() ? f.title.trim() + '\n\n' : ''}${plainBody()}${f.from.trim() ? '\n\n— ' + f.from.trim() : ''}`;

  /* ---- alanlar */
  const bind = (el, key) => { el.value = f[key]; el.addEventListener('input', () => { f[key] = el.value; persist(); renderPreview(); const e = document.querySelector('p.error'); if (e) e.textContent = ''; }); return el; };
  const toIn = bind(h('input', { id: 'to', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'safiye@ornek.com' }), 'to');
  const fromIn = bind(h('input', { id: 'from', type: 'text', maxlength: '60', placeholder: 'Ömer' }), 'from');
  const titleIn = bind(h('input', { id: 'title', type: 'text', maxlength: String(C.LIMITS.title), placeholder: 'Örn. Yeni yıl sözü' }), 'title');
  const bodyIn = bind(h('textarea', { id: 'body', maxlength: String(C.LIMITS.body), placeholder: 'Canım…' }), 'body');

  function insertText(t) {
    const s = bodyIn.selectionStart ?? bodyIn.value.length, e = bodyIn.selectionEnd ?? s;
    bodyIn.value = bodyIn.value.slice(0, s) + t + bodyIn.value.slice(e);
    bodyIn.selectionStart = bodyIn.selectionEnd = s + t.length;
    f.body = bodyIn.value; persist(); renderPreview(); bodyIn.focus();
  }
  const tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'Emojiler' });
  function drawTray() {
    tray.replaceChildren(
      ...C.QUICK_EMOJIS.map((e) => h('button', { type: 'button', 'aria-label': e, onclick: () => insertText(e) }, e)),
      emojis.length ? h('div', { class: 'sep' }, 'Senin emojilerin') : null,
      ...emojis.map((e) => { const b = h('button', { type: 'button', class: 'sticker-btn', 'aria-label': e.name, title: e.name, onclick: () => insertText(`:e${e.id}:`) }); b.innerHTML = emojiSVG(e.params, 30); return b; }),
      h('button', { type: 'button', style: 'font-size:.9rem;color:var(--rose-d);font-weight:600', onclick: newEmoji }, '＋ Yeni emoji yap'));
  }
  function newEmoji() {
    const close = openModal('Yeni emoji', emojiMaker({ saveLabel: '💾 Kaydet ve ekle', onSave: async ({ name, params }) => {
      const e = { id: Date.now(), name: name || 'Emoji', params, fallback: C.EMOJI.fallbacks[params.mouth % C.EMOJI.fallbacks.length] };
      emojis = [e, ...emojis].slice(0, 60); LS.set(EMOJIS, emojis);
      drawTray(); close(); insertText(`:e${e.id}:`);
    } }));
  }

  /* ---- zarf, kâğıt, mühür */
  const envPicker = h('div', { class: 'picker', role: 'group', 'aria-label': 'Zarf' });
  const paperPicker = h('div', { class: 'picker papers', role: 'group', 'aria-label': 'Kâğıt' });
  const sealPicker = h('div', { class: 'picker seals', role: 'group', 'aria-label': 'Mühür' });
  function drawPickers() {
    const pick = (key, val) => () => { f[key] = val; persist(); drawPickers(); renderPreview(); };
    envPicker.replaceChildren(...C.ENVELOPES.map((e) => { const b = h('button', { type: 'button', 'aria-pressed': String(f.envelope === e.id), 'aria-label': e.name, onclick: pick('envelope', e.id) }, envelopeEl(e.id, f.seal, { w: 84 }), h('span', null, e.name)); return b; }));
    paperPicker.replaceChildren(...C.PAPERS.map((p) => h('button', { type: 'button', 'aria-pressed': String(f.paper === p.id), onclick: pick('paper', p.id) }, p.name)));
    sealPicker.replaceChildren(...C.SEALS.map((s) => h('button', { type: 'button', 'aria-label': `Mühür ${s}`, 'aria-pressed': String(f.seal === s), onclick: pick('seal', s) }, s)));
  }

  const previewBox = h('div', { class: 'stage', style: 'gap:14px' });
  function renderPreview() {
    previewBox.replaceChildren(
      envelopeEl(f.envelope, f.seal, { w: 210 }),
      h('div', { style: 'width:100%' }, sheetEl({ title: f.title, body: f.body || 'Mektubun burada görünecek…', paper: f.paper, date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), from: f.from }, emojiMap())));
  }

  /* ---- gönderim */
  const err = h('p', { class: 'error', role: 'alert' });
  const sendBtn = h('button', { class: 'btn', type: 'button' }, '📨 Gönder');
  const mailBtn = h('button', { class: 'btn ghost', type: 'button' }, '✉️ Mail uygulamamda aç');
  function validate() {
    err.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.to.trim())) { err.textContent = 'Geçerli bir alıcı e-posta adresi yaz.'; toIn.focus(); return false; }
    if (!f.body.trim()) { err.textContent = 'Önce mektubunu yaz.'; bodyIn.focus(); return false; }
    return true;
  }
  const cfg = () => Object.assign({ service: '', template: '', key: '' }, LS.get(CFG, {}));
  const ready = () => { const c = cfg(); return !!(c.service && c.template && c.key); };
  function drawSend() { sendBtn.textContent = ready() ? '📨 Gönder' : '📨 Gönder (önce ayar gerekir)'; }

  async function send() {
    if (!validate()) return;
    if (!ready()) { openSettings(); toast('Otomatik gönderim için önce ayarı yap ya da “Mail uygulamamda aç”ı kullan', 'err'); return; }
    const c = cfg();
    sendBtn.disabled = true; sendBtn.textContent = 'Gönderiliyor…';
    try {
      const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: c.service.trim(), template_id: c.template.trim(), user_id: c.key.trim(),
          template_params: { to_email: f.to.trim(), subject: subject(), message_html: htmlEmail(), message_text: plainEmail(), from_name: f.from.trim() || 'Biri' } })
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 200) || r.status);
      confetti(); toast('💌 Mektup gönderildi!');
      LS.set('gonder-son', { to: f.to, from: f.from });
    } catch (e) {
      err.textContent = 'Gönderilemedi: ' + (e.message || e) + ' — ayarları kontrol et ya da “Mail uygulamamda aç”ı dene.';
    } finally { sendBtn.disabled = false; drawSend(); }
  }
  function openMail() {
    if (!validate()) return;
    const body = plainEmail();
    const url = `mailto:${encodeURIComponent(f.to.trim())}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(body)}`;
    if (url.length > 1800) {
      // çok uzun mektuplar mailto'ya sığmaz: panoya kopyala
      navigator.clipboard?.writeText(body).then(() => toast('Mektup çok uzun; panoya kopyalandı. Mail uygulamasında yapıştır.'), () => {});
      location.href = `mailto:${encodeURIComponent(f.to.trim())}?subject=${encodeURIComponent(subject())}`;
    } else location.href = url;
  }
  sendBtn.addEventListener('click', send);
  mailBtn.addEventListener('click', openMail);


  /* ---- önizlemeyi görsel (PNG) ya da PDF olarak üret ve paylaş */
  const SNAP_BG = '#fbf4ec';

  /* html2canvas "clip-path" çizemez: zarfı (kapak üçgeni dahil) SVG olarak yeniden çiz */
  function snapEnvelope(w) {
    const el = envelopeEl(f.envelope, f.seal, { w });
    const e = C.ENVELOPES.find((x) => x.id === f.envelope) || C.ENVELOPES[0];
    const H = Math.round(w * 0.64), r = Math.round(w * 0.03);
    const pat = el.style.getPropertyValue('--e-pattern');
    let defs = '', fillFront = e.front, fillFlap = e.flap, overlay = '';
    const m = /^url\("data:image\/svg\+xml,(.*)"\)$/.exec(pat);
    if (m) {
      try {
        const tile = decodeURIComponent(m[1]);
        const tw = Number(/width='(\d+)'/.exec(tile)[1]), th = Number(/height='(\d+)'/.exec(tile)[1]);
        defs = `<pattern id='p' width='${tw}' height='${th}' patternUnits='userSpaceOnUse'><image href="data:image/svg+xml,${encodeURIComponent(tile)}" width='${tw}' height='${th}'/></pattern>`;
        overlay = 'p';
      } catch { /* desensiz çiz */ }
    }
    const tex = (pts) => overlay ? `<polygon points='${pts}' fill='url(#p)'/>` : '';
    const frontPts = `0,0 ${w / 2},${H * 0.56} ${w},0 ${w},${H} 0,${H}`, flapPts = `0,0 ${w},0 ${w / 2},${H * 0.6 * 0.93}`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${H}' viewBox='0 0 ${w} ${H}'><defs>${defs}<clipPath id='c'><rect width='${w}' height='${H}' rx='${r}'/></clipPath></defs>
<g clip-path='url(#c)'><rect width='${w}' height='${H}' fill='${e.back}'/><polygon points='${frontPts}' fill='${fillFront}'/>${tex(frontPts)}<polygon points='${flapPts}' fill='${fillFlap}'/>${tex(flapPts)}</g></svg>`;
    el.querySelectorAll('.env-back,.env-front,.env-flap,.env-paper').forEach((n) => n.remove());
    const img = h('img', { alt: '', src: 'data:image/svg+xml,' + encodeURIComponent(svg), style: `position:absolute;left:0;top:0;width:${w}px;height:${H}px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))` });
    el.prepend(img);
    return el;
  }
  async function snapCanvas() {
    if (!window.html2canvas) throw new Error('Görsel aracı yüklenemedi (internet?)');
    const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const host = h('div', { 'aria-hidden': 'true', style: `position:fixed;left:-10000px;top:0;width:560px;padding:34px 30px 26px;background:${SNAP_BG};display:flex;flex-direction:column;align-items:center;gap:20px` },
      snapEnvelope(250),
      h('div', { style: 'width:100%' }, sheetEl({ title: f.title, body: f.body, paper: f.paper, date, from: f.from }, emojiMap())),
      h('div', { style: 'font:12px Arial,sans-serif;color:#a58c8c' }, 'On İki Mektup ile gönderildi'));
    document.body.append(host);
    try {
      try { await document.fonts?.ready; } catch { /* yoksay */ }
      return await window.html2canvas(host, { scale: 2, backgroundColor: SNAP_BG, useCORS: true, logging: false });
    } finally { host.remove(); }
  }
  const canvasBlob = (cv, type, q) => new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Görsel oluşturulamadı'))), type, q));
  async function makePng() { return canvasBlob(await snapCanvas(), 'image/png'); }

  /* tek sayfalık, sığ bir PDF: sayfa = mektup görseli (JPEG olarak gömülü) */
  async function makePdf() {
    const cv = await snapCanvas();
    const jpg = new Uint8Array(await (await canvasBlob(cv, 'image/jpeg', 0.92)).arrayBuffer());
    const W = Math.round(cv.width / 2), H = Math.round(cv.height / 2); // 1 px = 1 pt
    const enc = new TextEncoder(), parts = []; let len = 0; const offs = [];
    const put = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n${body}\nendobj\n`); };
    put('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offs[4] = len; put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); put(jpg); put('\nendstream\nendobj\n');
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const xref = len;
    put(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => String(offs[n]).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  function download(blob, name) {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function shareAs(kind, btn) {
    err.textContent = '';
    if (!f.body.trim()) { err.textContent = 'Önce mektubunu yaz.'; bodyIn.focus(); return; }
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Hazırlanıyor…';
    // pano, kullanıcı dokunuşu bitmeden kopyalanmalı
    if (f.to.trim()) { try { await navigator.clipboard?.writeText(f.to.trim()); } catch { /* yoksay */ } }
    try {
      const pdf = kind === 'pdf';
      const blob = pdf ? await makePdf() : await makePng();
      const name = 'mektup' + (cleanTitle(f.title) ? '-' + cleanTitle(f.title).toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi, '-').slice(0, 30).replace(/^-|-$/g, '') : '') + (pdf ? '.pdf' : '.png');
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: subject(), text: plainEmail() });
          toast(f.to.trim() ? 'Mail uygulamanı seç. Alıcı adresi panoya kopyalandı: alıcı kutusuna yapıştır.' : 'Mail uygulamanı seç; görsel ek olarak gelir.');
        } catch (e) { if (e && e.name !== 'AbortError') throw e; }
      } else {
        download(blob, name);
        toast('Dosya indirildi. Mail yazarken ek olarak ekle.');
      }
    } catch (e) { err.textContent = 'Görsel hazırlanamadı: ' + (e.message || e); }
    finally { btn.disabled = false; btn.textContent = old; }
  }
  const pngBtn = h('button', { class: 'btn ghost', type: 'button' }, '🖼️ PNG olarak gönder');
  const pdfBtn = h('button', { class: 'btn ghost', type: 'button' }, '📄 PDF olarak gönder');
  pngBtn.addEventListener('click', () => shareAs('png', pngBtn));
  pdfBtn.addEventListener('click', () => shareAs('pdf', pdfBtn));

  /* ---- ayarlar (EmailJS) */
  function openSettings() {
    const c = cfg();
    const svc = h('input', { type: 'text', value: c.service, placeholder: 'service_xxxxxxx', autocapitalize: 'off' });
    const tpl = h('input', { type: 'text', value: c.template, placeholder: 'template_xxxxxxx', autocapitalize: 'off' });
    const key = h('input', { type: 'text', value: c.key, placeholder: 'Public Key', autocapitalize: 'off' });
    const close = openModal('Otomatik gönderim ayarı', h('div', null,
      h('p', { class: 'muted' }, 'Uygulamanın e-postayı kendisi göndermesi için ücretsiz EmailJS hesabı gerekir (ayda 200 e-posta). Adımlar README-ANDROID dosyasında. Bu ayar yalnızca bu cihazda saklanır.'),
      field('Service ID', svc), field('Template ID', tpl), field('Public Key', key),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => { LS.set(CFG, { service: svc.value, template: tpl.value, key: key.value }); drawSend(); close(); toast('Ayar kaydedildi'); } }, 'Kaydet'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { LS.set(CFG, {}); drawSend(); close(); } }, 'Temizle'))));
  }

  /* ---- sayfa */
  const root = document.getElementById('app');
  root.replaceChildren(
    h('header', { class: 'topbar' },
      h('span', { class: 'brand' }, h('span', null, '💌'), 'Mektup Gönder'),
      h('div', { class: 'spacer' }),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Ayarlar', title: 'Ayarlar', onclick: openSettings }, '⚙️')),
    h('main', { class: 'container' },
      h('div', { class: 'write' },
        h('div', { class: 'card' },
          field('Kime (e-posta)', toIn), field('Senin adın', fromIn), field('Başlık', titleIn), field('Mektup', bodyIn), tray,
          h('div', { class: 'pickers' }, h('div', { class: 'label' }, 'Zarf'), envPicker, h('div', { class: 'label' }, 'Kâğıt'), paperPicker, h('div', { class: 'label' }, 'Mühür'), sealPicker),
          err, h('div', { class: 'btn-row' }, sendBtn, mailBtn),
          h('div', { class: 'label', style: 'margin-top:14px' }, 'Önizlemeyi görsel olarak gönder'),
          h('div', { class: 'btn-row' }, pngBtn, pdfBtn),
          h('p', { class: 'preview-note' }, 'Zarf ve mektup, önizlemedeki gibi görsele dönüşür. Telefonda paylaşma menüsü açılır: Gmail\'i seç, görsel ek olarak eklenir. Bilgisayarda dosya inip kalır.'),
          h('p', { class: 'preview-note' }, 'Hiçbir şey sunucuda saklanmaz. Taslağın ve emojilerin yalnızca bu telefonda durur.')),
        h('div', { class: 'preview' }, h('div', { class: 'label', style: 'margin-bottom:8px;text-align:center' }, 'Önizleme'), previewBox))));
  drawTray(); drawPickers(); drawSend(); renderPreview();
  window.GONDER = { makePng, makePdf, subject, plainEmail, htmlEmail, mailtoUrl: () => `mailto:${encodeURIComponent(f.to.trim())}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(plainEmail())}` };
  const last = LS.get('gonder-son', null);
  if (last && !f.to) { f.to = last.to || ''; f.from = f.from || last.from || ''; toIn.value = f.to; fromIn.value = f.from; }
})();
