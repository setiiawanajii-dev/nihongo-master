import { test, expect } from '@playwright/test';
import type { LearningDatabase } from '../src/repositories/contracts';
test.setTimeout(90_000);

test('manual entry and JSON/CSV import work without source fields', async ({ page }) => {
 await page.goto('/data-transfer');
 await page.getByRole('link', { name: 'Tambah vocabulary', exact: true }).click();
 const dialog = page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText(/PDF|Halaman sumber|Sumber PDF/)).toHaveCount(0);
 await dialog.getByLabel('Kanji / kata Jepang').fill('学校');
 await dialog.getByLabel('Kana', { exact: true }).fill('がっこう');
 await dialog.getByLabel('Romaji').fill('gakkou');
 await dialog.getByLabel('Arti Indonesia').fill('sekolah');
 await dialog.getByRole('button', { name: 'Simpan materi' }).click();
 await expect(dialog).toHaveCount(0);
 await page.goto('/grammar?add=1');
 await expect(dialog).toBeVisible();
 await dialog.getByLabel('Grammar pattern').fill('〜てから');
 await dialog.getByLabel('Pola pembentukan').fill('Vて + から');
 await dialog.getByLabel('Penjelasan', { exact: true }).fill('Kegiatan kedua dilakukan setelah kegiatan pertama.');
 await dialog.getByLabel('Arti Indonesia').fill('setelah');
 await dialog.getByRole('button', { name: 'Simpan materi' }).click();
 await expect(dialog).toHaveCount(0);
 for (const format of ['json', 'csv']) {
  await page.goto('/data-transfer');
  const kind = format === 'json' ? 'vocabulary' : 'grammar';
  const template = await page.request.get('/templates/' + kind + '.' + format);
  expect(template.ok()).toBe(true);
  await page.getByLabel('Berkas impor').setInputFiles({ name: kind + '.' + format, mimeType: 'text/plain', buffer: Buffer.from(await template.text()) });
  await page.getByRole('button', { name: 'Periksa impor' }).click();
  await expect(page.getByRole('heading', { name: 'Pratinjau impor' })).toBeVisible();
  await page.getByRole('button', { name: 'Simpan impor' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Impor selesai' })).toBeVisible();
 }
 await page.reload();
 const result = await page.evaluate(async () => {
  const path = '/src/services/database.ts'; const db = (await import(path)).database as LearningDatabase;
  return { vocabulary: await db.vocabulary.list(), grammar: await db.grammar.list(), rows: await db.transfer.export() };
 });
 expect(result.vocabulary).toHaveLength(1); // template duplicate ignored
 expect(result.grammar).toHaveLength(2);
 expect(JSON.stringify(result)).not.toMatch(/sourcePdfId|sourcePage|additionalSources/);
});

test('version 6 migrates content, favorites and quiz history without losing progress', async ({ page }) => {
 await page.goto('/favicon.svg'); // Same origin, before application opens the database.
 const old = await page.evaluate(async () => {
  const seedPath = '/src/data/seed.ts', progressPath = '/src/services/progress.ts';
  const seed = await import(seedPath), { newProgress } = await import(progressPath);
  const stamp = new Date().toISOString();
  const v = { ...seed.seedVocabulary[0], id: 'personal-v', isSeed: false, romaji: '', partOfSpeech: '', extractionDraftId: 'old-draft', sourcePdfId: 'book', sourcePage: 2, additionalSources: [], categoryIds: [] };
  const g = { ...seed.seedGrammar[0], id: 'personal-g', isSeed: false, sourcePdfId: 'book', sourcePage: 3, additionalSources: [], categoryIds: [], comparisonIds: [] };
  const progress = { ...newProgress('vocabulary', v.id), id: 'vocabulary:' + v.id, createdAt: stamp, updatedAt: stamp, correctCount: 2, reviewCount: 2, masteryScore: 25, status: 'REVIEW', lastReviewed: stamp, nextReview: stamp };
  const config = { mode: 'vocabulary', count: 10, levels: ['N3'], categoryIds: [], types: ['jp-to-id'], source: { kind: 'pdf', sourcePdfId: 'book' }, sourceLabel: 'Old book.pdf' };
  const question = { id: 'q1', itemId: v.id, contentId: v.id, itemType: 'vocabulary', type: 'jp-to-id', dimension: 'meaning', prompt: 'Apa artinya?', correctAnswer: 'a', options: [{ id: 'a', text: v.meaning }], explanation: v.meaning, sourcePdfId: 'book', sourcePage: 2, sourcePdfName: 'Old book.pdf', createdAt: stamp, updatedAt: stamp };
  const result = { id: 'history', sessionId: 'history', config, score: 100, accuracy: 100, correctCount: 1, wrongCount: 0, activeDurationSeconds: 5, startedAt: stamp, finishedAt: stamp, answers: [{ questionSnapshot: question, answer: 'a', isCorrect: true, answeredAt: stamp }], createdAt: stamp, updatedAt: stamp };
  const names = ['vocabulary','grammar','examples','categories','materials','pages','questions','progress','favorites','schedules','quizResults','quizAttempts','reviewRuns','sessions','reviewEvents','pdfFiles','pdfReading','extractionRuns','extractionDrafts','meta'];
  await new Promise<void>((resolve, reject) => {
   const open = indexedDB.open('nihongo-master', 6);
   open.onupgradeneeded = () => { for (const n of names) open.result.createObjectStore(n, { keyPath: 'id' }); };
   open.onerror = () => reject(open.error);
   open.onsuccess = () => {
    const db = open.result, tx = db.transaction(names, 'readwrite');
    const put = (s: string, value: unknown) => tx.objectStore(s).put(value);
    put('vocabulary', v); put('grammar', g); put('progress', progress); put('quizResults', result);
    put('favorites', { id: 'vocabulary:personal-v', target: { type: 'vocabulary', itemId: v.id }, notes: 'keep', createdAt: stamp, updatedAt: stamp });
    put('favorites', { id: 'pdf-page:book:2', target: { type: 'pdf-page', materialId: 'book', pageNumber: 2 }, notes: 'retired' });
    put('pdfFiles', { id: 'book', blob: new Blob(['old file']) });
    put('meta', { id: 'demo-removed-v1', value: stamp }); put('meta', { id: 'review-schedule-v1', value: stamp });
    tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
   };
  });
  return { progress, result };
 });
 await page.goto('/vocabulary/personal-v');
 await expect(page.getByRole('button', { name: 'Edit materi', exact: true })).toBeVisible();
 await page.getByRole('button', { name: 'Edit materi', exact: true }).click();
 await page.getByRole('button', { name: 'Simpan materi', exact: true }).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const read = () => page.evaluate(async () => {
  const u='/src/services/database.ts', a='/src/infrastructure/database/indexeddb.ts'; const db=(await import(u)).database as LearningDatabase; const adapter=await import(a);
  return {v:await db.vocabulary.list(),g:await db.grammar.list(),p:await db.progress.list(),f:await db.favorites.list(),q:await db.quizResults.list(),stores:Array.from((await adapter.openDatabase()).objectStoreNames)};
 });
 const after = await read();
 expect(after.p).toEqual([old.progress]);
 expect(after.f).toHaveLength(1); expect(after.f[0].notes).toBe('keep');
 expect(after.v).toHaveLength(1); expect(after.g).toHaveLength(1);
 expect(after.q[0].accuracy).toBe(old.result.accuracy);
 expect(after.q[0].answers[0].answer).toBe('a');
 expect(JSON.stringify(after)).not.toMatch(/sourcePdf|sourcePage|extractionDraft|pdfFiles|sourceLabel/);
 await page.reload(); expect(await read()).toEqual(after);
 await page.goto('/quiz/result?id=history');
 await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
});

test('imported content supports quiz, review and merge while retaining progress', async ({ page }) => {
 await page.goto('/data-transfer');
 await expect(page.getByRole('heading', { name: 'Impor dari file' })).toBeVisible();
 const result = await page.evaluate(async () => {
  const u='/src/services/database.ts', s='/src/data/seed.ts', f='/src/domain/transfer/format.ts';
  const db=(await import(u)).database as LearningDatabase, seed=await import(s), format=await import(f);
  const rows = [
   ...seed.seedVocabulary.slice(0,10).map((v:any)=>({type:'vocabulary',kanji:v.kanji,kana:v.kana,meaning:v.meaning,level:v.jlptLevel})),
   ...seed.seedGrammar.slice(0,6).map((g:any)=>({type:'grammar',grammar:g.pattern,pattern:g.formation,meaning:g.meaning,level:g.jlptLevel}))
  ];
  const preview=await db.transfer.preview(rows);
  await db.transfer.commit(preview,rows.map(()=> 'ignore'),rows.map(()=>null));
  let quiz=await db.quiz.start({mode:'mixed',count:10,levels:['N3'],categoryIds:[],types:['jp-to-id','grammar-meaning']});
  for(let i=0;i<quiz.questions.length;i++)quiz=await db.quiz.answer(quiz.id,i,quiz.questions[i].correctAnswer,2);
  const v=(await db.vocabulary.list())[0],g=(await db.grammar.list())[0];
  await db.learning.queueVocabularyReview(v.id);await db.learning.queueGrammarReview(g.id);
  let review=await db.review.start({mode:'mixed'},10);
  for(let i=0;i<review.entries.length;i++)review=await db.review.answer(review.id,i,2,'Jawaban mandiri',3);
  const before=await db.progress.list(), exported=await db.transfer.export();
  const parsed=[format.parseImport(format.exportJson(exported),'json'),format.parseImport(format.exportCsv(exported),'csv')];
  for(const entries of parsed){
   if(entries.some((e:any)=>e.error))throw new Error('Invalid round trip');
   const p=await db.transfer.preview(entries.map((e:any)=>e.row));
   await db.transfer.commit(p,p.rows.map(()=> 'merge'),p.rows.map(r=>r.id!));
  }
  return {before,after:await db.progress.list(),quiz:quiz.status,review:review.status,v:(await db.vocabulary.list()).length,g:(await db.grammar.list()).length,exported};
 });
 expect(result.before).toEqual(result.after);
 expect(result.quiz).toBe('COMPLETED');expect(result.review).toBe('COMPLETED');
 expect(result.v).toBe(10);expect(result.g).toBe(6);
 expect(JSON.stringify(result.exported)).not.toMatch(/sourcePdfId|sourcePage|"source"/);
 await page.reload();
 const saved=await page.evaluate(async()=>{const u='/src/services/database.ts';return (await import(u)).database.progress.list();});
 expect(saved).toEqual(result.after);
});

test('all current routes and retired redirects work on mobile in both themes', async ({ page }) => {
 await page.setViewportSize({width:390,height:844});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/dashboard','/vocabulary','/grammar','/quiz','/review','/progress','/favorites','/settings','/guide','/feedback','/data-transfer','/materials','/materials/old-book','/material-check?pdf=old-book']){
  await page.goto(route);await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText('Membuka database pembelajaran…',{exact:true})).toHaveCount(0);
  if(route.startsWith('/material'))await expect(page).toHaveURL(/\/data-transfer$/);
  for(const dark of [false,true]){
   await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await expect(page.locator('main')).not.toContainText(/Sumber PDF|PDF Reader|Upload PDF|Material Check/);
 }
 expect(errors).toEqual([]);
});
