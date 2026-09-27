import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Heart, Layers } from 'lucide-react';
import { useData } from '../../app/data/DataProvider';
import { Button, Card, EmptyState, PageHeading } from '../../components/ui';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';
import { database } from '../../services/database';
import { ContentDetail } from '../content/ContentDetail';
import { ContentEditor } from '../content/ContentEditor';
import { VocabularyProgress } from './VocabularyProgress';

export function VocabularyDetailPage() {
  const { id } = useParams(); const location = useLocation(); const data = useData();
  const [editing, setEditing] = useState(false); const { busy, error, run } = useOperation();
  const item = data.vocabulary.find(v => v.id === id);
  const progress = data.progress.find(p => p.itemType === 'vocabulary' && p.itemId === id);
  const favorite = data.favorites.find(f => f.target.type === 'vocabulary' && f.target.itemId === id);
  const back = typeof location.state?.backTo === 'string' && /^\/(?:vocabulary|review)(?:\?|$)/.test(location.state.backTo) ? location.state.backTo : '/vocabulary';
  return <><Link className="text-link detail-back" to={back}><ArrowLeft size={16} />{back.startsWith("/review") ? "Kembali ke review" : "Kembali ke vocabulary"}</Link><PageHeading eyebrow="単語 / DETAIL VOCABULARY" title={item?.kanji ?? (data.loading ? 'Membuka vocabulary…' : 'Vocabulary tidak ditemukan')} description={item ? item.kana : 'Temukan materi dari daftar vocabulary.'} /><DataState>{!item ? <EmptyState icon={BookOpen} title="Materi tidak ditemukan" description="Materi mungkin sudah dihapus. Data lainnya tetap tersedia." to="/vocabulary" action="Kembali ke vocabulary" /> : <><div className="entry-actions detail-actions"><Link className="button button-primary" to={`/vocabulary/flashcards?only=${encodeURIComponent(item.id)}`}><Layers size={17} />Latih kata ini</Link><Button variant="secondary" disabled={busy} aria-pressed={!!favorite} onClick={() => void run(() => data.mutate(() => favorite ? database.favorites.delete(favorite.id) : database.favorites.create({ target: { type: 'vocabulary', itemId: item.id }, notes: '' })))}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'Hapus favorit' : 'Favoritkan'}</Button><Button variant="secondary" disabled={busy} onClick={() => void run(() => data.mutate(() => database.learning.queueVocabularyReview(item.id)))}>Review sekarang</Button><Link className="text-link" to="/review">Lihat antrean review</Link></div><ErrorMessage message={error} /><div className="vocabulary-detail-grid"><Card className="detail-content"><ContentDetail key={item.id} embedded kind="vocabulary" item={item} onClose={() => undefined} onEdit={() => setEditing(true)} /></Card><Card className="detail-evidence"><h2>Penguasaan kata</h2><VocabularyProgress detailed progress={progress} /></Card></div>{editing && <ContentEditor kind="vocabulary" item={item} onClose={() => setEditing(false)} />}</>}</DataState></>;
}
