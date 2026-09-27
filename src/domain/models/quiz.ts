import type { Entity, JLPTLevel, QuizQuestion, QuizQuestionType } from './content';
export type QuizSource = { kind: 'all' } | { kind: 'pdf'; sourcePdfId: string } | { kind: 'page'; sourcePdfId: string; page: number } | { kind: 'unit'; sourcePdfId: string; unitId: string };
export interface QuizConfig {
 sourceLabel?: string; // Snapshot of the source selection for session/history display.
 source?: QuizSource; // Missing on legacy sessions means All Materials.
 mode: 'vocabulary' | 'grammar' | 'mixed';
 count: 10 | 20 | 30 | 50;
 levels: JLPTLevel[];
 categoryIds: string[];
 types: QuizQuestionType[];
}
export interface QuizAnswer { questionId: string; answer: string; answeredAt: string }
export interface QuizAttempt extends Entity {
 config: QuizConfig;
 status: 'ACTIVE' | 'COMPLETED';
 questions: QuizQuestion[];
 answers: QuizAnswer[];
 questionSeconds: number[];
 startedAt: string;
 completedAt: string | null;
}
