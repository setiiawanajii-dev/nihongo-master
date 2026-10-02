# Pengujian Nihongo Master

Jalankan `npm install`, lalu `npx playwright install chromium` sekali untuk memasang browser uji. Jalankan seluruh suite dengan `npm test`; build produksi dengan `npm run build`.

Jika Chromium/Chrome sudah terpasang, gunakan `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm test`.

## Pemisahan data

- `@playwright/test`: profil browser baru tanpa materi untuk tes instalasi kosong, input manual, impor, reset, dan migrasi.
- `./fixtures`: secara eksplisit memasukkan bank materi uji ke IndexedDB milik konteks tes tersebut. Data menggunakan contoh yang tersedia dalam repository, dengan `isSeed: false` dan template quiz tervalidasi. Ini bukan pengisian otomatis aplikasi.
- `emptyTest` dari fixture memakai profil kosong, untuk tes migrasi dan database tidak tersedia dalam berkas yang juga menguji koleksi berisi materi.
- Jumlah 70 vocabulary / 30 grammar pada tes koleksi adalah ukuran bank fixture, bukan persyaratan instalasi pengguna baru.
- Tidak ada tes yang menggunakan penyimpanan browser pribadi. Jangan menambahkan seed otomatis ke kode aplikasi untuk meluluskan tes.

## Fitur yang diuji

Navigasi, mobile, dark mode, input manual, CRUD, favorit, kategori, JSON/CSV beserta merge dan progres, flashcard, quiz, review, statistik, reset, feedback, serta regresi B02–B04.

Fitur PDF sudah dihapus. Pemeriksaan PDF hanya boleh muncul dalam skenario migrasi dari database lama, pengalihan URL lama, atau memastikan UI/ekspor tidak lagi menampilkan sumber PDF. Tes tersebut sengaja dipertahankan sebagai perlindungan data lama.

Dashboard memperbarui jamnya tiap 10 detik. Tes lintas tab menunggu maksimal 15 detik untuk statistik aktivitas hari ini, sambil tetap memastikan perubahan materi diterima.

Regresi A01–A04 mencakup level awal mengikuti koleksi, pilihan level eksplisit, pratinjau impor per halaman, pilihan duplikat lintas halaman, penyimpanan setelah refresh, pembatalan impor gagal, dan penolakan pratinjau yang kedaluwarsa.
