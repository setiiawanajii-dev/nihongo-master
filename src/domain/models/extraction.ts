import type { ContentKind, Entity, JLPTLevel, SourceReference } from './content';
export type ExtractionPageStatus = 'TEXT' | 'OCR_REQUIRED' | 'ERROR';
export interface ExtractionRun extends Entity {
  materialId: string; token: string; provider: string; totalPages: number; processedPages: number;
  textPages: number; ocrPages: number; errorPages: number;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'OCR_REQUIRED' | 'ERROR' | 'CANCELLED'; error: string;
}
export type DraftKind = ContentKind | 'example';
export interface ExtractionFields {
  kanji: string; kana: string; meaning: string; pattern: string; formation: string; explanation: string;
  example: string; translation: string; romaji: string; partOfSpeech: string;
}
export interface ExtractionDraft extends Entity, SourceReference {
  kind: DraftKind; fields: ExtractionFields; sourceText: string; reasons: string[];
  status: 'PENDING' | 'APPROVED' | 'DELETED'; revision: number;
  jlptLevel: JLPTLevel | null; targetId: string; targetType: ContentKind;
  approvedItemId: string | null;
}
export interface DraftEdit { fields: ExtractionFields; kind: DraftKind; jlptLevel: JLPTLevel | null; targetId: string; targetType: ContentKind }
