# Perbaikan B03 — soal grammar pribadi

Buka Grammar → Tambah/Edit → Soal grammar tervalidasi (opsional).

1. Isi kalimat benar dan terjemahannya.
2. Salin bagian kalimat yang ingin dikosongkan ke Jawaban bagian kosong. Bagian tersebut harus muncul tepat satu kali.
3. Isi pembahasan jawaban.
4. Untuk Correct sentence, isi tiga kalimat pengecoh yang tidak benar untuk pola dan makna tersebut. Untuk Fill in blank saja, kosongkan ketiganya.
5. Periksa semua isinya, centang konfirmasi, lalu simpan.

Aplikasi memvalidasi kelengkapan dan konsistensi format. Kebenaran bahasa Jepang tetap perlu diperiksa pengguna; aplikasi tidak membuat pengecoh otomatis.

Halaman Quiz menampilkan jumlah soal yang tersedia sesuai filter. Minimal sesi tetap 10 soal. Satu materi lengkap dapat menghasilkan satu soal isian dan satu soal kalimat benar. Jenis soal tanpa materi pendukung ditandai belum tersedia.

Materi lama dan progres tetap tersimpan. Materi tanpa template masih mendukung jenis soal lain sesuai kelengkapannya. Template tersimpan sebagai quizTemplate dan ikut ekspor/impor JSON maupun CSV. Jika kolom tidak disertakan saat Merge, template lama dipertahankan. Nilai null menghapus template. Pada CSV, isi quizTemplate adalah teks JSON dalam sel yang dikutip sesuai format CSV; paling mudah gunakan hasil Export CSV.

Paket pembaruan mencakup B02 dan B03. Ekstrak, unggah folder src dan tests serta dokumen ini ke root repository GitHub yang sama. Pertahankan struktur folder dan file lain. Jangan hapus seluruh repository. Vercel akan menerapkan pembaruan setelah deployment berhasil.
