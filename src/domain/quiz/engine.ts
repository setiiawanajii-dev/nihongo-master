import { hasKanji } from '../learning/spaced-repetition';
import type { Category, ExampleSentence, Grammar, QuizAttempt, QuizConfig, QuizQuestion, QuizQuestionType, QuizResult, Vocabulary } from '../models';
import { usableGrammarTemplate } from './grammar-template';

export const questionTypes: { value: QuizQuestionType; kind: 'vocabulary' | 'grammar'; label: string }[] = [
 { value: 'jp-to-id', kind: 'vocabulary', label: 'Japanese → Indonesian' },
 { value: 'id-to-jp', kind: 'vocabulary', label: 'Indonesian → Japanese' },
 { value: 'kanji-to-kana', kind: 'vocabulary', label: 'Kanji → Kana' },
 { value: 'multiple-choice', kind: 'vocabulary', label: 'Multiple choice' },
 { value: 'fill-blank', kind: 'vocabulary', label: 'Fill in blank · vocabulary' },
 { value: 'usage', kind: 'vocabulary', label: 'Context usage' },
 { value: 'grammar-choice', kind: 'grammar', label: 'Choose correct grammar' },
 { value: 'grammar-blank', kind: 'grammar', label: 'Fill in blank · grammar' },
 { value: 'grammar-sentence', kind: 'grammar', label: 'Correct sentence' },
 { value: 'grammar-meaning', kind: 'grammar', label: 'Meaning' },
 { value: 'grammar-comparison', kind: 'grammar', label: 'Grammar comparison' },
 { value: 'grammar-situation', kind: 'grammar', label: 'Situation' },
];
export interface QuizContent { vocabulary: Vocabulary[]; grammar: Grammar[]; examples: ExampleSentence[]; categories: Category[] }
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
 const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result;
}
export function normalizeAnswer(text: string) { return text.normalize('NFKC').trim().replace(/\s+/gu, '').replace(/[。.!！?？、,]/gu, '').toLocaleLowerCase('id'); }
export function answerIsCorrect(question: QuizQuestion, answer: string) {
 return question.answerFormat === 'text' ? [question.correctAnswer, ...(question.acceptedAnswers ?? [])].some(a => normalizeAnswer(a) === normalizeAnswer(answer)) : answer === question.correctAnswer;
}
export function answerText(question: QuizQuestion, answer: string) { return question.answerFormat === 'text' ? answer : question.options.find(o => o.id === answer)?.text ?? '(tidak dijawab)'; }
export function validConfig(config: QuizConfig) {
 if (!config || !['vocabulary', 'grammar', 'mixed'].includes(config.mode) || ![10,20,30,50].includes(config.count) || !Array.isArray(config.levels) || !config.levels.length || config.levels.some(l => !['N5','N4','N3','N2'].includes(l)) || !Array.isArray(config.categoryIds) || config.categoryIds.some(c => typeof c !== 'string') || !Array.isArray(config.types) || !config.types.length || config.types.some(t => !questionTypes.some(q => q.value === t))) throw new Error('Pengaturan quiz tidak valid. Pilih level dan jenis soal.');
}
type AddCandidate = (item: Vocabulary | Grammar, type: QuizQuestionType, dimension: QuizQuestion['dimension'], prompt: string, correct: string, alternatives: Iterable<string> | null, explanation: string, acceptedAnswers?: string[]) => void;
// Lazy alternatives let availability checks stop after three usable distractors.
function* alternatives<T>(items: readonly T[], text: (item: T) => string, include: (item: T) => boolean = () => true): Iterable<string> {
 for (const item of items) if (include(item)) yield text(item);
}
function visitQuestionCandidates(content: QuizContent, config: QuizConfig, add: AddCandidate) {
 validConfig(config);
 const scopedExamples = content.examples;
 const vocabularyIds = new Set(content.vocabulary.filter(item => config.levels.includes(item.jlptLevel) && (!config.categoryIds.length || config.categoryIds.some(id => item.categoryIds.includes(id)))).map(item => item.id));
 // These patterns can share a broad Indonesian gloss; do not use them as competing
 // gloss answers. Comparison questions also include formation to make the distinction explicit.
 const similarPatterns = [
  ['seed-g-N3-09','seed-g-N3-10'], ['seed-g-N3-11','seed-g-N3-12'],
  ['seed-g-N3-20','seed-g-N2-01','seed-g-N2-09'], ['seed-g-N3-05','seed-g-N2-07'],
 ];
 const overlaps = (a: Grammar, b: Grammar) => similarPatterns.some(group => group.includes(a.id) && group.includes(b.id));
 const match = (item: Vocabulary | Grammar) => config.levels.includes(item.jlptLevel) && (!config.categoryIds.length || config.categoryIds.some(id => item.categoryIds.includes(id)));
 const vocab = content.vocabulary.filter(match), grammar = content.grammar.filter(match);
 if (config.mode !== 'grammar') for (const item of vocab) {
  const others = vocab.filter(v => v.id !== item.id);
  const examples = scopedExamples.filter(e => e.itemType === 'vocabulary' && e.itemId === item.id);
  const example = examples[0]; const gloss = `${item.kanji}（${item.kana}）: ${item.meaning}.`;
  add(item, 'jp-to-id', 'meaning', `Apa arti 「${item.kanji}」?`, item.meaning, alternatives(others, v => v.meaning), gloss);
  add(item, 'id-to-jp', 'meaning', `Pilih kata Jepang untuk: ${item.meaning}`, item.kanji, alternatives(others, v => v.kanji, v => v.meaning !== item.meaning), gloss);
  if (hasKanji(item)) add(item, 'kanji-to-kana', 'kanji', `Bagaimana bacaan 「${item.kanji}」?`, item.kana, alternatives(others, v => v.kana), gloss);
  add(item, 'multiple-choice', 'recognition', `Pasangan bacaan dan arti mana yang cocok dengan 「${item.kanji}」?`, `${item.kana} — ${item.meaning}`, alternatives(others, v => `${v.kana} — ${v.meaning}`), gloss);
  const blank = examples.find(e => e.japanese.includes(item.kanji));
  if (blank) add(item, 'fill-blank', 'usage', `Isi bagian kosong dengan bentuk kata Jepang pada materi (kanji atau kana).\n${blank.japanese.replace(item.kanji, '＿＿＿')}\n${blank.translation}`, item.kanji, null, `${blank.japanese}\n${blank.translation}\n${gloss}`, [item.kana]);
  if (example?.translation.trim()) add(item, 'usage', 'usage', `Pilih contoh yang menyampaikan situasi berikut dengan 「${item.kanji}」:\n${example.translation}`, example.japanese, alternatives(scopedExamples, e => e.japanese, e => e.itemType === 'vocabulary' && e.itemId !== item.id && vocabularyIds.has(e.itemId) && !e.japanese.includes(item.kanji)), `${example.japanese}\n${example.translation}\n${gloss}`);
 }
 if (config.mode !== 'vocabulary') for (const item of grammar) {
  const others = grammar.filter(g => g.id !== item.id && !overlaps(item,g));
  const example = scopedExamples.find(e => e.itemType === 'grammar' && e.itemId === item.id);
  const detail = `${item.pattern}: ${item.meaning}\n${item.formation}\n${item.explanation}`;
  add(item, 'grammar-meaning', 'understanding', `Apa makna pola 「${item.pattern}」?\n${item.explanation}`, item.meaning, alternatives(others, g => g.meaning), detail);
  add(item, 'grammar-choice', 'understanding', `Pilih pola yang paling sesuai dengan penjelasan materi:\n${item.explanation}\nMakna: ${item.meaning}`, item.pattern, alternatives(others, g => g.pattern, g => g.meaning !== item.meaning && g.explanation !== item.explanation), detail);
  const template = usableGrammarTemplate(item.quizTemplate);
  if (template) {
   const explanation = `${template.sentence}\n${template.translation}\n${template.explanation}\n${detail}`;
   add(item, 'grammar-blank', 'sentence', `Lengkapi bagian kosong memakai bentuk pola 「${item.pattern}」.\n${template.sentence.replace(template.blankAnswer, '＿＿＿')}\n${template.translation}`, template.blankAnswer, null, explanation);
   if (template.wrongSentences.length === 3) add(item, 'grammar-sentence', 'sentence', `Pilih kalimat yang benar sesuai pola 「${item.pattern}」 dan makna ini:\n${template.translation}`, template.sentence, template.wrongSentences, explanation);
  }
  if (example?.translation.trim()) add(item, 'grammar-situation', 'usage', `Kamu ingin menyampaikan: “${example.translation}”\nGunakan nuansa berikut: ${item.explanation}\nPola mana yang sesuai?`, item.pattern, alternatives(others, g => g.pattern, g => g.meaning !== item.meaning && g.explanation !== item.explanation), `${example.japanese}\n${example.translation}\n${detail}`);
  const other = others.find(g => item.comparisonIds.includes(g.id) && g.meaning !== item.meaning) ?? others.find(g => g.meaning !== item.meaning);
  if (other) add(item, 'grammar-comparison', 'understanding', `Bandingkan A「${item.pattern}」dan B「${other.pattern}」. Pasangan makna dan pembentukan mana yang sesuai dengan materi?`, `A: ${item.meaning} (${item.formation})\nB: ${other.meaning} (${other.formation})`, [`A: ${other.meaning} (${other.formation})\nB: ${item.meaning} (${item.formation})`, `Keduanya memakai pembentukan: ${item.formation}`, `Keduanya memakai pembentukan: ${other.formation}`], `${detail}\n\n${other.pattern}: ${other.meaning}\n${other.explanation}`);
 }
}

export function buildQuestionPool(content: QuizContent, config: QuizConfig): QuizQuestion[] {
 const pool: QuizQuestion[] = [];
 const normalized = new Map<string, string>();
 const answerKey = (text: string) => { let key = normalized.get(text); if (key === undefined) { key = normalizeAnswer(text); normalized.set(text, key); } return key; };
 function add(item: Vocabulary | Grammar, type: QuizQuestionType, dimension: QuizQuestion['dimension'], prompt: string, correct: string, alternatives: Iterable<string> | null, explanation: string, acceptedAnswers?: string[]) {
  if (!config.types.includes(type) || !correct.trim()) return;
  const correctKey = answerKey(correct);
  const texts = alternatives === null ? [] : [correct, ...shuffled([...new Set(alternatives)].filter(a => a.trim() && answerKey(a) !== correctKey)).slice(0, 3)];
  // Multiple choice is unavailable when a defensible set of distinct alternatives is missing.
  if (alternatives !== null && texts.length < 4) return;
  pool.push({ id: `${item.id}:${type}`, itemId: item.id, contentId: item.id, itemType: 'kanji' in item ? 'vocabulary' : 'grammar', type, dimension, prompt,
   options: texts.map((text, i) => ({ id: `answer-${i}`, text })), correctAnswer: alternatives === null ? correct : 'answer-0', answerFormat: alternatives === null ? 'text' : 'choice', acceptedAnswers,
   explanation, jlptLevel: item.jlptLevel, contentLabel: 'kanji' in item ? item.kanji : item.pattern, createdAt: item.createdAt, updatedAt: item.updatedAt });
 }
 visitQuestionCandidates(content, config, add);
 return pool;
}

/** Exact availability using the same candidate rules, without generating or shuffling questions. */
export function questionAvailability(content: QuizContent, config: QuizConfig) {
 const counts = { vocabulary: 0, grammar: 0 };
 const byType = Object.fromEntries(questionTypes.map(q => [q.value, 0])) as Record<QuizQuestionType, number>;
 visitQuestionCandidates(content, config, (item, type, _dimension, _prompt, correct, choices) => {
  if (!config.types.includes(type) || !correct.trim()) return;
  if (choices !== null) {
   const seen = new Set<string>();
   const answer = normalizeAnswer(correct);
   let valid = 0;
   for (const choice of choices) {
    if (seen.has(choice)) continue;
    seen.add(choice);
    if (choice.trim() && normalizeAnswer(choice) !== answer && ++valid === 3) break;
   }
   if (valid < 3) return;
  }
  counts['kanji' in item ? 'vocabulary' : 'grammar']++;
  byType[type]++;
 });
 return { ...counts, byType };
}
export function countQuestionAvailability(content: QuizContent, config: QuizConfig) {
 const { vocabulary, grammar } = questionAvailability(content, config);
 return { vocabulary, grammar };
}
// Round-robin by type, then prefer unseen content items; shuffle once and persist the snapshot.
export function chooseQuestions(pool: QuizQuestion[], config: QuizConfig, random = Math.random) {
 const select = (candidates: QuizQuestion[], count: number) => {
  const grouped = new Map<QuizQuestionType, QuizQuestion[]>();
  for (const q of shuffled(candidates, random)) grouped.set(q.type, [...(grouped.get(q.type) ?? []), q]);
  const types = shuffled([...grouped.keys()], random), chosen: QuizQuestion[] = [], seen = new Set<string>();
  while (chosen.length < count) {
   let added = false;
   for (const type of types) { const remaining = grouped.get(type)!; if (!remaining.length || chosen.length === count) continue;
    const unseen = remaining.findIndex(q => !seen.has(q.itemId)); const [q] = remaining.splice(unseen < 0 ? 0 : unseen, 1); chosen.push(q); seen.add(q.itemId); added = true;
   }
   if (!added) break;
  }
  return chosen;
 };
 let chosen: QuizQuestion[];
 if (config.mode === 'mixed') {
  const v = pool.filter(q => q.itemType === 'vocabulary'), g = pool.filter(q => q.itemType === 'grammar');
  if (v.length < config.count / 2 || g.length < config.count / 2) throw new Error(`Mixed membutuhkan ${config.count / 2} soal vocabulary dan ${config.count / 2} soal grammar. Ubah jumlah atau filter.`);
  chosen = [...select(v, config.count / 2), ...select(g, config.count / 2)];
 } else chosen = select(pool, config.count);
 if (chosen.length < config.count) throw new Error(`Hanya ${pool.length} soal tersedia. Kurangi jumlah atau perluas filter.`);
 return shuffled(chosen, random).map(q => ({ ...q, options: shuffled(q.options, random) }));
}
export function calculateResult(attempt: QuizAttempt, stamp: string): QuizResult {
 if (attempt.answers.length !== attempt.questions.length) throw new Error('Quiz belum selesai.');
 const answers = attempt.questions.map((q,i) => ({ questionSnapshot: q, answer: attempt.answers[i].answer, answeredAt: attempt.answers[i].answeredAt, isCorrect: answerIsCorrect(q, attempt.answers[i].answer) }));
 const correctCount = answers.filter(a => a.isCorrect).length, accuracy = Math.round(correctCount / answers.length * 100);
 return { id: attempt.id, sessionId: attempt.id, config: attempt.config, startedAt: attempt.startedAt, finishedAt: stamp, activeDurationSeconds: attempt.questionSeconds.reduce((a,b) => a+b,0), score: accuracy, accuracy, correctCount, wrongCount: answers.length - correctCount, answers, createdAt: stamp, updatedAt: stamp };
}
export function categoryScore(result: QuizResult, kind: 'vocabulary' | 'grammar') { const rows = result.answers.filter(a => a.questionSnapshot.itemType === kind); return rows.length ? Math.round(rows.filter(a => a.isCorrect).length / rows.length * 100) : null; }
export function durationLabel(seconds: number) { return `${Math.floor(seconds / 60)} mnt ${Math.floor(seconds % 60)} dtk`; }
