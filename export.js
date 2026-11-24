/* Mektup Gönder: dışa aktarma.
   - buildHtml: dokununca (ya da kendiliğinden) açılan zarf, tek dosyalık HTML
   - makeGif:   mailde kendiliğinden oynayan zarf açılma animasyonu
   - makePdf:   3 sayfa: kapalı zarf, açık zarf, mektup
   - makePng:   zarf + mektup tek görsel */
(function () {
  'use strict';
  const C = window.CONFIG, X = window.EXTRA, U = window.UI, h = U.h;
  const HR = 0.64;                         // zarf yüksekliği / genişliği
  const BG = '#fbf4ec';
  const envDef = (id) => C.ENVELOPES.find((e) => e.id === id) || C.ENVELOPES[0];
  const paperDef = (id) => X.PAPERS.find((p) => p.id === id) || X.PAPERS[0];
  const fontDef = (id) => X.FONTS.find((f) => f.id === id) || X.FONTS[0];
  const effectDef = (id) => X.EFFECTS.find((f) => f.id === id) || X.EFFECTS[0];
  const dateStr = (f) => (f && f.date && f.date.trim()) || new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const emojiMapOf = (emojis) => new Map((emojis || []).map((e) => [e.id, e]));

  /* ------------------------------------------------------------ mektup kâğıdı (DOM) */
  function letterEl(f, map) {
    const el = h('article', { class: 'lt', 'data-p': f.paper, 'data-ff': f.font || 'klasik' });
    if (f.showDate !== false) el.append(h('div', { class: 'd' }, dateStr(f)));
    if (f.title.trim()) el.append(h('h2', null, f.title.trim()));
    el.append(h('div', { class: 'b' }, U.renderBody(f.body || '', map)));
    if (f.photo) el.append(h('div', { class: 'ph' }, h('img', { src: f.photo, alt: 'Mektuba eklenmiş fotoğraf' })));
    if (f.from.trim()) el.append(h('div', { class: 'f' }, '— ' + f.from.trim()));
    return el;
  }

  async function loadFonts(f) {
    if (!document.fonts) return;
    try { await Promise.all(['500 20px Caveat', '700 20px Caveat'].map((x) => document.fonts.load(x, 'Ağşıİ'))); } catch { /* yoksay */ }
    try { await document.fonts.ready; } catch { /* yoksay */ }
  }

  const MAX_CANVAS = 15000;   // piksel: telefon tarayıcıları bundan büyük tuvali sessizce boş bırakabilir
  async function withLetter(f, map, fn) {
    if (!window.html2canvas) throw new Error('Görsel aracı yüklenemedi');
    await loadFonts(f);
    const el = letterEl(f, map);
    el.style.width = '420px'; el.style.boxShadow = 'none';
    const host = h('div', { 'aria-hidden': 'true', style: 'position:fixed;left:-10000px;top:0;width:420px' }, el);
    document.body.append(host);
    try { return await fn(el); } finally { host.remove(); }
  }
  /* mektubun 420 px genişlikteki yüksekliği (css px) */
  const measure = (f, emojis) => withLetter(f, emojiMapOf(emojis), async (el) => el.offsetHeight);
  async function captureLetter(f, map, S) {
    return withLetter(f, map, async (el) => {
      const hh = el.offsetHeight, eff = Math.max(1, Math.min(S, Math.floor(MAX_CANVAS / Math.max(hh, 1))));
      if (hh > MAX_CANVAS) throw new Error('Mektup çok uzun, resim olarak hazırlanamıyor. HTML dosyasını dene.');
      const cv = await window.html2canvas(el, { scale: eff, backgroundColor: null, useCORS: true, logging: false });
      cv.effS = eff; return cv;
    });
  }

  /* ------------------------------------------------------------ zarf (SVG, HTML için) */
  function tileInfo(e) {
    const svg = U.patternSVG(e.pattern, e.accent);
    if (!svg) return null;
    return { svg, w: Number(/width='(\d+)'/.exec(svg)[1]), h: Number(/height='(\d+)'/.exec(svg)[1]) };
  }
  function envSvgs(e) {
    const W = 300, H = Math.round(W * HR * 100) / 100, r = 9, t = tileInfo(e);
    const defs = (id) => `<defs>${t ? `<pattern id='p${id}' width='${t.w}' height='${t.h}' patternUnits='userSpaceOnUse'><image href="data:image/svg+xml,${encodeURIComponent(t.svg)}" width='${t.w}' height='${t.h}'/></pattern>` : ''}<clipPath id='c${id}'><rect width='${W}' height='${H}' rx='${r}'/></clipPath></defs>`;
    const svg = (id, vb, inner) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}' preserveAspectRatio='none' width='100%' height='100%'>${defs(id)}${inner}</svg>`;
    const tex = (id, pts) => (t ? `<polygon points='${pts}' fill='url(#p${id})'/>` : '');
    const frontPts = `0,0 ${W / 2},${H * 0.56} ${W},0 ${W},${H} 0,${H}`;
    const fh = H * 0.6, flapPts = `0,0 ${W},0 ${W / 2},${fh * 0.93}`;
    return {
      back: svg('b', `0 0 ${W} ${H}`, `<rect width='${W}' height='${H}' rx='${r}' fill='${e.back}'/>`),
      front: svg('f', `0 0 ${W} ${H}`, `<g clip-path='url(#cf)'><polygon points='${frontPts}' fill='${e.front}'/>${tex('f', frontPts)}</g>`),
      flap: svg('l', `0 0 ${W} ${fh}`, `<polygon points='${flapPts}' fill='${e.flap}'/>${tex('l', flapPts)}`)
    };
  }

  /* ------------------------------------------------------------ açılan zarf (HTML dosyası) */
  const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  let fontCSSCache = null;
  async function embeddedFontCSS() {
    if (fontCSSCache) return fontCSSCache;
    let css = X.FONT_FACE_CSS;
    for (const name of [...new Set([...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map((m) => m[1]))]) {
      const buf = await (await fetch(name)).arrayBuffer();
      css = css.split(`url(${name})`).join(`url(data:font/woff2;base64,${b64(buf)})`);
    }
    return (fontCSSCache = css);
  }

  const SCENE_CSS = `
*{box-sizing:border-box}
html,body{margin:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:radial-gradient(ellipse at 50% 0%,#fff7f0,#f6e4d8 60%,#efd5c8) fixed;color:#4a2d33;min-height:100vh;display:flex;justify-content:center;overflow-x:hidden}
.wrap{--w:min(78vw,340px);width:min(92vw,520px);padding:26px 0 56px;display:flex;flex-direction:column;align-items:center;gap:20px;position:relative}
.hint{text-align:center;margin:6px 0 0;font:700 20px/1.35 Georgia,serif;transition:opacity .6s,height .6s;max-width:90%}
.hint small{display:block;font:500 14px system-ui,sans-serif;color:#9a7c80;margin-top:6px;animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{50%{opacity:.35}}
.scene{all:unset;display:block;width:var(--w);height:calc(var(--w)*.64 + 80px);position:relative;cursor:pointer;margin-top:36px;transition:opacity .9s,transform .9s,height .9s .1s,margin .9s;-webkit-tap-highlight-color:transparent}
.scene:focus-visible .env{outline:3px solid #c8586c;outline-offset:6px;border-radius:12px}
.env{position:absolute;left:0;right:0;top:80px;height:calc(var(--w)*.64);perspective:900px}
.env>*{position:absolute}
.scene:not(.go) .env{animation:wig 2.8s ease-in-out infinite}
@keyframes wig{0%,78%,100%{transform:rotate(0)}84%{transform:rotate(-2.6deg)}90%{transform:rotate(2.6deg)}95%{transform:rotate(-1.4deg)}}
.back{inset:0;z-index:1;filter:drop-shadow(0 10px 16px rgba(60,30,30,.22))}
.pp{left:6%;right:6%;top:8%;bottom:6%;z-index:2;border-radius:3px;box-shadow:0 1px 5px rgba(0,0,0,.22);transition:transform 1.05s .55s cubic-bezier(.2,.8,.2,1)}
.front{inset:0;z-index:3}
.flap{left:0;right:0;top:0;height:60%;z-index:4;transform-origin:50% 0;transition:transform .7s ease,z-index 0s .35s}
.seal{left:50%;top:56%;width:21%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;font-size:calc(var(--w)*.105);line-height:1;z-index:5;box-shadow:0 3px 8px rgba(0,0,0,.3),inset 0 0 0 2px rgba(255,255,255,.35);transition:opacity .35s,transform .45s}
.lab{left:8%;right:8%;top:77%;text-align:center;z-index:4;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .4s}
.go .flap{transform:rotateX(180deg);z-index:1}
.go .pp{transform:translateY(-74%)}
.go .seal{opacity:0;transform:translate(-50%,-50%) scale(.3)}
.go .lab{opacity:0}
.reveal .scene{opacity:0;height:0;margin-top:0;transform:translateY(60px);pointer-events:none}
.reveal .hint{opacity:0;height:0;overflow:hidden;margin:0}
.lt{width:100%;display:none;opacity:0;transform:translateY(70px) scale(.93);transition:opacity .9s,transform 1.1s cubic-bezier(.2,.8,.2,1)}
.lt.show{display:block}
.lt.in{opacity:1;transform:none}
.again{display:none;border:0;border-radius:999px;background:#c8586c;color:#fff;font:600 15px system-ui,sans-serif;padding:11px 20px;cursor:pointer;box-shadow:0 4px 12px rgba(200,88,108,.35)}
.reveal .again{display:inline-block}
.fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9}
.p{position:absolute;top:-10vh;will-change:transform;animation:fall linear forwards}
.p.up{top:auto;bottom:-10vh;animation-name:rise}
.p.c{border-radius:2px}
@keyframes fall{to{transform:translate3d(var(--dx),118vh,0) rotate(var(--r))}}
@keyframes rise{to{transform:translate3d(var(--dx),-118vh,0) rotate(var(--r))}}
@media (prefers-reduced-motion:reduce){.fx{display:none}}`;

  const PAGE_JS = `(function(){
var wrap=document.getElementById('wrap'),scene=document.getElementById('scene'),hint=document.getElementById('hint'),lt=document.getElementById('lt'),again=document.getElementById('again'),fx=document.getElementById('fx');
var EF=window.__EF||{list:[],up:false},opened=false,auto=0,T=[];
function later(f,ms){T.push(setTimeout(f,ms));}
function burst(n){
  var cols=['#c8586c','#e5c46b','#8fc4ae','#a994d1','#f7b784','#6fa8dc'];
  for(var i=0;i<n;i++){
    var s=document.createElement('span');s.className='p'+(EF.up?' up':'');
    if(EF.list===null){s.classList.add('c');s.style.width=(6+Math.random()*6)+'px';s.style.height=(9+Math.random()*8)+'px';s.style.background=cols[i%cols.length];}
    else if(EF.list.length){s.textContent=EF.list[i%EF.list.length];s.style.fontSize=(16+Math.random()*20)+'px';}
    else return;
    s.style.left=(Math.random()*100)+'vw';
    s.style.setProperty('--dx',(Math.random()*160-80)+'px');
    s.style.setProperty('--r',(Math.random()*720-360)+'deg');
    s.style.animationDuration=(3+Math.random()*3)+'s';
    s.style.animationDelay=(Math.random()*.9)+'s';
    fx.appendChild(s);
    (function(x){setTimeout(function(){x.remove();},7500);})(s);
  }
}
function open(){
  if(opened)return;opened=true;clearTimeout(auto);
  scene.classList.add('go');hint.style.opacity=0;
  later(function(){burst(34);},650);
  later(reveal,2400);
}
function reveal(){
  wrap.classList.add('reveal');lt.classList.add('show');
  requestAnimationFrame(function(){requestAnimationFrame(function(){lt.classList.add('in');});});
  burst(26);
}
function reset(){
  T.forEach(clearTimeout);T=[];opened=false;fx.innerHTML='';
  wrap.classList.remove('reveal');lt.classList.remove('in','show');scene.classList.remove('go');hint.style.opacity=1;
  window.scrollTo(0,0);auto=setTimeout(open,1300);
}
scene.addEventListener('click',open);
again.addEventListener('click',reset);
auto=setTimeout(open,1700);
window.__open=open;
})();`;

  async function buildHtml(f, emojis, opts = {}) {
    const e = envDef(f.envelope), p = paperDef(f.paper), fnt = fontDef(f.font), ef = effectDef(f.effect);
    const map = emojiMapOf(emojis), L = envSvgs(e);
    const lt = letterEl(f, map); lt.id = 'lt';
    const fontCss = fnt.needsFont ? await embeddedFontCSS() : '';
    const from = f.from.trim(), title = f.title.trim();
    const pp = `background-color:${p.bg};${p.img ? `background-image:${p.img};` : ''}${p.size ? `background-size:${p.size};` : ''}`;
    const labelFont = `${700} calc(var(--w)*${0.078 * fnt.fs}) ${fnt.css}`;
    return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light">
<title>${escHtml(title || (from ? from + ' sana bir mektup gönderdi' : 'Sana bir mektup var'))}</title>
<style>${fontCss}${X.letterCSS()}${SCENE_CSS}</style></head>
<body><main class="wrap" id="wrap">
<p class="hint" id="hint">💌 ${escHtml(from || 'Biri')} sana bir mektup gönderdi<small>Zarf kendiliğinden açılacak, istersen dokun</small></p>
<button class="scene" id="scene" type="button" aria-label="Zarfı aç">
<div class="env"><div class="back">${L.back}</div><div class="pp" style="${pp}"></div><div class="front">${L.front}</div><div class="flap">${L.flap}</div>
<div class="seal" style="background:${e.accent}">${escHtml(f.seal)}</div>${f.label.trim() ? `<div class="lab" style="font:${labelFont};color:${e.accent}">${escHtml(f.label.trim())}</div>` : ''}</div></button>
${lt.outerHTML}
<button class="again" id="again" type="button">↻ Tekrar izle</button>
</main><div class="fx" id="fx" aria-hidden="true"></div>
<script>window.__EF=${JSON.stringify({ list: ef.list, up: ef.id === 'kelebek' })};${PAGE_JS}</script></body></html>`;
  }

  /* ------------------------------------------------------------ canvas ile kare çizimi (GIF, PDF, PNG) */
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Desen yüklenemedi')); i.src = src; });

  async function prepare(f, emojis, S) {
    const e = envDef(f.envelope), fnt = fontDef(f.font), ef = effectDef(f.effect), t = tileInfo(e);
    const letter = await captureLetter(f, emojiMapOf(emojis), S);
    S = letter.effS;
    let pat = null;
    if (t) {
      const svg = t.svg.replace(/<svg ([^>]*?)width='(\d+)' height='(\d+)'>/, (m, a, w, hh) => `<svg ${a}width='${w * S}' height='${hh * S}' viewBox='0 0 ${w} ${hh}'>`);
      pat = { img: await loadImg('data:image/svg+xml,' + encodeURIComponent(svg)), S };
    }
    return { f, e, fnt, ef, pat, letter, S, crop: 1, p: paperDef(f.paper) };
  }

  function rr(ctx, x, y, w, hh, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function fillPat(ctx, P) {
    if (!P.pat) return;
    const pt = ctx.createPattern(P.pat.img, 'repeat');
    if (pt.setTransform) pt.setTransform(new DOMMatrix().scale(1 / P.pat.S));
    ctx.fillStyle = pt; ctx.fill();
  }

  /* zarfın tamamı: arka, (açık) kapak, mektup, ön, (kapalı) kapak, mühür, yazı */
  function drawEnvelope(ctx, P, x, y, w, o) {
    const e = P.e, hh = w * HR, r = w * 0.03, a = o.alpha == null ? 1 : o.alpha, flap = o.flap == null ? 1 : o.flap;
    if (a <= 0.01 && !o.letter) return;
    ctx.save();
    ctx.translate(x + w / 2, y + hh / 2); ctx.rotate(o.rot || 0); ctx.translate(-(x + w / 2), -(y + hh / 2));
    const flapDraw = () => {
      ctx.save(); ctx.translate(x, y); ctx.scale(1, flap);
      const fh = hh * 0.6; poly(ctx, [[0, 0], [w, 0], [w / 2, fh * 0.93]]); ctx.fillStyle = e.flap; ctx.fill(); fillPat(ctx, P);
      ctx.restore();
    };
    // arka
    ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = 'rgba(60,30,30,.25)'; ctx.shadowBlur = 14 * P.S; ctx.shadowOffsetY = 6 * P.S;
    rr(ctx, x, y, w, hh, r); ctx.fillStyle = e.back; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = a; if (flap < 0) flapDraw(); ctx.restore();
    // mektup (ön tarafın arkasında)
    if (o.letter) {
      const L = o.letter;
      ctx.save(); ctx.beginPath(); ctx.rect(0, -10000, 10000, 10000 + (o.clipBottom == null ? y + hh : o.clipBottom)); ctx.clip();
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 6 * P.S; ctx.shadowOffsetY = 1 * P.S;
      ctx.drawImage(P.letter, 0, 0, P.letter.width, P.letter.height * P.crop, L.x, L.y, L.w, L.h);
      if (P.crop < 1) {                       // kırpılan mektubun alt kenarı yumuşakça solar
        const fh = Math.min(70, L.h * 0.12), gr = ctx.createLinearGradient(0, L.y + L.h - fh, 0, L.y + L.h);
        gr.addColorStop(0, P.p.bg + '00'); gr.addColorStop(1, P.p.bg);
        ctx.shadowColor = 'transparent'; ctx.fillStyle = gr; ctx.fillRect(L.x, L.y + L.h - fh, L.w, fh);
      }
      ctx.restore();
    }
    // ön
    ctx.save(); ctx.globalAlpha = a; rr(ctx, x, y, w, hh, r); ctx.clip();
    poly(ctx, [[x, y], [x + w / 2, y + hh * 0.56], [x + w, y], [x + w, y + hh], [x, y + hh]]); ctx.fillStyle = e.front; ctx.fill(); fillPat(ctx, P); ctx.restore();
    ctx.save(); ctx.globalAlpha = a; if (flap >= 0) { ctx.beginPath(); rr(ctx, x, y, w, hh, r); ctx.clip(); flapDraw(); } ctx.restore();
    // yazı + mühür (yalnız kapalıyken)
    const seen = Math.max(0, flap) * a;
    if (seen > 0.02) {
      ctx.save(); ctx.globalAlpha = seen;
      if (P.f.label.trim()) {
        ctx.fillStyle = e.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let size = w * 0.078 * P.fnt.fs; ctx.font = `700 ${size}px ${P.fnt.css}`;
        const maxW = w * 0.84; while (ctx.measureText(P.f.label.trim()).width > maxW && size > 8) { size -= 1; ctx.font = `700 ${size}px ${P.fnt.css}`; }
        ctx.fillText(P.f.label.trim(), x + w / 2, y + hh * 0.86);
      }
      const sr = w * 0.105, sy = y + hh * 0.56;
      ctx.beginPath(); ctx.arc(x + w / 2, sy, sr, 0, Math.PI * 2); ctx.fillStyle = e.accent; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8 * P.S; ctx.shadowOffsetY = 3 * P.S; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.lineWidth = w * 0.008; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
      ctx.font = `${w * 0.105}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
      ctx.fillText(P.f.seal, x + w / 2, sy + w * 0.006);
      ctx.restore();
    }
    ctx.restore();
  }

  /* kendiliğinden belirlenen parçacıklar (aynı efekt her karede aynı yerden devam eder) */
  function makeParticles(P, n) {
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const list = P.ef.list, out = [];
    if (list && list.length === 0) return out;
    const cols = ['#c8586c', '#e5c46b', '#8fc4ae', '#a994d1', '#f7b784', '#6fa8dc'];
    for (let i = 0; i < n; i++) out.push({ x: rnd(), d: rnd() * 0.45, sp: 0.55 + rnd() * 0.5, dx: (rnd() - 0.5) * 0.12, sz: 14 + rnd() * 16, r: (rnd() - 0.5) * 8, g: list ? list[i % list.length] : null, c: cols[i % cols.length] });
    return out;
  }
  function drawParticles(ctx, P, parts, tau, W, Hc) {
    const up = P.ef.id === 'kelebek';
    for (const q of parts) {
      const t = (tau - q.d) * q.sp; if (t <= 0 || t >= 1.05) continue;
      const y = up ? Hc + 30 - t * (Hc + 60) : -30 + t * (Hc + 60), x = q.x * W + q.dx * W * t * 3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(q.r * t);
      if (q.g) { ctx.font = `${q.sz}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.g, 0, 0); }
      else { ctx.fillStyle = q.c; ctx.fillRect(-4, -6, 8, 12); }
      ctx.restore();
    }
  }

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* tek kare: k = { wig, flap(1..-1), rise(0..1), grow(0..1), tau } */
  function drawFrame(ctx, P, W, Hc, k, geo, parts) {
    ctx.save(); ctx.scale(P.S, P.S);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, Hc);
    const ew = 300, eh = ew * HR, ex = (W - ew) / 2, ey = geo.envTop;
    const lw0 = ew * 0.88, lh0 = geo.Lh * (lw0 / geo.Lw), lx0 = (W - lw0) / 2;
    const yIn = ey + eh * 0.08, yOut = ey + eh * 0.08 - eh * 0.86;
    const g = ease(k.grow || 0), r = ease(k.rise || 0);
    const ly0 = lerp(yIn, yOut, r);
    const L = { x: lerp(lx0, geo.fx, g), y: lerp(ly0, geo.fy, g), w: lerp(lw0, geo.Lw, g), h: lerp(lh0, geo.Lh, g) };
    const alpha = 1 - Math.pow(g, 1.3);
    drawEnvelope(ctx, P, ex, ey + g * 50, ew, { flap: k.flap, rot: (k.wig || 0) * 0.045, alpha, letter: { x: L.x, y: L.y, w: L.w, h: L.h }, clipBottom: g > 0 ? ey + g * 50 + eh + g * g * 6000 : ey + eh });
    if (parts && k.tau > 0) drawParticles(ctx, P, parts, k.tau, W, Hc);
    ctx.restore();
  }

  function geometry(P, Wcss, maxH) {
    const Lw = Wcss - 60, full = Math.round(P.letter.height / P.S * (Lw / (P.letter.width / P.S)));
    const Lh = maxH ? Math.min(full, maxH) : full;
    P.crop = Lh / full;
    return { Lw, Lh, full, fx: 30, fy: 30, envTop: 190 };
  }
  const canvasOf = (W, H, S) => { const c = document.createElement('canvas'); c.width = Math.round(W * S); c.height = Math.round(H * S); return c; };
  const toBlob = (cv, type, q) => new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Görsel oluşturulamadı'))), type, q));

  /* ------------------------------------------------------------ GIF */
  const GIF_MAX_H = 1700;   // bundan uzun mektubun GIF'te yalnız baş kısmı görünür (dosya boyutu ve hız için)
  async function makeGif(f, emojis, onProgress) {
    const G = window.gifenc; if (!G) throw new Error('GIF aracı yüklenemedi');
    const W = 480, P = await prepare(f, emojis, 1), S = P.S, geo = geometry(P, W, GIF_MAX_H);
    const Hc = Math.max(560, geo.Lh + 60), cv = canvasOf(W, Hc, S), ctx = cv.getContext('2d', { willReadFrequently: true });
    const parts = makeParticles(P, 34);
    const frames = [];       // { k, delay }
    frames.push({ k: { flap: 1, wig: 0 }, delay: 800 });
    for (let i = 0; i < 6; i++) frames.push({ k: { flap: 1, wig: Math.sin(i * 1.9) * (1 - i / 7) }, delay: 70 });
    for (let i = 1; i <= 7; i++) frames.push({ k: { flap: Math.cos((i / 7) * Math.PI) }, delay: 60 });
    const rise = 8; for (let i = 1; i <= rise; i++) frames.push({ k: { flap: -1, rise: i / rise, tau: i / 22 }, delay: 60 });
    const grow = 10; for (let i = 1; i <= grow; i++) frames.push({ k: { flap: -1, rise: 1, grow: i / grow, tau: (rise + i) / 22 }, delay: 60 });
    for (let i = 1; i <= 6; i++) frames.push({ k: { flap: -1, rise: 1, grow: 1, tau: (rise + grow + i) / 22 }, delay: 80 });
    frames.push({ k: { flap: -1, rise: 1, grow: 1, tau: 0 }, delay: 3800 });
    /* ortak palet: birkaç temsilci kareden tek palet çıkar. Kareler arası renk titremesi biter. */
    const rep = [0, 7, 13, 17, 22, frames.length - 8, frames.length - 1].filter((i, x, a) => i >= 0 && i < frames.length && a.indexOf(i) === x);
    const sample = new Uint8ClampedArray(W * Hc * 4 * rep.length);
    rep.forEach((i, x) => { drawFrame(ctx, P, W, Hc, frames[i].k, geo, parts); sample.set(ctx.getImageData(0, 0, W, Hc).data, x * W * Hc * 4); });
    const palette = G.quantize(sample, 256);
    await tick();
    const gif = G.GIFEncoder();
    for (let i = 0; i < frames.length; i++) {
      drawFrame(ctx, P, W, Hc, frames[i].k, geo, parts);
      const { data } = ctx.getImageData(0, 0, W, Hc);
      gif.writeFrame(G.applyPalette(data, palette), W, Hc, i === 0 ? { palette, delay: frames[i].delay, repeat: 0 } : { delay: frames[i].delay });
      if (onProgress) onProgress((i + 1) / frames.length);
      await tick();
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  }

  /* ------------------------------------------------------------ PNG: zarf üstte, mektup altta */
  async function makePng(f, emojis) {
    const W = 480, P = await prepare(f, emojis, 2), S = P.S, geo = geometry(P, W);
    const eh = 300 * HR, Hc = 30 + eh + 26 + geo.Lh + 40, cv = canvasOf(W, Hc, S), ctx = cv.getContext('2d');
    ctx.save(); ctx.scale(S, S); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, Hc);
    drawEnvelope(ctx, P, (W - 300) / 2, 30, 300, { flap: 1, alpha: 1 });
    ctx.shadowColor = 'rgba(60,30,30,.2)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.drawImage(P.letter, geo.fx, 30 + eh + 26, geo.Lw, geo.Lh); ctx.restore();
    return toBlob(cv, 'image/png');
  }

  /* ------------------------------------------------------------ PDF: kapalı zarf → açık zarf → mektup */
  function caption(ctx, W, Hc, text, small) {
    ctx.save(); ctx.scale(1, 1); ctx.textAlign = 'center'; ctx.fillStyle = '#7a5a5f'; ctx.font = '600 20px Georgia, serif'; ctx.fillText(text, W / 2, Hc - 64);
    ctx.fillStyle = '#a58c8c'; ctx.font = '14px system-ui, Arial, sans-serif'; ctx.fillText(small, W / 2, Hc - 36); ctx.restore();
  }
  async function makePdf(f, emojis) {
    const W = 480, P = await prepare(f, emojis, 2), S = P.S, geo = geometry(P, W), parts = makeParticles(P, 34);
    const from = f.from.trim() || 'Biri';
    const pages = [];
    const page = async (Hc, k, cap, small) => {
      const cv = canvasOf(W, Hc, S), ctx = cv.getContext('2d');
      drawFrame(ctx, P, W, Hc, k, geo, parts);
      if (cap) { ctx.save(); ctx.scale(S, S); caption(ctx, W, Hc, cap, small); ctx.restore(); }
      const jpg = new Uint8Array(await (await toBlob(cv, 'image/jpeg', 0.92)).arrayBuffer());
      pages.push({ jpg, w: W, h: Hc, pw: cv.width, ph: cv.height });
    };
    await page(480, { flap: 1 }, `💌 ${from} sana bir mektup gönderdi`, 'Zarfı açmak için sonraki sayfaya geç →');
    await page(480, { flap: -1, rise: 1, tau: 0.35 }, 'Zarf açıldı…', 'Mektup bir sonraki sayfada →');
    await page(Math.max(300, geo.Lh + 60), { flap: -1, rise: 1, grow: 1, tau: 0 });
    return pdfFromJpegs(pages);
  }
  function pdfFromJpegs(pages) {
    const enc = new TextEncoder(), parts = []; let len = 0; const offs = [];
    const put = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const n = pages.length, objCount = 2 + n * 3;       // 1 katalog, 2 sayfalar, her sayfa için 3 nesne
    put('%PDF-1.4\n');
    offs[1] = len; put('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offs[2] = len; put(`2 0 obj\n<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>\nendobj\n`);
    pages.forEach((p, i) => {
      const pg = 3 + i * 3, im = pg + 1, ct = pg + 2, content = `q ${p.w} 0 0 ${p.h} 0 0 cm /Im0 Do Q`;
      offs[pg] = len; put(`${pg} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>\nendobj\n`);
      offs[im] = len; put(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`); put(p.jpg); put('\nendstream\nendobj\n');
      offs[ct] = len; put(`${ct} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    });
    const xref = len;
    let x = `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objCount; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    put(x + `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  window.EXPORT = { measure, GIF_MAX_H, buildHtml, makeGif, makePdf, makePng, letterEl, drawFrame, prepare };
})();
