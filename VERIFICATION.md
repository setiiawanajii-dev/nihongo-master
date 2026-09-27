# Verifikasi versi 0.14.0

- Instalasi bersih npm ci berhasil (95 paket), diikuti build TypeScript dan Vite.
- 9 tes browser terkait perubahan lulus, setelah koreksi contoh berkas grammar:
  - Input manual vocabulary/grammar tanpa sumber.
  - Impor contoh JSON dan CSV melalui UI, validasi, duplikat dan penyimpanan setelah refresh.
  - Migrasi database versi 6 ke 7: konten, favorit materi, progres dan snapshot hasil quiz dipertahankan; penyimpanan PDF dihapus.
  - Materi impor digunakan untuk quiz dan review hingga selesai.
  - Ekspor JSON/CSV dan Merge mempertahankan ID/progres.
  - Semua route aktif dan redirect route lama pada layar 390px, mode terang/gelap.
  - Reset progres: konfirmasi, batal, popup sukses, belajar ulang, refresh.
  - Hapus seluruh data: konfirmasi, popup sukses dan transaksi atomik.
  - Instalasi awal kosong, cleanup demo tidak menghapus materi pribadi.
- Tampilan Import / Export desktop diperiksa secara visual.
- Tidak ada referensi PDF di UI atau dependensi PDF di package.json/package-lock.json.
- Build masih memberi peringatan ukuran bundle utama >500 kB; build selesai.
- Ini pemeriksaan terarah, bukan klaim bahwa seluruh suite historis lulus. Beberapa tes lama masih mengasumsikan data seed.
- Temuan audit B02/B03/B04 tidak termasuk perubahan ini.
- Belum dipublikasikan ke GitHub/Vercel.
