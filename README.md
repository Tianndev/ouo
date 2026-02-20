# OUO.IO Bypass Tool

Alat ini mengotomatiskan proses bypass tautan OUO.IO, dirancang untuk tujuan pengujian dan simulasi traffic. Fitur utamanya mencakup dukungan rotasi proxy SOCKS, pemrosesan konkuren multi-worker, dan otomatisasi browser menggunakan Puppeteer dengan mode stealth.

## Fitur

- **Bypass Otomatis**: Menangani seluruh alur navigasi tautan OUO.IO secara otomatis.
- **Dukungan Proxy**: Secara otomatis mengambil dan menggunakan proxy SOCKS4/5 dari sumber publik.
- **Pemrosesan Konkuren**: Mendukung eksekusi multi-worker untuk memproses banyak URL secara bersamaan.
- **Kemampuan Stealth**: Mengimplementasikan berbagai teknik untuk menghindari mekanisme deteksi bot.
- **Pemblokiran Iklan**: Memblokir request dari domain iklan untuk mempercepat navigasi.
- **Operasi Headless**: Berjalan di latar belakang tanpa antarmuka browser untuk efisiensi.
- **URL Acak**: Mengacak urutan URL sebelum diproses agar lebih natural.

![Preview Tools](data/image.png)

## Prasyarat

Pastikan perangkat lunak berikut terinstal di sistem Anda sebelum melanjutkan:

- **Node.js**: Versi 16.0.0 atau lebih tinggi.
- **NPM**: Node Package Manager (biasanya disertakan dengan Node.js).
- **Git**: Untuk mengkloning repositori.
- **Koneksi Internet Stabil**: Diperlukan untuk pengambilan proxy dan navigasi.

## Instalasi

Ikuti langkah-langkah ini untuk menyiapkan proyek secara lokal:

1. **Clone Repositori**

    ```bash
    git clone https://github.com/Tianndev/uou.git
    cd uou
    ```

2. **Instal Dependensi**

    Instal paket Node.js yang diperlukan dengan menjalankan:

    ```bash
    npm install
    ```

    Perintah ini akan menginstal Puppeteer, stealth plugin, axios, chalk, dan pustaka lain yang didefinisikan dalam `package.json`.

## Konfigurasi

### URL Target

Buat file bernama `ouo.txt` di dalam direktori `data`. Tambahkan URL OUO.IO target, satu per baris. Jika direktori tidak ada, buat terlebih dahulu.

**Jalur File:** `data/ouo.txt`

**Contoh Konten:**
```text
https://ouo.io/contoh1
https://ouo.io/contoh2
https://ouo.io/contoh3
```

### Pengaturan Lanjutan

Anda dapat menyesuaikan parameter operasional dengan memodifikasi objek `CONFIG` di dalam file `main.js`:

```javascript
const CONFIG = {
    useProxy: true,       // Set ke false untuk menonaktifkan penggunaan proxy
    ouoFile: 'data/ouo.txt', // Lokasi file URL input
    headless: 'new',      // 'new' untuk mode headless, false untuk browser terlihat
    timeout: 50000,       // Waktu maksimum (ms) menunggu operasi
    consecutiveFailureThreshold: 2, // Batas kegagalan berturut-turut
    concurrency: 5,       // Jumlah worker browser konkuren
};
```

## Penggunaan

Untuk memulai proses bypass, jalankan perintah berikut di terminal Anda:

```bash
npm run ouo
```

Aplikasi akan menginisialisasi, mengambil proxy SOCKS yang tersedia, mengacak daftar URL, dan mulai memproses URL yang terdaftar di `data/ouo.txt`. Kemajuan dan status akan ditampilkan di konsol.

## Penafian

Perangkat lunak ini disediakan hanya untuk tujuan pendidikan dan pengujian. Penulis tidak bertanggung jawab atas penyalahgunaan alat ini atau atas konsekuensi apa pun yang diakibatkan oleh penggunaannya. Pengguna bertanggung jawab penuh untuk memastikan tindakan mereka mematuhi semua hukum dan ketentuan layanan yang berlaku.

## Lisensi

Hak Cipta © 2026 **Dakila Universe**. Semua Hak Dilindungi.

Penyalinan, modifikasi, distribusi, atau penggunaan perangkat lunak ini secara tidak sah sangat dilarang tanpa izin tertulis dari pemegang hak cipta.