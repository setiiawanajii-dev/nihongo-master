import { GrammarPractice } from './GrammarPractice';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Heart } from 'lucide-react';
import { useData } from '../../app/data/DataProvider';
import { Button, Card, EmptyState, PageHeading } from '../../components/ui';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';
import { database } from '../../services/database';
import { ContentDetail } from '../content/ContentDetail';
import { ContentEditor } from '../content/ContentEditor';
import { GrammarProgress } from './GrammarProgress';

export function GrammarDetailPage() {
  const { id } = useParams(); const location = useLocation(); const data = useData();
  const [editing, setEditing] = useState(false); const { busy, error, run } = useOperation();
  const item = data.grammar.find(v => v.id === id);
  const progress = data.progress.find(p => p.itemType === 'grammar' && p.itemId === id);
  const favorite = data.favorites.find(f => f.target.type === 'grammar' && f.target.itemId === id);
  const back = typeof location.state?.backTo === 'string' && /^\/(?:grammar|review)(?:\?|$)/.test(location.state.backTo) ? location.state.backTo : '/grammar';
  return <><Link className="text-link detail-back" to={back}><ArrowLeft size={16} />{back.startsWith("/review") ? "Kembali ke review" : "Kembali ke grammar"}</Link><PageHeading eyebrow="文法 / DETAIL GRAMMAR" title={item?.pattern ?? (data.loading ? 'Membuka grammar…' : 'Grammar tidak ditemukan')} description={item ? item.meaning : 'Temukan materi dari daftar grammar.'} /><DataState>{!item ? <EmptyState icon={BookOpen} title="Materi tidak ditemukan" description="Materi mungkin sudah dihapus. Data lainnya tetap tersedia." to="/grammar" action="Kembali ke grammar" /> : <><div className="entry-actions detail-actions"><Button variant="secondary" disabled={busy} aria-pressed={!!favorite} onClick={() => void run(() => data.mutate(() => favorite ? database.favorites.delete(favorite.id) : database.favorites.create({ target: { type: 'grammar', itemId: item.id }, notes: '' })))}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'Hapus favorit' : 'Favoritkan'}</Button><Button variant="secondary" disabled={busy} onClick={() => void run(() => data.mutate(() => database.learning.queueGrammarReview(item.id)))}>Review sekarang</Button><Link className="text-link" to="/review?type=grammar">Lihat antrean review</Link></div><ErrorMessage message={error} /><div className="vocabulary-detail-grid"><Card className="detail-content"><ContentDetail key={item.id} embedded kind="grammar" item={item} onClose={() => undefined} onEdit={() => setEditing(true)} /></Card><Card className="detail-evidence"><h2>Penguasaan grammar</h2><GrammarProgress detailed progress={progress} /><GrammarPractice key={item.id} item={item} /></Card></div>{editing && <ContentEditor kind="grammar" item={item} onClose={() => setEditing(false)} />}</>}</DataState></>;
}
