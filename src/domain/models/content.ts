export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2';
export type ContentKind = 'vocabulary' | 'grammar';
export interface Entity { id: string; createdAt: string; updatedAt: string }
export interface SourceReference {
  sourcePdfId: string; // PDFMaterial.id, not a fabricated file URL.
  sourcePage: number; // One-based PDF page index.
}
export interface ExampleSentence extends Entity, SourceReference {
  itemId: string;
  itemType: ContentKind;
  japanese: string;
  translation: string;
}
export interface ContentBase extends Entity, SourceReference {
  jlptLevel: JLPTLevel;
  categoryIds: string[];
  meaning: string;
  notes: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isSeed: boolean;
  additionalSources: SourceReference[];
  extractionDraftId?: string;
  importedFromFile?: boolean;
  importDuplicate?: boolean;
}
export interface Vocabulary extends ContentBase {
  kanji: string;
  kana: string;
  romaji: string;
  partOfSpeech: string;
}
export interface Grammar extends ContentBase {
  pattern: string;
  formation: string;
  explanation: string;
  commonMistakes: string;
  comparisonIds: string[];
}
export interface Category extends Entity { name: string; description: string; isSeed: boolean }
export interface PDFUnit { id: string; name: string; startPage: number; endPage: number }
export interface PDFMaterial extends Entity {
  units?: PDFUnit[];
  name: string;
  file: string | null; // Key of the Blob in pdfFiles; null for seed references.
  totalPages: number;
  completedPages: number;
  source: string;

  title: string;
  filename: string;
  pageCount: number;
  isDummy: boolean;
  status: 'REFERENCE_ONLY' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'ERROR';
  checksum: string | null;
}
export interface PDFPage extends Entity {
  materialId: string;
  pageNumber: number;
  printedPageLabel: string | null;
  text: string;
  extractionStatus?: import('./extraction').ExtractionPageStatus;
  extractionError?: string;
  extractionProvider?: string;
}
export type QuizQuestionType = 'jp-to-id' | 'id-to-jp' | 'kanji-to-kana' | 'fill-blank' | 'usage' | 'grammar-meaning' | 'multiple-choice' | 'grammar-choice' | 'grammar-blank' | 'grammar-sentence' | 'grammar-comparison' | 'grammar-situation';
export interface QuizQuestion extends Entity, SourceReference {
  contentId: string; // Canonical content ID; legacy snapshots are backfilled from itemId.
  sourcePdfName?: string; // Snapshot preserves readable provenance in quiz history.
  itemId: string;
  itemType: ContentKind;
  type: QuizQuestionType;
  dimension: 'recognition' | 'meaning' | 'kanji' | 'usage' | 'understanding' | 'sentence';
  prompt: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  answerFormat?: 'choice' | 'text';
  jlptLevel?: JLPTLevel;
  contentLabel?: string;
  explanation: string;
}

export interface PDFFile { id: string; blob: Blob }
export interface PDFReadingProgress extends Entity { completedPageNumbers: number[]; lastPage: number }
