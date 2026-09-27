import { useEffect, useRef, useState } from 'react';
import type { FlashcardRating, Grammar, GrammarDimension, GrammarReviewInput } from '../../domain/models';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Button } from '../../components/ui';
import { ErrorMessage, useOperation } from '../../components/DataState';

const dimensions = [
  { key: 'understanding', label: 'Pemahaman', prompt: 'Jelaskan makna pola ini dan kapan pola ini dipakai dengan kata-katamu sendiri.' },
  { key: 'usage', label: 'Penggunaan', prompt: 'Tuliskan situasi yang cocok memakai pola ini dan alasan pemilihannya.' },
  { key: 'sentence', label: 'Penyusunan kalimat', prompt: 'Buat satu kalimat Jepang memakai pola ini, lalu tuliskan terjemahannya.' },
] as const;
export function GrammarPractice({ item }: { item: Grammar }) {
  const { mutate, examples } = useData(); const { busy, error, run } = useOperation();
  const [dimension, setDimension] = useState<GrammarDimension>('understanding');
  const [response, setResponse] = useState(''); const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false); const [retry, setRetry] = useState<GrammarReviewInput | null>(null);
  const pending = useRef(false); const activeSeconds = useRef(0);
  useEffect(() => { const timer = window.setInterval(() => { if (!document.hidden) activeSeconds.current += 1; }, 1000); return () => window.clearInterval(timer); }, []);
  function submit(rating: FlashcardRating) {
    if (pending.current) return; pending.current = true;
    const input = retry ?? { itemId: item.id, dimension, response, rating, eventId: crypto.randomUUID(), sessionId: crypto.randomUUID(), activeDurationSeconds: activeSeconds.current };
    setRetry(input);
    void run(() => mutate(() => database.learning.recordGrammarReview(input)), () => { setSaved(true); setRetry(null); setChecking(false); setResponse(''); activeSeconds.current = 0; }).finally(() => { pending.current = false; });
  }
  return <section className="progress-editor"><h2>Latihan & review grammar</h2><p className="small-note">Tulis jawaban, bandingkan dengan materi, lalu nilai sendiri. Jawaban tidak diperiksa otomatis.</p><form className="data-form" onSubmit={e => { e.preventDefault(); if (response.trim()) { setChecking(true); setSaved(false); } }}><fieldset disabled={busy || checking || !!retry}><label>Aspek latihan<select aria-label="Aspek latihan" value={dimension} onChange={e => { setDimension(e.target.value as GrammarDimension); setResponse(''); setSaved(false); activeSeconds.current = 0; }}>{dimensions.map(d => <option value={d.key} key={d.key}>{d.label}</option>)}</select></label><p className="detail-paragraph">{dimensions.find(d => d.key === dimension)?.prompt}</p><label>Jawaban latihan<textarea aria-label="Jawaban latihan" required maxLength={4000} value={response} onChange={e => setResponse(e.target.value)} /></label><Button type="submit" disabled={!response.trim()}>Bandingkan jawaban</Button></fieldset></form>
  {checking && <div className="grammar-assessment"><p className="detail-paragraph"><strong>Rujukan:</strong> {item.meaning}. {item.explanation}</p><p lang="ja">{item.formation}</p>{examples.filter(e => e.itemType === 'grammar' && e.itemId === item.id).map(e => <blockquote className="example-block" key={e.id}><p lang="ja">{e.japanese}</p><p>{e.translation}</p></blockquote>)}<p className="small-note">Seberapa tepat jawabanmu dibandingkan rujukan?</p><div className="grammar-rating-buttons">{(['😵 Belum paham', '😐 Hampir paham', '🙂 Paham', '🔥 Sangat paham'] as const).map((label, rating) => <Button key={label} variant="secondary" disabled={busy || (!!retry && retry.rating !== rating)} onClick={() => submit(rating as FlashcardRating)}>{label}</Button>)}</div><Button variant="secondary" disabled={busy || !!retry} onClick={() => setChecking(false)}>Perbaiki jawaban</Button></div>}
  <ErrorMessage message={error} />{saved && <p role="status" className="setting-feedback">Penilaian grammar tersimpan. Jadwal review telah diperbarui.</p>}
  </section>;
}
