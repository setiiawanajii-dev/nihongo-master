# Perbaikan A01–A04

Tanggal: 2 Oktober 2026. Perbaikan lokal; belum diterbitkan ke Vercel.

## Perubahan

- **A01:** Pengaturan Quiz menghitung ketersediaan tanpa membuat seluruh soal. Tampilan sesi aktif dipisahkan sehingga penyimpanan jawaban tidak menghitung ulang pengaturan. Normalisasi jawaban saat membuat bank soal menggunakan cache lokal satu proses. Snapshot soal, pengacakan, skor, dan penyimpanan tetap dipertahankan.
- **A02:** Pratinjau impor menampilkan 25 materi per halaman. Pilihan duplikat berlaku pada seluruh berkas dan tetap tersimpan saat berpindah halaman. Pencocokan materi, kategori, dan contoh memakai indeks; pembacaan tabel dan normalisasi berulang memakai cache khusus satu transaksi. Validasi tidak dilewati. Impor tetap atomik dan menolak pratinjau kedaluwarsa. Lebar panel juga diperbaiki untuk layar 320 piksel.
- **A03:** Quiz memilih level pertama yang tersedia dari N5 hingga N2. Pilihan eksplisit pengguna tetap dihormati, termasuk jika level tersebut kosong.
- **A04:** Tes Dashboard diberi materi uji secara eksplisit; tes impor memakai judul terbaru. Pemeriksaan fungsi tidak dihapus.

## Pengukuran sebelum dan sesudah

Build produksi lokal, Chrome headless, profil terpisah, 800 vocabulary + 80 grammar + 190 contoh. Pengukuran dilakukan setelah tes fungsi, tanpa suite berjalan bersamaan. Ini sampel pengukuran, bukan jaminan waktu untuk semua perangkat.

| Tindakan | Audit sebelum | Setelah perbaikan |
| --- | ---: | ---: |
| Memilih level N5 | 24,05 detik | 0,15 detik |
| Memulai quiz 10 soal | 12,02 detik | 1,78 detik |
| Menyimpan jawaban pertama | 24,11 detik | 0,21 detik |
| Pratinjau impor 880 materi | 4,48 detik | 0,44 detik |
| Menyimpan impor 880 materi | 38,33 detik | 2,08 detik |

Setelah refresh: impor berisi tepat 800 vocabulary, 80 grammar, dan 190 contoh; sesi quiz mempertahankan 1 jawaban dari 10 soal. Tidak ada error JavaScript halaman pada pengukuran tersebut. Level awal otomatis N5 dan tombol Mulai aktif.

Masih ada pekerjaan utama browser sekitar 1,50 detik saat membuat sesi quiz besar. Pada simulasi CPU 4× lebih lambat, Dashboard dibuka sekitar 2,07 detik. Aplikasi lebih ringan, tetapi belum dapat dijamin tanpa jeda di semua perangkat. Tidak dilakukan pengujian HP fisik.

## Validasi

- TypeScript dan build produksi berhasil. Peringatan ukuran bundle utama sekitar 536 KB masih ada; ini bukan kegagalan build.
- Suite lengkap saat dijalankan: 92 tes, 91 lulus dan 1 timeout pada latihan grammar. Trace mencatat pembaruan server pengembangan saat pengujian; seluruh 4 tes grammar lulus pada pengulangan tanpa perubahan berkas.
- Satu tes tambahan memeriksa rollback impor dan pratinjau kedaluwarsa. Ketiga tes regresi A01–A04 dan kelima tes impor/ekspor lulus pada pengulangan akhir: 8/8.
- Total 93 skenario berbeda memiliki hasil lulus setelah pengulangan. Ini bukan klaim bahwa satu eksekusi suite lengkap menghasilkan 93/93.
- Regresi meliputi pilihan level, pagination, duplikat lintas halaman, persistensi setelah refresh, rollback seluruh impor ketika gagal, penolakan materi berubah setelah pratinjau, serta ukuran layar 320 piksel.
- Pengujian memakai database browser terpisah, tidak menghapus data belajar pengguna.

## Berkas utama yang berubah

- `src/domain/quiz/engine.ts`
- `src/features/quiz/QuizPage.tsx`
- `src/infrastructure/database/indexeddb.ts`
- `src/infrastructure/database/validation.ts`
- `src/infrastructure/database/transfer.ts`
- `src/features/transfer/TransferPage.tsx`
- `src/styles/transfer.css`
- `tests/a01-a04.spec.ts`
- `tests/foundation.spec.ts`
- `tests/no-pdf.spec.ts`
- `README.md` dan `tests/README.md`

## Memperbarui website

Ekstrak paket, lalu unggah berkas yang diperbarui ke folder yang sama di repository GitHub. Tidak perlu mengosongkan repository. Pastikan folder `src` dan `tests` beserta subfoldernya tetap utuh. Commit ke branch produksi yang terhubung ke Vercel, kemudian tunggu deployment berstatus Ready. Pembaruan kode ini tidak menjalankan reset database pengguna.

Menjalankan lokal: `npm install`, lalu `npm run dev`. Build: `npm run build`.
