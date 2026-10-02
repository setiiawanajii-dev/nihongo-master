# Q01 — pembaruan tes otomatis

Tes koleksi sekarang memasukkan bank data uji secara eksplisit melalui tests/fixtures.ts. Instalasi baru tetap kosong. Tidak ada perubahan kode aplikasi atau data browser pengguna.

Tes navigasi mengikuti halaman sekarang: Panduan, Saran & Bug, Import/Export, dan halaman belajar. Asumsi sumber PDF diganti dengan tautan Review Material. Migrasi tetap diuji dengan database lama untuk melindungi materi dan progres pengguna. Tes grammar mengikuti konfirmasi template yang diperkenalkan pada B03. Tes dashboard mengikuti interval pembaruan 10 detik.

Hasil pemeriksaan: 85 skenario dijalankan. Pemeriksaan awal menghasilkan 80 lulus dan 5 gagal; kelima tes diperbaiki dan dijalankan ulang, semuanya lulus. Tidak ada tes dilewati atau dihapus hanya untuk menyembunyikan kegagalan. Build aplikasi berhasil sebelum pemeriksaan ulang; build akhir juga dijalankan terpisah.

Paket hanya berisi tes dan dokumentasi Q01. Unggah folder tests dan dokumen ini ke repository yang sama. File lainnya tidak perlu dihapus. Ini tidak mengubah tampilan atau fitur aplikasi yang digunakan pengguna.

Petunjuk menjalankan tes tersedia di tests/README.md.
