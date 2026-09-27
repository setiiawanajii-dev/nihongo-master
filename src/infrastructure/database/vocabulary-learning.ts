import { progressKey, type LearningProgress, type VocabularyReviewInput } from '../../domain/models';
import { advanceVocabulary } from '../../domain/learning/vocabulary';
import { newProgress } from '../../services/progress';
import { stores, transact } from './indexeddb';
import { validate } from './validation';

export async function recordVocabularyReview(input: VocabularyReviewInput): Promise<LearningProgress> {
  if (!input || ![0, 1, 2, 3].includes(input.rating) || !input.itemId || !input.eventId?.trim() || !input.sessionId?.trim() || !Number.isFinite(input.activeDurationSeconds) || input.activeDurationSeconds < 0) throw new Error('Jawaban flashcard tidak valid.');
  return transact(stores, 'readwrite', async tx => {
    const key = progressKey('vocabulary', input.itemId);
    if (!await tx.get('vocabulary', input.itemId)) throw new Error('Vocabulary sudah dihapus. Lewati kartu ini.');
    const previousEvent = await tx.get('reviewEvents', input.eventId);
    if (previousEvent) {
      if (previousEvent.itemType !== 'vocabulary' || previousEvent.itemId !== input.itemId || previousEvent.rating !== input.rating || previousEvent.sessionId !== input.sessionId) throw new Error('Identitas jawaban telah dipakai. Muat ulang sesi.');
      const saved = await tx.get('progress', key);
      if (!saved) throw new Error('Progres telah dihapus. Mulai sesi baru.');
      return saved;
    }
    const now = new Date(); const stamp = now.toISOString();
    const previous = await tx.get('progress', key) ?? { ...newProgress('vocabulary', input.itemId), id: key, createdAt: stamp, updatedAt: stamp };
    const next = advanceVocabulary(previous, await tx.get('schedules', key), input.rating, now);
    await validate('progress', next.progress, tx);
    await tx.put('progress', next.progress);
    await tx.put('schedules', { id: key, itemId: input.itemId, itemType: 'vocabulary', intervalDays: next.intervalDays, lastRating: input.rating,
      reviewCount: next.progress.reviewCount, lastReviewed: stamp, nextReview: next.nextReview, createdAt: previous.createdAt, updatedAt: stamp });
    const duration = Math.min(300, Math.round(input.activeDurationSeconds));
    await tx.add('reviewEvents', { id: input.eventId, itemId: input.itemId, itemType: 'vocabulary', rating: input.rating, sessionId: input.sessionId,
      nextReview: next.nextReview, activeDurationSeconds: duration, createdAt: stamp, updatedAt: stamp });
    const session = await tx.get('sessions', input.sessionId);
    if (session && session.type !== 'flashcards') throw new Error('Identitas sesi sudah dipakai aktivitas lain.');
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await tx.put('sessions', { id: input.sessionId, type: 'flashcards', startedAt: session?.startedAt ?? new Date(now.getTime() - duration * 1000).toISOString(), endedAt: stamp,
      activeDurationSeconds: (session?.activeDurationSeconds ?? 0) + duration, timezone: session?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      localDate: session?.localDate ?? localDate, itemIds: [...new Set([...(session?.itemIds ?? []), input.itemId])], createdAt: session?.createdAt ?? stamp, updatedAt: stamp });
    return next.progress;
  });
}
export async function queueVocabularyReview(itemId: string) {
  return transact(stores, 'readwrite', async tx => {
    if (!await tx.get('vocabulary', itemId)) throw new Error('Vocabulary tidak ditemukan.');
    const stamp = new Date().toISOString(); const id = progressKey('vocabulary', itemId);
    const previous = await tx.get('progress', id) ?? { ...newProgress('vocabulary', itemId), id, createdAt: stamp, updatedAt: stamp };
    const progress: LearningProgress = { ...previous, nextReview: stamp, updatedAt: stamp };
    const schedule = await tx.get('schedules', id);
    await tx.put('progress', progress);
    await tx.put('schedules', { id, itemId, itemType: 'vocabulary', intervalDays: schedule?.intervalDays ?? 0, lastRating: schedule?.lastRating ?? null,
      reviewCount: progress.reviewCount, lastReviewed: progress.lastReviewed, nextReview: stamp, createdAt: schedule?.createdAt ?? stamp, updatedAt: stamp });
    return progress;
  });
}
