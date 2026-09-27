import type { Entity, Favorite, Grammar, LearningProgress, SourceReference } from '../../domain/models';
import { favoriteKey, progressKey } from '../../domain/models';
import type { StoreName, Tables } from '../../repositories/contracts';
import type { Transaction } from './indexeddb';

const normalized = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('id');
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function text(value: unknown, field: string, required = true) {
  assert(typeof value === 'string' && (!required || value.trim().length > 0), `${field} harus diisi.`);
  assert(value.length <= 20_000, `${field} terlalu panjang.`);
}
function integer(value: unknown, field: string, min = 0) { assert(typeof value === 'number' && Number.isSafeInteger(value) && value >= min, `${field} harus bilangan bulat minimal ${min}.`); }
function date(value: unknown, field: string) { assert(value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value))), `${field} tidak valid.`); }
function score(value: unknown) { assert(value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100), 'Skor harus kosong atau antara 0–100.'); }
async function source(tx: Transaction, ref: SourceReference) {
  text(ref.sourcePdfId, 'Sumber PDF'); integer(ref.sourcePage, 'Halaman sumber', 1);
  const pdf = await tx.get('materials', ref.sourcePdfId);
  assert(pdf && ref.sourcePage <= pdf.pageCount, 'Sumber PDF atau nomor halaman tidak valid.');
}
async function itemReference(tx: Transaction, item: { itemId: string; itemType: string }) {
  assert(item.itemType === 'vocabulary' || item.itemType === 'grammar', 'Jenis materi tidak valid.');
  assert(await tx.get(item.itemType, item.itemId), 'Materi tidak ditemukan; mungkin sudah dihapus.');
}
export async function validate<K extends Exclude<StoreName, 'meta'>>(store: K, value: Tables[K], tx: Transaction) {
  const entity = value as Entity;
  text(entity.id, 'ID'); date(entity.createdAt, 'Waktu dibuat'); date(entity.updatedAt, 'Waktu diperbarui');
  if (store === 'vocabulary' || store === 'grammar') {
    const item = value as Tables['vocabulary'] | Grammar;
    text(item.meaning, 'Arti'); text(item.notes, 'Catatan', false);
    assert(['N5', 'N4', 'N3', 'N2'].includes(item.jlptLevel), 'Level JLPT tidak valid.');
    integer(item.difficulty, 'Kesulitan', 1); assert(item.difficulty <= 5, 'Kesulitan maksimal 5.');
    assert(typeof item.isSeed === 'boolean', 'Status seed tidak valid.');
    assert(Array.isArray(item.categoryIds) && new Set(item.categoryIds).size === item.categoryIds.length, 'Kategori tidak valid atau duplikat.');
    for (const id of item.categoryIds) assert(await tx.get('categories', id), 'Kategori tidak ditemukan.');
    await source(tx, item);
    assert(Array.isArray(item.additionalSources), 'Daftar sumber tidak valid.');
    for (const ref of item.additionalSources) await source(tx, ref);
    if (store === 'vocabulary') {
      const v = item as Tables['vocabulary'];
      for (const key of ['kanji', 'kana', 'romaji', 'partOfSpeech'] as const) text(v[key], key, (!v.extractionDraftId && !v.importedFromFile) || !['romaji', 'partOfSpeech'].includes(key));
      const key = (record: Tables['vocabulary']) => [record.kanji, record.kana, record.meaning].map(normalized).join('|');
      assert(!(await tx.list('vocabulary')).some(other => other.id !== v.id && !other.importDuplicate && !v.importDuplicate && key(other) === key(v)), 'Vocabulary ini sudah ada. Edit sumber pada entri yang ada agar progres tidak terpisah.');
    } else {
      const g = item as Grammar;
      for (const key of ['pattern', 'formation', 'explanation'] as const) text(g[key], key, key !== 'explanation' || !g.importedFromFile);
      text(g.commonMistakes, 'Kesalahan umum', false);
      assert(Array.isArray(g.comparisonIds), 'Daftar perbandingan tidak valid.');
      for (const id of g.comparisonIds) assert(id !== g.id && await tx.get('grammar', id), 'Grammar pembanding tidak valid.');
      assert(!(await tx.list('grammar')).some(other => other.id !== g.id && !other.importDuplicate && !g.importDuplicate && normalized(other.pattern) === normalized(g.pattern) && normalized(other.meaning) === normalized(g.meaning)), 'Grammar ini sudah ada. Gunakan entri yang ada.');
    }
  } else if (store === 'categories') {
    const category = value as Tables['categories']; text(category.name, 'Nama kategori'); text(category.description, 'Deskripsi', false);
    assert(typeof category.isSeed === 'boolean', 'Status kategori tidak valid.');
    assert(!(await tx.list('categories')).some(other => other.id !== category.id && normalized(other.name) === normalized(category.name)), 'Nama kategori sudah digunakan.');
  } else if (store === 'progress') {
    const p = value as LearningProgress;
    await itemReference(tx, p);
    assert(p.id === progressKey(p.itemType, p.itemId), 'Identitas progres tidak dapat diubah.');
    assert(['NEW', 'LEARNING', 'REVIEW', 'WEAK', 'MASTERED'].includes(p.status), 'Status progres tidak valid.');
    score(p.masteryScore); integer(p.reviewCount, 'Jumlah review'); integer(p.correctCount, 'Jumlah benar'); integer(p.wrongCount, 'Jumlah salah');
    date(p.lastReviewed, 'Review terakhir'); date(p.nextReview, 'Review berikutnya'); text(p.notes, 'Catatan', false);
    assert(p.dimensions && typeof p.dimensions === 'object', 'Dimensi progres tidak valid.');
    for (const [key, evidence] of Object.entries(p.dimensions)) {
      assert(['recognition', 'meaning', 'kanji', 'usage', 'understanding', 'sentence'].includes(key), 'Dimensi tidak dikenal.');
      integer(evidence.attempts, 'Percobaan'); integer(evidence.correct, 'Jawaban benar');
      assert(evidence.correct <= evidence.attempts, 'Jawaban benar melebihi jumlah percobaan.'); score(evidence.score); date(evidence.lastTestedAt, 'Waktu pengujian');
    }
    assert(p.masteryScore === null || p.correctCount + p.wrongCount > 0, 'Mastery memerlukan bukti latihan.');
    if (p.status === 'MASTERED') assert(p.masteryScore !== null && p.masteryScore >= 85 && p.correctCount >= 3 && Object.values(p.dimensions).some(d => d && d.attempts >= 3), 'Mastered memerlukan bukti performa; membaca atau mencatat saja tidak cukup.');
  } else if (store === 'favorites') {
    const f = value as Favorite;
    assert(f.target && typeof f.target === 'object', 'Target favorit tidak valid.');
    if (f.target.type === 'pdf-page') await source(tx, { sourcePdfId: f.target.materialId, sourcePage: f.target.pageNumber });
    else await itemReference(tx, { itemType: f.target.type, itemId: f.target.itemId });
    assert(f.id === favoriteKey(f.target), 'Target favorit tidak dapat diubah.'); text(f.notes, 'Catatan favorit', false);
  } else if (store === 'examples') {
    const example = value as Tables['examples']; await itemReference(tx, example); await source(tx, example);
    text(example.japanese, 'Kalimat Jepang'); text(example.translation, 'Terjemahan', false);
  }
}
