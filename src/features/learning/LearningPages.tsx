import { Link } from 'react-router-dom';
import { ListChecks, RotateCcw, Files, Heart, ArrowLeft } from 'lucide-react';
import { Badge, EmptyState, PageHeading } from '../../components/ui';

const pageContent = {
  quiz: { eyebrow: 'クイズ / QUIZ', title: 'Uji pemahamanmu.', description: 'Dari mengenali kata hingga memahami penggunaannya.', icon: ListChecks, emptyTitle: 'Sesi pertamamu menunggu.', emptyDescription: 'Halaman quiz sudah siap. Sistem pertanyaan, jawaban, dan penilaian akan dibuat pada tahap quiz.', to: '/vocabulary', action: 'Lihat contoh vocabulary' },
  review: { eyebrow: '復習 / REVIEW', title: 'Kembali, agar lebih melekat.', description: 'Ruang untuk mengulang dan memperkuat yang sudah dipelajari.', icon: RotateCcw, emptyTitle: 'Belum ada jadwal review.', emptyDescription: 'Antrean review akan tersedia setelah sistem latihan dan spaced repetition diimplementasikan.', to: '/dashboard', action: 'Kembali ke dashboard' },
  materials: { eyebrow: '教材 / MATERI PDF', title: 'Semua bermula dari materimu.', description: 'Satu tempat untuk sumber pembelajaran Bahasa Jepang pilihanmu.', icon: Files, emptyTitle: 'Rak bukumu masih kosong.', emptyDescription: 'Database sekarang menyimpan referensi sumber dummy untuk seed. Upload, pembaca, dan pemrosesan PDF belum dibuat.', to: '/dashboard', action: 'Kembali ke dashboard' },
  favorites: { eyebrow: 'お気に入り / FAVORIT', title: 'Simpan yang ingin kamu ingat.', description: 'Koleksi pribadi untuk kata, pola, dan halaman yang berarti.', icon: Heart, emptyTitle: 'Belum ada materi favorit.', emptyDescription: 'Penyimpanan favorit akan tersedia saat materi vocabulary, grammar, dan halaman PDF sudah terhubung ke database.', to: '/grammar', action: 'Lihat contoh grammar' },
};
export function LearningPage({ kind }: { kind: keyof typeof pageContent }) {
  const content = pageContent[kind];
  return <><PageHeading eyebrow={content.eyebrow} title={content.title} description={content.description}><Badge tone="neutral">Database · STEP 2</Badge></PageHeading><EmptyState icon={content.icon} title={content.emptyTitle} description={content.emptyDescription} to={content.to} action={content.action} /><p className="stage-note">Navigasi halaman ini aktif. Fitur pembelajaran hadir secara bertahap.</p></>;
}

export function NotFoundPage() {
  return <><PageHeading eyebrow="404 / ページが見つかりません" title="Sepertinya kamu salah jalan." description="Halaman ini tidak ditemukan. Ruang belajarmu tetap ada di sini." /><Link className="button button-primary" to="/dashboard"><ArrowLeft size={17} /> Kembali ke dashboard</Link></>;
}
