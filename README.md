# Bütçe Kontrol Uygulaması

Kişisel bütçe ve günlük harcama takip uygulaması. React + Vite + Tailwind CSS ile geliştirildi.

## Özellikler

- Aylık maaş ve maaş günü girişi
- Opsiyonel yatırım bütçesi (yüzde veya sabit tutar)
- Otomatik günlük harcama limiti hesaplama
- Kategorili harcama girişi (Yemek, Alışveriş, Ulaşım, Fatura, Sağlık, Eğlence, Diğer)
- Günlük bilanço ve kategori dağılımı raporu
- Önceki günden tasarruf/aşım otomatik devir

## Yerel Kurulum

```bash
npm install
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır.

## Production Build

```bash
npm run build
```

Çıktı `dist/` klasörüne yazılır.

---

## Deploy Etme

### Vercel (Önerilen — En kolay)

**Yöntem 1: GitHub üzerinden (önerilen)**

1. Bu projeyi GitHub'a push et
2. [vercel.com](https://vercel.com) adresine git, GitHub ile giriş yap
3. "Add New Project" → repo'nu seç → "Deploy"
4. Vercel otomatik olarak Vite'ı algılar, ek ayar gerekmez
5. ~30 saniye sonra `proje-adi.vercel.app` adresinde yayında olur

**Yöntem 2: CLI ile (GitHub gerekmez)**

```bash
npm install -g vercel
vercel
```

Sorulara `Enter` ile cevap verip deploy edebilirsin.

---

### Netlify

**Yöntem 1: Sürükle-bırak**

1. `npm run build` çalıştır
2. [app.netlify.com/drop](https://app.netlify.com/drop) adresine git
3. `dist/` klasörünü tarayıcıya sürükle-bırak
4. Anında yayında

**Yöntem 2: GitHub üzerinden**

1. Projeyi GitHub'a push et
2. [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project"
3. Repo'yu seç
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy

---

## Proje Yapısı

```
budget-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Ana uygulama
│   ├── main.jsx         # React giriş noktası
│   └── index.css        # Tailwind direktifleri
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```
