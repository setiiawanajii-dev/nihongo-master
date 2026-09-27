import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layers, Shuffle, RotateCcw } from 'lucide-react';
import type { FlashcardRating, LearningProgress, Vocabulary } from '../../domain/models';
import { ratings, reviewDate } from '../../domain/learning/vocabulary';
import { database } from '../../services/database';
import { useData } from '../../app/data/DataProvider';
import { DataState, ErrorMessage } from '../../components/DataState';
import { Badge, Button, Card, EmptyState, PageHeading, ProgressBar } from '../../components/ui';
import { selectVocabulary } from './selection';

export function FlashcardPage() {
  const data = useData(); const [params] = useSearchParams();
  const cards = params.has('only') ? data.vocabulary.filter(v => v.id === params.get('only')) : selectVocabulary(data.vocabulary, data.progress, data.favorites, data.categories, params);
  return <><PageHeading eyebrow="単語 / FLASHCARD" title="Kenali. Ingat. Ulangi." description="Pikirkan bacaannya dan artinya, lalu balik kartu untuk memeriksa." /><DataState><FlashcardSession key={params.toString()} cards={cards} /></DataState></>;
}
function FlashcardSession({ cards }: { cards: Vocabulary[] }) {
  const data = useData();
  const [queue, setQueue] = useState(() => cards.map(card => card.id));
  const [index, setIndex] = useState(0); const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ itemId: string; rating: FlashcardRating; nextReview: string }[]>([]);
  const [skipped, setSkipped] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [pendingRating, setPendingRating] = useState<FlashcardRating | null>(null);
  const lock = useRef(false), eventId = useRef(crypto.randomUUID()), sessionId = useRef(crypto.randomUUID());
  const clock = useRef({ seconds: 0, started: document.visibilityState === 'visible' ? performance.now() : null as number | null });
  useEffect(() => {
    clock.current = { seconds: 0, started: document.visibilityState === 'visible' ? performance.now() : null };
    const visibility = () => {
      const current = clock.current;
      if (current.started !== null) current.seconds += (performance.now() - current.started) / 1000;
      current.started = document.visibilityState === 'visible' ? performance.now() : null;
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [index]);
  const item = data.vocabulary.find(v => v.id === queue[index]);
  const example = data.examples.find(e => e.itemType === 'vocabulary' && e.itemId === item?.id);
  function next() { setIndex(value => value + 1); setFlipped(false); setPendingRating(null); setError(''); eventId.current = crypto.randomUUID(); }
  async function rate(rating: FlashcardRating) {
    if (lock.current || !item || !flipped || (pendingRating !== null && pendingRating !== rating)) return;
    lock.current = true; setBusy(true); setError(''); setPendingRating(rating);
    const seconds = clock.current.seconds + (clock.current.started === null ? 0 : (performance.now() - clock.current.started) / 1000);
    try {
      let saved: LearningProgress | undefined;
      await data.mutate(async () => { saved = await database.learning.recordVocabularyReview({ itemId: item.id, rating, eventId: eventId.current, sessionId: sessionId.current, activeDurationSeconds: seconds }); });
      setResults(previous => [...previous, { itemId: item.id, rating, nextReview: saved!.nextReview! }]);
      next();
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Penyimpanan gagal.'} Jawaban belum dikonfirmasi. Coba penilaian yang sama lagi.`); }
    finally { lock.current = false; setBusy(false); }
  }
  function shuffle() {
    const nextQueue = [...queue];
    for (let i = nextQueue.length - 1; i > index; i--) { const j = index + Math.floor(Math.random() * (i - index + 1)); [nextQueue[i], nextQueue[j]] = [nextQueue[j], nextQueue[i]]; }
    setQueue(nextQueue); setFlipped(false); eventId.current = crypto.randomUUID();
  }
  if (queue.length === 0) return <EmptyState icon={Layers} title="Belum ada kartu untuk dilatih" description="Pilih vocabulary atau ubah filter. Antrean review hanya berisi materi yang sudah jatuh tempo." to="/vocabulary" action="Pilih vocabulary" />;
  if (index >= queue.length) return <Card className="flashcard-complete"><Badge>Sesi selesai</Badge><h2>Satu langkah lagi hari ini.</h2><p>{results.length} jawaban tersimpan · {skipped} kartu dilewati</p><div className="rating-summary">{ratings.map(r => <div key={r.value}><span>{r.label}</span><strong>{results.filter(result => result.rating === r.value).length}</strong></div>)}</div>{results.at(-1) && <p className="small-note">Review terakhir dijadwalkan: {reviewDate(results.at(-1)!.nextReview)}</p>}<div className="entry-actions"><Link className="button button-primary" to="/vocabulary">Kembali ke vocabulary</Link><Link className="button button-secondary" to="/review">Lihat review</Link></div></Card>;
  return <section className="flashcard-session"><div className="flashcard-toolbar"><Badge>Kartu {index + 1} / {queue.length}</Badge><span>{results.length} jawaban tersimpan</span><Button variant="secondary" disabled={busy || pendingRating !== null || queue.length - index < 2} onClick={shuffle}><Shuffle size={15} />Acak sisa kartu</Button></div><ProgressBar value={index} max={queue.length} label="Kemajuan sesi flashcard" />{!item ? <Card className="flashcard-missing"><p>Vocabulary ini sudah dihapus dari database.</p><Button disabled={busy} onClick={() => { setSkipped(s => s + 1); next(); }}>Lewati kartu</Button></Card> : <><button className={`flashcard-face ${flipped ? 'flipped' : ''}`} aria-label={flipped ? 'Sembunyikan jawaban' : 'Balik kartu untuk melihat jawaban'} disabled={busy} onClick={() => setFlipped(value => !value)}><span className="flashcard-level">{item.jlptLevel} · {flipped ? 'JAWABAN' : 'KOSAKATA'}</span><strong className="flashcard-kanji" lang="ja">{item.kanji}</strong>{flipped ? <><span className="flashcard-kana" lang="ja">{item.kana} · {item.romaji}</span><span className="flashcard-meaning">{item.meaning}</span>{example && <span className="flashcard-example"><span lang="ja">{example.japanese}</span><span>{example.translation}</span></span>}</> : <span className="flashcard-hint"><RotateCcw size={16} />Klik kartu atau tekan Enter untuk melihat jawaban.</span>}</button><p className="rating-prompt">{flipped ? 'Seberapa baik kamu mengenali kata ini?' : 'Balik kartu sebelum memberi penilaian.'}</p><div className="rating-buttons">{ratings.map(r => <Button key={r.value} variant="secondary" disabled={!flipped || busy || (pendingRating !== null && pendingRating !== r.value)} onClick={() => void rate(r.value)}><span>{r.label}</span><small>{r.hint}</small></Button>)}</div></>}<ErrorMessage message={error} />{busy && <p role="status">Menyimpan jawaban…</p>}<div className="flashcard-footer"><Link to="/vocabulary" className="text-link">Keluar dari latihan</Link>{item && <Button variant="secondary" disabled={busy || pendingRating !== null} onClick={() => { setSkipped(s => s + 1); next(); }}>Lewati tanpa menilai</Button>}</div><p className="small-note">Setiap jawaban langsung disimpan. Memuat ulang memulai urutan kartu baru; progres yang sudah disimpan tetap ada. Skor flashcard adalah penilaian diri atas pengenalan, bukan bukti kemampuan penggunaan.</p></section>;
}
