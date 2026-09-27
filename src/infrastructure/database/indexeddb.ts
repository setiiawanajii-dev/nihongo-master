import type { StoreName, Tables } from '../../repositories/contracts';

export const DATABASE_NAME = 'nihongo-master';
export const DATABASE_VERSION = 7;
export const stores: StoreName[] = ['vocabulary', 'grammar', 'examples', 'categories', 'questions', 'progress', 'favorites', 'schedules', 'quizResults', 'quizAttempts', 'reviewRuns', 'sessions', 'reviewEvents', 'meta'];
let connection: Promise<IDBDatabase> | undefined;
export function openDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB tidak tersedia. Gunakan browser yang mendukung penyimpanan lokal.')); return; }
    let blocked = false;
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = event => {
      const db = request.result;
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
      if (event.oldVersion < 1) {
        for (const name of ['vocabulary', 'grammar'] as const) {
          const store = request.transaction!.objectStore(name);
          store.createIndex('jlptLevel', 'jlptLevel');
          store.createIndex('categoryIds', 'categoryIds', { multiEntry: true });
        }
        for (const name of ['examples', 'questions', 'progress', 'schedules'] as const)
          request.transaction!.objectStore(name).createIndex('item', ['itemType', 'itemId']);
      }
      if (event.oldVersion < 7) {
        // The schema upgrade is atomic: content IDs and learning evidence stay intact.
        for (const name of ['materials', 'pages', 'pdfFiles', 'pdfReading', 'extractionRuns', 'extractionDrafts'])
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
        const clean = (value: unknown): unknown => {
          if (Array.isArray(value)) return value.map(clean);
          if (!value || typeof value !== 'object') return value;
          const old = value as Record<string, unknown>;
          const result: Record<string, unknown> = {};
          for (const [key, item] of Object.entries(old)) {
            if (['sourcePdfId', 'sourcePdfName', 'sourcePage', 'additionalSources', 'extractionDraftId', 'sourceLabel'].includes(key)) continue;
            if (key === 'source' && item && typeof item === 'object' && 'kind' in item) continue;
            result[key] = clean(item);
          }
          // Extracted entries may legitimately lack romaji or part of speech.
          if (old.extractionDraftId) result.importedFromFile = true;
          if ('itemId' in old && 'prompt' in old && !old.contentId) result.contentId = old.itemId;
          return result;
        };
        for (const name of ['vocabulary', 'grammar', 'examples', 'questions', 'quizAttempts', 'quizResults', 'favorites']) {
          const cursor = request.transaction!.objectStore(name).openCursor();
          cursor.onsuccess = () => {
            const row = cursor.result;
            if (!row) return;
            if (name === 'favorites' && row.value.target?.type === 'pdf-page') row.delete();
            else row.update(clean(row.value));
            row.continue();
          };
        }
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Tidak dapat membuka database.'));
    request.onblocked = () => { blocked = true; reject(new Error('Database sedang dipakai versi lain. Tutup tab Nihongo Master lain, lalu coba lagi.')); };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
  }).catch(error => { connection = undefined; throw error; });
  return connection;
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export class Transaction {
  constructor(private readonly transaction: IDBTransaction) {}
  get<K extends StoreName>(store: K, id: string): Promise<Tables[K] | undefined> { return result(this.transaction.objectStore(store).get(id)); }
  list<K extends StoreName>(store: K): Promise<Tables[K][]> { return result(this.transaction.objectStore(store).getAll()); }
  async put<K extends StoreName>(store: K, entity: Tables[K]) { await result(this.transaction.objectStore(store).put(entity)); }
  async add<K extends StoreName>(store: K, entity: Tables[K]) { await result(this.transaction.objectStore(store).add(entity)); }
  async clear(store: StoreName) { await result(this.transaction.objectStore(store).clear()); }
  async delete(store: StoreName, id: string) { await result(this.transaction.objectStore(store).delete(id)); }
}
// Resolve writes only after oncomplete, never after an individual request succeeds.
export async function transact<T>(scope: StoreName[], mode: IDBTransactionMode, work: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(scope, mode);
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Perubahan dibatalkan. Data tidak disimpan.'));
    transaction.onerror = () => { /* onabort reports transaction failure */ };
  });
  // Attach a rejection handler before asynchronous request handling to avoid an unhandled abort.
  void done.catch(() => undefined);
  try {
    const value = await work(new Transaction(transaction));
    await done;
    return value;
  } catch (error) {
    try { transaction.abort(); } catch { /* already completed or aborted */ }
    await done.catch(() => undefined);
    throw error;
  }
}
