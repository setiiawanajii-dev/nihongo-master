import { expect, test, type Page } from '@playwright/test';
import type { LearningDatabase } from '../src/repositories/contracts';
import type { FlashcardRating } from '../src/domain/models';

test.setTimeout(90_000);
async function ready(page: Page, path = '/vocabulary') {
  await page.goto(path);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText('Membuka database pembelajaran…', { exact: true })).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('detail route, full content, refresh, unknown id and return to filtered pagination', async ({ page }) => {
  await ready(page, '/vocabulary?level=N3&page=2&sort=kana');
  await expect(page.locator('.result-count')).toHaveText('50 vocabulary · Halaman 2 / 5');
  const card = page.locator('.content-card').first();
  const word = await card.locator('.entry-kanji').innerText();
  await card.getByRole('link', { name: 'Detail', exact: true }).click();
  await expect(page).toHaveURL(/\/vocabulary\/seed-v-N3-/);
  await expect(page.locator('main h1')).toHaveText(word);
  await expect(page.locator('.example-block')).toHaveCount(1);
  await expect(page.locator('.entry-source')).toContainText('DUMMY-N3-vocabulary.pdf');
  await expect(page.locator('.detail-content')).toContainText('Catatan materi');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText(word);
  await page.getByRole('link', { name: 'Kembali ke vocabulary', exact: true }).click();
  await expect(page.locator('.result-count')).toHaveText('50 vocabulary · Halaman 2 / 5');
  await ready(page, '/vocabulary/nonexistent');
  await expect(page.getByRole('heading', { name: 'Materi tidak ditemukan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review sekarang', exact: true })).toHaveCount(0);
});

test('search, level, category, favorite, sort and pagination survive reload', async ({ page }) => {
  await ready(page);
  await page.getByRole('combobox', { name: 'Filter level JLPT' }).selectOption('N2');
  await expect(page.locator('.result-count')).toContainText('20 vocabulary');
  await page.getByRole('button', { name: 'Berikutnya', exact: true }).click();
  await page.reload();
  await expect(page.locator('.result-count')).toHaveText('20 vocabulary · Halaman 2 / 2');
  await page.getByRole('combobox', { name: 'Filter level JLPT' }).selectOption('all');
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('kaigo');
  await expect(page.locator('.content-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Favoritkan 介護', exact: true }).click();
  await page.getByRole('button', { name: 'Favorit', exact: true }).click();
  await page.reload();
  await expect(page.locator('.content-card')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Cari vocabulary' })).toHaveValue('kaigo');
  await page.getByRole('combobox', { name: 'Filter kategori' }).selectOption('category-2');
  await expect(page.locator('.content-card')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter kategori' }).selectOption('all');
  await page.getByRole('button', { name: 'Semua', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('');
  await page.getByRole('combobox', { name: 'Urutkan vocabulary' }).selectOption('kana');
  const kana = await page.locator('.entry-reading').allTextContents();
  expect(kana).toEqual([...kana].sort((a, b) => a.localeCompare(b, 'ja')));
  await page.getByRole('button', { name: 'Mastered', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(0);
});

for (const rating of [0, 1, 2, 3] as const) {
  test(`flashcard rating ${rating} updates persistent progress, schedule and history exactly once`, async ({ page }) => {
    await ready(page, '/vocabulary/flashcards?only=seed-v-N3-01');
    const labels = ['😵 Belum tahu', '😐 Hampir tahu', '🙂 Tahu', '🔥 Sangat hafal'];
    const button = page.getByRole('button', { name: new RegExp(labels[rating]) });
    await expect(button).toBeDisabled();
    await expect(page.locator('.flashcard-kana')).toHaveCount(0);
    await page.getByRole('button', { name: 'Balik kartu untuk melihat jawaban' }).click();
    await expect(page.locator('.flashcard-kana')).toContainText('かいご');
    await expect(page.locator('.flashcard-meaning')).toContainText('Perawatan');
    await button.click();
    await expect(page.getByText('Satu langkah lagi hari ini.', { exact: true })).toBeVisible();
    await page.reload();
    const snapshot = await page.evaluate(async () => {
      const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase;
      return { progress: await db.progress.get('vocabulary:seed-v-N3-01'), schedule: await db.schedules.get('vocabulary:seed-v-N3-01'), events: await db.reviewEvents.list(), sessions: await db.sessions.list() };
    });
    expect(snapshot.progress).toMatchObject({ reviewCount: 1, correctCount: rating >= 2 ? 1 : 0, wrongCount: rating < 2 ? 1 : 0, masteryScore: [0, 10, 19, 25][rating] });
    expect(snapshot.progress?.status).not.toBe('MASTERED');
    expect(snapshot.schedule?.intervalDays).toBeCloseTo([10 / 1440, 1, 3, 7][rating], 6);
    expect(snapshot.progress?.nextReview).toBe(snapshot.schedule?.nextReview);
    expect(snapshot.events).toHaveLength(1); expect(snapshot.sessions).toHaveLength(1);
  });
}

test('review now queues without awarding scores and learning removes it from due review', async ({ page }) => {
  await ready(page, '/vocabulary/seed-v-N3-01');
  await page.getByRole('button', { name: 'Review sekarang', exact: true }).click();
  await expect(page.locator('.detail-evidence')).toContainText('Review jatuh tempo');
  await page.getByRole('link', { name: 'Lihat antrean review' }).click();
  await expect(page.locator('.content-card')).toHaveCount(1);
  await expect(page.locator('.content-card')).toContainText('Belum diuji');
  await page.locator('.content-card').getByRole('link', { name: 'Detail', exact: true }).click();
  await page.getByRole('link', { name: 'Kembali ke review', exact: true }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByRole('link', { name: 'Flashcard', exact: true }).click();
  await page.getByRole('button', { name: 'Balik kartu untuk melihat jawaban' }).click();
  await page.getByRole('button', { name: /🙂 Tahu/ }).click();
  await expect(page.getByText('Satu langkah lagi hari ini.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lihat review', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.content-card')).toHaveCount(0);
});

test('idempotent and concurrent rating transactions, rollback, intervals, and no mastery inflation', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase;
    const input = { itemId: 'seed-v-N3-01', rating: 3 as FlashcardRating, sessionId: 'test-session', eventId: 'unique-event', activeDurationSeconds: 12 };
    await Promise.all([db.learning.recordVocabularyReview(input), db.learning.recordVocabularyReview(input)]);
    const one = await db.progress.get('vocabulary:seed-v-N3-01');
    let rejected = false;
    try { await db.learning.recordVocabularyReview({ ...input, itemId: 'seed-v-N3-02' }); } catch { rejected = true; }
    await Promise.all([db.learning.recordVocabularyReview({ ...input, eventId: 'event-2' }), db.learning.recordVocabularyReview({ ...input, eventId: 'event-3' })]);
    const final = await db.progress.get('vocabulary:seed-v-N3-01');
    return { one, final, rejected, other: await db.progress.get('vocabulary:seed-v-N3-02'), schedule: await db.schedules.get('vocabulary:seed-v-N3-01'), events: (await db.reviewEvents.list()).length, session: await db.sessions.get('test-session') };
  });
  expect(result.one?.reviewCount).toBe(1); expect(result.final?.reviewCount).toBe(3);
  expect(result.final?.masteryScore).toBe(25); expect(result.final?.status).not.toBe('MASTERED');
  expect(result.rejected).toBe(true); expect(result.other).toBeUndefined(); expect(result.events).toBe(3);
  expect(result.schedule?.intervalDays).toBe(30); expect(result.session?.activeDurationSeconds).toBe(36);
});

test('mastered and mastery sort use saved evidence and skip does not write progress', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase;
    const source = '/src/services/progress.ts'; const { newProgress } = await import(source);
    const evidence = { attempts: 5, correct: 5, score: 100, lastTestedAt: new Date().toISOString(), source: 'quiz' as const };
    await db.progress.create({ ...newProgress('vocabulary', 'seed-v-N3-02'), status: 'MASTERED', masteryScore: 100, correctCount: 20, dimensions: { recognition: evidence, meaning: evidence, kanji: evidence, usage: evidence } });
  });
  await ready(page, '/vocabulary?status=mastered');
  await expect(page.locator('.content-card')).toHaveCount(1); await expect(page.locator('.content-card')).toContainText('改善');
  await ready(page, '/vocabulary?sort=mastery-desc');
  await expect(page.locator('.entry-kanji').first()).toHaveText('改善');
  await ready(page, '/vocabulary/flashcards?only=seed-v-N3-01');
  await page.getByRole('button', { name: 'Lewati tanpa menilai' }).click();
  await expect(page.getByText('0 jawaban tersimpan · 1 kartu dilewati')).toBeVisible();
  const p = await page.evaluate(async () => { const url = '/src/services/database.ts'; return ((await import(url)).database as LearningDatabase).progress.get('vocabulary:seed-v-N3-01'); });
  expect(p).toBeUndefined();
});

test('version 1 migration keeps content, progress and favorites', async ({ page }) => {
  // Run before app code, only in this isolated browser context.
  await page.addInitScript(() => {
    (window as unknown as { migrationReady: Promise<void> }).migrationReady = new Promise(resolve => {
      const request = indexedDB.open('nihongo-master', 1);
      request.onupgradeneeded = () => {
        for (const name of ['vocabulary', 'grammar', 'examples', 'categories', 'materials', 'pages', 'questions', 'progress', 'favorites', 'schedules', 'quizResults', 'sessions', 'meta']) request.result.createObjectStore(name, { keyPath: 'id' });
        const tx = request.transaction!; const stamp = new Date().toISOString();
        tx.objectStore('meta').put({ id: 'seed-v1', value: stamp });
        tx.objectStore('vocabulary').put({ id: 'kept', kanji: '保存', kana: 'ほぞん', romaji: 'hozon', meaning: 'Disimpan', jlptLevel: 'N3', categoryIds: [], difficulty: 3, isSeed: false, notes: 'Tetap ada', sourcePdfId: 'old', sourcePage: 1, additionalSources: [], partOfSpeech: '名詞', createdAt: stamp, updatedAt: stamp });
        tx.objectStore('progress').put({ id: 'vocabulary:kept', itemType: 'vocabulary', itemId: 'kept', status: 'NEW', masteryScore: null, dimensions: {}, correctCount: 0, wrongCount: 0, reviewCount: 0, lastReviewed: null, nextReview: null, notes: 'Catatan lama', createdAt: stamp, updatedAt: stamp });
        tx.objectStore('favorites').put({ id: 'vocabulary:kept', target: { type: 'vocabulary', itemId: 'kept' }, notes: 'Favorit lama', createdAt: stamp, updatedAt: stamp });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => resolve();
    });
  });
  await ready(page);
  await expect(page.locator('.entry-kanji')).toHaveText('保存');
  const result = await page.evaluate(async () => { const url = '/src/services/database.ts'; const db = (await import(url)).database as LearningDatabase; return { p: await db.progress.get('vocabulary:kept'), f: await db.favorites.get('vocabulary:kept'), events: await db.reviewEvents.list() }; });
  expect(result.p?.notes).toBe('Catatan lama'); expect(result.f?.notes).toBe('Favorit lama'); expect(result.events).toEqual([]);
});

test('mobile flashcards and detail remain usable in dark mode', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/vocabulary/seed-v-N3-01');
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('vocabulary-detail-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Latih kata ini' }).click();
  await page.getByRole('button', { name: 'Balik kartu untuk melihat jawaban' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('vocabulary-flashcard-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: /🔥 Sangat hafal/ }).click();
  await expect(page.getByText('Satu langkah lagi hari ini.', { exact: true })).toBeVisible();
});
