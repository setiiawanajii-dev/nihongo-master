import { advanceEvidence } from './spaced-repetition';
import type { FlashcardRating, GrammarDimension, LearningProgress, ReviewSchedule } from '../models';
export function advanceGrammar(progress: LearningProgress, schedule: ReviewSchedule | undefined, rating: FlashcardRating, dimension: GrammarDimension, now: Date) {
  return advanceEvidence(progress, schedule, rating, dimension, now);
}
