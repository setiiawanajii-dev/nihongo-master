# Pembaruan 27 September 2026 — Hapus demo

Aplikasi tidak lagi memasukkan seed secara otomatis. Saat versi ini pertama dibuka, transaksi `demo-removed-v1` menghapus vocabulary/grammar berlabel isSeed (kecuali materi hasil impor/ekstraksi), contoh, favorit, progres dan jadwal terkait. Referensi PDF dummy tanpa file dan tidak dipakai materi pribadi ikut dihapus. Kategori awal yang tidak dipakai dibersihkan.

Materi impor, PDF asli, progres materi pribadi, sesi serta snapshot riwayat quiz tetap disimpan. Referensi dummy yang masih dipakai materi pribadi dipertahankan agar asal materi tidak rusak. Pembersihan tidak diulang setelah marker tersimpan dan tidak membuat seed kembali.

Verifikasi: build produksi berhasil; dua tes tests/remove-demo.spec.ts lulus (23,2 detik), mencakup instalasi kosong, refresh, dua inisialisasi bersamaan, pembersihan bank 100 demo, perlindungan hasil merge impor, file PDF, progres dan riwayat. Suite lama yang mengasumsikan seed otomatis tidak dijalankan pada pembaruan ini dan perlu fixture bank eksplisit untuk pengujian fitur berbasis seed.

Untuk Vercel: upload isi paket ini sebagai pembaruan pada proyek nihongo-master yang sama, lalu buka alamat utama dan refresh. Data browser hanya dibersihkan ketika versi baru berhasil dibuka. Jangan menghapus data situs browser. Paket menyertakan vercel.json untuk routing SPA dan tidak menyertakan konfigurasi hosting Sites.

