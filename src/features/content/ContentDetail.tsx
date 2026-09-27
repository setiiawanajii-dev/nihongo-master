import { SourceLink } from '../materials/SourceLink';
import { Link } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import type { ContentKind, Grammar, Vocabulary } from '../../domain/models';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { newProgress } from '../../services/progress';
import { Modal } from '../../components/Modal';
import { Badge, Button } from '../../components/ui';
import { ErrorMessage, useOperation } from '../../components/DataState';

function DetailContainer({ embedded, children, ...props }: { embedded?: boolean; children: ReactNode; title: string; onClose: () => void; busy: boolean }) { return embedded ? <div>{children}</div> : <Modal {...props}>{children}</Modal>; }

export function ContentDetail({ kind, item, onClose, onEdit, embedded = false }: { embedded?: boolean; kind: ContentKind; item: Vocabulary | Grammar; onClose: () => void; onEdit: () => void }) {
  const { examples, grammar, progress, mutate } = useData();
  const record = progress.find(p => p.itemType === kind && p.itemId === item.id);
  const [notes, setNotes] = useState(record?.notes ?? '');
  const { busy, error, run } = useOperation();
  const isVocabulary = 'kanji' in item;
  return <DetailContainer embedded={embedded} title={isVocabulary ? item.kanji : item.pattern} onClose={onClose} busy={busy}><div className="detail-top"><Badge>{item.jlptLevel}</Badge><Badge tone="neutral">{item.isSeed ? 'Seed demo' : 'Materi pribadi'}</Badge></div><h3>{item.meaning}</h3>{isVocabulary ? <p className="detail-paragraph" lang="ja">{[item.kana, item.romaji, item.partOfSpeech].filter(Boolean).join(' · ')}</p> : <><h3 className="detail-section-label">Pola pembentukan</h3><p className="grammar-form">{item.formation}</p><h3 className="detail-section-label">Penjelasan</h3><p className="detail-paragraph">{item.explanation || 'Penjelasan belum tersedia.'}</p><h3 className="detail-section-label">Kesalahan umum</h3><p className="detail-paragraph">{item.commonMistakes || "Belum ada kesalahan umum yang dicatat."}</p><h3 className="detail-section-label">Grammar terkait</h3><div className="entry-actions">{item.comparisonIds.length ? item.comparisonIds.map(id => { const related = grammar.find(g => g.id === id); return related ? <Link key={id} className="text-link" to={`/grammar/${encodeURIComponent(id)}`}>{related.pattern} · {related.meaning}</Link> : null; }) : <p className="muted">Belum ada grammar terkait. Tambahkan melalui Edit materi.</p>}</div></>}
    <h3 className="detail-section-label">Contoh & terjemahan</h3>{!examples.some(e => e.itemType === kind && e.itemId === item.id) && <p className="muted">Belum ada contoh kalimat.</p>}
    {examples.filter(example => example.itemType === kind && example.itemId === item.id).map(example => <blockquote className="example-block" key={example.id}><p lang="ja">{example.japanese}</p><p>{example.translation || "Terjemahan tidak tersedia pada sumber."}</p><SourceLink source={example} /></blockquote>)}
    <h3 className="detail-section-label">Catatan materi</h3><p className="detail-paragraph muted">{item.notes || "Belum ada catatan materi."}</p><p className="entry-source"><SourceLink source={item} /></p><Button variant="secondary" onClick={onEdit} disabled={busy}>Edit materi</Button>
    <section className="progress-editor"><h3>Catatan progres pribadi</h3><p className="detail-paragraph">Status: {record?.status ?? 'NEW'} · Mastery: {record?.masteryScore == null ? 'Belum diuji' : `${record.masteryScore}%`}</p><p className="small-note">Menyimpan catatan tidak menambah mastery, sesi belajar, atau skor. {isVocabulary ? "Flashcard vocabulary menilai pengenalan kata; aspek penggunaan belum diuji." : "Latihan grammar menggunakan penilaian diri untuk tiga aspek."}</p><form className="data-form" onSubmit={event => { event.preventDefault(); void run(() => mutate(() => record ? database.progress.update(record.id, { notes }) : database.progress.create(newProgress(kind, item.id, notes)))); }}><label>Catatan belajar<textarea aria-label="Catatan belajar" value={notes} onChange={event => setNotes(event.target.value)} /></label><div className="form-actions"><Button disabled={busy} type="submit">{record ? 'Simpan catatan progres' : 'Buat catatan progres'}</Button>{record && <Button disabled={busy} variant="secondary" type="button" onClick={() => { if (window.confirm('Hapus progres dan jadwal review materi ini? Materi dan favorit tetap disimpan.')) void run(() => mutate(() => database.progress.delete(record.id)), () => setNotes('')); }}>Hapus progres</Button>}</div></form><ErrorMessage message={error} />{record && <p className="setting-feedback" role="status">{notes === record.notes ? 'Catatan tersimpan di database.' : 'Perubahan catatan belum disimpan.'}</p>}</section>
  </DetailContainer>;
}
