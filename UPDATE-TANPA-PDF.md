# Memperbarui ke versi tanpa PDF

ZIP ini adalah proyek lengkap. Ekstrak ke folder baru agar file lama yang dihapus tidak tertinggal.
Jangan hapus database browser atau menekan reset saat memperbarui website.

## GitHub

Upload file baru/yang berubah sesuai struktur folder. File di package.json, package-lock.json,
src, tests, public/templates dan dokumen harus memakai versi terbaru.

Upload melalui web GitHub tidak menghapus file lama secara otomatis.
Hapus file/folder lama berikut dari repository:
- src/features/materials/
- src/features/material-check/
- src/infrastructure/pdf/
- src/domain/extraction/
- public/pdfjs/ (jika sebelumnya diunggah)
- scripts/pdf-assets.mjs
- src/services/extraction.ts
- src/infrastructure/database/pdf.ts
- src/infrastructure/database/extraction.ts
- src/domain/models/extraction.ts
- src/domain/quiz/source.ts
- src/features/quiz/QuizSourcePicker.tsx
- src/styles/materials.css
- src/styles/extraction.css
- tests/materials.spec.ts
- tests/extraction.spec.ts
- tests/source-quiz.spec.ts
- tests/optional-source.spec.ts
- B01-SUMBER-OPSIONAL.md

Jangan upload node_modules, dist, .git, .vercel, .env.local atau file rahasia.
Pastikan Vercel menyelesaikan deployment Ready dari commit terbaru di main.

## Dampak pada data pengguna

Vocabulary/grammar yang sudah tersimpan, termasuk hasil ekstraksi yang telah disetujui, tetap ada.
ID konten, contoh, kategori, progres, favorit materi dan riwayat quiz dipertahankan.
Saat database diperbarui, file PDF lokal dalam aplikasi, draf ekstraksi, bookmark halaman,
metadata halaman dan referensi sumber dibersihkan. File asli di komputer tidak disentuh.
Ekspor lama tetap dapat diimpor; metadata sumber diabaikan.
