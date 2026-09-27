import type { ReviewRun, ReviewFilter, FlashcardRating, QuizAttempt, QuizConfig, GrammarReviewEvent, GrammarReviewInput, VocabularyReviewEvent, VocabularyReviewInput, Category, Entity, ExampleSentence, Favorite, Grammar, LearningProgress, QuizQuestion, QuizResult, ReviewSchedule, StudySession, Vocabulary } from '../domain/models';

export interface Tables {
  vocabulary: Vocabulary;
  grammar: Grammar;
  examples: ExampleSentence;
  categories: Category;
  questions: QuizQuestion;
  progress: LearningProgress;
  favorites: Favorite;
  schedules: ReviewSchedule;
  quizResults: QuizResult;
  quizAttempts: QuizAttempt;
  reviewRuns: ReviewRun;
  sessions: StudySession;
  reviewEvents: VocabularyReviewEvent | GrammarReviewEvent;
  meta: { id: string; value: string };
}
export type StoreName = keyof Tables;
export type NewEntity<T extends Entity> = Omit<T, keyof Entity>;
export type EntityPatch<T extends Entity> = Partial<NewEntity<T>>;
export interface Repository<T extends Entity> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(data: NewEntity<T>): Promise<T>;
  update(id: string, changes: EntityPatch<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
export interface LearningDatabase {
  transfer: {
    preview(rows: import('../domain/transfer/format').ImportRow[]): Promise<import('../domain/transfer/format').ImportPreview>;
    commit(preview: import('../domain/transfer/format').ImportPreview, actions: import('../domain/transfer/format').DuplicateAction[], targets: (string | null)[]): Promise<{created:number;merged:number;ignored:number}>;
    export(): Promise<import('../domain/transfer/format').ImportRow[]>;
  };
  initialize(): Promise<void>;
  resetLearningProgress(confirmed: boolean): Promise<void>;
  deleteAllLearningData(confirmation: string): Promise<void>;
  review: {
    start(filter: ReviewFilter, limit: number): Promise<ReviewRun>;
    answer(id: string, index: number, rating: FlashcardRating, response: string, seconds: number): Promise<ReviewRun>;
    skip(id: string, index: number): Promise<ReviewRun>;
  };
  reviewRuns: Pick<Repository<ReviewRun>, 'list' | 'get'>;
  quiz: {
    start(config: QuizConfig): Promise<QuizAttempt>;
    answer(id: string, questionIndex: number, answer: string, seconds: number): Promise<QuizAttempt>;
    checkpoint(id: string, questionIndex: number, seconds: number): Promise<void>;
  };
  quizAttempts: Pick<Repository<QuizAttempt>, 'list' | 'get'>;
  learning: { recordGrammarReview(input: GrammarReviewInput): Promise<LearningProgress>; queueGrammarReview(itemId: string): Promise<LearningProgress>; recordVocabularyReview(input: VocabularyReviewInput): Promise<LearningProgress>; queueVocabularyReview(itemId: string): Promise<LearningProgress> };
  reviewEvents: Pick<Repository<VocabularyReviewEvent | GrammarReviewEvent>, 'list' | 'get'>;
  vocabulary: Repository<Vocabulary>;
  grammar: Repository<Grammar>;
  categories: Repository<Category>;
  progress: Repository<LearningProgress>;
  favorites: Repository<Favorite>;
  examples: Repository<ExampleSentence>;
  schedules: Pick<Repository<ReviewSchedule>, 'list' | 'get'>;
  quizResults: Pick<Repository<QuizResult>, 'list' | 'get'>;
  sessions: Pick<Repository<StudySession>, 'list' | 'get'>;
}
