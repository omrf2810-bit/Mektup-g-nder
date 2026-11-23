/* Hem sunucu (require) hem tarayıcı (window.CONFIG) tarafından kullanılan ortak ayarlar. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    MONTHS: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],

    // pattern: none | dots | hearts | stars | stripes
    ENVELOPES: [
      { id: 'klasik',    name: 'Krem Klasik',  back: '#e9d8bb', front: '#f6ead3', flap: '#efdfc3', accent: '#b88a44', pattern: 'none' },
      { id: 'gul',       name: 'Gül',          back: '#d98a9d', front: '#f0b3c1', flap: '#e79bad', accent: '#8e2c47', pattern: 'hearts' },
      { id: 'gece',      name: 'Gece Mavisi',  back: '#22304f', front: '#33466f', flap: '#2a3b60', accent: '#e5c46b', pattern: 'stars' },
      { id: 'altin',     name: 'Altın',        back: '#c9a049', front: '#e6c372', flap: '#d9b25a', accent: '#6b4a12', pattern: 'dots' },
      { id: 'kraft',     name: 'Kraft',        back: '#a07650', front: '#c09768', flap: '#b08659', accent: '#5a3d1f', pattern: 'stripes' },
      { id: 'nane',      name: 'Nane',         back: '#8fc4ae', front: '#bde3d1', flap: '#a4d2bf', accent: '#2f6b56', pattern: 'dots' },
      { id: 'lavanta',   name: 'Lavanta',      back: '#a994d1', front: '#d3c4ee', flap: '#bba9e0', accent: '#5b3f8f', pattern: 'stars' },
      { id: 'gunbatimi', name: 'Gün Batımı',   back: '#e58a52', front: '#f7b784', flap: '#f0a06a', accent: '#8a2f1b', pattern: 'stripes' },
      { id: 'kar',       name: 'Kar',          back: '#c9dbec', front: '#f1f7fc', flap: '#dce9f5', accent: '#4a6fa5', pattern: 'stars' }
    ],

    PAPERS: [
      { id: 'krem', name: 'Krem' },
      { id: 'cizgili', name: 'Çizgili' },
      { id: 'kareli', name: 'Kareli' },
      { id: 'pembe', name: 'Pembe' },
      { id: 'gece', name: 'Gece' }
    ],

    SEALS: ['❤️', '🌹', '⭐', '🌙', '🕊️', '🍀', '🔥', '🦋', '🌻', '💍', '🫶', '✨'],
    REACTIONS: ['❤️', '🥹', '😂', '😍', '🥰', '🫶', '😘', '🔥'],
    QUICK_EMOJIS: ['❤️', '💕', '💌', '😍', '🥰', '😘', '🥹', '😂', '🤗', '😊', '😴', '🌹', '🌙', '⭐', '✨', '🔥', '🎁', '🍫', '☕', '🏖️', '🌸', '🫶', '💍', '🐻'],

    EMOJI: {
      ranges: { tone: 12, face: 5, eyes: 12, mouth: 12, brows: 6, acc: 10, extra: 6, bg: 8 },
      // Mektup e-postayla gittiğinde özel emojinin yerine geçen Unicode karşılığı (ağıza göre)
      fallbacks: ['😊', '😁', '😏', '😮', '😐', '😘', '😛', '😢', '😂', '😺', '😬', '😗']
    },

    LIMITS: { title: 120, body: 8000, name: 60 },

    // Ayın ilham soruları (Ocak = 0)
    PROMPTS: [
      'Yeni yıl için birlikte hayal ettiğin üç şeyi yaz.',
      'Seni sevdiğimi fark ettiğim an…',
      'Bana bahar gibi hissettiren bir anımız.',
      'Seninle yapmak istediğim küçük bir kaçamak.',
      'Sana teşekkür etmek istediğim bir şey.',
      'Yaz için hayalim: seninle…',
      'Seni en çok güldüren anımızı anlat.',
      'Birlikte gittiğimiz yerlerden en sevdiğin hangisi ve neden?',
      'Sonbahara girerken sana minnet duyduğum şeyler.',
      'Seni ilk gördüğüm günü anlat.',
      'Bu yıl seninle öğrendiğim bir şey.',
      'Gelecek yıla bırakmak istediğim bir söz.'
    ]
  };
});
