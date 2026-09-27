import { useState } from 'react';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Button, Card } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { ErrorMessage, useOperation } from '../../components/DataState';

export function ResetProgress() {
  const { mutate, loading, error: dataError } = useData();
  const [open, setOpen] = useState(false), [confirmation, setConfirmation] = useState(''), [success, setSuccess] = useState(false);
  const { busy, error, run } = useOperation();
  return <Card className="settings-card"><h2>Mulai belajar dari awal</h2>
    <p className="detail-paragraph">Reset mastery, jadwal review, hasil quiz, sesi belajar, waktu belajar, streak, dan progres membaca PDF. Semua materi kembali berstatus NEW / belum dinilai.</p>
    <p className="detail-paragraph muted">Vocabulary, grammar, contoh, kategori, PDF, hasil ekstraksi, catatan pribadi, favorit, dan bookmark tetap disimpan.</p>
    <Button variant="secondary" disabled={loading || !!dataError || busy} onClick={() => { setConfirmation(''); setSuccess(false); setOpen(true); }}>Reset progres belajar</Button>
    {success && <p className="setting-feedback" role="status">Progres berhasil direset. Materi Anda tetap tersimpan dan siap dipelajari kembali.</p>}
    {open && <Modal title="Reset semua progres belajar?" busy={busy} onClose={() => setOpen(false)}>
      <p className="detail-paragraph">Riwayat quiz, sesi yang sedang berjalan, penilaian, jadwal review, dan tracking membaca akan dihapus. Tindakan ini tidak dapat dibatalkan. Tab aplikasi lain pada browser ini akan dimuat ulang.</p>
      <p className="detail-paragraph">Materi, file PDF, catatan, favorit, dan bookmark tidak dihapus. Ekspor JSON/CSV saat ini tidak mencadangkan progres.</p>
      <form className="data-form" onSubmit={event => { event.preventDefault(); if (confirmation !== 'RESET') return; void run(() => mutate(() => database.resetLearningProgress(true), 'reset'), () => { setOpen(false); setSuccess(true); }); }}>
        <label>Ketik RESET untuk melanjutkan<input autoComplete="off" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></label>
        <ErrorMessage message={error} />
        <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={busy || confirmation !== 'RESET'}>{busy ? 'Mereset…' : 'Ya, reset semua progres'}</Button></div>
      </form>
    </Modal>}
  </Card>;
}
