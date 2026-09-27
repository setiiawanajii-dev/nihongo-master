import type { ExtractionDraft, ExtractionRun, DraftEdit, PDFFile, PDFReadingProgress, ReviewRun, ReviewFilter, FlashcardRating, QuizAttempt, QuizConfig, GrammarReviewEvent, GrammarReviewInput, VocabularyReviewEvent, VocabularyReviewInput, Category, Entity, ExampleSentence, Favorite, Grammar, LearningProgress, PDFMaterial, PDFPage, QuizQuestion, QuizResult, ReviewSchedule, StudySession, Vocabulary } from '../domain/models';

export interface Tables {
  vocabulary: Vocabulary;
  grammar: Grammar;
  examples: ExampleSentence;
  categories: Category;
  materials: PDFMaterial;
  pages: PDFPage;
  extractionRuns: ExtractionRun;
  extractionDrafts: ExtractionDraft;
  pdfFiles: PDFFile;
  pdfReading: PDFReadingProgress;
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
  extraction: {
    runs(): Promise<ExtractionRun[]>;
    drafts(): Promise<ExtractionDraft[]>;
    begin(materialId: string, provider: string): Promise<ExtractionRun>;
    savePage(runId: string, token: string, page: PDFPage, drafts: ExtractionDraft[]): Promise<void>;
    finish(runId: string, token: string, status?: 'ERROR' | 'CANCELLED', error?: string): Promise<void>;
    edit(id: string, revision: number, changes: DraftEdit): Promise<ExtractionDraft>;
    delete(id: string, revision: number): Promise<void>;
    approve(id: string, revision: number, confirmed: boolean): Promise<string>;
  };
  pdf: {
    saveUnit(materialId: string, unit: { id?: string; name: string; startPage: number; endPage: number }): Promise<string>;
    upload(file: File, name: string, source: string): Promise<PDFMaterial>;
    getFile(id: string): Promise<Blob | undefined>;
    reading(id: string): Promise<PDFReadingProgress | undefined>;
    visit(id: string, page: number): Promise<void>;
    complete(id: string, page: number, completed: boolean): Promise<void>;
    bookmark(id: string, page: number, bookmarked: boolean): Promise<void>;
    delete(id: string): Promise<void>;
  };
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
  materials: Pick<Repository<PDFMaterial>, 'list' | 'get'>;
  pages: Pick<Repository<PDFPage>, 'list' | 'get'>;
  schedules: Pick<Repository<ReviewSchedule>, 'list' | 'get'>;
  quizResults: Pick<Repository<QuizResult>, 'list' | 'get'>;
  sessions: Pick<Repository<StudySession>, 'list' | 'get'>;
}
