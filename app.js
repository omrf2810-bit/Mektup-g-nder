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
          h('p', { class: 'preview-note' }, 'Hiçbir şey sunucuda saklanmaz. Taslağın ve emojilerin yalnızca bu telefonda durur.')),
        h('div', { class: 'preview' }, h('div', { class: 'label', style: 'margin-bottom:8px;text-align:center' }, 'Önizleme'), previewBox))));
  drawTray(); drawPickers(); drawSend(); renderPreview();
  window.GONDER = { subject, plainEmail, htmlEmail, mailtoUrl: () => `mailto:${encodeURIComponent(f.to.trim())}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(plainEmail())}` };
  const last = LS.get('gonder-son', null);
  if (last && !f.to) { f.to = last.to || ''; f.from = f.from || last.from || ''; toIn.value = f.to; fromIn.value = f.from; }
})();
