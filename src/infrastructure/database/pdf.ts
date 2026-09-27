import type { PDFMaterial, PDFReadingProgress } from '../../domain/models';
import { favoriteKey } from '../../domain/models';
import { transact, type Transaction } from './indexeddb';

export async function migratePdfReferences(tx: Transaction) {
  if (await tx.get('meta', 'pdf-system-v1')) return;
  // Preserve legacy aliases in stored snapshots while adding the canonical sourcePdfId.
  function migrate(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(migrate);
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      return Object.fromEntries([...Object.entries(obj).map(([key, v]) => [key, migrate(v)]), ...(typeof obj.sourcePdf === 'string' && !obj.sourcePdfId ? [['sourcePdfId', obj.sourcePdf]] : [])]);
    }
    return value;
  }
  for (const store of ['vocabulary', 'grammar', 'examples', 'questions', 'quizResults', 'quizAttempts'] as const) {
    for (const row of await tx.list(store)) await tx.put(store, migrate(row) as typeof row);
  }
  for (const m of await tx.list('materials')) await tx.put('materials', { ...m, name: m.name ?? m.title, file: m.file ?? null, totalPages: m.totalPages ?? m.pageCount, completedPages: m.completedPages ?? 0, source: m.source ?? (m.isDummy ? 'Referensi seed dummy' : '') });
  await tx.put('meta', { id: 'pdf-system-v1', value: new Date().toISOString() });
}
async function material(tx: Transaction, id: string, page?: number) {
  const m = await tx.get('materials', id);
  if (!m?.file) throw new Error('Berkas PDF tidak tersedia atau sudah dihapus.');
  if (page !== undefined && (!Number.isSafeInteger(page) || page < 1 || page > m.totalPages)) throw new Error('Nomor halaman PDF tidak valid.');
  return m;
}
async function reading(tx: Transaction, id: string): Promise<PDFReadingProgress> {
  const stamp = new Date().toISOString();
  return await tx.get('pdfReading', id) ?? { id, completedPageNumbers: [], lastPage: 1, createdAt: stamp, updatedAt: stamp };
}
export const pdfCommands = {
  saveUnit: (materialId: string, unit: { id?: string; name: string; startPage: number; endPage: number }) => transact(['materials'], 'readwrite', async tx => {
    const m = await tx.get('materials', materialId);
    if (!m) throw new Error('Sumber PDF tidak ditemukan.');
    if (!unit || typeof unit.name !== 'string' || !unit.name.trim() || unit.name.length > 120 || !Number.isSafeInteger(unit.startPage) || !Number.isSafeInteger(unit.endPage) || unit.startPage < 1 || unit.endPage < unit.startPage || unit.endPage > m.totalPages) throw new Error('Isi nama unit dan rentang halaman PDF yang valid.');
    const units = m.units ?? [];
    if (unit.id && !units.some(u => u.id === unit.id)) throw new Error('Unit tidak ditemukan.');
    if (units.some(u => u.id !== unit.id && u.name.toLocaleLowerCase() === unit.name.trim().toLocaleLowerCase())) throw new Error('Nama unit sudah digunakan pada PDF ini.');
    const id = unit.id ?? crypto.randomUUID();
    await tx.put('materials', { ...m, units: [...units.filter(u => u.id !== id), { id, name: unit.name.trim(), startPage: unit.startPage, endPage: unit.endPage }], updatedAt: new Date().toISOString() });
    return id;
  }),
  async upload(file: File, name: string, source: string) {
    if (!name.trim() || name.length > 200 || source.length > 2000) throw new Error('Nama wajib diisi (maksimal 200 karakter); sumber maksimal 2000 karakter.');
    const { inspectPdf } = await import('../pdf/document');
    const info = await inspectPdf(file);
    try { return await transact(['materials', 'pdfFiles', 'pdfReading'], 'readwrite', async tx => {
      if ((await tx.list('materials')).some(m => m.checksum === info.checksum && m.file)) throw new Error('PDF ini sudah ada di koleksi. Cari nama berkas yang sama untuk membukanya.');
      const id = crypto.randomUUID(), stamp = new Date().toISOString();
      const m: PDFMaterial = { id, name: name.trim(), title: name.trim(), file: id, filename: file.name, totalPages: info.totalPages, pageCount: info.totalPages, completedPages: 0, source: source.trim(), checksum: info.checksum, status: 'READY', isDummy: false, createdAt: stamp, updatedAt: stamp };
      await tx.add('pdfFiles', { id, blob: new Blob([file], { type: 'application/pdf' }) });
      await tx.add('materials', m); await tx.add('pdfReading', await reading(tx, id)); return m;
    }); } catch (error) { if (error instanceof DOMException && error.name === 'QuotaExceededError') throw new Error('Penyimpanan browser penuh. PDF belum disimpan.'); throw error; }
  },
  getFile: (id: string) => transact(['pdfFiles'], 'readonly', async tx => (await tx.get('pdfFiles', id))?.blob),
  reading: (id: string) => transact(['pdfReading'], 'readonly', tx => tx.get('pdfReading', id)),
  visit: (id: string, page: number) => transact(['materials', 'pdfReading'], 'readwrite', async tx => { await material(tx, id, page); await tx.put('pdfReading', { ...await reading(tx, id), lastPage: page, updatedAt: new Date().toISOString() }); }),
  complete: (id: string, page: number, completed: boolean) => transact(['materials', 'pdfReading'], 'readwrite', async tx => {
    const m = await material(tx, id, page), p = await reading(tx, id), stamp = new Date().toISOString();
    const pages = new Set(p.completedPageNumbers); if (completed) pages.add(page); else pages.delete(page);
    await tx.put('pdfReading', { ...p, completedPageNumbers: [...pages].sort((a, b) => a - b), updatedAt: stamp });
    await tx.put('materials', { ...m, completedPages: pages.size, updatedAt: stamp });
  }),
  bookmark: (id: string, page: number, bookmarked: boolean) => transact(['materials', 'favorites'], 'readwrite', async tx => {
    await material(tx, id, page); const target = { type: 'pdf-page' as const, materialId: id, pageNumber: page }, key = favoriteKey(target);
    if (bookmarked) { if (!await tx.get('favorites', key)) { const stamp = new Date().toISOString(); await tx.add('favorites', { id: key, target, notes: '', createdAt: stamp, updatedAt: stamp }); } } else await tx.delete('favorites', key);
  }),
  delete: (id: string) => transact(['materials', 'pdfFiles', 'pdfReading', 'pages', 'favorites', 'vocabulary', 'grammar', 'examples', 'questions', 'extractionRuns', 'extractionDrafts'], 'readwrite', async tx => {
    const m = await tx.get('materials', id); if (!m) return;
    for (const store of ['vocabulary', 'grammar', 'examples', 'questions'] as const) for (const row of await tx.list(store)) {
      if (row.sourcePdfId === id || ('additionalSources' in row && row.additionalSources.some(s => s.sourcePdfId === id))) throw new Error('PDF masih menjadi sumber materi. Ubah referensi sumber materi terkait sebelum menghapus PDF.');
    }
    for (const p of await tx.list('pages')) if (p.materialId === id) await tx.delete('pages', p.id);
    for (const f of await tx.list('favorites')) if (f.target.type === 'pdf-page' && f.target.materialId === id) await tx.delete('favorites', f.id);
    for (const draft of await tx.list('extractionDrafts')) if (draft.sourcePdfId === id) await tx.delete('extractionDrafts', draft.id);
    await tx.delete('extractionRuns', id);
    if (m.file) await tx.delete('pdfFiles', m.file); await tx.delete('pdfReading', id); await tx.delete('materials', id);
  }),
};
