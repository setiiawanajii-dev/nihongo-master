import { expect, test, type Page } from '@playwright/test';
import type { LearningDatabase } from '../src/repositories/contracts';
import type { QuizAttempt, QuizConfig } from '../src/domain/models';

test.setTimeout(120_000);
async function ready(page: Page, route='/quiz') { await page.goto(route); await expect(page.locator('main h1')).toBeVisible(); await expect(page.getByText('Membuka database pembelajaran…',{exact:true})).toBeHidden(); }
async function attempt(page: Page): Promise<QuizAttempt> { return page.evaluate(async()=>{ const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;return (await db.quizAttempts.get(new URL(location.href).searchParams.get('attempt')!))!; }); }

test('all modes, sizes, N3/N2, twelve types and randomized valid options; sparse levels/custom handled',async({page})=>{
 await ready(page);
 const coverage = await page.evaluate(async()=>{
  const url='/src/services/database.ts', engineUrl='/src/domain/quiz/engine.ts';const db=(await import(url)).database as LearningDatabase;const e=await import(engineUrl);
  const data={vocabulary:await db.vocabulary.list(),grammar:await db.grammar.list(),examples:await db.examples.list(),categories:await db.categories.list()};
  const types=e.questionTypes.map((q:{value:string})=>q.value); const counts:number[]=[];let valid=true; const allTypes=new Set<string>();
  for(const mode of ['vocabulary','grammar','mixed']) for(const level of ['N3','N2']) for(const count of [10,20,30,50]) {const config={mode,count,levels:[level],categoryIds:[],types};const pool=e.buildQuestionPool(data,config);pool.forEach((q:{type:string})=>allTypes.add(q.type));const questions=e.chooseQuestions(pool,config);counts.push(questions.length);valid &&= new Set(questions.map((q:{id:string})=>q.id)).size===count && questions.every((q:{sourcePdfId:string;sourcePage:number;answerFormat:string;options:{id:string;text:string}[];correctAnswer:string})=>!!q.sourcePdfId&&q.sourcePage>0&&(q.answerFormat==='text'||(q.options.length===4&&new Set(q.options.map(o=>o.text)).size===4&&q.options.filter(o=>o.id===q.correctAnswer).length===1)));}
  const config={mode:'mixed',count:20,levels:['N3'],categoryIds:[],types};const pool=e.buildQuestionPool(data,config); const a=e.chooseQuestions(pool,config,()=>0.1),b=e.chooseQuestions(pool,config,()=>0.9);
  return {counts,valid,types:[...allTypes],orderA:a.map((q:{id:string})=>q.id),orderB:b.map((q:{id:string})=>q.id),optionsA:a[0].options,optionsB:b[0].options};
 });
 expect(coverage.counts).toEqual(Array.from({length:6},()=>[10,20,30,50]).flat());expect(coverage.valid).toBe(true);expect(coverage.types).toHaveLength(12);expect(coverage.orderA).not.toEqual(coverage.orderB);
 await page.getByLabel('Level quiz',{exact:true}).selectOption('N5');await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeDisabled();await expect(page.getByText(/Soal belum cukup/)).toBeVisible();
 await page.getByLabel('Level quiz',{exact:true}).selectOption('N4');await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeDisabled();
 await page.getByLabel('Level quiz',{exact:true}).selectOption('Custom');await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeEnabled();await page.getByRole('checkbox',{name:'N3',exact:true}).uncheck();await page.getByRole('checkbox',{name:'N2',exact:true}).uncheck();await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeDisabled();
});

test('20-question UI quiz scores 85%, Kotoba 90%, Bunpou 80%; mistakes, history and refresh persist',async({page})=>{
 await ready(page);await page.getByLabel('Jumlah soal').selectOption('20');await page.getByRole('button',{name:'Mulai quiz'}).click();await expect(page).toHaveURL(/attempt=/);
 const first=await attempt(page);const seen={vocabulary:0,grammar:0};
 for(let i=0;i<20;i++){
  const q=first.questions[i];await expect(page.getByText(`Soal ${i+1} / 20`,{exact:true})).toBeVisible();
  const n=++seen[q.itemType];const wrong=n>(q.itemType==='vocabulary'?9:8);
  if(q.answerFormat==='text') await page.getByLabel('Jawaban Jepang',{exact:true}).fill(wrong?'不正解':q.correctAnswer);
  else await page.locator(`input[type=radio][value="${wrong?q.options.find(o=>o.id!==q.correctAnswer)!.id:q.correctAnswer}"]`).check();
  await page.getByRole('button',{name:i===19?'Selesai & lihat hasil':'Simpan & berikutnya',exact:true}).click();
  if(wrong) { await expect(page.getByRole('heading',{name:'❌ Salah'})).toBeVisible(); await page.getByRole('link',{name:i===19?'Lihat hasil quiz':'Lanjut ke soal berikutnya',exact:true}).click(); }
  if(i===0) {await expect(page.getByText('Soal 2 / 20',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Soal 2 / 20',{exact:true})).toBeVisible();expect((await attempt(page)).questions).toEqual(first.questions);}
 }
 await expect(page).toHaveURL(/quiz\/result\?id=/);await expect(page.locator('.quiz-score')).toHaveText('85%');await expect(page.locator('.quiz-score-count')).toHaveText('17 / 20');await expect(page.locator('.quiz-breakdown')).toContainText('Kotoba90%');await expect(page.locator('.quiz-breakdown')).toContainText('Bunpou80%');await expect(page.locator('.quiz-mistake')).toHaveCount(3);
 for(const card of await page.locator('.quiz-mistake').all()){await expect(card).toContainText('Jawabanmu');await expect(card).toContainText('Jawaban benar');await expect(card).toContainText('Pembahasan');await expect(card).toContainText('Halaman');}
 await page.reload();await expect(page.locator('.quiz-score')).toHaveText('85%');await page.getByRole('link',{name:'Kembali ke quiz & riwayat'}).click();await expect(page.locator('.quiz-history-row')).toContainText('85%');await page.getByRole('link',{name:'Lihat hasil',exact:true}).click();await expect(page.locator('.quiz-mistake')).toHaveCount(3);
 const saved=await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;return {results:await db.quizResults.list(),sessions:await db.sessions.list(),progress:await db.progress.list()};});expect(saved.results).toHaveLength(1);expect(saved.sessions).toHaveLength(1);expect(saved.progress.reduce((sum,p)=>sum+p.correctCount,0)).toBe(17);
});

test('typed blank accepts normalized kana; pause, checkpoint and resume preserve active time',async({page})=>{
 await ready(page);const id=await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;const a=await db.quiz.start({mode:'vocabulary',count:10,levels:['N3'],categoryIds:[],types:['fill-blank']});await db.quiz.checkpoint(a.id,0,65);return a.id;});
 await page.goto(`/quiz?attempt=${id}`);await expect(page.getByLabel('Waktu aktif')).toContainText('1 mnt');const a=await attempt(page);const q=a.questions[0];await page.getByRole('button',{name:'Jeda',exact:true}).click();await expect(page.getByRole('heading',{name:'Sesi dijeda'})).toBeVisible();await expect(page.getByLabel('Jawaban Jepang')).toHaveCount(0);await page.getByRole('button',{name:'Lanjutkan quiz',exact:true}).click();await page.getByLabel('Jawaban Jepang').fill(` ${q.acceptedAnswers![0]}。 `);await page.getByRole('button',{name:'Simpan & berikutnya'}).click();await expect(page.getByText('Soal 2 / 10',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Simpan & keluar'}).click();await expect(page.getByRole('link',{name:'Lanjutkan',exact:true})).toBeVisible();await page.getByRole('link',{name:'Lanjutkan',exact:true}).click();await expect(page.getByText('Soal 2 / 10',{exact:true})).toBeVisible();
 const result=await page.evaluate(async(id)=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;let a=(await db.quizAttempts.get(id))!;for(let i=a.answers.length;i<a.questions.length;i++) a=await db.quiz.answer(id,i,a.questions[i].correctAnswer,2);return (await db.quizResults.get(id))!;},id);expect(result.accuracy).toBe(100);expect(result.activeDurationSeconds).toBeGreaterThanOrEqual(83);
});

test('quiz transactions reject tampering, serialize duplicate answers and retain history after source deletion',async({page})=>{
 await ready(page);const result=await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;
 const config:QuizConfig={mode:'grammar',count:10,levels:['N2'],categoryIds:[],types:['grammar-meaning']};let a=await db.quiz.start(config);let invalid=0;
 for(const [index,answer,time] of [[0,'missing-option',1],[3,'answer-0',2],[0,'answer-0',-1]] as const){try{await db.quiz.answer(a.id,index,answer,time);}catch{invalid++;}}
 const first=a.questions[0];await Promise.all([db.quiz.answer(a.id,0,first.correctAnswer,4),db.quiz.answer(a.id,0,first.correctAnswer,4)]);a=(await db.quizAttempts.get(a.id))!;const afterDuplicate=a.answers.length;
 for(let i=1;i<9;i++) a=await db.quiz.answer(a.id,i,a.questions[i].correctAnswer,3);
 const last=a.questions[9];await Promise.all([db.quiz.answer(a.id,9,last.correctAnswer,3),db.quiz.answer(a.id,9,last.correctAnswer,3)]);
 const saved=(await db.quizResults.get(a.id))!;const progressCount=(await db.progress.list()).reduce((sum,p)=>sum+p.reviewCount,0);await db.grammar.delete(first.itemId);const retained=(await db.quizResults.get(a.id))!;
 return {invalid,afterDuplicate,results:(await db.quizResults.list()).length,sessions:(await db.sessions.list()).length,progressCount,saved,retained};});
 expect(result.invalid).toBe(3);expect(result.afterDuplicate).toBe(1);expect(result.results).toBe(1);expect(result.sessions).toBe(1);expect(result.progressCount).toBe(10);expect(result.saved.accuracy).toBe(100);expect(result.saved.activeDurationSeconds).toBe(31);expect(result.retained).toEqual(result.saved);
});

test('empty results, unknown attempts, responsive custom form, runner and result',async({page})=>{
 await ready(page,'/quiz/result');await expect(page.getByRole('heading',{name:'Hasil quiz belum tersedia'})).toBeVisible();await page.goto('/quiz?attempt=missing');await expect(page.getByRole('heading',{name:'Sesi tidak ditemukan'})).toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await ready(page);await page.getByLabel('Level quiz',{exact:true}).selectOption('Custom');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByLabel('Jumlah soal').selectOption('10');await page.getByRole('button',{name:'Mulai quiz'}).click();await expect(page).toHaveURL(/attempt=/);await page.setViewportSize({width:320,height:900});await expect(page.locator('.quiz-prompt')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const a=await attempt(page);await page.evaluate(async(id)=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;let a=(await db.quizAttempts.get(id))!;for(let i=0;i<a.questions.length;i++){const q=a.questions[i];a=await db.quiz.answer(id,i,q.answerFormat==='text'?'不正解':q.options.find(o=>o.id!==q.correctAnswer)!.id,2);}},a.id);
 await page.goto(`/quiz/result?id=${a.id}`);await expect(page.locator('.quiz-mistake')).toHaveCount(10);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/quiz-result-mobile.png',fullPage:false});await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.documentElement.classList.add('dark'));await expect(page.locator('.desktop-sidebar .nav-item.active')).toHaveCSS('background-color','rgb(42, 65, 51)');await page.screenshot({path:'test-results/quiz-result-dark.png',fullPage:false});
});

test('version 2 migration preserves existing content and notes while adding quiz storage',async({page})=>{
 await page.addInitScript(async()=>{
  if(sessionStorage.getItem('quiz-v2-fixture')) return;sessionStorage.setItem('quiz-v2-fixture','1');
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('nihongo-master',2);r.onupgradeneeded=()=>{for(const name of ['vocabulary','grammar','examples','categories','materials','pages','questions','progress','favorites','schedules','quizResults','sessions','reviewEvents','meta'])r.result.createObjectStore(name,{keyPath:'id'});};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const tx=db.transaction(['meta','progress','categories'],'readwrite');tx.objectStore('categories').put({id:'legacy-category',name:'Kategori pribadi',description:'Tetap ada',isSeed:false,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});tx.objectStore('progress').put({id:'grammar:legacy',itemId:'legacy',itemType:'grammar',status:'NEW',masteryScore:null,dimensions:{},reviewCount:0,correctCount:0,wrongCount:0,lastReviewed:null,nextReview:null,notes:'Catatan sebelum migrasi',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});tx.oncomplete=()=>{db.close();resolve();};};});
 });
 await ready(page);await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeEnabled();
 const migrated=await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;return {note:(await db.progress.get('grammar:legacy'))?.notes,category:(await db.categories.get('legacy-category'))?.name,attempts:await db.quizAttempts.list(),vocabulary:(await db.vocabulary.list()).length};});expect(migrated).toEqual({note:'Catatan sebelum migrasi',category:'Kategori pribadi',attempts:[],vocabulary:70});
});

test('quiz and self-rated evidence remain mixed in both directions',async({page})=>{
 await ready(page);const sources=await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;const sources:string[]=[];
 for(const kind of ['vocabulary','grammar'] as const){let a=await db.quiz.start({mode:kind,count:10,levels:['N3'],categoryIds:[],types:kind==='vocabulary'?['multiple-choice']:['grammar-meaning']});const q=a.questions[0];
 const review=()=>{const input={itemId:q.itemId,rating:3 as const,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:3};return kind==='vocabulary'?db.learning.recordVocabularyReview(input):db.learning.recordGrammarReview({...input,dimension:'understanding',response:'Penjelasan mandiri'});};
 await review();for(let i=0;i<a.questions.length;i++)a=await db.quiz.answer(a.id,i,a.questions[i].correctAnswer,2);
 sources.push((await db.progress.get(`${kind}:${q.itemId}`))!.dimensions[q.dimension]!.source!);sources.push((await review()).dimensions[q.dimension]!.source!);
 }
 return sources;});expect(sources).toEqual(['mixed','mixed','mixed','mixed']);
});
