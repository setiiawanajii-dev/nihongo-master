import { expect, test, type Page } from '@playwright/test';
import type { LearningDatabase } from '../src/repositories/contracts';

test.setTimeout(90_000);
async function ready(page: Page, route = '/vocabulary') {
  await page.goto(route);
  await expect(page.getByText('Membuka database pembelajaran…', { exact: true })).toBeHidden();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('fresh database remains empty after refresh', async ({ page }) => {
 await ready(page);
 const read = () => page.evaluate(async () => { const u='/src/services/database.ts'; const db=(await import(u)).database as LearningDatabase; return {v:await db.vocabulary.list(),g:await db.grammar.list(),p:await db.progress.list()}; });
 expect(await read()).toEqual({v:[],g:[],p:[]});
 await page.reload(); expect(await read()).toEqual({v:[],g:[],p:[]});
});

test('vocabulary CRUD via UI survives refresh and deletion is permanent', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Tambah vocabulary', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kanji / kata Jepang', { exact: true }).fill('図書館テスト');
  await dialog.getByLabel('Kana', { exact: true }).fill('としょかん');
  await dialog.getByLabel('Romaji', { exact: true }).fill('toshokan');
  await dialog.getByLabel('Arti Indonesia', { exact: true }).fill('Perpustakaan uji');
  await dialog.getByRole('button', { name: 'Simpan materi', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('図書館テスト');
  const card = page.locator('.content-card');
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Arti Indonesia').fill('Perpustakaan yang diperbarui');
  await page.getByRole('button', { name: 'Simpan materi', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('図書館テスト');
  await expect(card).toContainText('Perpustakaan yang diperbarui');
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('図書館テスト');
  await expect(card).toHaveCount(0);
});

test('grammar CRUD preserves formation and explanation after refresh', async ({ page }) => {
  await ready(page, '/grammar');
  await page.getByRole('button', { name: 'Tambah grammar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Grammar pattern').fill('〜てから（テスト）');
  await dialog.getByLabel('Pola pembentukan').fill('Vて + から');
  await dialog.getByLabel('Penjelasan', { exact: true }).fill('Tindakan kedua terjadi setelah tindakan pertama.');
  await dialog.getByLabel('Arti Indonesia').fill('Setelah melakukan');
  await dialog.getByRole('button', { name: 'Simpan materi', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole('textbox', { name: 'Cari grammar' }).fill('テスト');
  const card = page.locator('.content-card');
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Penjelasan', { exact: true }).fill('Penjelasan grammar yang diperbarui.');
  await page.getByRole('button', { name: 'Simpan materi', exact: true }).click();
  await expect(dialog).toBeHidden();
  await card.getByRole('link', { name: 'Detail', exact: true }).click();
  await expect(page.locator('.detail-content')).toContainText('Penjelasan grammar yang diperbarui.');
  await page.reload();
  await expect(page.locator('.detail-content')).toContainText('Penjelasan grammar yang diperbarui.');
  await page.getByRole('link', { name: 'Kembali ke grammar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cari grammar' }).fill('テスト');
  await expect(page.locator('.content-card')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.content-card').getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(0);
});

test('favorite create, read, update and delete persist separately from content', async ({ page }) => {
  await ready(page);
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('kaigo');
  await page.getByRole('button', { name: 'Favoritkan 介護', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hapus favorit 介護', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await ready(page, '/favorites');
  await expect(page.locator('.content-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit catatan' }).click();
  await page.getByLabel('Catatan favorit', { exact: true }).fill('Penting untuk pekerjaan saya.');
  await page.getByRole('button', { name: 'Simpan catatan favorit' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await expect(page.locator('.content-card')).toContainText('Penting untuk pekerjaan saya.');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Hapus favorit', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Belum ada materi favorit.' })).toBeVisible();
});

test('progress notes persist but do not fabricate mastery or learning sessions', async ({ page }) => {
  await ready(page, '/vocabulary?item=seed-v-N3-01');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Catatan belajar', { exact: true }).fill('Perlu latihan membaca.');
  await page.getByRole('button', { name: 'Buat catatan progres' }).click();
  await expect(page.getByText('Catatan tersimpan di database.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Catatan belajar', { exact: true })).toHaveValue('Perlu latihan membaca.');
  await page.getByLabel('Catatan belajar', { exact: true }).fill('Catatan diperbarui.');
  await page.getByRole('button', { name: 'Simpan catatan progres' }).click();
  await expect(page.getByRole('button', { name: 'Simpan catatan progres' })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel('Catatan belajar', { exact: true })).toHaveValue('Catatan diperbarui.');
  const snapshot = await page.evaluate(async () => { const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase; return { progress: await db.progress.list(), sessions: await db.sessions.list() }; });
  expect(snapshot.progress[0]).toMatchObject({ status: 'NEW', masteryScore: null, correctCount: 0, wrongCount: 0, reviewCount: 0 });
  expect(snapshot.sessions).toHaveLength(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Hapus progres', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Buat catatan progres' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Catatan belajar', { exact: true })).toHaveValue('');
});

test('category CRUD detaches references without deleting vocabulary', async ({ page }) => {
  await ready(page, '/settings');
  await page.getByRole('button', { name: 'Tambah kategori', exact: true }).click();
  await page.getByLabel('Nama kategori').fill('Kategori pengujian');
  await page.getByLabel('Deskripsi kategori').fill('Catatan kategori');
  await page.getByRole('button', { name: 'Simpan kategori' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  const row = page.locator('.category-row').filter({ hasText: 'Kategori pengujian' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Nama kategori').fill('Kategori diperbarui');
  await page.getByRole('button', { name: 'Simpan kategori' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(async () => { const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase; const c = (await db.categories.list()).find(x => x.name === 'Kategori diperbarui')!; await db.vocabulary.update('seed-v-N3-01', { categoryIds: [c.id] }); });
  await page.reload();
  const edited = page.locator('.category-row').filter({ hasText: 'Kategori diperbarui' });
  await expect(edited).toContainText('1 materi');
  page.once('dialog', dialog => dialog.accept());
  await edited.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(edited).toHaveCount(0);
  await page.reload();
  const remaining = await page.evaluate(async () => { const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase; return { v: await db.vocabulary.get('seed-v-N3-01'), count: (await db.vocabulary.list()).length }; });
  expect(remaining.v?.categoryIds).toEqual([]);
  expect(remaining.count).toBe(70);
});

test('validation rolls back invalid edits, prevents duplicates, and deletes dependents atomically', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase;
    const defaults = '/src/services/progress.ts'; const { newProgress } = await import(defaults);
    const rejected: string[] = [];
    for (const [name, update] of Object.entries({ page: { sourcePage: 0 }, pdf: { sourcePdfId: 'missing' }, category: { categoryIds: ['missing'] }, meaning: { meaning: '' } })) {
      try { await db.vocabulary.update('seed-v-N3-01', update); } catch { rejected.push(name); }
    }
    const row = (await db.vocabulary.get('seed-v-N3-01'))!;
    const { id: _id, createdAt: _c, updatedAt: _u, ...copy } = row;
    try { await db.vocabulary.create(copy); } catch { rejected.push('duplicate'); }
    const p = await db.progress.create(newProgress('vocabulary', row.id, 'will be removed'));
    try { await db.progress.update(p.id, { masteryScore: 100, status: 'MASTERED' }); } catch { rejected.push('unearned-mastery'); }
    await db.favorites.create({ target: { type: 'vocabulary', itemId: row.id }, notes: '' });
    await db.vocabulary.delete(row.id);
    await db.initialize();
    return { rejected, remaining: (await db.vocabulary.list()).length, row: await db.vocabulary.get(row.id), progress: await db.progress.list(), favorites: await db.favorites.list(), examples: (await db.examples.list()).filter(e => e.itemId === row.id) };
  });
  expect(result.rejected).toEqual(['page', 'pdf', 'category', 'meaning', 'duplicate', 'unearned-mastery']);
  expect(result.remaining).toBe(69); expect(result.row).toBeUndefined();
  expect(result.progress).toEqual([]); expect(result.favorites).toEqual([]); expect(result.examples).toEqual([]);
  await page.reload();
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('kaigo');
  await expect(page.locator('.content-card')).toHaveCount(0);
});

test('two tabs seed once and broadcast saved favorite changes', async ({ page, context }) => {
  const other = await context.newPage();
  await Promise.all([ready(page), ready(other, '/favorites')]);
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('kaigo');
  await page.getByRole('button', { name: 'Favoritkan 介護', exact: true }).click();
  await expect(other.locator('.content-card')).toHaveCount(1);
  await other.reload();
  await expect(other.locator('.content-card')).toHaveCount(1);
  const count = await page.evaluate(async () => { const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase; return (await db.vocabulary.list()).length; });
  expect(count).toBe(70);
});

test('IndexedDB failure is visible instead of pretending to save data', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get: () => undefined }));
  await page.goto('/vocabulary');
  await expect(page.getByRole('alert')).toContainText('IndexedDB tidak tersedia');
  await expect(page.getByRole('button', { name: 'Tambah vocabulary', exact: true })).toBeDisabled();
});

test('database cards and dialogs fit mobile and dark mode', async ({ page }, testInfo) => {
  await ready(page, '/vocabulary');
  await page.screenshot({ path: testInfo.outputPath('database-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('kaigo');
  await page.goto('/vocabulary?item=seed-v-N3-01');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('database-mobile-detail.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Tambah vocabulary', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('database-mobile-form.png') });
});
