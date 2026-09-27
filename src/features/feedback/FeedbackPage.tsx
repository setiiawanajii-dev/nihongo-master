import { Bug, Lightbulb, Send, ShieldCheck, Mail, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, PageHeading } from '../../components/ui';
import { navigation } from '../../app/navigation';

const draftKey = 'nihongo-master:feedback-draft';
const initial = { kind: 'bug', title: '', page: '/dashboard', description: '', steps: '', expected: '' };
function readDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
    if (!saved || typeof saved !== 'object') return initial;
    return Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, typeof saved[key] === 'string' ? saved[key].slice(0, 3000) : value])) as typeof initial;
  } catch { return initial; }
}
const recipient = (import.meta.env.VITE_FEEDBACK_EMAIL ?? 'aji.stwn71@gmail.com').trim();
const hasRecipient = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(recipient);

export function FeedbackPage() {
  const [draft, setDraft] = useState(readDraft);
  const [storageError, setStorageError] = useState(false);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [draft]);
  function change(key: keyof typeof initial, value: string) {
    setDraft(current => ({ ...current, [key]: value })); setPreview(''); setMessage(''); setError('');
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    if (draft.title.trim().length < 3 || draft.description.trim().length < 10) {
      setError('Isi judul minimal 3 karakter dan uraian minimal 10 karakter.'); return;
    }
    setError(''); setMessage('');
    const report = [
      `Nihongo Master — ${draft.kind === 'bug' ? 'Laporan bug' : 'Saran'}`,
      `Judul: ${draft.title.trim()}`, `Halaman: ${draft.page}`,
      '', draft.description.trim(),
      ...(draft.kind === 'bug' ? ['', `Langkah untuk mengulang masalah:\n${draft.steps.trim() || 'Tidak diisi'}`, '', `Hasil yang diharapkan:\n${draft.expected.trim() || 'Tidak diisi'}`] : []),
    ].join('\n');
    setPreview(report);
    if (hasRecipient) {
      window.location.href = emailUrl(report);
      setMessage('Lanjutkan dengan menekan Kirim di aplikasi email. Jika tidak terbuka, gunakan salin atau unduh laporan di bawah.');
    }
  }
  function emailUrl(report: string) {
    return `mailto:${recipient}?subject=${encodeURIComponent(`[Nihongo Master] ${draft.kind === 'bug' ? 'Bug' : 'Saran'}: ${draft.title.trim()}`)}&body=${encodeURIComponent(report)}`;
  }
  async function copy() {
    try { await navigator.clipboard.writeText(preview); setMessage('Laporan disalin. Tempelkan ke pesan untuk pengelola; laporan belum terkirim.'); }
    catch { setError('Tidak dapat menyalin otomatis. Pilih teks pratinjau lalu salin, atau unduh laporan.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([preview], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nihongo-master-feedback.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Laporan disiapkan untuk diunduh. Kirim file ini ke pengelola; laporan belum terkirim.');
  }
  return <div className="feedback-page">
    <PageHeading eyebrow="ご意見 / MASUKAN" title="Saran & lapor bug" description="Bantu kami membuat pengalaman belajar yang lebih nyaman." />
    <div className="feedback-layout">
      <Card className="feedback-form-card"><form className="data-form feedback-form" onSubmit={prepare}>
        <fieldset className="feedback-kind"><legend>Apa yang ingin kamu sampaikan?</legend>
          <div className="feedback-kind-options">{([
            { value: 'bug', title: 'Lapor bug', description: 'Ada yang tidak berjalan?', icon: Bug },
            { value: 'suggestion', title: 'Beri saran', description: 'Punya ide untuk aplikasi?', icon: Lightbulb },
          ] as const).map(({value, title, description, icon: Icon}) => <label key={value} className={`feedback-kind-option ${draft.kind === value ? 'is-selected' : ''}`}>
            <input type="radio" name="feedback-kind" value={value} checked={draft.kind === value} onChange={() => change('kind', value)} />
            <Icon size={21} aria-hidden="true" /><span><strong>{title}</strong><small>{description}</small></span>
          </label>)}</div>
        </fieldset>
        <div className="feedback-section-heading"><h2>Ceritakan pengalamanmu</h2><p className="muted">Isi judul, bagian aplikasi, dan uraian singkat.</p></div>
        <label>Judul<input required minLength={3} maxLength={100} value={draft.title} onChange={e => change('title', e.target.value)} placeholder={draft.kind === 'bug' ? 'Contoh: Halaman PDF tidak berpindah' : 'Contoh: Pilihan ukuran huruf saat belajar'} /></label>
        <label>Bagian aplikasi<select value={draft.page} onChange={e => change('page', e.target.value)}>{navigation.filter(item => item.path !== '/feedback').map(item => <option key={item.path} value={item.path}>{item.label}</option>)}<option value="/materials/:id">PDF Reader</option><option value="Lainnya">Lainnya</option></select></label>
        <label>{draft.kind === 'bug' ? 'Apa yang terjadi?' : 'Apa yang ingin diperbaiki?'}<textarea className="feedback-description" required minLength={10} maxLength={1500} value={draft.description} onChange={e => change('description', e.target.value)} placeholder={draft.kind === 'bug' ? 'Jelaskan kendala yang kamu temui saat menggunakan aplikasi…' : 'Ceritakan idemu dan bagaimana hal itu membantu kamu belajar…'} aria-describedby="feedback-description-hint" /></label>
        <div id="feedback-description-hint" className="feedback-field-hint"><span>Minimal 10 karakter</span><span>{draft.description.length} / 1500</span></div>
        {draft.kind === 'bug' && <div className="feedback-extra"><div className="feedback-section-heading"><h3>Detail tambahan</h3><p className="muted">Opsional, tetapi membantu kami memahami masalahnya.</p></div>
          <label>Langkah untuk mengulang masalah (opsional)<textarea maxLength={700} value={draft.steps} onChange={e => change('steps', e.target.value)} placeholder="1. Buka halaman… 2. Tekan tombol…" /></label>
          <label>Hasil yang diharapkan (opsional)<textarea maxLength={500} value={draft.expected} onChange={e => change('expected', e.target.value)} placeholder="Apa yang seharusnya terjadi?" /></label>
        </div>}
        {error && <p className="feedback-notice feedback-error" role="alert">{error}</p>}
        <div className="feedback-submit">
          <p className="feedback-draft"><CheckCircle2 size={16} aria-hidden="true" />{storageError ? 'Draf belum tersimpan. Salin laporan sebelum menutup halaman.' : 'Draf tersimpan di browser ini.'}</p>
          <Button type="submit"><Send size={16} aria-hidden="true" />{hasRecipient ? 'Kirim lewat email' : 'Siapkan laporan'}</Button>
        </div>
        <p className="feedback-send-hint">{hasRecipient ? 'Aplikasi email akan terbuka. Tekan Kirim di sana untuk menyampaikan laporan.' : 'Alamat penerima belum diatur. Laporan dapat disalin atau diunduh.'}</p>
      </form></Card>
      <aside className="feedback-guide" aria-label="Informasi pengiriman">
        <Card><span className="feedback-guide-icon"><Lightbulb size={22} aria-hidden="true" /></span><h2>Masukan kecil, manfaat besar.</h2><p>Setiap pengalaman membantu kami memahami apa yang perlu diperbaiki.</p><ul><li>Sampaikan satu topik dalam satu laporan.</li><li>Sebutkan bagian aplikasi yang digunakan.</li><li>Untuk bug, ceritakan langkah sebelum masalah muncul.</li></ul></Card>
        <div className="feedback-guide-note"><ShieldCheck size={20} aria-hidden="true" /><div><h3>Data belajarmu tetap pribadi</h3><p>PDF, materi, dan progres tidak dilampirkan. Hindari menulis kata sandi atau informasi pribadi.</p></div></div>
        {hasRecipient && <div className="feedback-guide-note"><Mail size={20} aria-hidden="true" /><div><h3>Disampaikan ke pembuat</h3><p>{recipient}</p></div></div>}
      </aside>
    </div>
    {message && <p role="status" className="feedback-notice">{message}</p>}
    {preview && <Card className="feedback-copy"><h2>Salinan laporan</h2><p className="muted">Jika aplikasi email tidak terbuka, salin atau unduh laporan ini untuk dikirim secara manual.</p><pre>{preview}</pre>
      <div className="form-actions"><Button variant="secondary" onClick={() => void copy()}>Salin laporan</Button><Button variant="secondary" onClick={download}>Unduh laporan</Button>{hasRecipient && <a className="button button-primary" href={emailUrl(preview)} onClick={() => setMessage('Lanjutkan pengiriman di aplikasi email. Aplikasi ini tidak dapat memastikan apakah email sudah terkirim.')}>Buka aplikasi email</a>}</div>
    </Card>}
  </div>;
}
