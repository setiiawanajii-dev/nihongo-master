import { stores, transact } from './indexeddb';
import { newProgress } from '../../services/progress';

/** Reset evidence atomically; preserve content, personal notes, favorites. */
export async function resetLearningProgress(confirmed: boolean): Promise<void> {
  if (confirmed !== true) throw new Error('Konfirmasi reset diperlukan.');
  await transact(stores, 'readwrite', async tx => {
    for (const row of await tx.list('progress')) {
      if (row.notes) await tx.put('progress', { ...newProgress(row.itemType, row.itemId), id: row.id, createdAt: row.createdAt, updatedAt: new Date().toISOString(), notes: row.notes });
      else await tx.delete('progress', row.id);
    }
    for (const name of ['schedules', 'quizResults', 'quizAttempts', 'reviewRuns', 'sessions', 'reviewEvents'] as const) {
      for (const row of await tx.list(name)) await tx.delete(name, row.id);
    }

    // Keep meta: resetting progress must not restore removed demonstration data.
  });
}

/** Clear user learning data atomically, without loading all records into memory. */
export async function deleteAllLearningData(confirmation: string): Promise<void> {
  if (confirmation !== 'HAPUS SEMUA') throw new Error('Ketik HAPUS SEMUA untuk mengonfirmasi penghapusan.');
  await transact(stores, 'readwrite', async tx => {
    // Migration markers are internal state, not user content. Keep them to prevent reseeding.
    for (const store of stores) if (store !== 'meta') await tx.clear(store);
  });
}
