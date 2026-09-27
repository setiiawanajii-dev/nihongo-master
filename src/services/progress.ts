import type { ContentKind, LearningProgress } from '../domain/models';
import type { NewEntity } from '../repositories/contracts';

export function newProgress(itemType: ContentKind, itemId: string, notes = ''): NewEntity<LearningProgress> {
  return { itemType, itemId, status: 'NEW', masteryScore: null, dimensions: {}, reviewCount: 0,
    correctCount: 0, wrongCount: 0, lastReviewed: null, nextReview: null, notes };
}
