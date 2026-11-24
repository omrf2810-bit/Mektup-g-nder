/* Mektup Gönder: ek içerik (zarflar, kâğıtlar, yazı tipleri, emojiler, şablonlar, efektler) ve mektup kâğıdı CSS'i.
   Hem uygulamada hem dışarı verilen dosyalarda (açılan zarf HTML'i) aynı tanımlar kullanılır. */
(function () {
  'use strict';
  const C = window.CONFIG;
  const VERSION = '202611240447';

  /* ---- zarflar: mevcut 9 + yenileri */
  C.ENVELOPES.push(
    { id: 'visne',    name: 'Vişne',          back: '#7b1f3a', front: '#a12b4f', flap: '#8e2444', accent: '#f1c27d', pattern: 'diamonds' },
    { id: 'okyanus',  name: 'Okyanus',        back: '#1d6a8a', front: '#3c9bbd', flap: '#2c84a6', accent: '#f6e7b4', pattern: 'waves' },
    { id: 'kiraz',    name: 'Kiraz Çiçeği',   back: '#f3b6c8', front: '#fde3ec', flap: '#f7c9d8', accent: '#c2455f', pattern: 'flowers' },
    { id: 'orman',    name: 'Orman',          back: '#2f5d46', front: '#4a8466', flap: '#3b7156', accent: '#f0d98a', pattern: 'dots' },
    { id: 'seker',    name: 'Pamuk Şeker',    back: '#f7a8d6', front: '#ffd3ec', flap: '#fbbde0', accent: '#7a3b8f', pattern: 'sparks' },
    { id: 'bulut',    name: 'Bulut',          back: '#b9d4ea', front: '#e8f3fb', flap: '#cfe3f3', accent: '#5c86b6', pattern: 'clouds' },
    { id: 'murdum',   name: 'Mürdüm',         back: '#5b3a78', front: '#7d5aa0', flap: '#6b4a8c', accent: '#f4d58d', pattern: 'diamonds' },
    { id: 'siyah',    name: 'Siyah Altın',    back: '#17171c', front: '#26262e', flap: '#1f1f26', accent: '#d9b25a', pattern: 'stripes' },
    { id: 'turkuaz',  name: 'Turkuaz',        back: '#2fa7a0', front: '#6fd0c9', flap: '#4dbcb5', accent: '#134e4a', pattern: 'waves' },
    { id: 'beyaz',    name: 'Düğün Beyazı',   back: '#f1ece4', front: '#fffdf8', flap: '#f7f2ea', accent: '#b99a5b', pattern: 'flowers' },
    { id: 'noel',     name: 'Kırmızı Kış',    back: '#a8262b', front: '#c8453f', flap: '#b5322f', accent: '#f5e6a8', pattern: 'snow' },
    { id: 'sonbahar', name: 'Sonbahar',       back: '#b4602c', front: '#d68a4c', flap: '#c47638', accent: '#5a2d0c', pattern: 'diamonds' },
    { id: 'seftali',  name: 'Şeftali',        back: '#f2a27d', front: '#fdd0b6', flap: '#f7b995', accent: '#9a3f1f', pattern: 'sparks' }
  );
  C.SEALS = C.SEALS.concat(['💖', '🎀', '🧿', '🌸', '🐚', '🪻', '🎁', '🍓', '☕', '🧸', '🦢', '🌈']);

  /* ---- kâğıtlar. bg/fg/hd(başlık)/mu(tarih), img: arka plan deseni */
  const tile = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const PAPERS = [
    { id: 'krem',     name: 'Krem',        bg: '#fffdf7', fg: '#3b2a2a', hd: '#7a2e45', mu: '#8a6f6f' },
    { id: 'cizgili',  name: 'Çizgili',     bg: '#fffdf7', fg: '#3b2a2a', hd: '#7a2e45', mu: '#8a6f6f', img: 'repeating-linear-gradient(transparent 0 29px, #c9dcee 29px 30px)', pos: '0 16px' },
    { id: 'kareli',   name: 'Kareli',      bg: '#fffdf7', fg: '#3b2a2a', hd: '#7a2e45', mu: '#8a6f6f', img: 'linear-gradient(#d7e4f0 1px, transparent 1px), linear-gradient(90deg, #d7e4f0 1px, transparent 1px)', size: '22px 22px' },
    { id: 'pembe',    name: 'Pembe',       bg: '#fff0f4', fg: '#3b2a2a', hd: '#a12b4f', mu: '#9b7480' },
    { id: 'gece',     name: 'Gece',        bg: '#1f2540', fg: '#f1e9d2', hd: '#f0d98a', mu: '#aab0cf' },
    { id: 'eski',     name: 'Eski kâğıt',  bg: '#f1e2bf', fg: '#4a3720', hd: '#7a4b1a', mu: '#8d7550', img: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.35), rgba(120,80,20,.18) 100%)' },
    { id: 'nane',     name: 'Nane',        bg: '#eefaf3', fg: '#22403a', hd: '#2f6b56', mu: '#6f8f84' },
    { id: 'lavanta',  name: 'Lavanta',     bg: '#f4eefc', fg: '#33274d', hd: '#5b3f8f', mu: '#8a7ea6' },
    { id: 'kalpli',   name: 'Kalpli',      bg: '#fff3f6', fg: '#4a2530', hd: '#b53a5c', mu: '#a07a86', img: tile("<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><path d='M22 33C10 24 12 14 18 14c2.6 0 3.6 1.6 4 2.8.4-1.2 1.4-2.8 4-2.8 6 0 8 10-4 19z' fill='#e48aa3' fill-opacity='.22'/></svg>") },
    { id: 'yildizli', name: 'Yıldızlı',    bg: '#1b2342', fg: '#f4ecdc', hd: '#f6d77b', mu: '#a9b0d0', img: tile("<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46'><path d='M12 6l1.2 3.6 3.8.1-3 2.4 1.1 3.7L12 13.6 8.9 15.8 10 12.1 7 9.7l3.8-.1z' fill='#f6d77b' fill-opacity='.3'/><circle cx='34' cy='30' r='1.3' fill='#f6d77b' fill-opacity='.35'/></svg>") },
    { id: 'gunbatimi', name: 'Gün batımı', bg: '#ffe9d6', fg: '#4a2a1c', hd: '#b04a24', mu: '#9a7a66', img: 'linear-gradient(180deg, #fff4e6 0%, #ffe0c4 55%, #ffc9a3 100%)' },
    { id: 'kar',      name: 'Kar',         bg: '#f3f8fd', fg: '#26384d', hd: '#4a6fa5', mu: '#7d92ab', img: tile("<svg xmlns='http://www.w3.org/2000/svg' width='38' height='38'><circle cx='9' cy='10' r='1.4' fill='#9fbbd8' fill-opacity='.45'/><circle cx='27' cy='24' r='1.8' fill='#9fbbd8' fill-opacity='.4'/></svg>") },
    { id: 'siyah',    name: 'Siyah',       bg: '#17171c', fg: '#ece6d6', hd: '#e0bb62', mu: '#9a968a' }
  ];
  C.PAPERS = PAPERS.map((p) => ({ id: p.id, name: p.name }));

  /* ---- yazı tipleri */
  const FONTS = [
    { id: 'klasik',  name: 'Klasik',     css: "Georgia, 'Times New Roman', serif", fs: 1 },
    { id: 'el',      name: 'El yazısı',  css: "'Caveat', 'Segoe Script', 'Bradley Hand', cursive", fs: 1.3, lh: 1.45, needsFont: true },
    { id: 'daktilo', name: 'Daktilo',    css: "'Courier New', Courier, monospace", fs: .9 },
    { id: 'sade',    name: 'Sade',       css: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif", fs: .95 }
  ];

  /* ---- açılış efektleri (zarf açılınca yağan şeyler) */
  const EFFECTS = [
    { id: 'kalp',    name: 'Kalp yağmuru', icon: '💕', list: ['❤️', '💕', '💖', '💗', '💘'] },
    { id: 'konfeti', name: 'Konfeti',      icon: '🎉', list: null },
    { id: 'yildiz',  name: 'Yıldızlar',    icon: '✨', list: ['⭐', '✨', '🌟', '💫'] },
    { id: 'cicek',   name: 'Çiçekler',     icon: '🌸', list: ['🌸', '🌷', '🌹', '🌼', '🌺'] },
    { id: 'kelebek', name: 'Kelebekler',   icon: '🦋', list: ['🦋', '🦋', '✨'] },
    { id: 'kar',     name: 'Kar',          icon: '❄️', list: ['❄️', '❅', '❆'] },
    { id: 'yok',     name: 'Efektsiz',     icon: '🚫', list: [] }
  ];

  /* ---- emoji sekmeleri */
  const EMOJI_CATS = [
    { id: 'ask',     name: '❤️ Aşk',     list: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💌', '💋', '🫶', '💍', '🌹', '😍', '🥰', '😘', '💑'] },
    { id: 'yuz',     name: '😊 Yüzler',  list: ['😊', '😁', '😂', '🤣', '🥹', '😭', '😴', '🤗', '😎', '🤩', '😇', '😉', '🙈', '🥺', '😋', '🤭', '😅', '🙃', '🫠', '😌', '🤤', '😏', '🫣', '😳'] },
    { id: 'doga',    name: '🌸 Doğa',    list: ['🌸', '🌷', '🌻', '🌼', '🍀', '🌿', '🌙', '⭐', '🌟', '✨', '☀️', '🌈', '☁️', '❄️', '🔥', '🌊', '🍂', '🍁', '🌺', '🪻', '🦋', '🐝', '⛅', '🌄'] },
    { id: 'yemek',   name: '☕ Yiyecek', list: ['☕', '🍫', '🍰', '🧁', '🍓', '🍒', '🍕', '🍔', '🍿', '🍷', '🥂', '🍦', '🍩', '🥐', '🍉', '🍑', '🍯', '🧋', '🍪', '🥞'] },
    { id: 'kutlama', name: '🎁 Kutlama', list: ['🎁', '🎉', '🎊', '🎂', '🎈', '🎀', '🕯️', '🥳', '🪩', '🎵', '🎶', '🎬', '📸', '🏖️', '✈️', '🏡', '🚗', '🗺️', '🎡', '🏔️'] },
    { id: 'hayvan',  name: '🐻 Hayvan',  list: ['🐻', '🧸', '🐱', '🐶', '🐰', '🦊', '🐼', '🐨', '🐧', '🦄', '🐥', '🐢', '🦢', '🕊️', '🐬', '🐞', '🦦', '🐿️'] },
    { id: 'ayrac',   name: '✦ Ayraç',    list: ['❀ ━━━━ ❀', '· · · ♡ · · ·', '✦ ✧ ✦', '— ♥ —', '🌹 ⸻ 🌹', '✿ ✿ ✿', '♡ ～～～ ♡', '꒰ ♡ ꒱'], wide: true }
  ];

  /* ---- hazır mektup şablonları */
  const TEMPLATES = [
    { name: '☀️ Günaydın', title: 'Günaydın aşkım', body: 'Günaydın canım!\n\nUyandığımda aklıma gelen ilk şey sen oldun. Bugün her şey yolunda gidecek, çünkü biliyorum ki sen varsın.\n\nKahveni al, gülümse; ben de uzaktan sana sarılıyorum. ☕❤️' },
    { name: '🥹 Seni özledim', title: 'Seni özledim', body: 'Canım,\n\nBugün seni çok özledim. Sesini, kahkahanı, bana bakışını… Hepsini.\n\nGörüşene kadar bu mektubu cebinde taşı; ne zaman özlesen aç ve oku. Seni çok seviyorum. 🫶' },
    { name: '💍 Yıldönümü', title: 'Yıldönümümüz kutlu olsun', body: 'Sevgilim,\n\nBir yıl daha geçti ve ben seni ilk günkü kadar, hatta daha çok seviyorum.\n\nBirlikte güldüğümüz, birlikte büyüdüğümüz her an için teşekkür ederim. Daha nice yıllara, seninle. 💕\n\nHep senin' },
    { name: '🎂 Doğum günü', title: 'Doğum günün kutlu olsun!', body: 'Canım,\n\nDoğum günün kutlu olsun! 🎂🎉\n\nBu yıl sana sağlık, huzur ve içinden geçen her şeyin gerçek olmasını diliyorum. Seni tanıdığım için ne kadar şanslı olduğumu bilmeni isterim.\n\nSeni çok seviyorum! 🎁' },
    { name: '🎆 Yeni yıl', title: 'Yeni yıl dileklerim', body: 'Sevgilim,\n\nYeni yıl sana ve bize güzel şeyler getirsin. Daha çok kahkaha, daha çok yolculuk, daha çok birlikte geçen akşamlar…\n\nBu yıl için bir sözüm var: Seni her gün biraz daha mutlu etmeye çalışacağım. ✨' },
    { name: '🙏 Özür dilerim', title: 'Özür dilerim', body: 'Canım,\n\nSeni üzdüğüm için çok özür dilerim. Söylediklerimi ve yaptıklarımı düşündüm; haklı olduğun yerler var.\n\nSeni kırmak asla istemem. Bana bir şans verirsen daha dikkatli olacağım. Seni seviyorum. 🌹' },
    { name: '🌷 Teşekkür ederim', title: 'İyi ki varsın', body: 'Sevgilim,\n\nBana gösterdiğin sabır, verdiğin destek ve her gün hissettirdiğin sevgi için teşekkür ederim.\n\nSeninle olmak hayatımın en güzel kararı. İyi ki varsın. 💌' },
    { name: '💘 Sevgililer Günü', title: 'Sevgililer Günü', body: 'Aşkım,\n\nBugün sadece takvimde değil, her günüm Sevgililer Günü, çünkü sen varsın.\n\nSana ne kadar değer verdiğimi kelimelere sığdıramam ama bu mektup bir başlangıç olsun. Seni çok seviyorum! 💘🌹' },
    { name: '✈️ Uzaktayken', title: 'Aramızdaki mesafe', body: 'Canım,\n\nAramızda kilometreler olsa da aklım hep sende. Her gün sana biraz daha yaklaşıyorum, kavuşacağımız günü sayıyorum.\n\nO güne kadar kalbim yanında. Sakın üzülme, çok yakında sarılacağız. 💞' },
    { name: '🌙 İyi geceler', title: 'İyi geceler', body: 'Güzelim,\n\nGün bitti, yıldızlar çıktı. Bugün için kendine teşekkür et, yarına güzel bir gülümsemeyle uyan.\n\nTatlı rüyalar. Rüyanda ben de olayım. 🌙✨' }
  ];

  /* ---- mektup kâğıdı CSS'i (uygulama + dışarı verilen dosyalar) */
  function letterCSS() {
    let css = `.lt{--bg:#fffdf7;--fg:#3b2a2a;--hd:#7a2e45;--mu:#8a6f6f;--fs:1;--lh:1.75;--ff:Georgia,serif;box-sizing:border-box;position:relative;background-color:var(--bg);color:var(--fg);border-radius:14px;padding:26px 24px 24px;font-family:var(--ff);font-size:calc(17px*var(--fs));line-height:var(--lh);border:1px solid rgba(0,0,0,.07);box-shadow:0 6px 22px rgba(60,30,30,.14);text-align:left;overflow-wrap:anywhere}
.lt .d{font:13px/1.3 system-ui,Arial,sans-serif;color:var(--mu);margin-bottom:8px}
.lt h2{font-family:var(--ff);font-weight:700;font-size:1.3em;line-height:1.3;margin:0 0 12px;color:var(--hd)}
.lt .b{white-space:pre-wrap}
.lt .f{text-align:right;margin-top:16px;font-size:1.1em}
.lt .sticker{display:inline-block;width:1.45em;height:1.45em;vertical-align:-.32em}
.lt .sticker svg{width:100%;height:100%;display:block}
`;
    for (const p of PAPERS) {
      css += `.lt[data-p=${p.id}]{--bg:${p.bg};--fg:${p.fg};--hd:${p.hd};--mu:${p.mu};${p.img ? `background-image:${p.img};` : ''}${p.size ? `background-size:${p.size};` : ''}${p.pos ? `background-position:${p.pos};` : ''}}\n`;
    }
    for (const f of FONTS) css += `.lt[data-ff=${f.id}]{--ff:${f.css};--fs:${f.fs};${f.lh ? `--lh:${f.lh};` : ''}}\n`;
    return css;
  }
  const style = document.createElement('style');
  const FONT_FACE_CSS = `
@font-face{font-family:'Caveat';font-weight:500;font-display:swap;src:url(fonts/caveat-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Caveat';font-weight:500;font-display:swap;src:url(fonts/caveat-latin-ext-500-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Caveat';font-weight:700;font-display:swap;src:url(fonts/caveat-latin-700-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Caveat';font-weight:700;font-display:swap;src:url(fonts/caveat-latin-ext-700-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}`;
  style.textContent = letterCSS() + FONT_FACE_CSS;
  document.head.append(style);

  window.EXTRA = { VERSION, PAPERS, FONTS, EFFECTS, EMOJI_CATS, TEMPLATES, letterCSS, FONT_FACE_CSS };
})();
