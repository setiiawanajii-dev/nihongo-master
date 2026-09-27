# 日本語マスター · Nihongo Master

Aplikasi pembelajaran Bahasa Jepang pribadi. Versi **0.13.0 — STEP 13: Final UI/UX Polish**.

## Perjalanan JLPT N5–N2

Dashboard dan halaman Progress menampilkan N5, N4, N3, dan N2. Vocabulary, Grammar, Quiz, dan Overall dihitung terpisah per level dari database. Level tanpa materi/hasil latihan menampilkan tanda —. Pembaruan ini tidak menambah materi demo atau mengubah progres yang tersimpan.

## Pembaruan: tanpa materi demo

Seed otomatis dinonaktifkan. Demo lama dibersihkan saat versi baru dibuka; materi pribadi dan PDF asli dipertahankan. Lihat `DEMO-CLEANUP.md` untuk batas pembersihan dan cara menerapkannya di Vercel. Keterangan seed pada bagian historis di bawah menjelaskan versi sebelumnya.

## Menjalankan

Prasyarat: Node.js **22.13+** dan npm. Dari folder ini:

```bash
npm install
npm run dev
```

Buka alamat Local yang ditampilkan (biasanya http://127.0.0.1:5173). Hentikan dengan Ctrl+C.

```bash
npm run build
npm run preview
```

Build produksi berada di `dist/`. Hosting mendatang harus memakai SPA fallback: route seperti `/vocabulary` diarahkan ke `index.html`. Vite dev/preview sudah mendukungnya.

## STEP 13 — Final UI/UX Polish

Perubahan dibatasi pada pengalaman penggunaan dan perbaikan yang ditemukan saat audit:

- Dashboard lebih ringkas: kartu pengantar berulang dihapus, rekomendasi dan statistik tetap berasal dari database.
- Warna teks sekunder lebih mudah dibaca, ukuran tombol utama/ikon minimal 44px, tipografi form mobile 16px, serta jarak dan pembungkusan teks panjang konsisten.
- Fokus keyboard terlihat, skip link memindahkan fokus ke konten, judul halaman lazy mendapat fokus, status drawer diumumkan, dan pertanyaan quiz mendapat fokus saat berganti.
- Viewer PDF dapat difokuskan untuk menggeser halaman yang diperbesar dengan keyboard. Tombol, bookmark dan penyelesaian halaman tetap menggunakan penyimpanan yang sama.
- Halaman gagal dimuat menawarkan muat ulang dan kembali ke Dashboard tanpa menampilkan stack trace.
- Klik berulang dikunci selama operasi berlangsung. Menghapus favorit yang mempunyai catatan meminta konfirmasi; penyimpanan catatan dan penghapusan favorit memberikan feedback.
- Field penjelasan yang belum tersedia diberi empty state, serta teks materi demo dibedakan dari materi PDF pribadi. Preferensi reduced motion dihormati.

Tidak ada reset data, penggantian ID, atau migrasi schema baru (IndexedDB tetap v6). Ekspor konten bukan backup progres atau berkas PDF. Data lokal bertahan saat refresh, tetapi tetap terikat pada browser dan alamat situs yang digunakan. PDF reader memakai canvas; lapisan teks untuk screen reader dan OCR belum termasuk tahap ini.

Lihat `VERIFICATION.md` untuk hasil audit dan cakupan pengujian.

## STEP 12 — Data Import / Export

Buka `/data-transfer` dari sidebar atau Pengaturan. Pilih berkas JSON/CSV atau tempel isinya, tekan **Periksa impor**, periksa pratinjau dan kebijakan duplikat, lalu **Simpan impor**. Tidak ada penyimpanan saat membaca berkas atau membuat pratinjau.

Vocabulary wajib: `kanji`, `kana`, `meaning`, `level`. Opsional: `category`, `example`, `translation`, `romaji`, `partOfSpeech`, `notes`. Grammar wajib: `grammar` (nama pola), `meaning`, `pattern` (struktur), `level`. Opsional: `example`, `translation`, `explanation`, `commonMistakes`, `notes`. Level yang didukung N5/N4/N3/N2. Penjelasan, romaji atau terjemahan yang tidak diberikan tidak dikarang.

JSON menerima array item atau envelope versi 1 dengan array `vocabulary` dan `grammar`. CSV menerima header sesuai field di atas; kolom `type` dapat dipakai untuk berkas campuran. Tanpa type, pilih jenis pada form. Kategori berupa array JSON atau nama dipisahkan `;`. Format ekspor mendukung beberapa contoh melalui array `examples`, kategori, catatan dan referensi sumber. Semua contoh ekspor disertakan; kolom example/translation CSV berisi contoh pertama untuk kemudahan penyuntingan, sedangkan examples adalah representasi lengkap yang diutamakan saat impor.

Kebijakan duplikat:

- ID ekspor yang masih ada menjadi kecocokan pertama. Tanpa kecocokan ID, vocabulary dicocokkan berdasarkan kanji + kana, grammar berdasarkan nama pola, dengan normalisasi Unicode NFKC, trim dan huruf kecil. Arti berbeda tetap memerlukan keputusan; bukan fuzzy matching sinonim/varian kana.
- **Merge** mempertahankan ID/createdAt, progres, dimensi mastery, jadwal review, favorit, sesi dan riwayat quiz. Field wajib mengikuti berkas; field tambahan kosong/tidak disertakan mempertahankan nilai lama. Kategori digabung, contoh dideduplikasi berdasarkan teks, terjemahan dan sumber. Referensi lama dipertahankan sebagai additionalSources jika sumber utama berubah.
- **Keep Both** membuat ID baru. Progres lama tetap milik materi lama, tidak disalin ke duplikat baru. Keduanya tetap dapat diedit setelah impor.
- **Ignore** melewati duplikat; materi baru tetap dibuat. Default duplikat adalah Ignore. Pilihan dapat diatur per item atau untuk semua duplikat.
- Jika beberapa materi database cocok, pilih tujuan Merge secara eksplisit. Duplikat di berkas yang sama juga ditampilkan sebelum penyimpanan. Jika belum ada kecocokan database, Merge memakai hasil item pertama yang cocok dalam batch.

Semua baris harus valid sebelum tombol simpan muncul. Batas: 10 MB, 5000 item, 20.000 karakter per field, 100 kategori/contoh/referensi tambahan per item. CSV mendukung UTF-8 BOM, koma, escaped quotes, multiline fields dan CRLF. Header duplikat, kolom tidak cocok, kutip rusak, level salah dan field wajib kosong ditolak. Impor menggunakan satu transaksi; kegagalan membatalkan seluruh batch. Jika konten berubah sejak pratinjau, pengguna harus memeriksa ulang. Perubahan progres saja tidak membatalkan pratinjau.

**Export JSON / Export CSV** mengekspor seluruh konten tersimpan, bukan backup seluruh aplikasi. Progres, favorit, riwayat, berkas PDF, draf extraction, unit PDF dan relasi perbandingan grammar tidak diekspor. Progres/relasi yang sudah ada tetap dipertahankan ketika Merge pada database yang sama. Kesulitan awal materi baru adalah 3; kesulitan lama dipertahankan saat Merge. Source PDF/halaman diekspor sebagai referensi; di database lain, sumber yang belum ada dibuat sebagai metadata tanpa file. Konten tanpa sumber memakai referensi berlabel “Impor JSON/CSV — bukan sumber PDF”.

CSV ekspor melindungi field yang menyerupai formula spreadsheet dengan awalan apostrof dan penanda `csvEncoding=apostrophe-v1`; importer mengembalikan teks asli saat membaca penanda itu. Jangan menghapus penanda jika ingin round-trip persis.

Arsitektur: `src/domain/transfer/format.ts` memuat model portable, parser, validasi dan serializer; `src/infrastructure/database/transfer.ts` menyediakan preview/commit/export atomik melalui `LearningDatabase.transfer`; `src/features/transfer/TransferPage.tsx` memuat antarmuka. Validator dan editor mendukung field opsional dari berkas serta Keep Both secara eksplisit. Schema IndexedDB tetap v6; data lama tidak direset.

## STEP 11 — Smart Dashboard

`/dashboard` menjadi pusat rekomendasi dari database pembelajaran yang sama dengan Vocabulary, Grammar, Quiz dan Review. Membuka dashboard tidak membuat sesi atau menambah mastery.

- **Recommended**: prioritaskan materi lemah yang jatuh tempo, lalu antrean review lainnya, lalu materi lemah yang belum jatuh tempo. Tampilkan judul, mastery yang benar-benar tersimpan, hitungan salah/benar/review, alasan dan tautan detail materi. Jadwal mendatang disebutkan dan tidak diklaim sudah jatuh tempo.
- **今日の学習**: daftar kandidat yang belum dinilai dan belum memiliki jadwal. Jumlah saran awal per jenis adalah `ceil(sqrt(jumlah kandidat))`, dibatasi kandidat yang tersedia. Semua item yang disarankan dapat dibuka. Ini kebijakan ukuran sesi yang dihitung dari bank materi, bukan target harian atau statistik prestasi.
- **Quiz rekomendasi**: gunakan pool nyata semua level yang tersedia. Pilih Mixed jika bank mencukupi kedua jenis, atau jenis dengan soal tersedia terbanyak. Pilih ukuran sah 10/20/30/50 terdekat rata-rata jumlah jawaban quiz selesai; tanpa riwayat gunakan ukuran minimum yang didukung engine. Jika soal tidak cukup, jumlah saran nol dan tombol mulai tidak tersedia. Tombol mulai menyimpan sesi quiz nyata sebelum membuka runner.
- **今日の復習**: memakai fungsi antrean yang sama dengan halaman Review, mencakup jadwal sekarang/terlambat, memisahkan vocabulary dan grammar, mengabaikan materi dihapus. Hitungan diperiksa setiap 10 detik dan saat window kembali fokus.
- **Weak Materials**: status WEAK, atau mastery di bawah 60% dengan bukti latihan. Materi baru/null mastery tidak otomatis dianggap lemah. Urutan mengutamakan yang jatuh tempo, kemudian prioritas berdasarkan salah/benar, mastery dan riwayat review. Daftar awal enam item; sisanya dapat dibuka melalui disclosure.
- **Aktivitas hari ini**: vocabulary/grammar adalah jumlah materi hidup unik dengan lastReviewed pada tanggal lokal hari ini dan reviewCount > 0. Jawaban quiz hanya dihitung dari quiz selesai hari ini. Keduanya bisa saling tumpang tindih dan tidak dijumlahkan sebagai jumlah materi unik gabungan.
- **Streak, waktu, sesi, akurasi, mastery dan JLPT**: memakai kalkulasi progres STEP 7 dari database. Streak menghitung tanggal aktivitas unik dan memberi toleransi kemarin; sesi masa depan tidak dihitung.

Rekomendasi diperbarui setelah penilaian, refresh, penghapusan materi, dan broadcast perubahan antar-tab. Belum ada data ditampilkan sebagai kosong/nol atau belum dinilai sesuai metrik, tanpa angka prestasi buatan. Tidak ada perubahan schema atau reset database. Impor/ekspor konten tersedia pada STEP 12 di atas.

File baru: `src/domain/analytics/dashboard.ts`, `src/features/dashboard/SmartDashboard.tsx`, `src/styles/dashboard.css`, dan `tests/dashboard.spec.ts`. Halaman Dashboard, impor stylesheet, versi paket dan informasi aplikasi diperbarui.

## STEP 10 — Source Based Quiz

Pada `/quiz`, pilih **All Materials**, **Specific PDF**, **Specific Unit/Chapter**, atau **Specific Page**. Filter mode, jumlah soal, level, kategori, dan jenis soal tetap berlaku bersamaan dengan sumber.

- Pilihan PDF mencakup PDF unggahan dan referensi demo yang ditandai jelas. Draf ekstraksi belum disetujui tidak masuk bank soal. PDF tanpa materi tersimpan menampilkan jumlah soal nol.
- Untuk unit/bab, pilih PDF lalu **Tambah unit/bab**. Isi nama dan rentang halaman reader (1-based, bukan nomor cetak); simpan, pilih, atau edit unit tersebut. Rentang bersifat inklusif. Unit tersimpan pada metadata PDF di IndexedDB dan bertahan setelah refresh. Tidak ada bab yang ditebak otomatis.
- Mesin memfilter materi berdasarkan referensi utama atau additionalSources yang cocok. Contoh kalimat dan pilihan jawaban juga dibatasi ke sumber terpilih. Materi yang hanya memiliki contoh di halaman pilihan, tanpa referensi materi yang cocok, tidak dimasukkan otomatis.
- Soal berbasis contoh menyimpan halaman contoh yang benar; soal berbasis definisi memakai referensi materi yang cocok. Setiap soal dan snapshot hasil menyimpan `sourcePdfId`, `sourcePage`, `contentId`, serta nama berkas sumber. Riwayat menyimpan label PDF/unit/rentang saat sesi dimulai.
- Jika bank soal terlalu kecil, tombol Mulai quiz nonaktif; aplikasi tidak mengambil soal atau pilihan jawaban dari luar sumber. Empat alternatif berbeda diperlukan untuk pilihan ganda; Mixed tetap membutuhkan 50% vocabulary dan 50% grammar. Jumlah sesi tetap 10/20/30/50.
- Jawaban salah langsung menampilkan **❌ Salah**, jawaban benar, penjelasan, PDF/halaman dan **Review Material**. Tombol itu menuju detail vocabulary/grammar terkait; tautan halaman sumber membuka PDF Reader pada halaman yang sesuai jika berkas tersedia.
- Pembahasan salah bertahan setelah refresh melalui sesi tersimpan dan URL feedback. Seluruh kesalahan juga tersedia pada `/quiz/result`. Materi yang dihapus kemudian tidak merusak snapshot hasil; tombol detail diganti keterangan bahwa materi sudah dihapus.
- Sesi dan hasil lama tetap didukung. Backfill satu kali menambahkan contentId dari itemId dan nama sumber yang tersedia tanpa mengubah jawaban, skor, atau progres. Tidak ada reset database atau store baru; schema tetap v6.

File utama tambahan: `src/domain/quiz/source.ts`, `src/features/quiz/QuizSourcePicker.tsx`, `src/features/quiz/QuizFeedback.tsx`, `src/styles/quiz.css`, dan `tests/source-quiz.spec.ts`. Engine, model, perintah database PDF/quiz, runner, result, serta SourceLink diperbarui.

Dashboard STEP 11 tersedia di atas. OCR tetap belum tersedia; PDF gambar memerlukan ekstraksi/validasi sebelum menghasilkan materi yang dapat dipakai quiz.

## STEP 9 — PDF Content Extraction

Buka `/material-check`, atau pilih **Extract / Material Review** dari Materials maupun PDF Reader. Pilih PDF lalu jalankan ekstraksi. PDF.js membaca teks per halaman secara lokal; tidak ada pengiriman dokumen ke layanan eksternal.

- Identifikasi konservatif untuk vocabulary, grammar, dan contoh kalimat: label eksplisit, kolom kosakata, atau kandidat Jepang yang perlu diperiksa. Ini bukan parser universal untuk semua tata letak buku.
- Setiap kandidat berstatus **Needs Review**, menyertakan cuplikan teks asli, sourcePdfId dan sourcePage. Kolom yang tidak ditemukan tetap kosong; aplikasi tidak menerjemahkan atau mengarang arti, kana, romaji maupun penjelasan.
- **Edit** untuk menyalin/memperbaiki kolom dari teks halaman sumber. Nilai yang tidak terdapat dalam teks sumber ditolak. Pilih level JLPT sendiri; level dan nilai kesulitan awal 3 adalah pengaturan aplikasi, bukan fakta yang disimpulkan dari PDF.
- **Approve** memerlukan kolom wajib lengkap dan konfirmasi pemeriksaan. Penyimpanan materi dan contoh terkait dilakukan atomik; klik ganda tidak menggandakan materi. Contoh mandiri perlu dipasangkan dengan vocabulary/grammar yang dipilih pengguna.
- **Delete** mengeluarkan kandidat dari antrean. Ekstraksi ulang tidak menghidupkan kembali kandidat yang dihapus atau menimpa keputusan sebelumnya.
- Filter jenis/status/halaman, pagination 12 kartu, teks asli per halaman, pembatalan dan melanjutkan ekstraksi tersedia. Kegagalan satu halaman tidak membatalkan hasil halaman lain.
- Halaman tanpa teks menampilkan **Text extraction unavailable. OCR required.** Halaman gambar tidak menghasilkan materi rekaan. Dokumen campuran tetap mempertahankan halaman yang berhasil dibaca.
- Draf, keputusan, teks halaman dan hasil persetujuan tersimpan di IndexedDB dan bertahan setelah refresh. Membaca atau menyetujui materi tidak menambah mastery/progres belajar.

Arsitektur tambahan:

```text
src/domain/models/extraction.ts             Model run, draft, status dan field
src/domain/extraction/provider.ts           Kontrak TextExtractionProvider untuk text/OCR
src/domain/extraction/identify.ts           Identifikasi konservatif berbasis teks sumber
src/infrastructure/pdf/text-extraction.ts   Adapter PDF.js
src/infrastructure/database/extraction.ts   Transaksi, validasi bukti dan approval
src/services/extraction.ts                 Orkestrasi per halaman, cancel/resume
src/features/material-check/MaterialCheckPage.tsx
src/styles/extraction.css
tests/extraction.spec.ts
```

Schema IndexedDB v6 menambahkan extractionRuns dan extractionDrafts tanpa menghapus data lama. Adapter OCR kelak dapat mengikuti kontrak provider yang sama; OCR belum diimplementasikan. Teks hasil PDF bergantung pada font/encoding dokumen, sehingga pemeriksaan visual terhadap halaman tetap diperlukan.

## STEP 8 — PDF Material System

- `/materials`: Add PDF, search nama/nama berkas/sumber, daftar PDF asli, jumlah halaman dan progres, Open PDF, serta Delete PDF dengan konfirmasi.
- `/materials/:id?page=2`: reader PDF.js lokal dengan previous/next, nomor halaman, zoom (relatif tampilan pas lebar), bookmark dan penandaan selesai yang bisa dibatalkan. Jika URL tidak menyebut halaman, reader melanjutkan halaman terakhir yang berhasil ditampilkan.
- Blob PDF disimpan di store `pdfFiles`, terpisah dari metadata `materials`. `PDFMaterial` memiliki `id`, `name`, `file` (ID Blob, bukan URL sementara), `totalPages`, `completedPages` (jumlah), `source`, `createdAt`. Alias `title`, `filename`, `pageCount` dipertahankan untuk kompatibilitas tampilan lama.
- `pdfReading` menyimpan daftar nomor halaman selesai dan posisi terakhir. Bookmark menggunakan Favorites `pdf-page`, dapat dibuka dari `/favorites`. Progres halaman tidak meningkatkan mastery atau membuat sesi latihan fiktif.
- `sourcePdfId` dan `sourcePage` menjadi referensi standar vocabulary, grammar, examples, soal dan snapshot quiz. Migrasi IndexedDB v4 → v5 menambahkan ID standar pada data lama (termasuk additionalSources dan riwayat), tanpa reset. Nomor halaman sumber divalidasi di repository; detail materi dan kesalahan quiz dapat membuka halaman sumber.
- PDF yang masih digunakan oleh vocabulary/grammar/examples/questions tidak dapat dihapus sampai referensinya dipindah. Hapus PDF lain membersihkan Blob, metadata, progres dan bookmark secara atomik; snapshot quiz historis tetap ada. Seed tetap berupa referensi dummy dan tidak dihitung sebagai PDF unggahan.
- Validasi unggahan: ekstensi/MIME, signature PDF, struktur terbaca, SHA-256 untuk duplikat, maksimal 50 MB dan 5.000 halaman. PDF berkata sandi belum didukung. Error penyimpanan/berkas muncul di UI dan tidak mengaku berhasil.
- Worker, CMaps, font standar dan WASM PDF.js disediakan lokal; `npm install` menyalinnya melalui postinstall `scripts/pdf-assets.mjs`. Jika install dijalankan dengan `--ignore-scripts`, jalankan `node scripts/pdf-assets.mjs` sebelum dev/build. Dibutuhkan browser modern dengan canvas dan IndexedDB.
- Reader menampilkan halaman secara visual melalui canvas. Ekstraksi teks dan pemeriksaan materi tersedia melalui STEP 9. OCR dan tautan/form interaktif di dalam PDF belum diaktifkan.

Berkas baru utama: `src/features/materials/{MaterialsPage,PDFReaderPage,SourceLink}.tsx`, `src/infrastructure/pdf/document.ts`, `src/infrastructure/database/pdf.ts`, `src/styles/materials.css`, `scripts/pdf-assets.mjs`, `tests/materials.spec.ts`.

## STEP 7 — Progress Tracking

- `/progress` menampilkan total/learning/weak/mastered vocabulary dan grammar, jumlah quiz, rata-rata skor dan akurasi, jumlah sesi, waktu aktif, current streak dan longest streak.
- Empat grafik: skor 30 quiz terakhir (urutan waktu), distribusi status vocabulary dan grammar, serta jumlah sesi per hari selama 30 hari. Tabel rincian bisa dibuka untuk mengakses angka tanpa mengandalkan warna grafik.
- Learning pada ringkasan mencakup status LEARNING + REVIEW; grafik tetap menampilkan kelima status secara terpisah.
- N3/N2: vocabulary dan grammar adalah rata-rata mastery seluruh materi pada level itu. Materi belum dinilai menyumbang 0 pada cakupan, bukan klaim kemampuan 0. Quiz memakai akurasi semua jawaban pada level soal, termasuk quiz Mixed. Overall merata-ratakan komponen tersebut; quiz belum dikerjakan menyumbang 0, jenis konten yang kosong dikeluarkan. Tanda — berarti data belum tersedia.
- Streak memakai tanggal lokal yang tersimpan pada sesi. Belajar kemarin mempertahankan streak sampai hari ini berakhir. Beberapa sesi di hari sama dihitung satu hari; sesi masa depan diabaikan. Tanggal aktif diperbarui setiap 30 detik.
- Sesi lintas tengah malam mengikuti tanggal sesi tersimpan; quiz memakai tanggal selesai. Waktu belajar adalah jumlah `activeDurationSeconds` sesi, sekali saja. Review yang telah dijawab dalam sesi berjalan termasuk; quiz aktif belum masuk statistik sampai selesai.
- Dashboard memakai sumber perhitungan yang sama. Angka target sementara diganti aktivitas nyata hari ini. Seed tidak menciptakan riwayat belajar atau streak.
- Statistik materi mengikuti konten saat ini; riwayat quiz tetap memakai snapshot soal meskipun materi dihapus. Identitas vocabulary/grammar dibedakan meskipun ID sama.
- Data memakai abstraction layer database yang sudah ada. Tidak perlu reset IndexedDB atau migrasi; refresh, mutasi dalam aplikasi, fokus tab dan sinkronisasi antartab memperbarui statistik.

File baru: `src/domain/analytics/progress.ts`, `src/features/progress/ProgressCharts.tsx`, `src/features/progress/useProgressAnalytics.ts`, `src/styles/progress.css`, dan `tests/progress.spec.ts`. Halaman Progress, Dashboard, DataProvider, Card, main dan versi paket diperbarui. Implementasi PDF tersedia pada STEP 8 di atas.

## STEP 6 — Review System

### Antrean dan sesi

- `/review`: **Vocabulary**, `/review?type=grammar`: **Grammar**, `/review?type=mixed`: **Mixed**. Mixed menggabungkan materi jatuh tempo menurut prioritas; tidak memaksakan jumlah kedua jenis agar sama.
- Antrean memakai `nextReview` untuk menentukan jatuh tempo. Urutan prioritas mempertimbangkan rasio `wrongCount` terhadap `correctCount`, mastery yang rendah, keterlambatan jadwal, waktu sejak `lastReviewed`, serta `reviewCount`.
- Catatan saja dan materi yang belum pernah dilatih tidak otomatis masuk review. Tombol **Review sekarang** dari detail tetap dapat memasukkan materi secara manual, tanpa memberi skor atau mereset interval yang sudah dicapai.
- Search, level, kategori, pagination 12 kartu, jumlah jatuh tempo dan jadwal mendatang tersedia. Antrean diperbarui setiap 10 detik dan ketika data dimuat ulang.
- Mulai sesi maksimal 10/20/50 materi. Bila antrean lebih pendek, sesi hanya berisi materi yang tersedia. Aspek dengan bukti terendah dipilih untuk setiap materi: recognition/meaning/kanji/usage untuk vocabulary dan understanding/usage/sentence untuk grammar.
- Tulis jawaban, buka rujukan, lalu nilai **Wrong / Hard / Good / Easy**. Jawaban kosong hanya dapat dinilai Wrong. Penilaian ini adalah penilaian diri, bukan koreksi otomatis jawaban bebas.
- **Hard berarti ingatan benar tetapi sulit**: menambah `correctCount`. Wrong menambah `wrongCount`; Good dan Easy menambah `correctCount`. Ini berbeda dari tombol flashcard lama “Hampir tahu”, yang masih dianggap belum sepenuhnya tahu.
- Setiap penilaian memperbarui mastery pada aspek yang dilatih, `reviewCount`, `correctCount`, `wrongCount`, `lastReviewed`, dan `nextReview`. Nilai aspek lain serta catatan pribadi dipertahankan. Satu penilaian tidak langsung memberi status MASTERED.
- `/review?session=<id>` menyimpan urutan, posisi, respons yang sudah dikirim, penilaian dan ringkasan sesi. Refresh dapat melanjutkan materi berikutnya. Teks yang belum dikirim tidak dipulihkan.
- Lewati tanpa menilai tidak mengubah progres/jadwal. Ringkasan menampilkan semua penilaian, mastery dan tanggal review berikutnya. Sesi aktif ditampilkan untuk dilanjutkan; 20 sesi selesai terbaru tersedia pada daftar, sesi lama tetap tersimpan dengan URL-nya.

### Interval sederhana

| Penilaian | Perkembangan |
| --- | --- |
| Wrong | 10 menit; jika penilaian sebelumnya juga Wrong, 1 hari untuk jeda belajar ulang |
| Hard | 1 hari pada interval awal; kemudian 3 hari, atau setengah interval sebelumnya dengan batas 3–7 hari |
| Good | 3 → 7 → 14 → 28 hari, lalu sekitar dua kali interval sebelumnya |
| Easy | 7 → 14 → 30 → 60 → 120 hari, lalu berkembang hingga batas |

Interval maksimal **180 hari**. Good/Easy memakai interval sebelumnya; nilai Wrong atau Hard dapat memperpendek jarak yang sudah panjang. Tombol penilaian di sesi menampilkan interval yang akan dipakai. Kebijakan ini juga dipakai flashcard vocabulary dan latihan grammar yang sudah ada, menggantikan rumus interval STEP 3/4.

### Integrasi quiz dan data lama

- Penyelesaian quiz memperbarui jadwal **sekali per materi**, bukan sekali untuk setiap pertanyaan tentang materi yang sama. Bila ada satu saja jawaban salah untuk materi itu, jadwal memakai Wrong dan status menjadi WEAK. Bila semuanya benar, jadwal memakai Good.
- Pada pembukaan pertama versi ini, progres latihan lama yang memiliki review tetapi belum memiliki `nextReview` mendapat jadwal awal dari tanggal review terakhir: 10 menit untuk WEAK/lebih banyak salah, 1 hari untuk akurasi/mastery rendah, atau 3 hari untuk lainnya. Hitungan, skor, catatan, dan jadwal yang sudah ada tidak direset. Materi yang dihapus atau catatan tanpa latihan tidak dijadwalkan.
- IndexedDB **v4** menambah `reviewRuns`, dengan migrasi yang menjaga store/data sebelumnya. UI menggunakan kontrak `LearningDatabase.review.start/answer/skip`; perhitungan jadwal berada di domain terpisah.
- Progres, jadwal, event, sesi, dan posisi antrean ditulis dalam satu transaksi. Pengiriman ulang identik tidak dihitung dua kali. Jawaban konflik ditolak. Jika materi/progres dihapus atau berubah di tab lain, entri sesi lama dilewati tanpa menambah progres.

File utama:

```text
src/domain/models/review.ts
src/domain/learning/
├── spaced-repetition.ts
└── review-queue.ts
src/infrastructure/database/review.ts
src/features/review/
├── ReviewPage.tsx
├── ReviewSession.tsx
└── useReviewRuns.ts
src/styles/review.css
tests/review.spec.ts
```

Kontrak penyimpanan, migrasi, integrasi quiz, fungsi penilaian vocabulary/grammar, routing, dan metadata versi juga diperbarui. Tidak ada dependency baru.

## STEP 5 — Quiz Engine

### Memulai dan mengerjakan

- `/quiz`: pilih **Vocabulary, Grammar, Mixed**, jumlah **10/20/30/50**, dan level **N5/N4/N3/N2/Custom**.
- Custom dapat memilih beberapa level, kategori, dan jenis soal. Kategori kosong berarti semua kategori. Mixed selalu seimbang: setengah vocabulary dan setengah grammar.
- Seed saat ini hanya menyediakan N3/N2. N5/N4 tetap dapat dipilih, tetapi sesi tidak bisa dimulai sebelum materi dan jumlah soal mencukupi. Jumlah soal tidak dikurangi secara diam-diam.
- Pertanyaan dibentuk dari vocabulary, grammar, penjelasan dan contoh yang tersimpan. Bentuk pengecoh grammar disiapkan sebagai latihan untuk contoh seed yang cocok, bukan teks sumber PDF. Grammar yang diubah atau materi pribadi tanpa template bentuk yang cocok tetap dapat digunakan pada jenis soal yang memenuhi syarat.
- Ada **12 jenis soal**: Japanese → Indonesian, Indonesian → Japanese, Kanji → Kana, Multiple choice, Vocabulary fill in blank, Context usage, Choose correct grammar, Grammar fill in blank, Correct sentence, Meaning, Grammar comparison, Situation.
- Soal dan opsi jawaban diacak sekali ketika sesi dibuat, lalu snapshot-nya disimpan. Tidak ada question ID berulang dalam satu sesi. Satu materi boleh muncul melalui jenis pertanyaan berbeda. Seleksi meratakan jenis soal dan mengutamakan materi yang belum muncul.
- Isian memakai jawaban Jepang. NFKC, spasi dan tanda baca dinormalisasi. Vocabulary menerima kanji atau kana. Grammar memeriksa bentuk pada contoh sesuai petunjuk; bukan penilai bebas semua kalimat Jepang yang mungkin benar.
- Jawaban dikunci setelah **Simpan & berikutnya**. Setelah jawaban terakhir, aplikasi membuka hasil. Jawaban yang sudah dikirim dan urutan soal bertahan setelah refresh.
- **Jeda**, **Simpan & keluar**, dan **Lanjutkan sesi** tersedia. Waktu aktif berhenti ketika tab tersembunyi atau saat jeda/penyimpanan. Checkpoint waktu setiap lima detik, saat visibilitas berubah, keluar, dan mengirim jawaban. Penutupan browser mendadak dapat kehilangan beberapa detik waktu terakhir; isian yang belum dikirim tidak dipulihkan.

### Hasil dan riwayat

`/quiz/result?id=<id>` menampilkan skor/akurasi, benar/total, jumlah salah, waktu aktif, persentase **Kotoba** dan **Bunpou**, semua kesalahan, jawabanmu, jawaban benar, pembahasan, serta sumber PDF/halaman. Komponen yang tidak diujikan menampilkan “Tidak diujikan”, bukan 0%. `/quiz/result` tanpa ID menampilkan hasil terbaru atau keadaan kosong.

Riwayat dapat dibuka kembali setelah refresh, diurutkan terbaru dan dipaginasi per 10 hasil. Snapshot hasil tetap ada ketika materi asal diedit/dihapus. Tautan ke materi yang sudah dihapus menampilkan kondisi tidak ditemukan.

### Penyimpanan dan integrasi progres

- IndexedDB schema **v3** menambahkan `quizAttempts` tanpa mereset data v1/v2. `quizResults` dan `sessions` tetap dipakai.
- `LearningDatabase.quiz.start/answer/checkpoint` menjadi batas penyimpanan; UI tidak memakai IndexedDB langsung. Backend mendatang dapat mengganti implementasi kontrak ini.
- Pengiriman jawaban memvalidasi pilihan, urutan dan waktu. Pengiriman ulang jawaban yang sama tidak menggandakan skor; konflik jawaban dari tab lain ditolak.
- Jawaban terakhir menyimpan attempt lengkap, hasil, sesi, dan pembaruan progres dalam **satu transaksi**. Retry tidak membuat dua hasil atau menghitung progres dua kali.
- Hasil quiz menambah bukti dimensi terkait (meaning, recognition, kanji, usage; understanding, usage, sentence untuk grammar). Bukti gabungan diberi `source: mixed`. Aturan minimal mastery tetap berlaku; skor satu sesi tidak otomatis menjadi MASTERED.
- Integrasi jadwal quiz kini mengikuti kebijakan STEP 6 di atas.

File utama:

```text
src/domain/models/quiz.ts
src/domain/quiz/
├── engine.ts
└── grammar-forms.ts
src/infrastructure/database/quiz.ts
src/features/quiz/
├── QuizPage.tsx
├── QuizRunner.tsx
├── QuizResultPage.tsx
└── useQuizRecords.ts
tests/quiz.spec.ts
```

Model/kontrak database, migrasi, route, styling, informasi versi, dan tampilan sumber mastery juga diperbarui.

## STEP 4 — Grammar System

- `/grammar`: search pola/arti/pembentukan/kategori, filter JLPT dan kategori, favorit, kelima status mastery, antrean jatuh tempo, sort dan pagination 12 kartu. Filter disimpan dalam URL.
- `/grammar/:id`: pola, arti, pembentukan, penjelasan, contoh/terjemahan, catatan materi/pribadi, kesalahan umum, grammar terkait, dan sumber PDF/halaman. Tautan kembali mempertahankan filter atau antrean asal.
- Edit materi juga dapat mengatur kesalahan umum dan relasi grammar; field kosong ditampilkan dengan pesan yang jelas. Seed lama tidak ditimpa atau diubah otomatis.
- `/review?type=grammar`: grammar yang jatuh tempo. Tab Vocabulary mempertahankan antrean sebelumnya. Review sekarang menjadwalkan materi tanpa menaikkan skor.
- Latihan pemahaman, penggunaan, dan penyusunan kalimat: tulis jawaban, bandingkan dengan rujukan, kemudian nilai diri. Ini bukan mesin quiz atau koreksi otomatis.
- Poin penilaian 0/40/75/100; rata-rata tiap aspek membentuk mastery tiga aspek. Aspek yang belum dinilai menyumbang 0. `NEW` sebelum penilaian, `WEAK` untuk Belum paham, `LEARNING` untuk Hampir paham, `REVIEW` untuk Paham/Sangat paham, dan `MASTERED` bila mastery ≥85%, tiap aspek ≥80%, minimal tiga penilaian per aspek. Bukti berstatus `self-rated`.
- Satu transaksi menyimpan progres, jadwal, respons latihan, event dan sesi. ID jawaban mencegah hitungan ganda saat retry. Menghapus grammar membersihkan progres, jadwal, favorit, contoh dan event terkait.
- Store `reviewEvents` menerima union event vocabulary/grammar; bentuk event vocabulary dan schema fisik IndexedDB v2 tetap kompatibel. Tidak ada reset database.

File utama baru:

```text
src/domain/learning/grammar.ts
src/infrastructure/database/grammar-learning.ts
src/features/grammar/
├── GrammarPage.tsx
├── GrammarDetailPage.tsx
├── GrammarProgress.tsx
├── GrammarPractice.tsx
├── ReviewPage.tsx
└── selection.ts
tests/grammar.spec.ts
```

Route, kontrak repository, types progres, editor/detail bersama, Favorit, Progress, gaya, metadata versi dan pengujian CRUD juga diperbarui.

## STEP 3 — Vocabulary System

- `/vocabulary`: search kanji/kana/romaji/arti/kategori, filter JLPT dan kategori, filter Semua/Favorit/Mastered/Review/Lemah/Baru, sort terbaru/kana/mastery/review, pagination 12 kartu.
- Search, filter, sort dan pagination disimpan di URL; tombol kembali dari detail mempertahankan daftar asal.
- `/vocabulary/:id`: kanji, kana, romaji, arti, part of speech, contoh/terjemahan, catatan materi/pribadi, sumber PDF/halaman, favorit, edit, mastery, dan jadwal review. ID yang tidak ada menampilkan kondisi tidak ditemukan.
- Setiap kartu menampilkan kanji, kana, arti, JLPT, kategori, status, skor mastery, dan jadwal review.
- `/vocabulary/flashcards`: latihan seluruh hasil filter (bukan hanya halaman pagination), latihan satu kata dari detail, balik kartu, acak sisa kartu, lewati tanpa menilai, dan ringkasan hasil.
- `/review`: vocabulary dengan jadwal yang sudah jatuh tempo. Tombol Review sekarang pada detail memasukkan materi ke antrean tanpa memberi skor. Review otomatis diperbarui setiap 30 detik pada daftar.
- Progres yang tersimpan sebelum refresh tetap ada. Urutan sesi flashcard dimulai kembali setelah refresh; bukan sesi resumable.

### Penilaian flashcard

| Jawaban | Poin pengenalan | Interval awal |
| --- | ---: | --- |
| 😵 Belum tahu | 0 | 10 menit |
| 😐 Hampir tahu | 40 | 1 hari |
| 🙂 Tahu | 75 | 3 hari |
| 🔥 Sangat hafal | 100 | 7 hari |

Skor pengenalan adalah rata-rata poin penilaian diri. Review berikutnya kini mengikuti tabel interval STEP 6; label flashcard dipetakan ke Wrong/Hard/Good/Easy. Interval dibatasi 180 hari.

Setiap jawaban memperbarui `reviewCount`, `correctCount` (Tahu/Sangat hafal), `wrongCount` (Belum/Hampir tahu), `lastReviewed`, `nextReview`, dimensi pengenalan, dan `masteryScore`. Counter ini merekam penilaian diri pada flashcard, bukan akurasi quiz.

Mastery vocabulary merupakan rata-rata empat aspek: recognition, meaning, kanji, usage. Aspek belum diuji belum memberi poin; karena itu pengenalan 100% saja menyumbang mastery 25%. `MASTERED` dari perhitungan flashcard memerlukan mastery ≥85%, skor setiap aspek ≥80%, dan minimal tiga percobaan tiap aspek. Flashcard sendiri hanya menguji pengenalan; tidak dapat membuktikan pemahaman penggunaan. Tidak ada tombol untuk memberi status Mastered secara manual.

### Konsistensi dan migrasi

Schema IndexedDB ditingkatkan ke versi 2 dengan store `reviewEvents`. Migrasi menambahkan store tanpa menghapus database versi 1 atau mengulang seed.

`LearningDatabase.learning.recordVocabularyReview()` memperbarui progress, schedule, review event, dan study session dalam satu transaksi. `eventId` menjaga idempotensi: pengulangan request yang sama tidak menambah skor atau waktu dua kali. ID yang digunakan untuk payload lain ditolak. UI mengunci tombol selama penyimpanan; kegagalan tidak memajukan kartu dan dapat dicoba kembali dengan identitas jawaban yang sama.

Sesi belajar hanya dibuat setelah ada jawaban tersimpan. Waktu aktif mengabaikan tab yang disembunyikan dan dibatasi lima menit per kartu. Melewati kartu tidak membuat progres atau sesi. Menghapus materi membersihkan event review terkait; menghapus progres mereset progres dan jadwal, sementara event historis tetap tersimpan.

File tambahan utama: `src/domain/learning/vocabulary.ts`, `src/infrastructure/database/vocabulary-learning.ts`, dan `src/features/vocabulary/{VocabularyPage,VocabularyDetailPage,FlashcardPage,VocabularyProgress}.tsx`, `selection.ts`. Pengujian STEP 3 ada di `tests/vocabulary.spec.ts`.

## STEP 2 yang tetap berfungsi

- IndexedDB native dengan database `nihongo-master`, schema version 6, transaksi atomik, validasi, dan error yang ditampilkan.
- Interface TypeScript untuk **Vocabulary, Grammar, ExampleSentence, LearningProgress, QuizQuestion, QuizResult, ReviewSchedule, StudySession, PDFMaterial, PDFPage, Category**, ditambah Favorite.
- CRUD vocabulary, grammar, kategori, learning progress, dan favorit melalui repository async.
- UI tambah/edit/hapus vocabulary dan grammar; detail contoh kalimat dan rujukan sumber; pencarian, filter level/kategori, pagination.
- CRUD kategori di **Pengaturan**. Menghapus kategori hanya melepas relasinya dari materi.
- Favorit melalui ikon hati; halaman **Favorit** mendukung baca, edit catatan, dan hapus.
- Catatan progres melalui **Detail materi**; tambah, baca, edit, dan hapus. Progres juga ditampilkan di halaman Progress.
- Pembaruan lintas tab melalui BroadcastChannel dan pemuatan ulang saat tab memperoleh fokus.
- Semua navigasi, sidebar, menu mobile, tema gelap, dan preferensi tema dari STEP 1 dipertahankan.

Membuka materi atau menyimpan catatan **tidak** menambah mastery maupun sesi belajar. UI catatan hanya mengubah notes. Pada STEP 3, penilaian flashcard juga memperbarui bukti pengenalan dan jadwal review. Skor yang belum diuji bernilai `null`, bukan kemampuan 0%.

## Seed awal

| Jenis | N3 | N2 | Total |
| --- | ---: | ---: | ---: |
| Vocabulary | 50 | 20 | 70 |
| Grammar | 20 | 10 | 30 |

Setiap materi memiliki contoh Jepang dan terjemahan Indonesia (100 ExampleSentence), `sourcePdfId`, `sourcePage`, level, kategori, dan penanda `isSeed`. Terdapat 11 kategori serta 4 PDFMaterial dan 100 PDFPage **dummy**. Metadata ini tidak mewakili berkas PDF yang benar-benar ada.

Seed adalah materi buatan untuk pengembangan sesuai instruksi STEP 2, bukan kutipan atau hasil ekstraksi PDF. Level merupakan pengelompokan belajar ilustratif, termasuk penguatan prasyarat. JLPT tidak menerbitkan daftar resmi kosakata/grammar untuk tes saat ini; lihat [panduan resmi JLPT, pertanyaan 7](https://www.jlpt.jp/tw/reference/pdf/guidebook_s_e.pdf). Seed tidak dimaksudkan sebagai kurikulum final atau pengganti materi PDF pengguna.

Seed dimasukkan **sekali** dalam transaksi yang sama dengan marker `meta/seed-v1`. Pembukaan ulang, refresh, React StrictMode, dan dua tab tidak menggandakan data. Materi seed yang diedit/dihapus tidak dikembalikan otomatis. Tidak ada seed untuk progres, favorit, hasil quiz, review, atau sesi belajar.

## Pemisahan data

| CONTENT DATA | USER PROGRESS DATA |
| --- | --- |
| vocabulary | progress |
| grammar | favorites |
| examples | schedules |
| categories | quizResults |
| materials | sessions |
| pages | quizAttempts / reviewRuns / reviewEvents |
| questions | |

`meta` menyimpan versi seed. Konten tidak memiliki field skor, status mastery, atau favorit. Catatan materi berbeda dari catatan progres dan catatan favorit.

Semua entitas memakai ID stabil dan timestamp ISO. `sourcePdfId` menunjuk `PDFMaterial.id`; `sourcePage` adalah indeks halaman berbasis 1. `additionalSources` memungkinkan satu materi memiliki banyak sumber tanpa memisahkan progres. Vocabulary dengan kombinasi bentuk/bacaan/makna yang sama ditolak sebagai duplikat; grammar dengan pola/makna sama juga ditolak. Homograf yang berbeda makna dapat disimpan terpisah.

Progres menggunakan key unik `itemType:itemId`. Favorit menggunakan key target unik; catatan favorit dapat diubah tanpa mengubah target. `QuizResult` menyediakan snapshot pertanyaan agar histori kelak tidak bergantung pada perubahan materi.

## Arsitektur penyimpanan

```text
React pages / DataProvider
          ↓
LearningDatabase + Repository<T> (async contract)
          ↓
services/database.ts (pilihan adapter)
          ↓
IndexedDB repositories → validasi → transaksi native
```

Repository menyediakan `list`, `get`, `create`, `update`, `delete`. React tidak mengakses object store secara langsung. Untuk memakai backend, buat adapter HTTP yang memenuhi `LearningDatabase`, lalu ganti instansiasi di `src/services/database.ts`. Adapter backend harus mempertahankan aturan validasi, keunikan, cascade, dan transaksi yang sama. Sinkronisasi/migrasi data lokal ke server merupakan pekerjaan terpisah, bukan otomatis hanya dengan mengganti adapter.

Schema pertama memakai object stores terpisah; index tersedia untuk level JLPT, kategori, item terkait, dan halaman PDF. Upgrade berikutnya ditambahkan berdasarkan `oldVersion` pada `onupgradeneeded`; jangan mengganti atau menghapus store yang sudah berisi data. Koneksi ditutup saat menerima `versionchange`.

Perubahan dinyatakan berhasil setelah transaksi `oncomplete`. Jika validasi atau penulisan gagal, transaksi dibatalkan. Penghapusan materi membersihkan contoh, pertanyaan, progres, jadwal, dan favorit terkait dalam transaksi yang sama. Snapshot hasil quiz tetap dipertahankan sebagai riwayat. Penghapusan progres membersihkan jadwalnya tanpa menghapus materi.

IndexedDB tidak memakai fallback diam-diam ke penyimpanan sementara: jika tidak tersedia, pengguna melihat error dan tombol coba lagi. Tema tetap disimpan di LocalStorage seperti sebelumnya.

**Batas penyimpanan:** data berada di browser dan origin yang sama. `localhost` dan `127.0.0.1`, port lain, atau browser lain mempunyai database berbeda. Menghapus data situs juga menghapus database. STEP 2 belum menyediakan backup atau cloud sync.

## Struktur file utama

```text
src/
├── main.tsx
├── app/
│   ├── router.tsx
│   ├── navigation.ts
│   ├── theme.tsx
│   ├── data/DataProvider.tsx
│   └── layouts/AppLayout.tsx
├── components/
│   ├── ui.tsx
│   ├── Modal.tsx
│   └── DataState.tsx
├── domain/models/
│   ├── content.ts
│   ├── progress.ts
│   └── index.ts
├── repositories/contracts.ts
├── infrastructure/database/
│   ├── indexeddb.ts
│   ├── repositories.ts
│   └── validation.ts
├── services/
│   ├── database.ts
│   └── progress.ts
├── data/seed.ts
├── features/
│   ├── dashboard/DashboardPage.tsx
│   ├── content/ContentPages.tsx
│   ├── content/ContentEditor.tsx
│   ├── content/ContentDetail.tsx
│   ├── categories/CategoryManager.tsx
│   ├── favorites/FavoritesPage.tsx
│   ├── progress/ProgressPage.tsx
│   ├── learning/LearningPages.tsx
│   └── settings/SettingsPage.tsx
└── styles/index.css

tests/
├── foundation.spec.ts
└── database.spec.ts
```

Demo satu kartu dari STEP 1 digantikan oleh seed persisten. Semua route tetap tersedia: `/dashboard`, `/vocabulary`, `/grammar`, `/quiz`, `/review`, `/progress`, `/materials`, `/favorites`, `/settings`, redirect `/`, dan halaman 404. Detail vocabulary memakai `/vocabulary/:id`; flashcard memakai `/vocabulary/flashcards`. Detail grammar memakai `/grammar/:id`; URL lama `/grammar?item=<id>` tetap didukung. URL vocabulary lama `/vocabulary?item=<id>` tetap didukung untuk kompatibilitas.

## Pengujian

```bash
npx playwright install chromium
npm test
```

Di Linux, pustaka sistem yang belum tersedia dapat dipasang melalui `npx playwright install --with-deps chromium` sesuai izin perangkat. Opsional: set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` untuk memakai Chrome/Chromium yang sudah terpasang.

Tes database berjalan dalam konteks browser terisolasi; tidak menghapus data browser pribadi pengguna. Cakupan: jumlah seed dan referensi, semua CRUD, persistensi setelah refresh, hapus permanen tanpa reseed, validasi/rollback, cleanup relasi, tidak adanya mastery palsu, sinkronisasi dua tab, dan penanganan IndexedDB yang tidak tersedia. Tes fondasi memeriksa navigasi, tema, responsive layout, serta halaman 404.

Contoh uji manual:

1. Buka Vocabulary, cari kata, klik ikon hati, lalu refresh.
2. Buka Favorit; kata tersebut masih tersimpan. Edit catatannya dan refresh lagi.
3. Buka Detail materi, tulis catatan belajar, simpan, lalu refresh URL detail.
4. Tambahkan kategori dari Pengaturan, gunakan kategori itu pada materi, lalu hapus kategori. Materi tetap ada.
5. Hapus satu materi seed dan refresh. Materi tersebut tidak muncul kembali.

## Batas pengerjaan

STEP 1–12 sudah mencakup fondasi, database pembelajaran, vocabulary, grammar, quiz, review, progress tracking, serta PDF upload/storage/reader/bookmark/page tracking/source reference. Membaca PDF tidak dianggap bukti mastery. Penyimpanan tetap lokal di browser; backup dan cloud sync belum tersedia.

STEP 9 menambahkan ekstraksi teks, identifikasi kandidat dan persetujuan manusia sebelum masuk database. STEP 10 menghubungkan quiz dengan PDF/unit/halaman terpilih. STEP 11 menambahkan rekomendasi Dashboard dari database. **Impor/ekspor konten tersedia pada STEP 12 di atas.**


## Reset progres belajar

Buka Pengaturan → Reset progres belajar → ketik `RESET` → Ya, reset semua progres.
Reset menghapus mastery, jadwal dan hitungan review, riwayat quiz, sesi aktif, waktu belajar, streak, serta progres membaca PDF. Materi kembali NEW / belum dinilai.
Vocabulary, grammar, contoh, kategori, PDF, hasil ekstraksi, catatan pribadi, favorit, dan bookmark tetap disimpan. Tema tidak berubah. Reset tidak mengembalikan materi demo.

Tindakan ini tidak dapat dibatalkan. Ekspor JSON/CSV saat ini hanya mencadangkan konten, bukan progres. Reset berlaku untuk penyimpanan browser dan alamat situs yang sedang dibuka; tab lain pada origin yang sama menerima notifikasi untuk dimuat ulang melalui BroadcastChannel.

Validasi fitur: build produksi berhasil; 2 tes browser reset lulus, meliputi konfirmasi/pembatalan, preservasi materi dan catatan, persistensi setelah refresh, dan belajar kembali. Tes memakai database browser terpisah. Data pengguna tidak direset saat implementasi.


## Saran & laporan bug

Buka menu Saran & Bug atau tautan pada Pengaturan. Isi jenis masukan, judul, bagian aplikasi, uraian, serta langkah reproduksi dan hasil yang diharapkan jika melaporkan bug. Tekan Kirim lewat email untuk langsung membuka aplikasi email tanpa tahap pratinjau.

Penerima default: aji.stwn71@gmail.com. Dapat diganti melalui VITE_FEEDBACK_EMAIL saat build (lihat .env.example). Alamat ini publik. Tidak ada layanan pengiriman email/server inbox: pengguna harus menekan Kirim di aplikasi email mereka. Aplikasi tidak mengklaim email telah terkirim. Salin dan unduh laporan tersedia jika aplikasi email tidak dikonfigurasi.

Draf disimpan lokal di browser. Hanya teks isian yang dilampirkan; PDF dan database belajar tidak ikut dikirim. Tidak ada email uji yang dikirim. Tes browser fitur mencakup validasi, draf setelah refresh, penerima/body mailto, unduhan, dan lebar layar mobile.


## Hapus semua data belajar

Pengaturan → Hapus semua data → ketik HAPUS SEMUA → Ya, hapus semua data.
Mengosongkan vocabulary, grammar, kategori, contoh, PDF beserta berkas dan halaman, hasil/draf ekstraksi, question bank, progres, catatan, favorit/bookmark, jadwal review, quiz aktif/riwayat, review aktif, serta sesi/waktu/streak. Semua tabel data pengguna dikosongkan dalam satu transaksi IndexedDB; marker migrasi tetap disimpan agar materi demo tidak kembali.

Berbeda dari Reset progres belajar yang mempertahankan konten. Penghapusan berlaku pada browser/origin saat ini dan tidak menghapus PDF asli pada perangkat, tema, maupun draf saran. Tab lain menerima notifikasi reset untuk reload. Export JSON/CSV bukan backup progres atau berkas PDF. Penghapusan tidak dapat dibatalkan.

Validasi: build produksi berhasil; 3 tes browser reset/hapus data lulus. Mencakup penolakan tanpa konfirmasi, pembatalan, seluruh tabel kosong setelah reload, preferensi lokal tetap ada, rollback transaksi saat gagal, serta regresi reset progres. Database pengguna asli tidak dihapus.
