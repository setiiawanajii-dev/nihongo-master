import { test as base, expect, type Page } from '@playwright/test';
import { seedVocabulary, seedGrammar, seedExamples, seedCategories } from '../src/data/seed';
import { grammarForms } from '../src/domain/quiz/grammar-forms';

// Explicit test-only bank. Never installed by application startup or production builds.
export const testBank = {
 vocabulary: seedVocabulary.map(v => ({ ...v, isSeed: false })),
 grammar: seedGrammar.map(g => {
  const example = seedExamples.find(e => e.itemType === 'grammar' && e.itemId === g.id);
  const form = grammarForms[g.id];
  return { ...g, isSeed: false, ...(example && form ? { quizTemplate: {
   sentence: example.japanese, translation: example.translation, blankAnswer: form[0],
   wrongSentences: form.slice(1).map(w => example.japanese.replace(form[0], w)),
   explanation: g.explanation, validated: true as const,
  } } : {}) };
 }),
 examples: seedExamples,
 categories: seedCategories.map(c => ({ ...c, isSeed: false })),
};
export async function installTestBank(page: Page) {
 await page.goto('/favicon.svg');
 await page.evaluate(async bank => {
  const service = '/src/services/database.ts', storage = '/src/infrastructure/database/indexeddb.ts';
  await (await import(service)).database.initialize();
  const { transact, stores } = await import(storage);
  await transact(stores, 'readwrite', async (tx: any) => {
   for (const [name, rows] of Object.entries(bank)) for (const row of rows) await tx.put(name, row);
  });
 }, testBank);
}
export const test = base.extend({
 page: async ({ page }, use) => { await installTestBank(page); await use(page); },
});
export { base as emptyTest, expect };
