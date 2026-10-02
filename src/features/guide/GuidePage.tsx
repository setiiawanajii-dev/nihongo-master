import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Files, RotateCcw } from 'lucide-react';
import { Card, PageHeading } from '../../components/ui';

const topics = [
  ['mulai', 'Mulai belajar'],
  ['materi', 'Vocabulary & grammar'], ['quiz', 'Latihan quiz'], ['review', 'Review & progres'],
  ['impor', 'Import & export'], ['data', 'Penyimpanan & reset'], ['bantuan', 'Kendala umum'],
];
function Go({ to, children }: { to: string; children: string }) {
  return <Link className="text-link" to={to}>{children}<ArrowUpRight size={15} aria-hidden="true" /></Link>;
}
export function GuidePage() {
  return <div className="guide-page">
    <PageHeading eyebrow="使い方 / PANDUAN" title="Mulai dari sini, belajar dengan nyaman." description="Panduan menggunakan Nihongo Master, dari menambahkan materi hingga mengulang pelajaran." />
    <Card className="guide-intro"><BookOpen size={28} aria-hidden="true" /><div><h2>Materimu → belajar → quiz → review</h2><p>Tidak perlu menggunakan semua fitur sekaligus. Tambahkan beberapa materi, pelajari, lalu ulangi secara bertahap.</p></div></Card>
    <nav className="guide-topics" aria-label="Daftar isi panduan">{topics.map(([id, title], i) => <a key={id} href={`#${id}`}><span>{String(i + 1).padStart(2, '0')}</span>{title}</a>)}</nav>
    <div className="guide-sections">
      <Card className="guide-section" id="mulai"><span className="eyebrow">01 / LANGKAH PERTAMA</span><h2>Mulai belajar</h2>
        <ol><li>Buka <strong>Dashboard</strong> untuk melihat rekomendasi dan materi yang perlu diulang.</li><li>Jika koleksi masih kosong, buka <strong>Import / Export</strong> untuk memasukkan JSON/CSV, atau tambahkan vocabulary dan grammar secara manual.</li><li>Pelajari materi, coba quiz ketika soal sudah mencukupi, lalu gunakan Review untuk mengulangnya.</li></ol>
        <p className="guide-note">Angka di Dashboard berasal dari aktivitasmu. Koleksi kosong atau materi yang belum dinilai belum memiliki bukti penguasaan.</p><Go to="/dashboard">Buka Dashboard</Go>
      </Card>
      <Card className="guide-section" id="materi"><span className="eyebrow">02 / PELAJARI MATERI</span><h2>Vocabulary dan grammar</h2>
        <p>Untuk menambah materi sendiri, pilih <strong>Tambah vocabulary</strong> atau <strong>Tambah grammar</strong>. Gunakan pencarian serta filter JLPT dan kategori untuk menemukan materi. Buka detail untuk membaca makna, contoh, catatan. Tandai favorit agar mudah ditemukan kembali.</p>
        <ol><li>Untuk materi sendiri, gunakan tombol tambah pada halaman Vocabulary atau Grammar dan isi formulirnya.</li><li>Di Vocabulary, pilih <strong>Flashcard</strong>. Pelajari kartu lalu beri penilaian: 😵 Belum tahu, 😐 Hampir tahu, 🙂 Tahu, atau 🔥 Sangat hafal.</li><li>Nilai sesuai kemampuanmu. Jawaban memperbarui progres dan membantu menentukan pengulangan berikutnya.</li><li>Untuk grammar, pelajari pola, penjelasan, contoh, dan kesalahan umum yang tersedia, lalu lanjutkan latihan atau review.</li></ol>
        <p className="guide-note"><strong>NEW</strong>: belum dipelajari · <strong>LEARNING</strong>: sedang dipelajari · <strong>REVIEW</strong>: perlu pengulangan · <strong>WEAK</strong>: perlu perhatian · <strong>MASTERED</strong>: sudah dikuasai.</p>
        <div className="entry-actions"><Go to="/vocabulary">Buka Vocabulary</Go><Go to="/grammar">Buka Grammar</Go><Go to="/favorites">Buka Favorit</Go></div>
      </Card>
      <Card className="guide-section" id="quiz"><span className="eyebrow">03 / UJI PEMAHAMAN</span><h2>Latihan quiz</h2>
        <ol><li>Buka <strong>Quiz</strong>, lalu pilih Vocabulary, Grammar, atau Mixed.</li><li>Pilih jumlah soal dan level. Gunakan <strong>Custom</strong> untuk menyesuaikan level, kategori, serta jenis soal.</li><li>Periksa jumlah soal tersedia, lalu tekan <strong>Mulai quiz</strong>.</li><li>Setelah selesai, lihat skor, akurasi, dan daftar kesalahan. Gunakan <strong>Review Material</strong> pada jawaban salah untuk membuka materi terkait.</li></ol>
        <p className="guide-note">Jika tombol mulai belum aktif, kurangi jumlah soal atau perluas filter. Pilihan ganda membutuhkan alternatif jawaban yang cukup; aplikasi tidak menambahkan materi di luar koleksi belajarmu secara otomatis.</p><Go to="/quiz">Buka Quiz</Go>
      </Card>
      <Card className="guide-section" id="review"><span className="eyebrow">04 / JAGA INGATAN</span><h2>Review dan pantau progres</h2>
        <p>Buka <strong>Review</strong> untuk melihat materi yang waktunya diulang. Pilih Vocabulary, Grammar, atau Mixed, lalu jalankan sesi yang tersedia. Jawab dan nilai kemampuanmu secara jujur.</p>
        <p>Jawaban salah atau sulit akan mendapat pengulangan lebih dekat. Jawaban yang sudah dikuasai mendapat jarak lebih panjang. Hasil review memperbarui mastery, hitungan benar/salah, dan jadwal berikutnya.</p>
        <p>Di <strong>Progress</strong>, lihat penguasaan materi, hasil quiz, sesi dan waktu belajar, streak, serta perjalanan N5–N2. Dashboard membantu memilih apa yang sebaiknya dipelajari berikutnya.</p>
        <p className="guide-note">Jika antrean review kosong, belum ada materi yang jatuh tempo. Kamu tetap bisa mempelajari materi baru atau berlatih melalui quiz.</p><div className="entry-actions"><Go to="/review">Buka Review</Go><Go to="/progress">Buka Progress</Go></div>
      </Card>
      <Card className="guide-section" id="impor"><span className="eyebrow">05 / PINDAHKAN KONTEN</span><h2>Import dan export JSON / CSV</h2><p>Ini jalur utama untuk memasukkan banyak materi. Unduh contoh berkas dari halaman Import / Export, ganti isinya dengan materi sendiri, lalu impor.</p>
        <ol><li>Buka <strong>Import / Export</strong>. Pilih berkas JSON/CSV atau tempel isinya, dan pilih jenis materi jika berkas tidak menyertakannya.</li><li>Tekan <strong>Periksa impor</strong>, lalu perbaiki kesalahan validasi sebelum melanjutkan.</li><li>Untuk duplikat: <strong>Merge</strong> menggabungkan sambil mempertahankan ID dan progres; <strong>Keep Both</strong> membuat materi baru dengan progres baru; <strong>Ignore</strong> melewati duplikat.</li><li>Periksa pratinjau dan jalankan impor. Gunakan <strong>Export JSON</strong> atau <strong>Export CSV</strong> untuk menyimpan konten ke berkas.</li></ol>
        <p className="guide-note">Export bukan backup seluruh aplikasi. Progres, riwayat quiz, dan favorit tidak disertakan.</p><Go to="/data-transfer">Buka Import / Export</Go>
      </Card>
      <Card className="guide-section" id="data"><span className="eyebrow">06 / PENGATURAN</span><h2>Penyimpanan, tampilan, dan reset</h2>
        <p>Materi dan progres disimpan di browser yang sedang digunakan. Refresh biasa tidak menghapus data, tetapi menghapus data situs dapat menghilangkannya. Perangkat, browser, dan alamat situs yang berbeda memiliki penyimpanan terpisah. Login dan sinkronisasi lintas perangkat belum tersedia.</p>
        <p>Ganti mode terang/gelap melalui ikon di header atau <strong>Pengaturan</strong>. Kategori materi juga bisa dikelola di Pengaturan.</p>
        <p>Ingin mulai belajar ulang? Buka <strong>Pengaturan → Reset progres belajar</strong>, ketik <strong>RESET</strong>, lalu konfirmasi. Mastery, jadwal review, riwayat quiz, sesi, waktu belajar, dan streak kembali ke awal.</p>
        <p className="guide-note">Reset tidak dapat dibatalkan. Materi, catatan, dan favorit tetap disimpan. Jangan gunakan reset untuk memperbaiki kendala tampilan.</p><Go to="/settings">Buka Pengaturan</Go>
      </Card>
      <Card className="guide-section" id="bantuan"><span className="eyebrow">07 / BUTUH BANTUAN?</span><h2>Kendala yang sering ditemui</h2>
        <details><summary>Materi belum muncul setelah memilih berkas</summary><p>Tekan Periksa impor, perbaiki kolom yang bermasalah, lalu tekan Simpan impor. Memilih berkas saja belum menyimpan materi.</p></details><details><summary>Data berbeda saat membuka website di HP lain</summary><p>Data masih tersimpan lokal, bukan di akun online. Import/export dapat memindahkan konten, tetapi tidak memindahkan progres belajar.</p></details>
        <details><summary>Laporan bug belum masuk ke pembuat</summary><p>Tombol Kirim lewat email membuka aplikasi email. Tekan Kirim di aplikasi email tersebut. Jika tidak terbuka, salin atau unduh laporan dan kirim manual ke alamat yang ditampilkan.</p></details>
        <Go to="/feedback">Kirim saran atau lapor bug</Go>
      </Card>
    </div>
    <div className="guide-bottom"><Files size={18} aria-hidden="true" /><Go to="/data-transfer">Tambahkan materi pertamamu</Go><RotateCcw size={18} aria-hidden="true" /><Go to="/review">Lanjutkan review</Go></div>
  </div>;
}
