export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2';
export type ContentKind = 'vocabulary' | 'grammar';
export interface Entity { id: string; createdAt: string; updatedAt: string }

export interface ExampleSentence extends Entity {
  itemId: string;
  itemType: ContentKind;
  japanese: string;
  translation: string;
}
export interface ContentBase extends Entity {
  jlptLevel: JLPTLevel;
  categoryIds: string[];
  meaning: string;
  notes: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isSeed: boolean;
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
export type QuizQuestionType = 'jp-to-id' | 'id-to-jp' | 'kanji-to-kana' | 'fill-blank' | 'usage' | 'grammar-meaning' | 'multiple-choice' | 'grammar-choice' | 'grammar-blank' | 'grammar-sentence' | 'grammar-comparison' | 'grammar-situation';
export interface QuizQuestion extends Entity {
  contentId: string; // Canonical content ID; legacy snapshots are backfilled from itemId.
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

