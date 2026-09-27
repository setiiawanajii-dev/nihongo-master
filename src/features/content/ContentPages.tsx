import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Languages, Info, Plus, Heart } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeading } from '../../components/ui';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';
import { useData } from '../../app/data/DataProvider';
import type { ContentKind, Grammar, Vocabulary } from '../../domain/models';
import { database } from '../../services/database';
import { ContentEditor } from './ContentEditor';
import { ContentDetail } from './ContentDetail';

export function ContentPage({ kind }: { kind: ContentKind }) {
  const data = useData();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Vocabulary | Grammar | 'new' | null>(null);
  const [params, setParams] = useSearchParams();
  const { busy, error, run } = useOperation();
  const isVocabulary = kind === 'vocabulary';
  const query = search.trim().normalize('NFKC').toLocaleLowerCase('id');
  const all: (Vocabulary | Grammar)[] = isVocabulary ? data.vocabulary : data.grammar;
  const selected = all.find(item => item.id === params.get('item'));
  const filtered = all.filter(item => {
    const fields = 'kanji' in item ? [item.kanji, item.kana, item.romaji] : [item.pattern, item.formation];
    return (level === 'all' || item.jlptLevel === level) && (category === 'all' || item.categoryIds.includes(category)) &&
      [...fields, item.meaning, ...data.categories.filter(c => item.categoryIds.includes(c.id)).map(c => c.name)].join(' ').normalize('NFKC').toLocaleLowerCase('id').includes(query);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.jlptLevel.localeCompare(a.jlptLevel) || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * 12, current * 12);
  const closeDetail = () => setParams({}, { replace: true });
  return <>
    <PageHeading eyebrow={isVocabulary ? '単語 / KOTOBA' : '文法 / BUNPOU'} title={isVocabulary ? 'Setiap kata membuka dunia.' : 'Pahami pola, temukan makna.'} description={`${all.length} ${kind} tersimpan di ruang belajarmu.`}><Button onClick={() => setEditor('new')} disabled={data.loading || !!data.error}><Plus size={16} />Tambah {kind}</Button></PageHeading>
    <DataState><div className="info-banner"><Info size={18} /><p>Seed demo: 50 vocabulary N3, 20 vocabulary N2, 20 grammar N3, dan 10 grammar N2. Pengelompokan level bersifat ilustratif. Sumber PDF dan halaman adalah referensi dummy.</p></div><ErrorMessage message={error} />
    <div className="content-toolbar"><label className="search-field"><Search size={18} /><input aria-label={isVocabulary ? 'Cari vocabulary' : 'Cari grammar'} placeholder={isVocabulary ? 'Cari kanji, kana, romaji, atau arti…' : 'Cari pola atau arti grammar…'} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><label className="filter-field"><span>Level</span><select aria-label="Filter level JLPT" value={level} onChange={event => { setLevel(event.target.value); setPage(1); }}><option value="all">Semua level</option>{['N5', 'N4', 'N3', 'N2'].map(item => <option key={item}>{item}</option>)}</select></label><label className="filter-field"><span>Kategori</span><select aria-label="Filter kategori" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="all">Semua kategori</option>{data.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <p className="muted result-count" aria-live="polite">{filtered.length} {kind} · Halaman {current} / {pages}</p>
    {!filtered.length ? <EmptyState icon={Search} title="Belum ada hasil yang cocok" description="Coba kata kunci lain, ganti filter, atau tambahkan materi baru." /> : <div className="content-grid">{visible.map(item => {
      const favorite = data.favorites.find(f => f.target.type === kind && 'itemId' in f.target && f.target.itemId === item.id);
      const word = 'kanji' in item;
      const title = word ? item.kanji : item.pattern;
      return <Card className="content-card" key={item.id}><div className="flex items-center justify-between"><span className={`icon-tile ${word ? 'green' : 'purple'}`}>{word ? <BookOpen size={20} /> : <Languages size={20} />}</span><div className="card-badges"><Badge tone="neutral">{item.jlptLevel} · {item.isSeed ? 'Seed' : 'Pribadi'}</Badge><Button variant="icon" disabled={busy} aria-label={`${favorite ? 'Hapus favorit' : 'Favoritkan'} ${title}`} aria-pressed={!!favorite} onClick={() => void run(() => data.mutate(() => favorite ? database.favorites.delete(favorite.id) : database.favorites.create({ target: { type: kind, itemId: item.id }, notes: '' })))}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></Button></div></div>
      <p className={`entry-kanji ${word ? '' : 'grammar-pattern'}`} lang="ja">{title}</p>{word && <p className="entry-reading" lang="ja">{item.kana} <span>· {item.romaji}</span></p>}<h2>{item.meaning}</h2>{!word && <p className="grammar-form" lang="ja">{item.formation}</p>}<div className="entry-meta">{word && <span>{item.partOfSpeech}</span>}<span>{item.categoryIds.map(id => data.categories.find(c => c.id === id)?.name).filter(Boolean).join(' · ') || 'Tanpa kategori'}</span></div><div className="entry-source">{data.materials.find(m => m.id === item.sourcePdfId)?.filename ?? item.sourcePdfId} · hlm. {item.sourcePage}</div>
      <div className="entry-actions"><Button variant="secondary" onClick={() => setParams({ item: item.id })}>Detail</Button><Button variant="secondary" onClick={() => setEditor(item)}>Edit</Button><Button variant="secondary" disabled={busy} className="danger-text" onClick={() => { if (window.confirm(`Hapus ${title}? Contoh, progres, jadwal review, dan favorit terkait juga dihapus. Tindakan ini tidak dapat dibatalkan.`)) void run(() => data.mutate(() => database[kind].delete(item.id))); }}>Hapus</Button></div></Card>;
    })}</div>}
    <div className="pagination"><Button variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>Sebelumnya</Button><span>{current} / {pages}</span><Button variant="secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>Berikutnya</Button></div>
    {params.has('item') && !selected && <p role="status" className="info-banner">Materi tidak ditemukan atau sudah dihapus. <button onClick={closeDetail}>Tutup</button></p>}
    {selected && !editor && <ContentDetail key={selected.id} kind={kind} item={selected} onClose={closeDetail} onEdit={() => setEditor(selected)} />}
    {editor && <ContentEditor kind={kind} item={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
    </DataState>
  </>;
}
