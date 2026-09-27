import type { LearningProgress, QuizConfig, QuizQuestion, QuizResult } from '../../domain/models';
import { sourceLabel } from '../../domain/quiz/source';
import { progressKey } from '../../domain/models';
import { buildQuestionPool, calculateResult, chooseQuestions } from '../../domain/quiz/engine';
import { scheduleReview } from '../../domain/learning/spaced-repetition';
import { newProgress } from '../../services/progress';
import { stores, transact, type Transaction } from './indexeddb';
import { validate } from './validation';

async function applyProgress(tx: Transaction, result: QuizResult) {
 const ratings = new Map<string, 0 | 2>();
 for (const row of result.answers) {
  const q = row.questionSnapshot;
  // Content may have been deleted while the quiz was open; history remains a snapshot.
  if (!await tx.get(q.itemType, q.itemId)) continue;
  const id = progressKey(q.itemType, q.itemId), stamp = result.finishedAt;
  const current = await tx.get('progress', id) ?? { ...newProgress(q.itemType, q.itemId), id, createdAt: stamp, updatedAt: stamp };
  ratings.set(id, !row.isCorrect || ratings.get(id) === 0 ? 0 : 2);
  const previous = current.dimensions[q.dimension];
  const attempts = (previous?.attempts ?? 0) + 1;
  const score = Math.round(((previous?.score ?? 0) * (attempts - 1) + (row.isCorrect ? 100 : 0)) / attempts);
  const dimensions = { ...current.dimensions, [q.dimension]: { attempts, correct: (previous?.correct ?? 0) + Number(row.isCorrect), score, lastTestedAt: stamp, source: previous && previous.source !== 'quiz' ? 'mixed' as const : 'quiz' as const } };
  const keys = q.itemType === 'vocabulary' ? ['recognition', 'meaning', 'kanji', 'usage'] as const : ['understanding', 'usage', 'sentence'] as const;
  const masteryScore = Math.round(keys.reduce((sum,key) => sum + (dimensions[key]?.score ?? 0),0) / keys.length);
  const mastered = masteryScore >= 85 && keys.every(key => (dimensions[key]?.score ?? 0) >= 80 && (dimensions[key]?.attempts ?? 0) >= 3);
  const progress: LearningProgress = { ...current, dimensions, masteryScore, status: !row.isCorrect ? 'WEAK' : mastered ? 'MASTERED' : 'REVIEW', reviewCount: current.reviewCount + 1, correctCount: current.correctCount + Number(row.isCorrect), wrongCount: current.wrongCount + Number(!row.isCorrect), lastReviewed: stamp, updatedAt: stamp };
  await validate('progress', progress, tx); await tx.put('progress', progress);
 }
 for (const [id,rating] of ratings) {
  const progress = (await tx.get('progress',id))!;
  const next = scheduleReview(progress,await tx.get('schedules',id),rating,new Date(result.finishedAt));
  await tx.put('progress',{...progress, nextReview:next.nextReview, status:rating === 0 ? 'WEAK' : progress.status});
  await tx.put('schedules',next.schedule);
 }
}
function secondsValue(seconds: number) { if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86_400) throw new Error('Waktu jawaban tidak valid.'); return Math.floor(seconds); }
export const quizCommands = {
 async start(config: QuizConfig) {
  return transact(stores, 'readwrite', async tx => {
   const content = { vocabulary: await tx.list('vocabulary'), grammar: await tx.list('grammar'), examples: await tx.list('examples'), categories: await tx.list('categories'), materials: await tx.list('materials') };
   const questions = chooseQuestions(buildQuestionPool(content, config), config);
   const stamp = new Date().toISOString();
   const attempt = { id: crypto.randomUUID(), config: { ...config, sourceLabel: sourceLabel(config.source, content.materials) }, questions, answers: [], questionSeconds: questions.map(() => 0), status: 'ACTIVE' as const, startedAt: stamp, completedAt: null, createdAt: stamp, updatedAt: stamp };
   await tx.add('quizAttempts', attempt); return attempt;
  });
 },
 async checkpoint(id: string, questionIndex: number, seconds: number) {
  const elapsed = secondsValue(seconds);
  await transact(['quizAttempts'], 'readwrite', async tx => {
   const attempt = await tx.get('quizAttempts', id);
   if (!attempt || attempt.status !== 'ACTIVE' || attempt.answers.length !== questionIndex) return;
   attempt.questionSeconds[questionIndex] = Math.max(attempt.questionSeconds[questionIndex], elapsed);
   await tx.put('quizAttempts', { ...attempt, updatedAt: new Date().toISOString() });
  });
 },
 async answer(id: string, questionIndex: number, answer: string, seconds: number) {
  const elapsed = secondsValue(seconds);
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 4000 || !Number.isInteger(questionIndex) || questionIndex < 0) throw new Error('Isi atau pilih jawaban terlebih dahulu.');
  return transact(stores, 'readwrite', async tx => {
   const attempt = await tx.get('quizAttempts', id);
   if (!attempt) throw new Error('Sesi quiz tidak ditemukan.');
   const existing = attempt.answers[questionIndex];
   if (existing) { if (existing.answer === answer.trim()) return attempt; throw new Error('Soal ini sudah dijawab di tab lain. Muat ulang sesi.'); }
   if (attempt.status !== 'ACTIVE' || questionIndex !== attempt.answers.length) throw new Error('Urutan soal berubah. Muat ulang sesi quiz.');
   const question = attempt.questions[questionIndex];
   if (!question || (question.answerFormat !== 'text' && !question.options.some(o => o.id === answer))) throw new Error('Pilihan jawaban tidak valid.');
   const stamp = new Date().toISOString();
   attempt.answers.push({ questionId: question.id, answer: answer.trim(), answeredAt: stamp });
   attempt.questionSeconds[questionIndex] = Math.max(attempt.questionSeconds[questionIndex], elapsed);
   attempt.updatedAt = stamp;
   if (attempt.answers.length === attempt.questions.length) {
    attempt.status = 'COMPLETED'; attempt.completedAt = stamp;
    const result = calculateResult(attempt, stamp);
    await tx.add('quizResults', result); await applyProgress(tx, result);
    const now = new Date();
    await tx.add('sessions', { id, type: 'quiz', startedAt: attempt.startedAt, endedAt: stamp, activeDurationSeconds: result.activeDurationSeconds, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, localDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, itemIds: [...new Set(attempt.questions.map(q => q.itemId))], createdAt: stamp, updatedAt: stamp });
   }
   await tx.put('quizAttempts', attempt); return attempt;
  });
 },
};

// Add provenance fields to old snapshots without changing questions, answers or scores.
export async function backfillQuizSources(tx: Transaction) {
 if (await tx.get('meta', 'quiz-sources-v1')) return;
 const materials = await tx.list('materials');
 const enrich = (q: QuizQuestion): QuizQuestion => ({ ...q, contentId: q.contentId ?? q.itemId, sourcePdfName: q.sourcePdfName ?? materials.find(m => m.id === q.sourcePdfId)?.filename });
 for (const q of await tx.list('questions')) await tx.put('questions', enrich(q));
 for (const attempt of await tx.list('quizAttempts')) await tx.put('quizAttempts', { ...attempt, questions: attempt.questions.map(enrich) });
 for (const result of await tx.list('quizResults')) await tx.put('quizResults', { ...result, answers: result.answers.map(a => ({ ...a, questionSnapshot: enrich(a.questionSnapshot) })) });
 await tx.put('meta', { id: 'quiz-sources-v1', value: new Date().toISOString() });
}
