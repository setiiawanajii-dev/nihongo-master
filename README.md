# Nihongo Master

Aplikasi belajar Bahasa Jepang pribadi: vocabulary, grammar, flashcard, quiz, review terjadwal, progress, favorit, dan kategori.
Masukkan materi melalui impor JSON/CSV atau tambah manual. Database awal kosong.

## Menjalankan

Gunakan Node.js 22.13+.

```bash
npm install
npm run dev
```

Build produksi: `npm run build`. Pratinjau: `npm run preview`.
Vercel: framework Vite, build `npm run build`, output `dist`.
Gunakan vercel.json untuk routing aplikasi satu halaman.

## Memasukkan materi

Buka Import / Export, unduh contoh vocabulary/grammar JSON atau CSV, lalu ganti isinya.
Pilih berkas atau tempel teks, tekan Periksa impor, periksa duplikat, lalu Simpan impor.
Merge mempertahankan ID dan progres; Keep Both membuat ID baru; Ignore melewati duplikat.
Tambah manual tersedia melalui Vocabulary dan Grammar, atau tombol pada Import / Export.
Contoh unduhan ada di public/templates; contoh tersebut tidak otomatis masuk ke database.

## Data

IndexedDB menyimpan materi dan progres per browser dan alamat situs. Refresh tidak menghapus data.
Belum tersedia akun/sinkronisasi lintas perangkat.
Ekspor JSON/CSV menyertakan konten, kategori dan contoh, bukan progres, favorit atau riwayat quiz.
Reset progres mempertahankan materi; Hapus semua data mengosongkan koleksi setelah konfirmasi.

## Versi 0.14.0

Fitur PDF, reader, ekstraksi, bookmark halaman, sumber dan filter quiz berdasarkan PDF dihapus.
Database versi 7 mempertahankan ID konten, contoh, kategori, progres, favorit materi, jadwal, dan riwayat.
Berkas PDF, metadata halaman, draf ekstraksi, bookmark PDF, serta kolom sumber lama dibersihkan ketika migrasi berjalan.
Materi hasil ekstraksi yang sudah disetujui tetap menjadi vocabulary/grammar biasa.
Ekspor lama dapat diimpor; kolom sumber yang sudah tidak digunakan diabaikan.
Alamat lama /materials, /materials/:id dan /material-check dialihkan ke /data-transfer.

## Pemeriksaan

Lihat VERIFICATION.md untuk pemeriksaan perubahan ini.
