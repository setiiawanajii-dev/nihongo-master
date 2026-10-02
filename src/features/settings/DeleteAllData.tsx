import { SuccessDialog } from '../../components/SuccessDialog';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Button, Card } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { ErrorMessage, useOperation } from '../../components/DataState';

export function DeleteAllData() {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [success, setSuccess] = useState(false);
  const { busy, error, run } = useOperation();
  return <Card className="settings-card delete-data-card">
    <h2>Kosongkan semua data belajar</h2>
    <p className="detail-paragraph">Hapus vocabulary, grammar, kategori, contoh kalimat sekaligus. Progres, catatan, favorit, jadwal review, serta riwayat quiz dan sesi belajar juga dihapus.</p>
    <p className="detail-paragraph muted">Gunakan ini jika ingin koleksi benar-benar kosong. Untuk mengulang belajar dengan materi yang sama, gunakan Reset progres belajar di atas.</p>
    <div className="entry-actions"><Button variant="secondary" className="delete-data-button" disabled={data.loading || !!data.error || busy} onClick={() => { setConfirmation(''); setSuccess(false); setOpen(true); }}><Trash2 size={17} aria-hidden="true" />Hapus semua data</Button><Link className="text-link" to="/data-transfer">Export konten terlebih dahulu</Link></div>

    {open && <Modal title="Hapus semua data belajar?" busy={busy} onClose={() => setOpen(false)}>
      <p className="detail-paragraph"><strong>Tindakan ini permanen dan tidak dapat dibatalkan.</strong> Semua materi dan data belajar pada browser dan alamat situs ini akan dihapus, termasuk catatan dan progres.</p>
      <p className="detail-paragraph">Berkas asli di komputer, pengaturan tema, dan draf saran tidak dihapus. Tab aplikasi lain pada alamat situs yang sama akan dimuat ulang.</p>
      <p className="detail-paragraph">Export JSON/CSV hanya menyimpan konten, bukan progres.</p>
      <form className="data-form" onSubmit={event => { event.preventDefault(); if (confirmation !== 'HAPUS SEMUA') return; void run(() => data.mutate(() => database.deleteAllLearningData(confirmation), 'reset'), () => { setOpen(false); setSuccess(true); }); }}>
        <label>Ketik HAPUS SEMUA untuk melanjutkan<input autoComplete="off" spellCheck={false} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></label>
        <ErrorMessage message={error} />
        <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Batal</Button><Button type="submit" className="delete-data-confirm" disabled={busy || confirmation !== 'HAPUS SEMUA'}>{busy ? 'Menghapus data…' : 'Ya, hapus semua data'}</Button></div>
      </form>
    </Modal>}
    {success && <SuccessDialog title="Semua data belajar berhasil dihapus" message="Semua data belajar berhasil dihapus. Koleksi dan progres kini kosong. Anda bisa mulai menambahkan materi baru." onClose={() => setSuccess(false)} />}
  </Card>;
}
