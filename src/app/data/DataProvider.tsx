import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Category, ExampleSentence, Favorite, Grammar, LearningProgress, PDFMaterial, Vocabulary, QuizResult, StudySession } from '../../domain/models';
import { database } from '../../services/database';

interface Snapshot { vocabulary: Vocabulary[]; grammar: Grammar[]; categories: Category[]; progress: LearningProgress[]; favorites: Favorite[]; examples: ExampleSentence[]; materials: PDFMaterial[]; quizResults: QuizResult[]; sessions: StudySession[] }
const empty: Snapshot = { vocabulary: [], grammar: [], categories: [], progress: [], favorites: [], examples: [], materials: [], quizResults: [], sessions: [] };
const DataContext = createContext<(Snapshot & { loading: boolean; error: string; refresh: () => Promise<void>; mutate: (operation: () => Promise<unknown>, notification?: 'changed' | 'reset') => Promise<void> }) | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      await database.initialize();
      const [vocabulary, grammar, categories, progress, favorites, examples, materials, quizResults, sessions] = await Promise.all([
        database.vocabulary.list(), database.grammar.list(), database.categories.list(), database.progress.list(), database.favorites.list(), database.examples.list(), database.materials.list(), database.quizResults.list(), database.sessions.list(),
      ]);
      if (ticket === generation.current) { setData({ vocabulary, grammar, categories, progress, favorites, examples, materials, quizResults, sessions }); setError(''); }
    } catch (cause) {
      if (ticket === generation.current) setError(cause instanceof Error ? cause.message : 'Penyimpanan gagal dibuka.');
      throw cause;
    } finally { if (ticket === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const update = (event?: Event | MessageEvent) => { if (event && 'data' in event && event.data === 'reset') { window.location.reload(); return; } void refresh().catch(() => undefined); };
    update();
    window.addEventListener('focus', update);
    try { channel.current = new BroadcastChannel('nihongo-master:data'); channel.current.onmessage = update; } catch { /* focus refresh remains available */ }
    return () => { window.removeEventListener('focus', update); channel.current?.close(); channel.current = null; generation.current++; };
  }, [refresh]);
  async function mutate(operation: () => Promise<unknown>, notification: 'changed' | 'reset' = 'changed') {
    await operation();
    channel.current?.postMessage(notification);
    await refresh();
  }
  return <DataContext.Provider value={{ ...data, loading, error, refresh, mutate }}>{children}</DataContext.Provider>;
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('DataProvider is required');
  return value;
}
