# Perbaikan Dashboard setelah impor banyak materi

2 Oktober 2026

Dashboard sebelumnya membuat seluruh kumpulan soal dan mengacak pilihan jawaban hanya untuk menghitung rekomendasi quiz. Proses ini juga dijalankan ulang oleh pembaruan waktu setiap 10 detik.

Perubahan:
- Perhitungan ketersediaan soal memakai aturan yang sama dengan mesin quiz, tetapi berhenti setelah menemukan cukup pilihan jawaban. Tidak membuat kumpulan soal atau mengacak jawaban.
- Dashboard menyimpan hasil perhitungan ketersediaan selama referensi data materi tetap sama. Pembaruan waktu tetap memperbarui jadwal review tanpa menghitung ketersediaan quiz lagi.
- Quiz lengkap tetap dibuat saat pengguna memulai quiz. Tidak ada perubahan format database, isi materi, atau progres.

Validasi:
- 5 pengujian lulus: kesesuaian jumlah soal untuk setiap jenis/mode/filter; bank kecil dan jawaban berulang; contoh dan template grammar; rekomendasi quiz yang bisa dimulai; data kosong; serta pembaruan tenggat review.
- Pemeriksaan TypeScript dan build produksi berhasil.
- Dengan paket 800 vocabulary + 80 grammar: proses lama sekitar 17.665 ms; median proses baru dari 5 pengukuran sekitar 131 ms. Pembaruan Dashboard dengan hasil tersimpan sekitar 2,26 ms per perhitungan.
- Hasil kedua cara sama: 3.196 kandidat soal vocabulary dan 320 grammar. Ini jumlah variasi soal, bukan jumlah materi.
- Angka merupakan benchmark fungsi di lingkungan lokal, bukan waktu muat seluruh halaman atau pengukuran perangkat pengguna. Pengujian UI browser langsung tidak dilakukan pada pembaruan ini.

Cara memperbarui deployment:
Unggah isi folder proyek dalam ZIP pembaruan ke repository GitHub yang terhubung ke Vercel, pertahankan struktur folder. Tunggu deployment baru berstatus Ready, kemudian muat ulang situs. Jangan reset data belajar.

File aplikasi yang berubah:
- src/domain/quiz/engine.ts
- src/domain/analytics/dashboard.ts
- src/features/dashboard/SmartDashboard.tsx

Pengujian tambahan:
- tests/dashboard-availability.spec.ts
