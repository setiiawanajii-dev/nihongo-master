import { resetLearningProgress, deleteAllLearningData } from './reset';
import { transferCommands } from './transfer';
import { extractionCommands } from './extraction';
import { pdfCommands, migratePdfReferences } from './pdf';
import { reviewCommands, backfillReviewSchedules } from './review';
import { quizCommands, backfillQuizSources } from './quiz';
import { recordGrammarReview, queueGrammarReview } from './grammar-learning';
import { recordVocabularyReview, queueVocabularyReview } from './vocabulary-learning';
import type { Entity, Favorite, LearningProgress } from '../../domain/models';
import { favoriteKey, progressKey } from '../../domain/models';
import type { EntityPatch, LearningDatabase, NewEntity, Repository, StoreName, Tables } from '../../repositories/contracts';
import { stores, transact, type Transaction } from './indexeddb';
import { validate } from './validation';

type Editable = 'vocabulary' | 'grammar' | 'categories' | 'progress' | 'favorites' | 'examples';
async function deleteRelated(tx: Transaction, store: Editable, id: string) {
  if (store === 'vocabulary' || store === 'grammar') {
    for (const dependent of ['examples', 'progress', 'schedules', 'questions', 'reviewEvents'] as const) {
      for (const item of await tx.list(dependent)) if (item.itemType === store && item.itemId === id) await tx.delete(dependent, item.id);
    }
    for (const favorite of await tx.list('favorites')) if (favorite.target.type === store && 'itemId' in favorite.target && favorite.target.itemId === id) await tx.delete('favorites', favorite.id);
    if (store === 'grammar') for (const grammar of await tx.list('grammar')) if (grammar.comparisonIds.includes(id)) await tx.put('grammar', { ...grammar, comparisonIds: grammar.comparisonIds.filter(ref => ref !== id), updatedAt: new Date().toISOString() });
    // Completed quiz snapshots and session history remain available as historical evidence.
  }
  if (store === 'categories') {
    for (const kind of ['vocabulary', 'grammar'] as const) {
      for (const item of await tx.list(kind)) if (item.categoryIds.includes(id)) await tx.put(kind, { ...item, categoryIds: item.categoryIds.filter(categoryId => categoryId !== id), updatedAt: new Date().toISOString() });
    }
  }
  if (store === 'progress') {
    const progress = await tx.get('progress', id);
    if (progress) for (const schedule of await tx.list('schedules')) if (schedule.itemId === progress.itemId && schedule.itemType === progress.itemType) await tx.delete('schedules', schedule.id);
  }
}
function readOnly<K extends Exclude<StoreName, 'meta'>>(store: K) {
  return {
    list: () => transact([store], 'readonly', tx => tx.list(store)),
    get: (id: string) => transact([store], 'readonly', tx => tx.get(store, id)),
  };
}
function repository<K extends Editable>(store: K): Repository<Tables[K]> {
  return {
    ...readOnly(store),
    create(data: NewEntity<Tables[K]>) {
      return transact(stores, 'readwrite', async tx => {
        const now = new Date().toISOString();
        let id = crypto.randomUUID() as string;
        if (store === 'progress') { const p = data as NewEntity<LearningProgress>; id = progressKey(p.itemType, p.itemId); }
        if (store === 'favorites') id = favoriteKey((data as NewEntity<Favorite>).target);
        const entity = { ...data, id, createdAt: now, updatedAt: now } as Tables[K];
        await validate(store, entity, tx);
        if (await tx.get(store, id)) throw new Error('Entri sudah ada. Gunakan edit untuk memperbaruinya.');
        await tx.add(store, entity);
        return entity;
      });
    },
    update(id: string, changes: EntityPatch<Tables[K]>) {
      return transact(stores, 'readwrite', async tx => {
        const current = await tx.get(store, id);
        if (!current) throw new Error('Entri tidak ditemukan; mungkin sudah dihapus di tab lain.');
        const entity = { ...current, ...changes, id, createdAt: (current as Entity).createdAt, updatedAt: new Date().toISOString() } as Tables[K];
        await validate(store, entity, tx);
        await tx.put(store, entity);
        return entity;
      });
    },
    delete(id: string) {
      return transact(stores, 'readwrite', async tx => {
        await deleteRelated(tx, store, id);
        await tx.delete(store, id);
      });
    },
  };
}
async function initialize() {
  // Cleanup and its marker commit atomically, including concurrent tabs/StrictMode.
  await transact(stores, 'readwrite', async tx => {
    if (!await tx.get('meta', 'demo-removed-v1')) {
      // Only demo content is removed. Imported merges and real PDF files are personal data.
      for (const kind of ['vocabulary', 'grammar'] as const) {
        for (const item of await tx.list(kind)) {
          if (!item.isSeed || item.importedFromFile || item.extractionDraftId) continue;
          await deleteRelated(tx, kind, item.id);
          await tx.delete(kind, item.id);
        }
      }
      const content = [...await tx.list('vocabulary'), ...await tx.list('grammar')];
      const referenced = new Set(content.flatMap(item => [item.sourcePdfId, ...item.additionalSources.map(s => s.sourcePdfId)]));
      for (const example of await tx.list('examples')) referenced.add(example.sourcePdfId);
      for (const draft of await tx.list('extractionDrafts')) referenced.add(draft.sourcePdfId);
      for (const material of await tx.list('materials')) {
        if (!material.isDummy || material.file || await tx.get('pdfFiles', material.id) || referenced.has(material.id)) continue;
        for (const page of await tx.list('pages')) if (page.materialId === material.id) await tx.delete('pages', page.id);
        for (const favorite of await tx.list('favorites')) if (favorite.target.type === 'pdf-page' && favorite.target.materialId === material.id) await tx.delete('favorites', favorite.id);
        await tx.delete('pdfReading', material.id);
        await tx.delete('materials', material.id);
      }
      for (const category of await tx.list('categories')) {
        if (category.isSeed && !content.some(item => item.categoryIds.includes(category.id))) await tx.delete('categories', category.id);
      }
      await tx.put('meta', { id: 'seed-v1', value: 'disabled' });
      await tx.put('meta', { id: 'demo-removed-v1', value: new Date().toISOString() });
    }
    await backfillReviewSchedules(tx);
    await migratePdfReferences(tx);
    await backfillQuizSources(tx);
  });
}
export function createIndexedDbDatabase(): LearningDatabase {
  return {
    initialize, resetLearningProgress, deleteAllLearningData, transfer: transferCommands, extraction: extractionCommands, pdf: pdfCommands, review: reviewCommands, reviewRuns: readOnly('reviewRuns'), quiz: quizCommands, quizAttempts: readOnly('quizAttempts'), learning: { recordGrammarReview, queueGrammarReview, recordVocabularyReview, queueVocabularyReview }, reviewEvents: readOnly('reviewEvents'), vocabulary: repository('vocabulary'), grammar: repository('grammar'), categories: repository('categories'),
    progress: repository('progress'), favorites: repository('favorites'), examples: repository('examples'),
    materials: readOnly('materials'), pages: readOnly('pages'), schedules: readOnly('schedules'), quizResults: readOnly('quizResults'), sessions: readOnly('sessions'),
  };
}
