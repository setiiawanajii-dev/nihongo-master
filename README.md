# Nihongo Master — 日本語マスター

Aplikasi web untuk belajar bahasa Jepang melalui kosakata, grammar, flashcard, quiz, dan pengulangan terjadwal. Pengguna dapat menyusun materi sendiri melalui input manual atau impor JSON/CSV, kemudian memantau perkembangan belajarnya.

Antarmuka menggunakan bahasa Indonesia dengan istilah Jepang, mendukung layar ponsel dan desktop, serta menyediakan mode terang dan gelap.

**Versi dalam aplikasi:** `0.14.0` · **Dokumentasi diperbarui:** 2 Oktober 2026

## Mulai dari sini

- **Pengguna:** buka menu **Panduan** di aplikasi untuk mempelajari alur belajar.
- **Menjalankan proyek:** ikuti bagian [Instalasi](#instalasi).
- **Menambahkan materi:** lihat [Impor dan ekspor](#impor-dan-ekspor).
- **Memperbarui website:** lihat [Deployment ke Vercel](#deployment-ke-vercel).

Instalasi baru dimulai dengan **koleksi kosong**. Materi demo tidak otomatis dimasukkan ke database pengguna.

## Fitur

| Bagian | Kegunaan |
| --- | --- |
| Dashboard | Rekomendasi belajar, review jatuh tempo, materi lemah, aktivitas, streak, dan perjalanan JLPT berdasarkan data tersimpan. |
| Vocabulary | Tambah, edit, hapus, cari, filter level/kategori/status, urutkan, tandai favorit, dan lihat detail kosakata. Daftar dibagi per halaman. |
| Flashcard | Latihan kosakata dengan empat penilaian: belum tahu, hampir tahu, tahu, dan sangat hafal. Jawaban memperbarui progres. |
| Grammar | Pola, makna, pembentukan, penjelasan, contoh, kesalahan umum, favorit, dan pelacakan penguasaan. |
| Quiz | Vocabulary, Grammar, atau Mixed; 10, 20, 30, atau 50 soal sesuai ketersediaan. Jawaban diacak, hasil dan kesalahan disimpan. |
| Ulangi pelajaran | Review vocabulary, grammar, atau campuran dengan jadwal pengulangan berdasarkan hasil belajar. |
| Progress | Statistik penguasaan, hasil quiz, sesi dan waktu belajar, streak, grafik aktivitas, serta perjalanan N5–N2. |
| Favorit | Akses cepat ke materi pilihan pengguna. |
| Import / Export | Impor dan ekspor konten JSON/CSV, pemeriksaan kolom, serta penanganan duplikat. |
| Pengaturan | Tema, kategori, reset progres, hapus seluruh data belajar, dan informasi pembuat. |
| Saran & Bug | Menyusun laporan untuk dikirim melalui aplikasi email pengguna. |

Status penguasaan materi: `NEW`, `LEARNING`, `REVIEW`, `WEAK`, dan `MASTERED`.

## Alur belajar yang disarankan

1. Tambahkan materi manual atau impor berkas JSON/CSV.
2. Pilih level dan kategori yang ingin dipelajari.
3. Baca detail materi atau gunakan flashcard untuk mengenali kosakata.
4. Kerjakan quiz untuk menguji pemahaman. **Flashcard tidak wajib dilakukan sebelum quiz.**
5. Buka **Ulangi pelajaran** untuk materi yang sudah waktunya diulang.
6. Pantau perkembangan di Dashboard dan Progress.

Jumlah materi yang disarankan Dashboard menyesuaikan koleksi dan riwayat belajar. Rekomendasi bukan target wajib.

## Instalasi

Prasyarat: **Node.js 22.13 atau lebih baru** dan npm.

Jalankan dari folder proyek yang berisi `package.json`:

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan terminal, biasanya `http://127.0.0.1:5173`.

Untuk membuat dan memeriksa hasil produksi:

```bash
npm run build
npm run preview
```

Hasil build berada di folder `dist`.

### Konfigurasi opsional

Salin `.env.example` menjadi `.env.local` jika ingin menyesuaikan email penerima saran:

```dotenv
VITE_FEEDBACK_EMAIL=alamat-email-publik@example.com
```

Alamat bawaan sudah tersedia jika variabel ini tidak diatur. Fitur saran memakai tautan `mailto:`; aplikasi email pengguna tetap perlu mengirim pesannya. Aplikasi ini tidak memiliki layanan pengiriman email otomatis.

Variabel berawalan `VITE_` dapat terlihat pada hasil aplikasi di browser. Jangan memasukkan kata sandi atau kunci rahasia ke variabel tersebut.

## Impor dan ekspor

Buka **Import / Export**, pilih JSON atau CSV, unggah berkas atau tempel isinya, lalu tekan **Periksa impor**. Tinjau hasilnya sebelum menekan **Simpan impor**.

Contoh format tersedia di aplikasi dan folder [public/templates](public/templates). Berkas contoh tidak dimasukkan otomatis ke koleksi.

### Kolom materi

| Jenis | Kolom wajib | Kolom tambahan yang umum |
| --- | --- | --- |
| Vocabulary | `kanji`, `kana`, `meaning`, `level` | `category`, `romaji`, `partOfSpeech`, `examples`, `notes` |
| Grammar | `grammar`, `meaning`, `pattern`, `level` | `category`, `explanation`, `examples`, `commonMistakes`, `notes`, `quizTemplate` |

- `kanji` adalah tulisan kata Jepang; kata yang hanya memakai kana juga dapat diisi pada kolom ini.
- `grammar` adalah nama pola, sedangkan `pattern` berisi cara pembentukannya.
- Level yang diterima: `N5`, `N4`, `N3`, dan `N2`.
- `category` dapat berupa array nama kategori pada JSON atau teks dipisahkan titik koma.
- Contoh dapat menggunakan pasangan `example` dan `translation`, atau array `examples`.
- Batas impor: **10 MB dan 5.000 item** per berkas.

Contoh JSON gabungan:

```json
{
  "format": "nihongo-content",
  "version": 1,
  "vocabulary": [
    {
      "kanji": "食べる",
      "kana": "たべる",
      "meaning": "makan",
      "level": "N5",
      "category": ["Kegiatan sehari-hari"],
      "examples": [
        { "example": "パンを食べます。", "translation": "Saya makan roti." }
      ]
    }
  ],
  "grammar": [
    {
      "grammar": "～てください",
      "meaning": "tolong lakukan",
      "pattern": "Kata kerja bentuk て + ください",
      "level": "N5",
      "explanation": "Digunakan untuk meminta seseorang melakukan sesuatu.",
      "examples": [
        { "example": "名前を書いてください。", "translation": "Tolong tulis nama Anda." }
      ]
    }
  ]
}
```

### Duplikat

| Pilihan | Hasil |
| --- | --- |
| **Gabungkan / Merge** | Memperbarui materi yang cocok sambil mempertahankan ID dan progresnya. Kategori dan contoh digabung. |
| **Simpan keduanya / Keep Both** | Membuat materi terpisah dengan ID baru, tanpa menyalin progres lama. |
| **Abaikan / Ignore** | Melewati materi yang sudah ada. |

Kecocokan memakai ID ekspor, atau tulisan Jepang + kana untuk vocabulary, dan nama pola untuk grammar setelah normalisasi. Ejaan alternatif seperti `きれい` dan `綺麗` belum tentu dianggap duplikat; periksa pratinjau sebelum menyimpan.

### Paket persiapan N5

Paket terpisah yang telah disiapkan berisi **800 kosakata dan 80 unit grammar**, dengan arti bahasa Indonesia dan total 190 contoh kalimat. Paket ini tidak disertakan otomatis saat aplikasi dibuka; pengguna perlu mengimpor JSON-nya sendiri.

Paket merupakan bahan persiapan dasar, bukan daftar resmi lengkap JLPT. Kanji dipelajari melalui kosakata; aplikasi belum memiliki koleksi kanji terpisah. Tidak semua entri kosakata dilengkapi contoh kalimat.

### Ketersediaan quiz

Jenis soal mengikuti kelengkapan materi dan pilihan jawaban yang tersedia. Bank yang terlalu kecil dapat belum memenuhi jumlah soal yang dipilih.

Contoh kalimat grammar saja tidak otomatis menghasilkan soal **Fill in blank** atau **Correct sentence**. Kedua jenis ini menggunakan `quizTemplate` yang diperiksa melalui bagian **Soal grammar tervalidasi** pada editor grammar. Tandai tervalidasi hanya setelah memeriksa kalimat, jawaban, dan pengecohnya.

## Penyimpanan dan privasi data belajar

Materi, progres, favorit, jadwal review, dan riwayat belajar disimpan di **IndexedDB pada browser pengguna**. Preferensi tema dan draf saran menggunakan penyimpanan lokal browser.

- Refresh halaman tidak menghapus data yang berhasil disimpan.
- Data terpisah menurut browser, profil, perangkat, dan alamat situs. Data di localhost tidak otomatis muncul di domain Vercel.
- Belum ada akun, login, atau sinkronisasi lintas perangkat.
- Menghapus data situs/browser dapat menghapus koleksi dan progres.
- Ekspor JSON/CSV mencakup **konten, kategori terkait, dan contoh**, bukan progres, favorit, atau riwayat quiz. Ini **bukan cadangan lengkap aplikasi**.

Integrasi Vercel Web Analytics digunakan pada build produksi untuk statistik kunjungan. Statistik pengunjung ini berbeda dari progres belajar pribadi yang tersimpan di browser.

### Reset progres dan hapus data

| Tindakan | Yang dihapus | Yang dipertahankan |
| --- | --- | --- |
| Reset progres belajar | Bukti penguasaan, jadwal review, riwayat quiz, dan sesi belajar. | Materi, contoh, kategori, favorit, serta catatan pribadi pada progres. |
| Hapus seluruh data belajar | Seluruh materi, contoh, kategori, favorit, progres, dan riwayat belajar. | Penanda internal migrasi; preferensi browser seperti tema tidak ikut dihapus oleh perintah database ini. |

Keduanya memerlukan konfirmasi dan menampilkan pemberitahuan setelah berhasil. Penghapusan seluruh data memerlukan teks **HAPUS SEMUA**. Tidak perlu melakukan reset untuk memasang pembaruan aplikasi.

## Halaman aplikasi

| Alamat | Halaman |
| --- | --- |
| `/dashboard` | Dashboard |
| `/vocabulary` | Daftar vocabulary |
| `/vocabulary/:id` | Detail vocabulary |
| `/vocabulary/flashcards` | Flashcard vocabulary |
| `/grammar` | Daftar grammar |
| `/grammar/:id` | Detail grammar |
| `/quiz` | Pengaturan dan sesi quiz |
| `/quiz/result` | Hasil quiz |
| `/review` | Review terjadwal |
| `/progress` | Statistik belajar |
| `/favorites` | Materi favorit |
| `/data-transfer` | Import / Export |
| `/guide` | Panduan penggunaan |
| `/feedback` | Saran dan laporan bug |
| `/settings` | Pengaturan |

Alamat `/` mengarah ke Dashboard. Alamat lama `/materials`, `/materials/:id`, dan `/material-check` dialihkan ke Import / Export. Alamat yang tidak dikenal menampilkan halaman tidak ditemukan.

## Deployment ke Vercel

Proyek menggunakan konfigurasi berikut:

| Pengaturan | Nilai |
| --- | --- |
| Framework | Vite |
| Root Directory | Folder yang berisi `package.json` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Berkas [vercel.json](vercel.json) menyediakan pengalihan untuk routing aplikasi, sehingga membuka atau me-refresh alamat seperti `/dashboard` dapat memuat aplikasi.

Untuk pembaruan melalui GitHub:

1. Ganti berkas proyek yang diperbarui, dengan struktur folder tetap sama.
2. Commit perubahan ke branch produksi yang terhubung ke Vercel.
3. Tunggu deployment terbaru selesai dan berstatus **Ready**.
4. Buka domain produksi dan muat ulang halaman untuk memeriksa perubahan.

Jangan unggah `node_modules`, `dist`, `.git`, `.vercel`, `.openai`, atau berkas lingkungan berisi nilai pribadi seperti `.env.local`. `.env.example` boleh disertakan jika isinya hanya contoh atau konfigurasi publik. Untuk unggahan lewat web GitHub, pilih berkas secara manual; jangan mengandalkan `.gitignore` sebagai penyaring unggahan web.

## Teknologi dan struktur proyek

React, TypeScript, Vite, Tailwind CSS, React Router, IndexedDB, Lucide, Vercel Web Analytics, dan Playwright.

```text
nihongo-master/
├── public/                 # Ikon dan contoh berkas impor
├── src/
│   ├── app/                # Routing, layout, tema, dan penyedia data
│   ├── components/         # Komponen antarmuka bersama
│   ├── data/               # Data pendukung dan contoh untuk pengujian
│   ├── domain/             # Model, aturan quiz/review, dan perhitungan statistik
│   ├── features/           # Halaman dan fitur aplikasi
│   ├── infrastructure/     # Implementasi IndexedDB, validasi, dan migrasi
│   ├── repositories/       # Kontrak akses data
│   ├── services/           # Penghubung layanan dan database
│   ├── styles/             # Gaya antarmuka
│   └── main.tsx            # Titik masuk aplikasi
├── tests/                  # Pengujian fitur dan regresi
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

Kontrak repository memisahkan penggunaan data dari implementasi IndexedDB. Backend dapat ditambahkan melalui implementasi kontrak tersebut; sinkronisasi belum tersedia saat ini.

## Pengujian

```bash
npm install
npx playwright install chromium
npm test
npm run build
```

Jika memakai Chrome/Chromium yang sudah terpasang:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm test
```

Pengujian memakai konteks browser tersendiri. Bank contoh dipasang secara eksplisit oleh fixture pengujian, bukan oleh aplikasi produksi. Lihat [panduan pengujian](tests/README.md).

Untuk pembaruan Dashboard terbaru, **5 pengujian terkait serta pemeriksaan TypeScript dan build produksi lulus**. Ini tidak berarti seluruh suite dijalankan ulang pada pembaruan tersebut. Uji UI browser langsung belum dilakukan untuk perubahan terakhir.

## Ringkasan perkembangan

- **Fondasi:** navigasi, layout responsif, dark mode, komponen bersama, dan penyimpanan lokal.
- **Pembelajaran:** vocabulary, grammar, flashcard, quiz, review terjadwal, mastery, dan statistik berdasarkan data nyata.
- **Pengelolaan materi:** input manual, impor/ekspor JSON/CSV, duplikat, kategori, favorit, serta reset progres dan data.
- **Kemudahan penggunaan:** panduan, petunjuk pengguna baru, saran dan laporan bug, serta tautan pembuat dan dukungan sukarela.
- **Penyederhanaan:** seluruh fitur PDF dihapus. Materi dari ekstraksi lama yang sudah disetujui dipertahankan sebagai materi biasa; penyimpanan PDF, draf ekstraksi, dan referensi sumber lama dibersihkan lewat migrasi.
- **Perbaikan belajar:** penghitungan mastery kata tanpa kanji, template grammar tervalidasi, pencatatan aktivitas per hari, dan pemisahan data uji dari koleksi pengguna.
- **Optimasi terbaru:** Dashboard memakai penghitungan ketersediaan soal tanpa membangun atau mengacak seluruh quiz, dan memakai kembali hasilnya pada pembaruan jam.

Pada benchmark lokal dengan 800 vocabulary dan 80 grammar, perhitungan ketersediaan soal turun dari sekitar **17,7 detik menjadi 0,13 detik**, dengan jumlah kandidat soal yang sama. Angka ini mengukur fungsi perhitungan, bukan waktu muat seluruh halaman atau kecepatan semua perangkat.

Catatan perubahan tersedia di [perbaikan Dashboard](UPDATE-DASHBOARD-RINGAN.md), [panduan awal](UPDATE-PANDUAN-AWAL.md), [template grammar](UPDATE-B03.md), [aktivitas belajar](UPDATE-B04.md), [pengujian](UPDATE-Q01.md), dan [penghapusan PDF](UPDATE-TANPA-PDF.md).

## Pembuat dan dukungan

- Instagram: [@hakkenshain](https://www.instagram.com/hakkenshain/)
- Dukungan sukarela: [Trakteer aji_setiawan40](https://teer.id/aji_setiawan40)
- Saran atau masalah: gunakan menu **Saran & Bug** di aplikasi.

Saat melaporkan masalah, sertakan halaman yang dibuka, langkah sebelum masalah muncul, hasil yang diharapkan, serta perangkat/browser yang dipakai.
