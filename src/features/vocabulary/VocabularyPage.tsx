import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Heart, Layers, Plus, Search } from 'lucide-react';
import { useData } from '../../app/data/DataProvider';
import { Badge, Button, Card, EmptyState, PageHeading } from '../../components/ui';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';
import { ContentEditor } from '../content/ContentEditor';
import { ContentDetail } from '../content/ContentDetail';
import type { Vocabulary } from '../../domain/models';
import { database } from '../../services/database';
import { selectVocabulary } from './selection';
import { VocabularyProgress } from './VocabularyProgress';

export function VocabularyPage({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const data = useData(); const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Vocabulary | 'new' | null>(null);
  const { busy, error, run } = useOperation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const filters = new URLSearchParams(params); if (reviewOnly) { filters.set('status', 'review'); if (!filters.has('sort')) filters.set('sort', 'review'); }
  const filtered = selectVocabulary(data.vocabulary, data.progress, data.favorites, data.categories, filters, now);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const rawPage = Number(params.get('page') ?? 1);
  const page = Math.max(1, Math.min(pageCount, Number.isInteger(rawPage) ? rawPage : 1));
  const pageItems = filtered.slice((page - 1) * 12, page * 12);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('item'); next.delete('page'); if (value === 'all' || value === '') next.delete(key); else next.set(key, value); setParams(next, { replace: true, flushSync: true }); };
  const setPage = (nextPage: number) => { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next, { flushSync: true }); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const selected = data.vocabulary.find(item => item.id === params.get('item'));
  const closeLegacy = () => { const next = new URLSearchParams(params); next.delete('item'); setParams(next, { replace: true, flushSync: true }); };
  const flashFilters = new URLSearchParams(filters); flashFilters.delete('page'); flashFilters.delete('item');
  const listLocation = `${reviewOnly ? "/review" : "/vocabulary"}${params.toString() ? `?${params}` : ''}`;
  useEffect(() => { if (params.get('add') === '1') { setEditing('new'); setParams(current => { const next = new URLSearchParams(current); next.delete('add'); return next; }, { replace: true }); } }, [params, setParams]);
  return <><PageHeading eyebrow={reviewOnly ? '復習 / REVIEW VOCABULARY' : '単語 / KOTOBA'} title={reviewOnly ? 'Ulangi hari ini, ingat lebih lama.' : 'Setiap kata membuka dunia.'} description={reviewOnly ? 'Vocabulary yang jadwal review-nya sudah tiba.' : `${data.vocabulary.length} vocabulary tersimpan di ruang belajarmu.`}><div className="entry-actions"><Button disabled={data.loading || !!data.error} onClick={() => setEditing('new')}><Plus size={16} />Tambah vocabulary</Button>{filtered.length > 0 && !data.loading && !data.error && <Link className="button button-secondary" to={`/vocabulary/flashcards?${flashFilters}`}><Layers size={16} />Flashcard</Link>}</div></PageHeading><DataState><p className="info-banner">Impor materi dari JSON/CSV atau tambahkan sendiri melalui tombol Tambah. Progres flashcard berasal dari jawabanmu dan disimpan di perangkat.</p><ErrorMessage message={error} />
    <div className="content-toolbar"><label className="search-field"><Search size={18} /><input aria-label="Cari vocabulary" placeholder="Cari kanji, kana, romaji, arti, atau kategori…" value={params.get('q') ?? ''} onChange={event => setFilter('q', event.target.value)} /></label><label className="filter-field">Level<select aria-label="Filter level JLPT" value={params.get('level') ?? 'all'} onChange={e => setFilter('level', e.target.value)}><option value="all">Semua level</option>{['N5', 'N4', 'N3', 'N2'].map(level => <option key={level}>{level}</option>)}</select></label><label className="filter-field">Kategori<select aria-label="Filter kategori" value={params.get('category') ?? 'all'} onChange={e => setFilter('category', e.target.value)}><option value="all">Semua kategori</option>{data.categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label></div>
    <div className="vocabulary-controls"><div className="filter-pills" role="group" aria-label="Status vocabulary">{(reviewOnly ? [['review', 'Review']] : [['all', 'Semua'], ['favorite', 'Favorit'], ['mastered', 'Mastered'], ['review', 'Review'], ['weak', 'Lemah'], ['new', 'Baru']]).map(([value, label]) => <button key={value} aria-pressed={(filters.get('status') ?? 'all') === value} onClick={() => setFilter('status', value)}>{label}</button>)}</div><label className="filter-field">Urutkan<select aria-label="Urutkan vocabulary" value={filters.get('sort') ?? 'newest'} onChange={e => setFilter('sort', e.target.value)}><option value="newest">Terbaru</option><option value="kana">Kana (あ→ん)</option><option value="mastery-asc">Mastery terendah</option><option value="mastery-desc">Mastery tertinggi</option><option value="review">Review terdekat</option></select></label></div>
    <p className="result-count muted" aria-live="polite">{filtered.length} vocabulary · Halaman {page} / {pageCount}</p>{filtered.length === 0 ? <EmptyState icon={Search} title="Belum ada hasil yang cocok" description={reviewOnly ? 'Belum ada review yang jatuh tempo. Kamu tetap bisa berlatih dari daftar vocabulary.' : 'Ganti filter atau kata pencarian. Mastered hanya muncul setelah ada bukti kemampuan yang memadai.'} to="/vocabulary" action="Lihat semua vocabulary" /> : <div className="content-grid">{pageItems.map(item => {
      const favorite = data.favorites.find(f => f.target.type === 'vocabulary' && f.target.itemId === item.id);
      const progress = data.progress.find(p => p.itemType === 'vocabulary' && p.itemId === item.id);
      return <Card key={item.id} className="content-card"><div className="flex items-center justify-between"><span className="icon-tile green"><BookOpen size={20} /></span><div className="card-badges"><Badge>{item.jlptLevel}</Badge><Button variant="icon" disabled={busy} aria-label={`${favorite ? 'Hapus favorit' : 'Favoritkan'} ${item.kanji}`} aria-pressed={!!favorite} onClick={() => void run(() => data.mutate(() => favorite ? database.favorites.delete(favorite.id) : database.favorites.create({ target: { type: 'vocabulary', itemId: item.id }, notes: '' })))}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></Button></div></div><p className="entry-kanji" lang="ja">{item.kanji}</p><p className="entry-reading" lang="ja">{item.kana}</p><h2>{item.meaning}</h2><div className="entry-meta">{item.categoryIds.map(id => data.categories.find(c => c.id === id)?.name).filter(Boolean).join(' · ') || 'Tanpa kategori'}</div><VocabularyProgress progress={progress} /><div className="entry-actions"><Link className="button button-secondary" to={`/vocabulary/${encodeURIComponent(item.id)}`} state={{ backTo: listLocation }}>Detail</Link><Button variant="secondary" onClick={() => setEditing(item)}>Edit</Button><Button variant="secondary" disabled={busy} onClick={() => { if (window.confirm(`Hapus ${item.kanji}? Progres, contoh, dan favorit terkait juga akan dihapus.`)) void run(() => data.mutate(() => database.vocabulary.delete(item.id))); }}>Hapus</Button></div></Card>;
    })}</div>}
    <div className="pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button><span>{page} / {pageCount}</span><Button variant="secondary" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Berikutnya</Button></div>
    {params.has('item') && !selected && <p role="status">Materi tidak ditemukan. <button onClick={closeLegacy}>Tutup</button></p>}{selected && !editing && <ContentDetail kind="vocabulary" item={selected} onClose={closeLegacy} onEdit={() => setEditing(selected)} />}{editing && <ContentEditor kind="vocabulary" item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}</DataState></>;
}
