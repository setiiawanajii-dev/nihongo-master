import { test, expect } from '@playwright/test';

test('kana reaches mastery through review; kanji and grammar retain their requirements', async ({ page }) => {
 await page.goto('/favicon.svg');
 const result = await page.evaluate(async () => {
  const path = '/src/domain/learning/spaced-repetition.ts';
  const { advanceEvidence, weakestDimension, masteryFromEvidence, requiredDimensions } = await import(path);
  const ppath = '/src/services/progress.ts'; const { newProgress } = await import(ppath);
  const now = new Date();
  const run = (item: object, type = 'vocabulary') => {
   let p = { ...newProgress(type, 'test'), id: type + ':test', createdAt: now.toISOString(), updatedAt: now.toISOString() };
   for (let i = 0; i < 30; i++) p = advanceEvidence(p, undefined, 3, weakestDimension(p, item), now, true, item).progress;
   return p;
  };
  const kana = run({ kanji: 'テスト' });
  const hiragana = run({ kanji: 'ありがとう' });
  const kanji = masteryFromEvidence(kana, { kanji: '学校' });
  const grammar = run({ pattern: '〜から' }, 'grammar');
  return { kana, hiragana, kanji, grammar, extended: requiredDimensions('vocabulary', { kanji: '𠮷' }) };
 });
 expect(result.kana.masteryScore).toBe(100);
 expect(result.kana.status).toBe('MASTERED');
 expect(result.kana.dimensions.kanji).toBeUndefined();
 expect(result.kana.reviewCount).toBe(30);
 expect(result.hiragana.status).toBe('MASTERED');
 expect(result.kanji).toEqual({ masteryScore: 75, mastered: false });
 expect(result.grammar.status).toBe('MASTERED');
 expect(result.extended).toContain('kanji');
});

test('version 7 progress is corrected once and survives refresh without adding history', async ({ page }) => {
 await page.goto('/favicon.svg');
 const before = await page.evaluate(async () => {
  const stamp = '2026-09-20T10:00:00.000Z';
  const dimensions = Object.fromEntries(['recognition','meaning','usage'].map(key => [key, { attempts: 10, correct: 10, score: 100, source: 'self-rated', lastTestedAt: stamp }]));
  const progress = { id:'vocabulary:kana', itemType:'vocabulary', itemId:'kana', dimensions, status:'REVIEW', masteryScore:75, reviewCount:30, correctCount:30, wrongCount:0, lastReviewed:stamp, nextReview:'2026-10-20T10:00:00.000Z', notes:'keep this', createdAt:stamp, updatedAt:stamp };
  await new Promise<void>((resolve,reject) => {
   const open = indexedDB.open('nihongo-master',7);
   open.onupgradeneeded = () => { for (const name of ['vocabulary','progress']) open.result.createObjectStore(name,{keyPath:'id'}); };
   open.onsuccess = () => {
    const db = open.result, tx = db.transaction(['vocabulary','progress'],'readwrite');
    tx.objectStore('vocabulary').put({id:'kana',kanji:'テスト'});
    tx.objectStore('progress').put(progress);
    tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
   };
  });
  return progress;
 });
 const read = () => page.evaluate(async () => {
  const path = '/src/infrastructure/database/indexeddb.ts'; const { transact } = await import(path);
  return transact(['progress','sessions','reviewEvents'], 'readonly', async (tx: any) => ({ progress: await tx.get('progress','vocabulary:kana'), sessions: await tx.list('sessions'), events: await tx.list('reviewEvents') }));
 });
 const after = await read();
 expect(after.progress).toEqual({...before,masteryScore:100,status:'MASTERED'});
 expect(after.sessions).toEqual([]); expect(after.events).toEqual([]);
 await page.reload(); expect(await read()).toEqual(after);
});

test('quiz completion uses kana dimensions and persists its result', async ({ page }) => {
 await page.goto('/favicon.svg');
 const result = await page.evaluate(async () => {
  const dbPath = '/src/infrastructure/database/indexeddb.ts', quizPath = '/src/infrastructure/database/quiz.ts';
  const { transact, stores } = await import(dbPath); const { quizCommands } = await import(quizPath);
  const stamp = new Date().toISOString();
  const dimensions = Object.fromEntries(['recognition','meaning','usage'].map(key => [key,{ attempts:3, correct:3, score:100, source:'quiz', lastTestedAt:stamp }]));
  const q = { id:'q',itemId:'kana',contentId:'kana',itemType:'vocabulary',dimension:'meaning',type:'jp-to-id',prompt:'テスト',answerFormat:'choice',options:[{id:'a',text:'tes'}],correctAnswer:'a',explanation:'tes',createdAt:stamp,updatedAt:stamp };
  await transact(stores,'readwrite',async (tx: any) => {
   await tx.put('vocabulary',{id:'kana',kanji:'テスト'});
   await tx.put('progress',{id:'vocabulary:kana',itemId:'kana',itemType:'vocabulary',dimensions,masteryScore:75,status:'REVIEW',reviewCount:9,correctCount:9,wrongCount:0,lastReviewed:stamp,nextReview:stamp,notes:'',createdAt:stamp,updatedAt:stamp});
   await tx.put('quizAttempts',{id:'attempt',config:{mode:'vocabulary',count:10,levels:['N3'],categoryIds:[],types:['jp-to-id']},questions:[q],answers:[],questionSeconds:[0],status:'ACTIVE',startedAt:stamp,completedAt:null,createdAt:stamp,updatedAt:stamp});
  });
  await quizCommands.answer('attempt',0,'a',5);
  return transact(stores,'readonly',async (tx: any) => ({progress:await tx.get('progress','vocabulary:kana'),results:await tx.list('quizResults')}));
 });
 expect(result.progress.masteryScore).toBe(100);
 expect(result.progress.status).toBe('MASTERED');
 expect(result.progress.correctCount).toBe(10);
 expect(result.results).toHaveLength(1);
});
