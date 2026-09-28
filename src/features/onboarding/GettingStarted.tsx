import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileUp, PencilLine } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { Modal } from '../../components/Modal';

export function LearningSteps() {
 return <ol className="learning-steps" aria-label="Langkah belajar">
  <li><span>1</span><div><strong>Tambah materi</strong><p>Isi sendiri atau impor dari file.</p></div></li>
  <li><span>2</span><div><strong>Belajar & quiz</strong><p>Kenali materi, lalu uji pemahaman.</p></div></li>
  <li><span>3</span><div><strong>Ulangi pelajaran</strong><p>Buka Review saat jadwalnya tiba.</p></div></li>
 </ol>;
}
export function GettingStarted() {
 const [choosing, setChoosing] = useState(false);
 return <section className="getting-started" aria-label="Mulai belajar">
  <Card className="welcome-card"><BookOpen size={30} aria-hidden="true"/><h2>Selamat datang di Nihongo Master 👋</h2><p>Yuk, masukkan materi pertamamu untuk mulai belajar. Kamu bisa mulai dari satu kata atau satu pola grammar.</p><div className="entry-actions"><Button id="add-first-material" onClick={() => setChoosing(true)}>Tambah materi pertama</Button><Link className="text-link" to="/guide#mulai">Lihat panduan singkat</Link></div></Card>
  <LearningSteps/><p className="small-note">Flashcard membantu mengenal kata. Kamu juga boleh langsung quiz jika soal yang tersedia mencukupi.</p>
  {choosing && <Modal title="Bagaimana ingin menambah materi?" onClose={() => { setChoosing(false); requestAnimationFrame(() => document.getElementById("add-first-material")?.focus()); }}><div className="getting-started-options">
   <section><PencilLine aria-hidden="true"/><h3>Isi manual</h3><p>Masukkan kata atau grammar satu per satu. Cocok untuk mulai belajar.</p><div className="entry-actions"><Link className="button button-primary" to="/vocabulary?add=1">Tambah vocabulary</Link><Link className="button button-secondary" to="/grammar?add=1">Tambah grammar</Link></div></section>
   <section><FileUp aria-hidden="true"/><h3>Impor dari file</h3><p>Masukkan banyak materi sekaligus menggunakan JSON/CSV. Tersedia contoh file yang bisa kamu isi.</p><Link className="button button-secondary" to="/data-transfer#import-materi">Pilih file materi</Link></section>
  </div></Modal>}
 </section>;
}
export function SavedMaterial({ kind, id, onDismiss }: { kind: 'vocabulary' | 'grammar'; id: string; onDismiss: () => void }) {
 return <div className="info-banner saved-material"><p role="status"><strong>✓ Materimu sudah tersimpan!</strong> Kamu bisa mulai belajar sekarang.</p><div className="entry-actions">{kind === 'vocabulary' && <Link className="button button-primary" to={`/vocabulary/flashcards?only=${encodeURIComponent(id)}`}>Belajar dengan flashcard</Link>}<Link className="button button-secondary" to={`/${kind}/${encodeURIComponent(id)}`}>Buka materi</Link><Button variant="secondary" onClick={onDismiss}>Tutup pemberitahuan</Button></div></div>;
}
