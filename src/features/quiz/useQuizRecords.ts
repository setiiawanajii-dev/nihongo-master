import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuizAttempt, QuizResult } from '../../domain/models';
import { database } from '../../services/database';
export function useQuizRecords() {
 const [attempts, setAttempts] = useState<QuizAttempt[]>([]), [results, setResults] = useState<QuizResult[]>([]);
 const [loading, setLoading] = useState(true), [error, setError] = useState('');
 const generation = useRef(0);
 const reload = useCallback(async () => { const ticket = ++generation.current; try { await database.initialize(); const [a,r] = await Promise.all([database.quizAttempts.list(), database.quizResults.list()]); if(ticket !== generation.current) return; setAttempts(a.sort((x,y) => y.updatedAt.localeCompare(x.updatedAt))); setResults(r.sort((x,y) => y.finishedAt.localeCompare(x.finishedAt))); setError(''); } catch(e) { if(ticket === generation.current) setError(e instanceof Error ? e.message : 'Riwayat gagal dimuat.'); } finally { if(ticket === generation.current) setLoading(false); } },[]);
 useEffect(() => { void reload(); const focus = () => { void reload(); }; window.addEventListener('focus', focus); return () => { generation.current++; window.removeEventListener('focus', focus); }; },[reload]);
 return { attempts, results, loading, error, reload };
}
