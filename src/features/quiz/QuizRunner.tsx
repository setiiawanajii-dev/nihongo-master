import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { QuizAttempt } from '../../domain/models';
import { answerIsCorrect, durationLabel, questionTypes } from '../../domain/quiz/engine';
import { database } from '../../services/database';
import { useData } from '../../app/data/DataProvider';
import { Badge, Button, Card, ProgressBar } from '../../components/ui';
import { ErrorMessage, useOperation } from '../../components/DataState';

export function QuizRunner({ attempt, onSaved }: { attempt: QuizAttempt; onSaved: () => Promise<void> }) {
 const index = attempt.answers.length, question = attempt.questions[index];
 const { mutate } = useData(); const navigate = useNavigate(); const { busy, error, run } = useOperation();
 const [answer, setAnswer] = useState(''), [seconds, setSeconds] = useState(attempt.questionSeconds[index] ?? 0), [paused, setPaused] = useState(false), [clockError, setClockError] = useState('');
 const promptRef = useRef<HTMLHeadingElement>(null);
 useEffect(() => { promptRef.current?.focus({ preventScroll: true }); }, [index, paused]);
 const elapsed = useRef(seconds), lock = useRef(false), pending = useRef<{ answer: string; seconds: number } | null>(null);
 useEffect(() => {
  if (attempt.status !== 'ACTIVE') return;
  let previous = performance.now(); let checkpointAt = elapsed.current;
  const checkpoint = () => { void database.quiz.checkpoint(attempt.id,index,elapsed.current).then(() => setClockError('')).catch(() => setClockError('Waktu belum tersimpan. Coba simpan jawaban atau keluar kembali.')); };
  const visibility = () => { previous = performance.now(); checkpoint(); };
  const timer = window.setInterval(() => { const now = performance.now(); if (!document.hidden && !paused && !lock.current) { elapsed.current += Math.min(2,(now-previous)/1000); setSeconds(Math.floor(elapsed.current)); } previous = now; if(elapsed.current-checkpointAt >= 5) { checkpointAt=elapsed.current; checkpoint(); } },1000);
  document.addEventListener('visibilitychange',visibility);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange',visibility); void database.quiz.checkpoint(attempt.id,index,elapsed.current).catch(() => undefined); };
 },[attempt.id,index,attempt.status,paused]);
 if (attempt.status === 'COMPLETED') return <Navigate replace to={`/quiz/result?id=${attempt.id}`} />;
 if (!question) return <p role="alert">Sesi tidak valid. Kembali ke halaman quiz.</p>;
 const savedSeconds = attempt.questionSeconds.slice(0,index).reduce((a,b) => a+b,0);
 function submit() {
  if (lock.current) return; lock.current=true;
  const input = pending.current ?? {answer:answer.trim(),seconds:elapsed.current}; pending.current=input;
  void run(async () => { let updated: QuizAttempt | undefined;
   await mutate(async () => { updated=await database.quiz.answer(attempt.id,index,input.answer,input.seconds); });
   if (!answerIsCorrect(question,input.answer)) navigate(`/quiz?attempt=${attempt.id}&feedback=${index}`,{replace:true});
   else if(updated?.status === 'COMPLETED') navigate(`/quiz/result?id=${attempt.id}`,{replace:true});
   await onSaved();
  }).finally(() => {lock.current=false;});
 }
 return <Card className="quiz-runner"><div className="quiz-session-meta"><Badge>{question.itemType === 'vocabulary' ? 'Kotoba' : 'Bunpou'} · {question.jlptLevel}</Badge><span aria-live="polite">Soal {index+1} / {attempt.questions.length}</span><span aria-label="Waktu aktif">{durationLabel(savedSeconds+seconds)}</span></div><ProgressBar value={index/attempt.questions.length*100} label="Kemajuan quiz" /><p className="small-note">{questionTypes.find(t => t.value === question.type)?.label} · Waktu berhenti ketika tab tersembunyi atau sesi dijeda.</p>
 <div className="quiz-session-actions"><Button variant="secondary" disabled={busy || !!pending.current} onClick={() => setPaused(p => !p)}>{paused ? 'Lanjutkan quiz' : 'Jeda'}</Button><Button variant="secondary" disabled={busy} onClick={() => void run(async () => { await database.quiz.checkpoint(attempt.id,index,elapsed.current); navigate('/quiz'); })}>Simpan & keluar</Button></div>
 {paused ? <div className="quiz-pause"><h2>Sesi dijeda</h2><p>Tekan Lanjutkan quiz saat kamu siap.</p></div> : <form onSubmit={e => {e.preventDefault();submit();}}><h2 ref={promptRef} className="quiz-prompt" tabIndex={-1}>{question.prompt}</h2><fieldset className="quiz-answer-field" disabled={busy || !!pending.current}><legend className="sr-only">Jawaban quiz</legend>{question.answerFormat === 'text' ? <label className="quiz-text-answer">Jawaban Jepang<input autoComplete="off" spellCheck={false} aria-label="Jawaban Jepang" maxLength={4000} value={answer} onChange={e => setAnswer(e.target.value)} /><span className="small-note">Spasi, lebar karakter, dan tanda baca tidak memengaruhi penilaian. Gunakan bentuk Jepang sesuai petunjuk, bukan romaji.</span></label> : <div className="quiz-options">{question.options.map((o,i) => <label key={o.id} className={`quiz-option ${answer === o.id ? 'selected' : ''}`}><input type="radio" name={`question-${question.id}`} value={o.id} checked={answer === o.id} onChange={() => setAnswer(o.id)} /><span className="quiz-option-letter">{String.fromCharCode(65+i)}</span><span>{o.text}</span></label>)}</div>}</fieldset><div className="quiz-submit"><p className="small-note">Jawaban yang dikirim tidak dapat diubah.</p><Button type="submit" disabled={busy || !answer.trim()}>{busy ? 'Menyimpan…' : pending.current ? 'Coba simpan lagi' : index+1 === attempt.questions.length ? 'Selesai & lihat hasil' : 'Simpan & berikutnya'}</Button></div></form>}
 <ErrorMessage message={error || clockError} /></Card>;
}
