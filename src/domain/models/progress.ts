import type { ContentKind, Entity, QuizQuestion } from './content';

export type MasteryStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'WEAK' | 'MASTERED';
export interface DimensionEvidence { source?: 'self-rated' | 'quiz' | 'mixed'; attempts: number; correct: number; score: number | null; lastTestedAt: string | null }
export interface LearningProgress extends Entity {
  itemId: string;
  itemType: ContentKind;
  status: MasteryStatus;
  masteryScore: number | null; // null means not assessed, not 0% ability.
  dimensions: Partial<Record<QuizQuestion['dimension'], DimensionEvidence>>;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewed: string | null;
  nextReview: string | null;
  notes: string;
}
export interface ReviewSchedule extends Entity {
  itemId: string;
  itemType: ContentKind;
  lastReviewed: string | null;
  nextReview: string;
  intervalDays: number;
  reviewCount: number;
  lastRating: 0 | 1 | 2 | 3 | null;
}
export interface QuizResult extends Entity {
  sessionId: string;
  config?: import('./quiz').QuizConfig;
  startedAt: string;
  finishedAt: string;
  activeDurationSeconds: number;
  score: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  answers: { questionSnapshot: QuizQuestion; answer: string; isCorrect: boolean; answeredAt: string }[];
}
export interface StudySession extends Entity {
  type: 'flashcards' | 'quiz' | 'review' | 'reading';
  startedAt: string;
  endedAt: string | null;
  activeDurationSeconds: number;
  timezone: string;
  localDate: string;
  dailyActivity?: Record<string, number>;
  itemIds: string[];
}
export type FavoriteTarget = { type: ContentKind; itemId: string };
export interface Favorite extends Entity { target: FavoriteTarget; notes: string }

export function progressKey(type: ContentKind, itemId: string) { return `${type}:${itemId}`; }
export function favoriteKey(target: FavoriteTarget) {
  return progressKey(target.type, target.itemId);
}

export type GrammarDimension = 'understanding' | 'usage' | 'sentence';
export interface GrammarReviewInput extends VocabularyReviewInput { dimension: GrammarDimension; response: string }
export interface GrammarReviewEvent extends Omit<VocabularyReviewEvent, 'itemType'> { itemType: 'grammar'; dimension: GrammarDimension; response: string }

export type FlashcardRating = 0 | 1 | 2 | 3;
export interface VocabularyReviewEvent extends Entity {
  itemId: string;
  itemType: 'vocabulary';
  dimension?: QuizQuestion['dimension'];
  response?: string;
  rating: FlashcardRating;
  sessionId: string;
  nextReview: string;
  activeDurationSeconds: number;
}
export interface VocabularyReviewInput {
  itemId: string;
  rating: FlashcardRating;
  eventId: string;
  sessionId: string;
  activeDurationSeconds: number;
}
