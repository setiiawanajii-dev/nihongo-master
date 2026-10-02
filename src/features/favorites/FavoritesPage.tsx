import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Favorite } from '../../domain/models';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Badge, Button, Card, EmptyState, PageHeading } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';

export function FavoritesPage() {
  const { favorites, vocabulary, grammar, mutate } = useData();
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState<Favorite | null>(null);
  const { busy, error, run } = useOperation();
  return <><PageHeading eyebrow="お気に入り / FAVORIT" title="Simpan yang ingin kamu ingat." description={`${favorites.length} favorit tersimpan di perangkat ini.`} /><DataState>{feedback && <p className="setting-feedback" role="status">{feedback}</p>}<ErrorMessage message={editing ? '' : error} />{favorites.length === 0 ? <EmptyState icon={Heart} title="Belum ada materi favorit." description="Tekan ikon hati pada vocabulary atau grammar untuk menyimpannya di sini." to="/vocabulary" action="Jelajahi vocabulary" /> : <div className="content-grid">{favorites.map(favorite => {
    const target = favorite.target;
    const item = (target.type === 'vocabulary' ? vocabulary : grammar).find(row => row.id === target.itemId);
    const title = item ? ('kanji' in item ? item.kanji : item.pattern) : 'Materi tidak tersedia';
    return <Card className="content-card" key={favorite.id}><Badge>{target.type}</Badge><h2 className="favorite-title">{title}</h2><p className="detail-paragraph">{item?.meaning}</p><p className="muted detail-paragraph">{favorite.notes || 'Belum ada catatan favorit.'}</p><div className="entry-actions">{item && <Link className="button button-secondary" to={target.type === 'vocabulary' ? `/vocabulary/${encodeURIComponent(item.id)}` : `/grammar/${encodeURIComponent(item.id)}`}>Buka materi</Link>}<Button variant="secondary" onClick={() => setEditing(favorite)}>Edit catatan</Button><Button variant="secondary" disabled={busy} onClick={() => { if (favorite.notes && !window.confirm('Hapus favorit beserta catatannya? Materi dan progres belajar tetap tersimpan.')) return; void run(() => mutate(() => database.favorites.delete(favorite.id)), () => setFeedback('Favorit dihapus.')); }}>Hapus favorit</Button></div></Card>;
  })}</div>}</DataState>{editing && <Modal title="Edit catatan favorit" onClose={() => setEditing(null)} busy={busy}><form className="data-form" onSubmit={event => { event.preventDefault(); const notes = String(new FormData(event.currentTarget).get('notes') ?? ''); void run(() => mutate(() => database.favorites.update(editing.id, { notes })), () => { setEditing(null); setFeedback('Catatan favorit tersimpan.'); }); }}><label>Catatan favorit<textarea aria-label="Catatan favorit" name="notes" defaultValue={editing.notes} /></label><ErrorMessage message={error} /><Button disabled={busy} type="submit">Simpan catatan favorit</Button></form></Modal>}</>;
}
