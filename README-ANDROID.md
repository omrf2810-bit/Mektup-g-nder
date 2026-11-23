# 💌 Mektup Gönder

Mektubunu yaz, zarfını ve emojilerini seç, e-posta olarak gönder. **Hesap, sunucu ve eşleşme yok**; hiçbir şey saklanmaz (taslak ve emojiler yalnızca kendi telefonunda durur).

## 1) Yayınla (GitHub Pages, ücretsiz, ~5 dk)
1. github.com'da yeni bir depo aç (örn. `mektup`, **Public** olmalı: ücretsiz Pages bunu ister).
2. Bu klasörün **içindekileri** (index.html, app.js, style.css... hepsini) depoya sürükleyip **Commit changes** de.
3. Depoda **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save**.
4. 1–2 dakika sonra adres hazır: `https://KULLANICI-ADIN.github.io/mektup/`

> Depo herkese açık olur ama içinde senin mektubun yok, sadece uygulama kodu var. Mektuplar hiçbir yere kaydedilmez.

## 2) Android'e uygulama olarak ekle
Telefonda **Chrome** ile adresi aç → ⋮ menüsü → **Uygulamayı yükle** (veya **Ana ekrana ekle**). Ana ekranda zarf simgesi çıkar, tam ekran açılır.

## 3) E-posta gönderme: iki yol
**A) Hemen, ayarsız: "✉️ Mail uygulamamda aç".** Gmail (veya telefondaki mail uygulaması) alıcı, konu ve mektup metniyle açılır; sen **Gönder**'e basarsın. İstersen Gmail'de Gönder düğmesinin yanındaki ⋮ → **Gönderimi zamanla** ile ileri bir tarihe ayarlayabilirsin. Bu yolda zarf ve kâğıt görünümü e-postaya taşınmaz, düz metin gider.

**B) Uygulama kendisi göndersin: "📨 Gönder".** Güzel görünümlü (HTML) e-posta gider. Tek seferlik ücretsiz kurulum gerekir (ayda 200 e-posta):
1. emailjs.com'da ücretsiz hesap aç.
2. **Email Services → Add New Service → Gmail**'i seç ve Google hesabını bağla. Çıkan **Service ID**'yi not al.
3. **Email Templates → Create New Template**:
   - **To Email**: `{{to_email}}`
   - **Subject**: `{{subject}}`
   - **Content** (HTML düzenleyiciye geçip kaynak kodu aç): `{{{message_html}}}` (üç süslü parantez)
   - Kaydet; **Template ID**'yi not al.
4. **Account → General** sayfasından **Public Key**'i kopyala.
5. Uygulamada sağ üstteki ⚙️'ye bas ve üç değeri yapıştırıp **Kaydet** de.

E-posta senin Gmail adresinden gider. Ayarlar yalnızca o telefonun tarayıcısında saklanır.

## Sınırlar (dürüstçe)
- Gönderim **hemen** olur; uygulama içinde "şu tarihte gönder" yok (sunucu olmadığı için). Zamanlamak için yol A'daki Gmail "Gönderimi zamanla"yı kullan.
- Mektupların bir yerde saklanmaz; gönderdikten sonra uygulamada kayıt tutulmaz. Gönderdiklerin Gmail'de "Gönderilmiş" klasöründe durur.
- Yol B EmailJS'in ücretsiz planına bağlıdır (aylık 200 e-posta, e-posta başına küçük boyut sınırı). Çok uzun mektuplar için yol A daha güvenlidir.
