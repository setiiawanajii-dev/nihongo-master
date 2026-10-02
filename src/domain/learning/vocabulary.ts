import { advanceEvidence } from './spaced-repetition';
import type { FlashcardRating, LearningProgress, ReviewSchedule, Vocabulary } from '../models';

export const ratings = [
  { value: 0, label: '😵 Belum tahu', hint: '10 menit / 1 hari' },
  { value: 1, label: '😐 Hampir tahu', hint: '1–7 hari' },
  { value: 2, label: '🙂 Tahu', hint: '3 hari atau lebih' },
  { value: 3, label: '🔥 Sangat hafal', hint: '7 hari atau lebih' },
] as const;
export function isDue(progress: LearningProgress | undefined, now = Date.now()) {
  return !!progress?.nextReview && Date.parse(progress.nextReview) <= now;
}
export function advanceVocabulary(progress: LearningProgress, schedule: ReviewSchedule | undefined, rating: FlashcardRating, now: Date, item: Vocabulary) {
  return advanceEvidence(progress, schedule, rating, 'recognition', now, rating >= 2, item);
}
export function reviewDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belum dijadwalkan';
}
