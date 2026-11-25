/* Mektup Gönder: hesap, sunucu ve otomatik gönderim yok.
   Mektubu yaz; açılan zarf (GIF / HTML), PDF ya da PNG olarak mail uygulamanla paylaş. */
(function () {
  'use strict';
  const { h, field, toast, openModal, emojiSVG, envelopeEl, confetti, emojiMaker } = window.UI;
  const C = window.CONFIG, X = window.EXTRA, EX = window.EXPORT, G = window.GMAIL;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } }
  };
  const DRAFT = 'gonder-taslak', EMOJIS = 'gonder-emojis';

  const f = Object.assign({ to: '', from: '', label: '', title: '', body: '', envelope: 'klasik', paper: 'krem', font: 'klasik', seal: C.SEALS[0], effect: 'kalp', showDate: true, date: '', photo: '', listId: 0 }, LS.get(DRAFT, {}));
  try { f.photo = localStorage.getItem('gonder-foto') || ''; } catch { f.photo = ''; }
  let emojis = LS.get(EMOJIS, []);
  const PHOTO = 'gonder-foto';
  const persist = () => { LS.set(DRAFT, { ...f, photo: '' }); };
  const persistPhoto = () => { try { if (f.photo) localStorage.setItem(PHOTO, f.photo); else localStorage.removeItem(PHOTO); return true; } catch { return false; } };
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
      close.onclose = () => fin(false);   // Esc ya da dışarı dokunma = vazgeç
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
    f.title = ''; f.body = ''; f.date = ''; f.photo = ''; f.listId = 0; persistPhoto(); drawPhotoRow(); titleIn.value = ''; bodyIn.value = ''; dateIn.value = ''; persist(); renderPreview(); updCount(); bodyIn.focus();
  }
  function inspire() { insertText((f.body && !f.body.endsWith('\n') ? '\n\n' : '') + C.PROMPTS[Math.floor(Math.random() * C.PROMPTS.length)] + '\n\n'); }

  /* ---- fotoğraf */
  const photoInput = h('input', { type: 'file', accept: 'image/*', style: 'display:none', 'aria-label': 'Fotoğraf seç' });
  const photoRow = h('div', { class: 'photo-row' });
  function drawPhotoRow() {
    photoRow.replaceChildren(...(f.photo ? [h('img', { src: f.photo, alt: 'Eklenen fotoğraf' }), h('button', { type: 'button', class: 'chip', onclick: () => { f.photo = ''; persistPhoto(); drawPhotoRow(); renderPreview(); } }, 'Fotoğrafı kaldır')] : []));
    photoRow.style.display = f.photo ? '' : 'none';
  }
  async function loadBitmap(file) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch {
      return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Resim açılamadı')); i.src = URL.createObjectURL(file); });
    }
  }
  async function addPhoto(file) {
    if (!file) return;
    try {
      const bmp = await loadBitmap(file), w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight, sc = Math.min(1, 900 / Math.max(w0, h0));
      const cv = document.createElement('canvas'); cv.width = Math.round(w0 * sc); cv.height = Math.round(h0 * sc);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
      f.photo = cv.toDataURL('image/jpeg', 0.82);
      if (!persistPhoto()) toast('Fotoğraf bu cihazda saklanamadı ama mektupla gönderilir.');
      drawPhotoRow(); renderPreview(); err.textContent = '';
    } catch (e) { err.textContent = 'Fotoğraf eklenemedi: ' + (e.message || e); }
    photoInput.value = '';
  }
  photoInput.addEventListener('change', () => addPhoto(photoInput.files[0]));

  /* ---- takvim hatırlatması (.ics): zamanlı gönderim için sunucusuz tek yol */
  const icsText = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const icsFold = (line) => { const enc = new TextEncoder(); let out = '', cur = ''; for (const ch of line) { if (enc.encode(cur + ch).length > 72) { out += cur + '\r\n '; cur = ch; } else cur += ch; } return out + cur; };
  function buildIcs(whenLocal) {
    const p2 = (n) => String(n).padStart(2, '0'), loc = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
    const start = new Date(whenLocal), end = new Date(start.getTime() + 15 * 60000), who = f.label.trim() || f.to.trim() || 'sevgilin';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mektup Gonder//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mektup-gonder`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      `DTSTART:${loc(start)}`, `DTEND:${loc(end)}`, `SUMMARY:${icsText('💌 Mektubu gönder: ' + who)}`,
      `DESCRIPTION:${icsText('Mektup uygulamasını aç, taslağın kayıtlı. ' + subject() + (f.to.trim() ? ' Alıcı: ' + f.to.trim() : ''))}`,
      'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', `DESCRIPTION:${icsText('Mektubu gönderme zamanı')}`, 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText('10 dakika sonra mektubu gönder')}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }
  function openReminder() {
    const t = new Date(Date.now() + 86400000); t.setHours(9, 0, 0, 0);
    const pad2 = (n) => String(n).padStart(2, '0');
    const inp = h('input', { type: 'datetime-local', id: 'when', value: `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}T09:00` });
    const msg = h('p', { class: 'error', role: 'alert' });
    const close = openModal('Gönderme hatırlatması', h('div', { class: 'when' },
      h('p', { class: 'muted' }, 'Mektup o gün kendiliğinden gitmez. Seçtiğin zamanda telefonun seni uyarır, sen de uygulamayı açıp gönderirsin. Taslağın bu telefonda kayıtlı kalır.'),
      field('Ne zaman?', inp), msg,
      h('button', { class: 'btn', type: 'button', onclick: () => {
        if (!inp.value || isNaN(new Date(inp.value))) { msg.textContent = 'Bir tarih ve saat seç.'; return; }
        download(new Blob([buildIcs(inp.value)], { type: 'text/calendar;charset=utf-8' }), 'mektup-hatirlatma.ics');
        toast('İndirildi. Dosyaya dokununca takvimine eklenir.'); close();
      } }, '📅 Takvim dosyasını indir')));
  }

  /* ---- Mektuplarım: birden çok mektubu bu telefonda sakla (ör. her ay için bir mektup) */
  const LIST = 'gonder-liste', photoKey = (id) => 'gonder-foto-' + id;
  const getList = () => { const l = LS.get(LIST, []); return Array.isArray(l) ? l : []; };
  const rawStore = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); return true; } catch { return false; } };
  function syncInputs() {
    toIn.value = f.to; fromIn.value = f.from; labelIn.value = f.label; titleIn.value = f.title; dateIn.value = f.date; bodyIn.value = f.body; dateToggle.checked = f.showDate !== false;
    drawPickers(); drawPhotoRow(); renderPreview(); updCount();
  }
  function saveLetter(name, asNew) {
    const list = getList(), data = { ...f, photo: '' };
    let item = !asNew && f.listId ? list.find((x) => x.id === f.listId) : null;
    if (item) { item.data = data; item.updated = Date.now(); if (name) item.name = name; }
    else { item = { id: Date.now(), name: name || cleanTitle(f.title) || 'Adsız mektup', updated: Date.now(), data }; list.unshift(item); }
    f.listId = item.id; persist();
    const okPhoto = rawStore(photoKey(item.id), f.photo);
    const okList = (() => { try { localStorage.setItem(LIST, JSON.stringify(list.slice(0, 40))); return true; } catch { return false; } })();
    if (!okList) toast('Bu telefonda yer kalmadı, mektup kaydedilemedi. Eski mektupları sil.', 'err');
    else if (!okPhoto) toast('Mektup kaydedildi ama fotoğraf sığmadı.');
    return item;
  }
  function openLetter(item) {
    const photo = (() => { try { return localStorage.getItem(photoKey(item.id)) || ''; } catch { return ''; } })();
    Object.assign(f, { to: '', from: '', label: '', title: '', body: '', date: '', showDate: true }, item.data, { photo, listId: item.id });
    persist(); persistPhoto(); syncInputs();
  }
  function openLetters() {
    const box = h('div', null), nameIn = h('input', { type: 'text', maxlength: '60', placeholder: 'Örn. Ocak mektubu', 'aria-label': 'Mektubun adı' });
    let close;
    const draw = () => {
      const list = getList(), cur = list.find((x) => x.id === f.listId);
      if (!nameIn.value && cur) nameIn.value = cur.name;
      box.replaceChildren(
        h('p', { class: 'muted' }, 'Mektupların yalnızca bu telefonda saklanır. Aç dersen şu anki taslağın yerine gelir; kaydetmediysen önce kaydet.'),
        field(cur ? 'Bu mektubun adı' : 'Yeni kayıt adı', nameIn),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: () => { if (!f.body.trim()) { toast('Önce mektubu yaz.'); return; } saveLetter(nameIn.value.trim(), false); toast('Kaydedildi.'); nameIn.value = ''; draw(); } }, cur ? '💾 Güncelle' : '💾 Kaydet'),
          cur ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { saveLetter(nameIn.value.trim() || cur.name + ' (kopya)', true); toast('Yeni mektup olarak kaydedildi.'); nameIn.value = ''; draw(); } }, 'Yeni olarak kaydet') : null),
        list.length ? h('div', { class: 'tmpl', style: 'margin-top:12px' }, ...list.map((it) => h('div', { style: 'border:1.5px solid ' + (it.id === f.listId ? 'var(--rose)' : 'var(--line)') + ';border-radius:14px;padding:10px 14px' },
          h('b', null, it.name), h('small', { style: 'display:block;color:var(--muted)' }, new Date(it.updated).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' · ' + (it.data.body || '').replace(/\s+/g, ' ').slice(0, 60)),
          h('div', { class: 'btn-row', style: 'margin-top:8px' },
            h('button', { class: 'chip', type: 'button', onclick: () => { openLetter(it); close(); toast('Mektup açıldı.'); } }, 'Aç'),
            h('button', { class: 'chip', type: 'button', onclick: async () => { if (await ask(`"${it.name}" silinsin mi?`, 'Sil')) { const l = getList().filter((x) => x.id !== it.id); try { localStorage.setItem(LIST, JSON.stringify(l)); } catch { /* yoksay */ } rawStore(photoKey(it.id), ''); if (f.listId === it.id) { f.listId = 0; persist(); } nameIn.value = ''; draw(); } } }, 'Sil'))))) : h('p', { class: 'dl-note' }, 'Henüz kayıtlı mektup yok.'));
    };
    draw(); close = openModal('Mektuplarım', box);
  }

  /* ---- emoji tepsisi (sekmeli) */
  let tab = 'ask';
  const tabsBox = h('div', { class: 'tabs', role: 'tablist' });
  const tray = h('div', { class: 'tray', id: 'emoji-panel', role: 'tabpanel', 'aria-label': 'Emojiler' });
  function drawTray() {
    const all = [{ id: 'benim', name: '⭐ Benimkiler' }, ...X.EMOJI_CATS];
    tabsBox.replaceChildren(...all.map((c) => h('button', { type: 'button', class: 'chip', role: 'tab', 'aria-selected': String(tab === c.id), 'aria-controls': 'emoji-panel', 'aria-pressed': String(tab === c.id), onclick: () => { tab = c.id; drawTray(); } }, c.name)));
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
    const pick = (key, val) => () => { f[key] = val; persist(); drawPickers(); renderPreview(key === 'envelope' || key === 'seal'); };
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
  function renderPreview(pop) {
    const env = envelopeEl(f.envelope, f.seal, { w: 230 });
    if (pop) { env.classList.add('pop'); }
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
  /* ---- gönderim yolu: paylaşma menüsü ya da Gmail taslağı */
  let mode = LS.get('gonder-mode', 'share');
  const modeBox = h('div', { class: 'toolrow', role: 'group', 'aria-label': 'Gönderim yolu' });
  const modeNote = h('p', { class: 'dl-note' });
  let extras = LS.get('gonder-ekler', []);
  const extraBox = h('div', { class: 'toolrow', role: 'group', 'aria-label': 'Taslağa eklenecek ek dosyalar' });
  function drawExtras() {
    extraBox.style.display = mode === 'gmail' ? '' : 'none';
    extraBox.replaceChildren(h('span', { class: 'dl-note', style: 'margin:0 4px 0 0;align-self:center' }, 'Taslağa ayrıca ekle:'),
      ...[['pdf', '📄 PDF'], ['html', '🌐 HTML'], ['png', '🖼️ PNG'], ['gif', '🎬 GIF']].map(([id, label]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(extras.includes(id)), onclick: () => {
        extras = extras.includes(id) ? extras.filter((x) => x !== id) : [...extras, id]; LS.set('gonder-ekler', extras); drawExtras();
      } }, label)));
  }
  function drawMode() {
    const chip = (id, label) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(mode === id), onclick: () => {
      if (id === 'gmail' && !G.getClientId()) { openSettings(); return; }
      mode = id; LS.set('gonder-mode', mode); if (id === 'gmail') G.preload().catch(() => {}); drawMode();
    } }, label);
    modeBox.replaceChildren(chip('share', '📤 Paylaşma menüsü'), chip('gmail', '📧 Gmail taslağı'));
    drawExtras();
    modeNote.textContent = mode === 'gmail'
      ? 'Dosya Gmail hesabında bir taslağa konur. Gmail\'i açıp Gönder\'e basarsın. GIF ve PNG mailin içinde görünür.'
      : 'Telefonda paylaşma menüsü açılır: Gmail\'i seç, dosya ek olarak eklenir. Bilgisayarda dosya indirilir.';
  }
  function openSettings() {
    const idIn = h('input', { type: 'text', id: 'gcid', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '123456789-abc….apps.googleusercontent.com' });
    idIn.value = G.getClientId();
    const msg = h('p', { class: 'error', role: 'alert' });
    const origin = location.origin === 'null' ? '(adresini yaz)' : location.origin;
    const steps = [
      '**console.cloud.google.com** adresine gir, Google hesabınla giriş yap, üstten **Yeni proje** oluştur (adı: Mektup).',
      '**API\'ler ve Hizmetler → Kitaplık**\'tan **Gmail API**\'yi bul ve **Etkinleştir**\'e bas.',
      '**Google Auth Platform** (ya da "OAuth izin ekranı"): kullanıcı türü **Harici**, uygulama adı ve e-postanı yaz. **Veri erişimi**\'nde **gmail.compose** iznini ekle.',
      '**ÖNEMLİ: Hedef kitle → Test kullanıcıları → + Kullanıcı ekle**: giriş yapacağın Gmail adresini yaz ve Kaydet. Eklemezsen giriş "Hata 403: access_denied" ile durur.',
      '**İstemciler → İstemci oluştur → Web uygulaması**. "Yetkili JavaScript kaynakları"na şunu yapıştır: **' + origin + '** (yalnızca bu adres; sonunda / ve klasör adı olmasın).',
      'Oluşan **İstemci Kimliği**\'ni (…apps.googleusercontent.com) aşağıya yapıştır.'
    ];
    const rich = (t) => t.split('**').map((x, i) => (i % 2 ? h('b', null, x) : x));
    const list = h('ol', { style: 'padding-left:20px;margin:8px 0;line-height:1.5' }, ...steps.map((st) => h('li', null, ...rich(st))));
    const close = openModal('Gmail bağlantısı (bir kerelik kurulum)', h('div', null,
      h('p', { class: 'muted' }, 'Mektubu Gmail\'inde ekli bir taslak olarak hazırlamak için Google\'da kendi (ücretsiz) istemci kimliğini oluşturursun. Uygulama yalnızca taslak oluşturma iznini ister; hiçbir şey sunucuya gitmez.'),
      list,
      h('p', { class: 'muted' }, 'İlk girişte "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa Gelişmiş → devam et de. Kendi uygulaman olduğu için normaldir. Test modunda yaklaşık 7 günde bir yeniden giriş istenebilir.'),
      h('p', { class: 'muted' }, 'Giriş sırasında "Erişim engellendi … Hata 403: access_denied" görürsen: 3. adımdaki Test kullanıcıları listesine giriş yaptığın Gmail adresi eklenmemiş demektir. Ekle, Kaydet, tekrar dene.'),
      field('İstemci Kimliği (Client ID)', idIn), msg,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const v = idIn.value.trim();
          if (v && !G.looksValid(v)) { msg.textContent = 'Bu bir istemci kimliğine benzemiyor. "….apps.googleusercontent.com" ile biten metni yapıştır.'; return; }
          G.setClientId(v);
          if (v) { mode = 'gmail'; G.preload().catch(() => {}); } else mode = 'share';
          LS.set('gonder-mode', mode); drawMode(); close(); toast(v ? 'Kaydedildi. Artık Gmail taslağı seçili.' : 'Gmail bağlantısı kaldırıldı.');
        } }, 'Kaydet'),
        G.getClientId() ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { idIn.value = ''; } }, 'Kimliği sil') : null)));
  }
  const slugName = (ext) => fileName(ext);
  function draftHtml(fm, name, others) {
    const E = G.escHtml, who = E(f.from.trim() || 'Biri');
    let inner = `<p style="font-size:18px;margin:0 0 12px">💌 <b>${who}</b> sana bir mektup gönderdi</p>`;
    if (fm.id === 'gif' || fm.id === 'png') inner += '<img src="cid:mektup" alt="Mektup" style="max-width:100%;border-radius:12px">';
    else if (fm.id === 'html') inner += `<p>Ekteki <b>${E(name)}</b> dosyasını tarayıcıda aç, zarf kendiliğinden açılır.</p>`;
    else inner += `<p>Ekteki <b>${E(name)}</b> dosyasını aç.</p>`;
    if (others.length) inner += `<p style="font-size:14px;color:#7a5a5f">Ekler: ${others.map((o) => E(o)).join(', ')}${others.some((o) => /\.html$/.test(o)) ? ' (HTML dosyasını tarayıcıda aç; zarf kendiliğinden açılır)' : ''}</p>`;
    return `<div style="font-family:Georgia,serif;font-size:16px;color:#3b2a2a">${inner}</div>`;
  }
  async function gmailDraft(fm, blob, token, status) {
    const name = slugName(fm.ext), atts = [{ name, type: blob.type, bytes: new Uint8Array(await blob.arrayBuffer()), inline: fm.id === 'gif' || fm.id === 'png' }];
    for (const id of extras.filter((x) => x !== fm.id)) {
      const ef = FORMATS.find((x) => x.id === id); if (!ef) continue;
      status(`Ek hazırlanıyor: ${ef.t.split(' ')[0]}…`);
      const eb = await ef.make(() => {});
      atts.push({ name: slugName(ef.ext), type: eb.type, bytes: new Uint8Array(await eb.arrayBuffer()), inline: false });
    }
    status('Gmail\'e kaydediliyor…');
    const mime = G.buildMime({ to: f.to.trim(), subject: subject(), text: plainEmail(), html: draftHtml(fm, name, atts.slice(1).map((a) => a.name)), atts });
    const d = await G.createDraft(token, mime);
    const url = G.draftUrl(d);
    const list = atts.map((a) => a.name).join(', ');
    const close = openModal('Taslak Gmail\'e kaydedildi ✅', h('div', null,
      h('p', null, `${list} eklenmiş bir taslak hazır${f.to.trim() ? ' (alıcı: ' + f.to.trim() + ')' : ''}. Gmail'i aç, Taslaklar'dan mektubu bul, Gönder'e bas.`),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener', onclick: () => setTimeout(close, 300) }, '📧 Gmail\'i aç'), h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Kapat'))));
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
    let token = null;
    if (mode === 'gmail') {
      const cid = G.getClientId();
      if (!cid) { openSettings(); return; }
      try { token = await G.ensureToken(cid); }       // dokunuşun içinde: Google giriş penceresi
      catch (e) { err.textContent = e.retry ? e.message : 'Google girişi tamamlanmadı: ' + (e.message || e); return; }
    }
    const btn = fmtBtns.get(fm.id), small = btn.querySelector('small'), bar = btn.querySelector('.bar > i'), old = small.textContent;
    fmtBtns.forEach((b) => { b.disabled = true; });
    small.textContent = 'Hazırlanıyor…';
    if (f.to.trim() && mode !== 'gmail') { try { await navigator.clipboard?.writeText(f.to.trim()); } catch { /* yoksay */ } }   // pano, dokunuş bitmeden
    try {
      const blob = await fm.make((p) => { bar.style.width = Math.round(p * 100) + '%'; small.textContent = 'Hazırlanıyor… %' + Math.round(p * 100); });
      LS.set('gonder-son', { to: f.to, from: f.from });
      if (mode === 'gmail') await gmailDraft(fm, blob, token, (t) => { small.textContent = t; }); else await deliver(blob, fileName(fm.ext));
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
    h('header', { class: 'topbar' }, h('span', { class: 'brand' }, h('span', null, '💌'), 'Mektup Gönder'), h('span', { style: 'flex:1' }), h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Gmail bağlantısı', title: 'Gmail bağlantısı', onclick: openSettings }, '⚙️')),
    h('main', { class: 'container' },
      h('div', { class: 'write' },
        h('div', { class: 'card' },
          h('div', { class: 'sec-title' }, '1. Mektubunu yaz'),
          field('Kime (e-posta)', toIn, 'Sadece gönderirken adresi panoya kopyalamak için'), field('Senin adın', fromIn), field('Zarfın üstüne yazı', labelIn, 'Zarfın ön yüzünde görünür'), field('Başlık', titleIn), field('Tarih', dateIn, 'Örn. 1 Ocak 2027'), field('Mektup', bodyIn), counter,
          h('div', { class: 'toolrow' }, h('button', { type: 'button', class: 'chip', onclick: pickTemplate }, '📜 Hazır şablon'), h('button', { type: 'button', class: 'chip', onclick: inspire }, '💡 İlham al'), h('button', { type: 'button', class: 'chip', onclick: openLetters }, '📚 Mektuplarım'), h('button', { type: 'button', class: 'chip', onclick: () => photoInput.click() }, '📷 Fotoğraf ekle'), h('button', { type: 'button', class: 'chip', onclick: openReminder }, '📅 Takvime hatırlat'), h('button', { type: 'button', class: 'chip', onclick: newLetter }, '🗑️ Yeni mektup')),
          photoInput, photoRow,
          tabsBox, tray,
          h('div', { class: 'sec-title' }, '2. Zarfı ve kâğıdı seç'),
          h('div', { class: 'pickers' },
            h('div', { class: 'label' }, 'Zarf'), envPicker, h('div', { class: 'label' }, 'Kâğıt'), paperPicker, h('div', { class: 'label' }, 'Yazı tipi'), fontPicker,
            h('div', { class: 'label' }, 'Mühür'), sealPicker, h('div', { class: 'label' }, 'Zarf açılınca'), fxPicker),
          h('label', { class: 'toggle', for: 'showdate' }, dateToggle, 'Mektubun üstünde tarih görünsün'),
          h('div', { class: 'sec-title' }, '3. Nasıl göndereyim?'),
          modeBox, extraBox, modeNote, err, fmtList, mailBtn,
          h('p', { class: 'preview-note' }, 'Hiçbir şey sunucuda saklanmaz. Taslağın ve emojilerin yalnızca bu telefonda durur.'),
          h('p', { class: 'preview-note', id: 'ver', style: 'text-align:center;opacity:.7' }, 'Sürüm: ' + X.VERSION)),
        h('div', { class: 'preview' }, h('div', { class: 'label', style: 'margin-bottom:8px;text-align:center' }, 'Önizleme'), previewBox, h('div', { style: 'margin-top:14px' }, playBtn)))));
  drawTray(); drawPickers(); drawMode(); drawPhotoRow(); renderPreview(); updCount();
  if (mode === 'gmail' && G.getClientId()) G.preload().catch(() => {}); else if (mode === 'gmail') { mode = 'share'; drawMode(); }
  window.GONDER = { f, getList, readyPanel, buildIcs, addPhoto, getEmojis: () => emojis, subject, plainEmail, mailtoUrl: () => mailtoUrl(plainEmail()) };
  const last = LS.get('gonder-son', null);
  if (last && !f.to) { f.to = last.to || ''; f.from = f.from || last.from || ''; toIn.value = f.to; fromIn.value = f.from; renderPreview(); }
})();
