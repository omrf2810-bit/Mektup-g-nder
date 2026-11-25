/* Gmail taslağı: Google ile bir kerelik giriş yapılır, mektup (GIF/HTML/PDF/PNG) ekli bir TASLAK olarak Gmail hesabına kaydedilir.
   Gönderme işlemini sen Gmail'de yaparsın. İstek yalnızca "gmail.compose" iznini ister; uygulama sunucusu yok, her şey tarayıcıdan Google'a gider.
   Bağlantı için kullanıcının kendi Google Cloud "OAuth istemci kimliği" (Client ID) gerekir. */
(function () {
  'use strict';
  const SCOPE = 'https://www.googleapis.com/auth/gmail.compose';
  const KEY = 'gonder-google';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* yoksay */ } }
  };
  const getClientId = () => (store.get().clientId || '').trim();
  const setClientId = (id) => { store.set({ ...store.get(), clientId: String(id || '').trim() }); tok = null; };
  const looksValid = (id) => /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(String(id).trim());

  let tok = null, exp = 0, loading = null;
  const loaded = () => !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  function preload() {
    if (loaded()) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => res(); s.onerror = () => { loading = null; s.remove(); rej(new Error('Google girişi yüklenemedi. İnternet bağlantını kontrol et.')); };
      document.head.append(s);
    });
    return loading;
  }
  /* Dokunuşun içinden çağrılmalı: Google giriş penceresi yalnızca kullanıcı dokunuşuyla açılır. */
  function ensureToken(clientId) {
    if (tok && Date.now() < exp - 60000) return Promise.resolve(tok);
    if (!loaded()) {
      return preload().then(() => { const e = new Error('Google girişi hazırlandı. Düğmeye bir kez daha dokun.'); e.retry = true; throw e; });
    }
    return new Promise((res, rej) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: SCOPE,
        callback: (r) => {
          if (r && r.error) return rej(Object.assign(new Error(r.error_description || r.error), { code: r.error }));
          tok = r.access_token; exp = Date.now() + (Number(r.expires_in) || 3600) * 1000; res(tok);
        },
        error_callback: (e) => rej(Object.assign(new Error((e && (e.message || e.type)) || 'Giriş penceresi açılamadı'), { code: e && e.type }))
      });
      client.requestAccessToken({ prompt: '' });
    });
  }
  const forget = () => { tok = null; exp = 0; };

  /* ---- MIME (yalnızca ASCII üretir: gövdeler base64) */
  const enc = new TextEncoder();
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const wrap = (s) => s.replace(/(.{76})/g, '$1\r\n');
  const bodyB64 = (str) => wrap(b64(enc.encode(str)));
  function encodeHeader(str) {
    if (/^[\x20-\x7e]*$/.test(str)) return str;
    const words = []; let cur = '';
    for (const ch of str) { const next = cur + ch; if (cur && enc.encode(next).length > 42) { words.push(cur); cur = ch; } else cur = next; }
    if (cur) words.push(cur);
    return words.map((w) => `=?UTF-8?B?${b64(enc.encode(w))}?=`).join('\r\n ');
  }
  const rnd = () => Math.random().toString(36).slice(2, 12);
  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* opts: { to, subject, text, html, atts: [{ name, type, bytes(Uint8Array), inline }] }
     inline olanlar mailin içinde görünür (Content-ID: <mektup>, <mektup2>…), diğerleri ek olur. */
  const leaf = (headers, body) => ({ headers, body });
  const multi = (subtype, parts, extra) => {
    const bnd = subtype + '_' + rnd();
    return { headers: [`Content-Type: multipart/${subtype}; ${extra ? extra + '; ' : ''}boundary="${bnd}"`], body: parts.map((p) => `--${bnd}\r\n${p.headers.join('\r\n')}\r\n\r\n${p.body}`).join('\r\n') + `\r\n--${bnd}--` };
  };
  function buildMime(o) {
    const atts = o.atts || (o.att ? [o.att] : []);
    const alt = multi('alternative', [
      leaf(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'], bodyB64(o.text || '')),
      leaf(['Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64'], bodyB64(o.html || ''))
    ]);
    const safe = (n) => n.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    let cid = 0;
    const part = (a) => {
      const name = safe(a.name);
      const id = a.inline ? (cid++ === 0 ? 'mektup' : 'mektup' + cid) : null;
      return { id, p: leaf([`Content-Type: ${a.type}; name="${name}"`, 'Content-Transfer-Encoding: base64', a.inline ? `Content-Disposition: inline; filename="${name}"` : `Content-Disposition: attachment; filename="${name}"`, a.inline ? `Content-ID: <${id}>` : `X-Attachment-Id: f_${rnd()}`], wrap(b64(a.bytes))) };
    };
    const inl = atts.filter((a) => a.inline).map(part), att = atts.filter((a) => !a.inline).map(part);
    const rel = inl.length ? multi('related', [alt, ...inl.map((x) => x.p)], 'type="multipart/alternative"') : alt;
    const root = att.length ? multi('mixed', [rel, ...att.map((x) => x.p)]) : rel;
    const head = ['MIME-Version: 1.0'];
    if (o.to) head.push('To: ' + o.to);
    head.push('Subject: ' + encodeHeader(o.subject || ''), ...root.headers);
    return head.join('\r\n') + '\r\n\r\n' + root.body + '\r\n';
  }

  /* ---- Gmail API: taslak oluştur */
  const b64url = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function createDraft(token, mime) {
    const auth = { Authorization: 'Bearer ' + token };
    let r = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/drafts?uploadType=media', { method: 'POST', headers: { ...auth, 'Content-Type': 'message/rfc822' }, body: mime });
    if (!r.ok && r.status !== 401 && r.status !== 403) {   // yedek yol: JSON + base64url
      r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { raw: b64url(mime) } }) });
    }
    if (!r.ok) {
      let msg = ''; try { msg = (await r.json()).error.message; } catch { /* yoksay */ }
      throw Object.assign(new Error(friendly(r.status, msg)), { status: r.status });
    }
    return r.json();
  }
  function friendly(status, msg) {
    if (status === 401) return 'Google oturumun süresi doldu. Düğmeye tekrar dokun.';
    if (status === 403 && /not been used|disabled|accessNotConfigured/i.test(msg)) return 'Gmail API etkin değil. Google Cloud\'da "Gmail API"yi etkinleştir (ayarlardaki 2. adım).';
    if (status === 403) return 'Google izin vermedi: ' + (msg || 'gmail.compose iznini onayladığından emin ol.');
    if (status === 413) return 'Dosya Gmail için çok büyük. Daha kısa bir mektup ya da PNG dene.';
    return `Gmail taslağı oluşturulamadı (${status}) ${msg}`.trim();
  }
  const draftUrl = (d) => (d && d.message && d.message.id ? `https://mail.google.com/mail/u/0/#drafts?compose=${encodeURIComponent(d.message.id)}` : 'https://mail.google.com/mail/u/0/#drafts');

  window.GMAIL = { SCOPE, getClientId, setClientId, looksValid, preload, ensureToken, forget, buildMime, createDraft, draftUrl, escHtml };
})();
