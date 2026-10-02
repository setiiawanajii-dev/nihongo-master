import type { Vocabulary, Grammar, LearningProgress, QuizResult, StudySession, MasteryStatus, ContentKind } from '../models';

export interface ProgressSnapshot { vocabulary: Vocabulary[]; grammar: Grammar[]; progress: LearningProgress[]; quizResults: QuizResult[]; sessions: StudySession[] }
export const statuses: MasteryStatus[] = ['NEW', 'LEARNING', 'REVIEW', 'WEAK', 'MASTERED'];
export const statusLabels: Record<MasteryStatus, string> = { NEW: 'New', LEARNING: 'Learning', REVIEW: 'Review', WEAK: 'Weak', MASTERED: 'Mastered' };
export const percent = (value: number | null) => value === null ? '—' : `${Math.round(value * 10) / 10}%`;
export function duration(seconds: number) { const n = Math.round(seconds); return n < 60 ? `${n} detik` : n < 3600 ? `${Math.floor(n / 60)} m ${n % 60} d` : `${Math.floor(n / 3600)} j ${Math.floor(n % 3600 / 60)} m`; }
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86400000;
const dayString = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function calculateProgress(data: ProgressSnapshot, today = localDay()) {
  const progress = new Map(data.progress.map(p => [`${p.itemType}:${p.itemId}`, p]));
  function summarize(kind: ContentKind, level?: string) {
    const items = data[kind].filter(i => !level || i.jlptLevel === level);
    const counts = Object.fromEntries(statuses.map(s => [s, 0])) as Record<MasteryStatus, number>;
    let assessed = 0, sum = 0;
    for (const item of items) { const p = progress.get(`${kind}:${item.id}`); counts[p?.status ?? 'NEW']++; if (p?.masteryScore != null) { assessed++; sum += p.masteryScore; } }
    return { total: items.length, counts, learning: counts.LEARNING + counts.REVIEW, assessed, coverage: items.length ? sum / items.length : null };
  }
  const quizzes = [...data.quizResults].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(dayNumber(day)) && day <= today;
  const sessions = data.sessions.map(session => ({ session, activity: Object.entries(session.dailyActivity ?? { [session.localDate]: session.activeDurationSeconds }).filter(([day, seconds]) => validDay(day) && Number.isFinite(seconds) && seconds >= 0) })).filter(s => s.activity.length);
  const days = new Map<string, { sessions: number; seconds: number }>();
  for (const { activity } of sessions) for (const [date, seconds] of activity) {
    const day = days.get(date) ?? { sessions: 0, seconds: 0 };
    day.sessions++; day.seconds += seconds; days.set(date, day);
  }
  const ordered = [...days.keys()].map(dayNumber).sort((a, b) => a - b);
  let longest = 0, run = 0, previous = -Infinity;
  for (const day of ordered) { run = day === previous + 1 ? run + 1 : 1; longest = Math.max(longest, run); previous = day; }
  let current = 0, cursor = dayNumber(today);
  if (!days.has(today)) cursor--;
  while (days.has(dayString(cursor))) { current++; cursor--; }
  const activity = Array.from({ length: 30 }, (_, i) => { const date = dayString(dayNumber(today) - 29 + i); return { date, ...(days.get(date) ?? { sessions: 0, seconds: 0 }) }; });
  const levels = ['N5', 'N4', 'N3', 'N2'].map(level => {
    const vocabulary = summarize('vocabulary', level), grammar = summarize('grammar', level);
    const answers = quizzes.flatMap(q => q.answers.filter(a => {
      const snapshot = a.questionSnapshot;
      const live = data[snapshot.itemType].find(i => i.id === snapshot.itemId);
      return (snapshot.jlptLevel ?? live?.jlptLevel ?? (q.config?.levels.length === 1 ? q.config.levels[0] : undefined)) === level;
    }));
    const quiz = answers.length ? answers.filter(a => a.isCorrect).length / answers.length * 100 : null;
    const components = [vocabulary.coverage, grammar.coverage].filter((v): v is number => v !== null);
    const overall = components.length || quiz !== null ? [...components, quiz ?? 0].reduce((a, b) => a + b, 0) / (components.length + 1) : null;
    return { level, vocabulary, grammar, quiz, questions: answers.length, overall };
  });
  return { vocabulary: summarize('vocabulary'), grammar: summarize('grammar'), levels, quizzes,
    quiz: { total: quizzes.length, score: mean(quizzes.map(q => q.score)), accuracy: mean(quizzes.map(q => q.accuracy)) },
    study: { total: sessions.length, seconds: sessions.reduce((n, s) => n + s.activity.reduce((sum, [, seconds]) => sum + seconds, 0), 0), current, longest, today: days.get(today) ?? { sessions: 0, seconds: 0 }, activity } };
}
export type ProgressAnalytics = ReturnType<typeof calculateProgress>;
