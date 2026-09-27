import type { ContentKind, Entity, JLPTLevel, QuizQuestion } from './content';
import type { FlashcardRating } from './progress';
export interface ReviewFilter { mode: ContentKind | 'mixed'; level?: JLPTLevel | 'all'; categoryId?: string; query?: string }
export interface ReviewEntry { itemId: string; itemType: ContentKind; title: string; dimension: QuizQuestion['dimension']; fingerprint: string }
export interface ReviewOutcome { itemId: string; itemType: ContentKind; title: string; dimension: QuizQuestion['dimension']; rating: FlashcardRating | null; response: string; skippedReason?: string; nextReview: string | null; masteryScore: number | null; answeredAt: string }
export interface ReviewRun extends Entity { filter: ReviewFilter; entries: ReviewEntry[]; outcomes: ReviewOutcome[]; status: 'ACTIVE' | 'COMPLETED'; finishedAt: string | null }
