/* Mektup Gönder: hesap, sunucu ve otomatik gönderim yok.
   Mektubu yaz; açılan zarf (GIF / HTML), PDF ya da PNG olarak mail uygulamanla paylaş. */
(function () {
  'use strict';
  const { h, field, toast, openModal, emojiSVG, envelopeEl, confetti, emojiMaker } = window.UI;
  const C = window.CONFIG, X = window.EXTRA, EX = window.EXPORT;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } }
  };
  const DRAFT = 'gonder-taslak', EMOJIS = 'gonder-emojis';

  const f = Object.assign({ to: '', from: '', label: '', title: '', body: '', envelope: 'klasik', paper: 'krem', font: 'klasik', seal: C.SEALS[0], effect: 'kalp', showDate: true, date: '' }, LS.get(DRAFT, {}));
  let emojis = LS.get(EMOJIS, []);
  const persist = () => LS.set(DRAFT, f);
  const emojiMap = () => new Map(emojis.map((e) => [e.id, e]));
  const cleanTitle = (s) => String(s).replace(/\s+/g, ' ').trim();
  const fontDef = () => X.FONTS.find((x) => x.id === f.font) || X.FONTS[0];

  /* özel emojiler yazı olarak gönderilirken Unicode karşılığına döner */
  const plainBody = () => f.body.replace(/:e(\d+):/g, (m, id) => { const e = emojis.find((x) => x.id === Number(id)); return e ? e.fallback : '🙂'; });
  const subject = () => `💌 ${cleanTitle(f.from) || 'Biri'} sana bir mektup gönderdi${cleanTitle(f.title) ? ': ' + cleanTitle(f.title) : ''}`;
  const plainEmail = () => `${f.title.trim() ? f.title.trim() + '\n\n' : ''}${plainBody()}${f.from.trim() ? '\n\n— ' + f.from.trim() : ''}`;
  const mailtoUrl = (body) => `mailto:${encodeURIComponent(f.to.trim())}?subject=${encodeURIComponent(subject())}${body ? '&body=' + encodeURIComponent(body) : ''}`;

  /* ---- alanlar */
  const err = h('p', { class: 'error', role: 'alert' });
  const counter = h('p', { class: 'hint', style: 'text-align:right;margin:2px 0 0' });
  const updCount = () => { counter.textContent = `${f.body.length} / ${C.LIMITS.body}`; };
  const bind = (el, key) => { el.value = f[key]; el.addEventListener('input', () => { f[key] = el.value; persist(); renderPreview(); updCount(); err.textContent = ''; }); return el; };
  const toIn = bind(h('input', { id: 'to', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'safiye@ornek.com' }), 'to');
  const fromIn = bind(h('input', { id: 'from', type: 'text', maxlength: '60', placeholder: 'Ömer' }), 'from');
  const labelIn = bind(h('input', { id: 'label', type: 'text', maxlength: '28', placeholder: 'Örn. Safiye\'ye' }), 'label');
  const titleIn = bind(h('input', { id: 'title', type: 'text', maxlength: String(C.LIMITS.title), placeholder: 'Örn. Yeni yıl sözü' }), 'title');
  const dateIn = bind(h('input', { id: 'date', type: 'text', maxlength: '40', placeholder: 'Boş bırakırsan bugünün tarihi' }), 'date');
  const bodyIn = bind(h('textarea', { id: 'body', maxlength: String(C.LIMITS.body), placeholder: 'Canım…' }), 'body');

  function insertText(t) {
    const s = bodyIn.selectionStart ?? bodyIn.value.length, e = bodyIn.selectionEnd ?? s;
    bodyIn.value = bodyIn.value.slice(0, s) + t + bodyIn.value.slice(e);
    bodyIn.selectionStart = bodyIn.selectionEnd = s + t.length;
    f.body = bodyIn.value; persist(); renderPreview(); updCount(); err.textContent = ''; bodyIn.focus();
  }
  function ask(message, okLabel) {
    return new Promise((res) => {
      let done = false;
      const fin = (v) => { if (!done) { done = true; close(); res(v); } };
      const close = openModal('Emin misin?', h('div', null, h('p', null, message),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onclick: () => fin(true) }, okLabel || 'Evet'), h('button', { class: 'btn ghost', type: 'button', onclick: () => fin(false) }, 'Vazgeç'))));
    });
  }

  /* ---- şablon ve ilham */
  async function pickTemplate() {
    const close = openModal('Hazır mektup şablonları', h('div', { class: 'tmpl' }, ...X.TEMPLATES.map((t) => h('button', { type: 'button', onclick: async () => {
      if (f.body.trim() && !(await ask('Yazdığın mektubun yerine bu şablon gelecek. Devam edelim mi?', 'Şablonu kullan'))) return;
      f.title = t.title; f.body = t.body; titleIn.value = f.title; bodyIn.value = f.body; persist(); renderPreview(); updCount(); close(); toast('Şablon eklendi. Kendi sözlerinle değiştir.');
    } }, h('b', null, t.name), h('small', null, t.body.replace(/\n+/g, ' '))))));
  }
  async function newLetter() {
    if (f.body.trim() && !(await ask('Yazdığın mektup silinecek (zarf ve kâğıt seçimin kalır). Yeni mektup başlayalım mı?', 'Evet, yeni mektup'))) return;
    f.title = ''; f.body = ''; f.date = ''; titleIn.value = ''; bodyIn.value = ''; dateIn.value = ''; persist(); renderPreview(); updCount(); bodyIn.focus();
  }
  function inspire() { insertText((f.body && !f.body.endsWith('\n') ? '\n\n' : '') + C.PROMPTS[Math.floor(Math.random() * C.PROMPTS.length)] + '\n\n'); }

  /* ---- emoji tepsisi (sekmeli) */
  let tab = 'ask';
  const tabsBox = h('div', { class: 'tabs', role: 'tablist' });
  const tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'Emojiler' });
  function drawTray() {
    const all = [{ id: 'benim', name: '⭐ Benimkiler' }, ...X.EMOJI_CATS];
    tabsBox.replaceChildren(...all.map((c) => h('button', { type: 'button', class: 'chip', role: 'tab', 'aria-pressed': String(tab === c.id), onclick: () => { tab = c.id; drawTray(); } }, c.name)));
    const cat = X.EMOJI_CATS.find((c) => c.id === tab);
    tray.classList.toggle('wide', !!(cat && cat.wide));
    if (tab === 'benim') {
      tray.replaceChildren(
        ...emojis.map((e) => { const b = h('button', { type: 'button', class: 'sticker-btn', 'aria-label': e.name, title: e.name, onclick: () => insertText(`:e${e.id}:`) }); b.innerHTML = emojiSVG(e.params, 30); return b; }),
        h('button', { type: 'button', style: 'font-size:.9rem;color:var(--rose-d);font-weight:600', onclick: newEmoji }, '＋ Yeni emoji yap'));
    } else {
      tray.replaceChildren(...cat.list.map((e) => h('button', { type: 'button', 'aria-label': e, onclick: () => insertText(cat.wide ? '\n' + e + '\n' : e) }, e)));
    }
  }
  function newEmoji() {
    const close = openModal('Yeni emoji', emojiMaker({ saveLabel: '💾 Kaydet ve ekle', onSave: async ({ name, params }) => {
      const e = { id: Date.now(), name: name || 'Emoji', params, fallback: C.EMOJI.fallbacks[params.mouth % C.EMOJI.fallbacks.length] };
      emojis = [e, ...emojis].slice(0, 80); LS.set(EMOJIS, emojis);
      tab = 'benim'; drawTray(); close(); insertText(`:e${e.id}:`);
    } }));
  }

  /* ---- tasarım seçicileri */
  const envPicker = h('div', { class: 'picker', role: 'group', 'aria-label': 'Zarf' });
  const paperPicker = h('div', { class: 'picker papers2', role: 'group', 'aria-label': 'Kâğıt' });
  const fontPicker = h('div', { class: 'picker fonts', role: 'group', 'aria-label': 'Yazı tipi' });
  const sealPicker = h('div', { class: 'picker seals', role: 'group', 'aria-label': 'Mühür' });
  const fxPicker = h('div', { class: 'picker effects', role: 'group', 'aria-label': 'Açılış efekti' });
  function drawPickers() {
    const pick = (key, val) => () => { f[key] = val; persist(); drawPickers(); renderPreview(); };
    envPicker.replaceChildren(...C.ENVELOPES.map((e) => h('button', { type: 'button', 'aria-pressed': String(f.envelope === e.id), 'aria-label': e.name, onclick: pick('envelope', e.id) }, envelopeEl(e.id, f.seal, { w: 78 }), e.name)));
    paperPicker.replaceChildren(...X.PAPERS.map((p) => {
      const sw = h('span', { class: 'swatch', style: `background-color:${p.bg};color:${p.fg};${p.img ? `background-image:${p.img};` : ''}${p.size ? `background-size:${p.size};` : ''}` }, 'Aa');
      return h('button', { type: 'button', 'aria-pressed': String(f.paper === p.id), onclick: pick('paper', p.id) }, sw, p.name);
    }));
    fontPicker.replaceChildren(...X.FONTS.map((x) => h('button', { type: 'button', style: `font-family:${x.css}`, 'aria-pressed': String(f.font === x.id), onclick: pick('font', x.id) }, x.name)));
    sealPicker.replaceChildren(...C.SEALS.map((s) => h('button', { type: 'button', 'aria-label': `Mühür ${s}`, 'aria-pressed': String(f.seal === s), onclick: pick('seal', s) }, s)));
    fxPicker.replaceChildren(...X.EFFECTS.map((x) => h('button', { type: 'button', 'aria-pressed': String(f.effect === x.id), onclick: pick('effect', x.id) }, h('span', null, x.icon), x.name)));
  }
  const dateToggle = h('input', { type: 'checkbox', id: 'showdate' });
  dateToggle.checked = f.showDate !== false;
  dateToggle.addEventListener('change', () => { f.showDate = dateToggle.checked; persist(); renderPreview(); });

  /* ---- önizleme */
  const previewBox = h('div', { class: 'stage', style: 'gap:14px' });
  function renderPreview() {
    const env = envelopeEl(f.envelope, f.seal, { w: 230 });
    if (f.label.trim()) env.append(h('div', { class: 'env-label', style: `color:var(--e-accent);font:700 calc(var(--w)*${0.078 * fontDef().fs}) ${fontDef().css}` }, f.label.trim()));
    const shown = { ...f, body: f.body || 'Mektubun burada görünecek…' };
    previewBox.replaceChildren(env, h('div', { class: 'lt-prev', style: 'width:100%' }, EX.letterEl(shown, emojiMap())));
  }
  const playBtn = h('button', { class: 'btn', type: 'button', style: 'width:100%' }, '▶ Zarf açılışını izle');
  playBtn.addEventListener('click', async () => {
    if (!f.body.trim()) { err.textContent = 'Önce mektubunu yaz.'; bodyIn.focus(); return; }
    playBtn.disabled = true;
    try {
      const html = await EX.buildHtml(f, emojis);
      const frame = h('iframe', { class: 'pv-frame', title: 'Zarf açılış önizlemesi', sandbox: 'allow-scripts' });
      frame.srcdoc = html;
      openModal('Alıcı böyle görecek', frame);
    } catch (e) { err.textContent = 'Önizleme açılamadı: ' + (e.message || e); } finally { playBtn.disabled = false; }
  });

  /* ---- gönderim biçimleri */
  const slug = (s) => cleanTitle(s).toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const fileName = (ext) => 'mektup' + (slug(f.title) ? '-' + slug(f.title) : '') + '.' + ext;
  function download(blob, name) {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const canShareFile = (file) => !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
  async function shareFile(file) {
    await navigator.share({ files: [file], title: subject(), text: plainEmail() });
    toast(f.to.trim() ? 'Mail uygulamanı seç. Alıcı adresi panoya kopyalandı: alıcı kutusuna yapıştır.' : 'Mail uygulamanı seç; dosya ek olarak gelir.');
  }
  /* Tarayıcılar paylaşma menüsünü yalnızca dokunuştan hemen sonra açar. Dosya hazırlanırken süre dolarsa
     (uzun mektup, yavaş telefon) "Dosya hazır" paneli açılır: tek dokunuşla paylaş ya da indir. */
  function readyPanel(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    const kb = Math.max(1, Math.round(blob.size / 1024));
    const body = h('div', null, h('p', null, `${name} hazır (${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}).`),
      h('div', { class: 'btn-row' },
        canShareFile(file) ? h('button', { class: 'btn', type: 'button', onclick: async () => { try { await shareFile(file); close(); } catch (e) { if (e && e.name !== 'AbortError') toast('Paylaşılamadı, dosyayı indir.'); } } }, '📤 Paylaş') : null,
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { download(blob, name); toast('Dosya indirildi. Mail yazarken ek olarak ekle.'); } }, '⬇️ İndir')));
    const close = openModal('Dosya hazır', body);
  }
  async function deliver(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (canShareFile(file)) {
      try { await shareFile(file); }
      catch (e) {
        if (e && e.name === 'AbortError') return;
        if (e && e.name === 'NotAllowedError') return readyPanel(blob, name);   // dokunuş süresi doldu
        throw e;
      }
    } else {
      download(blob, name);
      toast('Dosya indirildi. Mail yazarken ek olarak ekle.');
    }
  }
  const FORMATS = [
    { id: 'gif', ic: '🎬', t: 'Açılan zarf animasyonu (GIF)', s: 'Zarf açılır, mektup çıkar. Mailde kendiliğinden oynar, her telefonda çalışır.', tag: 'Önerilen', ext: 'gif', make: (p) => EX.makeGif(f, emojis, p) },
    { id: 'html', ic: '🌐', t: 'Açılan zarf (HTML dosyası)', s: 'Dokununca açılan, efektli sayfa. Alıcı dosyayı tarayıcıda açar.', ext: 'html', make: async () => new Blob([await EX.buildHtml(f, emojis)], { type: 'text/html' }) },
    { id: 'pdf', ic: '📄', t: 'PDF (3 sayfa)', s: 'Kapalı zarf, açık zarf, mektup. PDF kendi başına hareket etmez, sayfa çevirerek okunur.', ext: 'pdf', make: () => EX.makePdf(f, emojis) },
    { id: 'png', ic: '🖼️', t: 'Resim (PNG)', s: 'Zarf ve mektup tek bir resimde.', ext: 'png', make: () => EX.makePng(f, emojis) }
  ];
  const fmtBtns = new Map();
  async function run(fm) {
    err.textContent = '';
    if (!f.body.trim()) { err.textContent = 'Önce mektubunu yaz.'; bodyIn.focus(); return; }
    if (fm.id === 'gif') {
      try {
        const hh = await EX.measure(f, emojis);
        if (hh > EX.GIF_MAX_H && !(await ask('Mektubun uzun: GIF\'te yalnızca ilk bölümü görünür. Tamamının görünmesi için HTML ya da PDF daha iyi. GIF yine de hazırlansın mı?', 'GIF yap'))) return;
      } catch { /* ölçülemedi, devam */ }
    }
    const btn = fmtBtns.get(fm.id), small = btn.querySelector('small'), bar = btn.querySelector('.bar > i'), old = small.textContent;
    fmtBtns.forEach((b) => { b.disabled = true; });
    small.textContent = 'Hazırlanıyor…';
    if (f.to.trim()) { try { await navigator.clipboard?.writeText(f.to.trim()); } catch { /* yoksay */ } }   // pano, dokunuş bitmeden
    try {
      const blob = await fm.make((p) => { bar.style.width = Math.round(p * 100) + '%'; small.textContent = 'Hazırlanıyor… %' + Math.round(p * 100); });
      LS.set('gonder-son', { to: f.to, from: f.from });
      await deliver(blob, fileName(fm.ext));
    } catch (e) { err.textContent = 'Hazırlanamadı: ' + (e.message || e); }
    finally { small.textContent = old; bar.style.width = '0'; fmtBtns.forEach((b) => { b.disabled = false; }); }
  }
  const fmtList = h('div', { class: 'fmts' }, ...FORMATS.map((fm) => {
    const b = h('button', { type: 'button', class: 'fmt' + (fm.tag ? ' main' : '') },
      h('span', { class: 'ic' }, fm.ic), h('span', null, h('b', null, fm.t, fm.tag ? h('span', { class: 'tag' }, fm.tag) : null), h('small', null, fm.s), h('span', { class: 'bar' }, h('i'))));
    b.addEventListener('click', () => run(fm));
    fmtBtns.set(fm.id, b); return b;
  }));
  const mailBtn = h('button', { class: 'btn ghost', type: 'button', style: 'width:100%;margin-top:10px' }, '✉️ Sadece yazı olarak mail uygulamamda aç');
  mailBtn.addEventListener('click', () => {
    err.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.to.trim())) { err.textContent = 'Geçerli bir alıcı e-posta adresi yaz.'; toIn.focus(); return; }
    if (!f.body.trim()) { err.textContent = 'Önce mektubunu yaz.'; bodyIn.focus(); return; }
    const body = plainEmail(), url = mailtoUrl(body);
    if (url.length > 1800) {
      navigator.clipboard?.writeText(body).then(() => toast('Mektup çok uzun; panoya kopyalandı. Mail uygulamasında yapıştır.'), () => {});
      location.href = mailtoUrl('');
    } else location.href = url;
  });

  /* ---- sayfa */
  const root = document.getElementById('app');
  root.replaceChildren(
    h('header', { class: 'topbar' }, h('span', { class: 'brand' }, h('span', null, '💌'), 'Mektup Gönder')),
    h('main', { class: 'container' },
      h('div', { class: 'write' },
        h('div', { class: 'card' },
          h('div', { class: 'sec-title' }, '1. Mektubunu yaz'),
          field('Kime (e-posta)', toIn, 'Sadece gönderirken adresi panoya kopyalamak için'), field('Senin adın', fromIn), field('Zarfın üstüne yazı', labelIn, 'Zarfın ön yüzünde görünür'), field('Başlık', titleIn), field('Tarih', dateIn, 'Örn. 1 Ocak 2027'), field('Mektup', bodyIn), counter,
          h('div', { class: 'toolrow' }, h('button', { type: 'button', class: 'chip', onclick: pickTemplate }, '📜 Hazır şablon'), h('button', { type: 'button', class: 'chip', onclick: inspire }, '💡 İlham al'), h('button', { type: 'button', class: 'chip', onclick: newLetter }, '🗑️ Yeni mektup')),
          tabsBox, tray,
          h('div', { class: 'sec-title' }, '2. Zarfı ve kâğıdı seç'),
          h('div', { class: 'pickers' },
            h('div', { class: 'label' }, 'Zarf'), envPicker, h('div', { class: 'label' }, 'Kâğıt'), paperPicker, h('div', { class: 'label' }, 'Yazı tipi'), fontPicker,
            h('div', { class: 'label' }, 'Mühür'), sealPicker, h('div', { class: 'label' }, 'Zarf açılınca'), fxPicker),
          h('label', { class: 'toggle', for: 'showdate' }, dateToggle, 'Mektubun üstünde tarih görünsün'),
          h('div', { class: 'sec-title' }, '3. Nasıl göndereyim?'),
          err, fmtList, mailBtn,
          h('p', { class: 'dl-note' }, 'Telefonda paylaşma menüsü açılır: Gmail\'i seç, dosya ek olarak eklenir. Bilgisayarda dosya indirilir.'),
          h('p', { class: 'preview-note' }, 'Hiçbir şey sunucuda saklanmaz. Taslağın ve emojilerin yalnızca bu telefonda durur.'),
          h('p', { class: 'preview-note', id: 'ver', style: 'text-align:center;opacity:.7' }, 'Sürüm: ' + X.VERSION + ' (GIF + HTML)')),
        h('div', { class: 'preview' }, h('div', { class: 'label', style: 'margin-bottom:8px;text-align:center' }, 'Önizleme'), previewBox, h('div', { style: 'margin-top:14px' }, playBtn)))));
  drawTray(); drawPickers(); renderPreview(); updCount();
  window.GONDER = { f, readyPanel, getEmojis: () => emojis, subject, plainEmail, mailtoUrl: () => mailtoUrl(plainEmail()) };
  const last = LS.get('gonder-son', null);
  if (last && !f.to) { f.to = last.to || ''; f.from = f.from || last.from || ''; toIn.value = f.to; fromIn.value = f.from; renderPreview(); }
})();
