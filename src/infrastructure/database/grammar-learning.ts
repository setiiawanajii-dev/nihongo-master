import { appendActivity } from '../../domain/learning/study-activity';
import { progressKey, type LearningProgress, type GrammarReviewInput } from '../../domain/models';
import { advanceGrammar } from '../../domain/learning/grammar';
import { newProgress } from '../../services/progress';
import { stores, transact } from './indexeddb';
import { validate } from './validation';

export async function recordGrammarReview(input: GrammarReviewInput): Promise<LearningProgress> {
  if (!input || !['understanding', 'usage', 'sentence'].includes(input.dimension) || typeof input.response !== 'string' || !input.response.trim() || input.response.length > 4000 || ![0, 1, 2, 3].includes(input.rating) || !input.itemId || !input.eventId?.trim() || !input.sessionId?.trim() || !Number.isFinite(input.activeDurationSeconds) || input.activeDurationSeconds < 0) throw new Error('Penilaian grammar tidak valid.');
  return transact(stores, 'readwrite', async tx => {
    const key = progressKey('grammar', input.itemId);
    if (!await tx.get('grammar', input.itemId)) throw new Error('Grammar sudah dihapus. Lewati kartu ini.');
    const previousEvent = await tx.get('reviewEvents', input.eventId);
    if (previousEvent) {
      if (previousEvent.itemType !== 'grammar' || previousEvent.itemId !== input.itemId || previousEvent.rating !== input.rating || previousEvent.sessionId !== input.sessionId || previousEvent.dimension !== input.dimension || previousEvent.response !== input.response.trim()) throw new Error('Identitas jawaban telah dipakai. Muat ulang sesi.');
      const saved = await tx.get('progress', key);
      if (!saved) throw new Error('Progres telah dihapus. Mulai sesi baru.');
      return saved;
    }
    const now = new Date(); const stamp = now.toISOString();
    const previous = await tx.get('progress', key) ?? { ...newProgress('grammar', input.itemId), id: key, createdAt: stamp, updatedAt: stamp };
    const next = advanceGrammar(previous, await tx.get('schedules', key), input.rating, input.dimension, now);
    await validate('progress', next.progress, tx);
    await tx.put('progress', next.progress);
    await tx.put('schedules', { id: key, itemId: input.itemId, itemType: 'grammar', intervalDays: next.intervalDays, lastRating: input.rating,
      reviewCount: next.progress.reviewCount, lastReviewed: stamp, nextReview: next.nextReview, createdAt: previous.createdAt, updatedAt: stamp });
    const duration = Math.min(300, Math.round(input.activeDurationSeconds));
    await tx.add('reviewEvents', { id: input.eventId, itemId: input.itemId, itemType: 'grammar', rating: input.rating, dimension: input.dimension, response: input.response.trim(), sessionId: input.sessionId,
      nextReview: next.nextReview, activeDurationSeconds: duration, createdAt: stamp, updatedAt: stamp });
    const session = await tx.get('sessions', input.sessionId);
    if (session && session.type !== 'review') throw new Error('Identitas sesi sudah dipakai aktivitas lain.');
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await tx.put('sessions', { id: input.sessionId, type: 'review', startedAt: session?.startedAt ?? new Date(now.getTime() - duration * 1000).toISOString(), endedAt: stamp,
      activeDurationSeconds: (session?.activeDurationSeconds ?? 0) + duration, timezone: session?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      dailyActivity: appendActivity(session, duration, now), localDate: session?.localDate ?? localDate, itemIds: [...new Set([...(session?.itemIds ?? []), input.itemId])], createdAt: session?.createdAt ?? stamp, updatedAt: stamp });
    return next.progress;
  });
}
export async function queueGrammarReview(itemId: string) {
  return transact(stores, 'readwrite', async tx => {
    if (!await tx.get('grammar', itemId)) throw new Error('Grammar tidak ditemukan.');
    const stamp = new Date().toISOString(); const id = progressKey('grammar', itemId);
    const previous = await tx.get('progress', id) ?? { ...newProgress('grammar', itemId), id, createdAt: stamp, updatedAt: stamp };
    const progress: LearningProgress = { ...previous, nextReview: stamp, updatedAt: stamp };
    const schedule = await tx.get('schedules', id);
    await tx.put('progress', progress);
    await tx.put('schedules', { id, itemId, itemType: 'grammar', intervalDays: schedule?.intervalDays ?? 0, lastRating: schedule?.lastRating ?? null,
      reviewCount: progress.reviewCount, lastReviewed: progress.lastReviewed, nextReview: stamp, createdAt: schedule?.createdAt ?? stamp, updatedAt: stamp });
    return progress;
  });
}
