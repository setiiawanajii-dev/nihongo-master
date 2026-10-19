# Pemisahan kategori Vocabulary dan Grammar

19 Oktober 2026

- Filter Vocabulary hanya menampilkan kategori yang digunakan vocabulary.
- Filter Grammar hanya menampilkan kategori yang digunakan grammar.
- Kategori yang dipakai kedua jenis materi tetap muncul pada keduanya.
- Form tambah/edit menyembunyikan kategori yang hanya dipakai jenis lain. Kategori yang belum digunakan tetap tersedia untuk penugasan pertama.
- Filter kategori yang tidak relevan pada URL dibersihkan beserta nomor halaman. Filter level, pencarian, dan pilihan lainnya dipertahankan.
- Pemisahan mengikuti referensi materi tersimpan, bukan perkiraan dari nama kategori. Tidak ada migrasi, penghapusan kategori, atau reset progress.

Berkas perubahan: `src/features/categories/selection.ts`, `src/features/vocabulary/VocabularyPage.tsx`, `src/features/grammar/GrammarPage.tsx`, `src/features/content/ContentEditor.tsx`, dan tes `tests/category-scope.spec.ts`.

Build produksi dan pemeriksaan TypeScript berhasil; seluruh 16 tes terkait lulus. Pengujian mencakup pemisahan filter/form, kategori bersama dan belum terpakai, filter URL lama, refresh, serta regresi Vocabulary/Grammar.

Paket ZIP berisi proyek lengkap. Ekstrak dan unggah isinya ke repository dengan struktur folder yang sama; tidak perlu menghapus repository. Deployment Vercel belum dilakukan oleh pembaruan lokal ini.
