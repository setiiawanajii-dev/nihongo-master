import { expect, test, type Page } from '@playwright/test';
import type { LearningDatabase } from '../src/repositories/contracts';
import type { QuizAttempt, QuizConfig } from '../src/domain/models';
test.setTimeout(120_000);
async function setup(page: Page) {
 await page.goto('/quiz'); await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeEnabled();
 await page.evaluate(async()=>{
  const url='/src/services/database.ts', storage='/src/infrastructure/database/indexeddb.ts';
  const db=(await import(url)).database as LearningDatabase; const {transact}=await import(storage);
  const base=(await db.materials.list())[0];
  await transact(['materials'],'readwrite',async(tx:any)=>{ for(const id of ['source-test','empty-test']) await tx.put('materials',{...base,id,name:id==='source-test'?'N3 Grammar':'PDF tanpa materi',filename:`${id}.pdf`,totalPages:100,pageCount:100,isDummy:false,file:null,units:[]}); });
  for(const kind of ['vocabulary','grammar'] as const) {
   const items=(await db[kind].list()).filter(i=>i.jlptLevel==='N3').slice(0,8);
   for(let i=0;i<items.length;i++) await db[kind].update(items[i].id,{sourcePdfId:'source-test',sourcePage:i<4?42:43});
   // The first example is intentionally out of scope: the engine must never borrow it.
   const examples=await db.examples.list();
   for(const e of examples.filter(e=>e.itemType===kind&&items.some(i=>i.id===e.itemId))) await db.examples.update(e.id,{sourcePdfId:'source-test',sourcePage:80});
  }
 });
 await page.reload(); await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeEnabled();
}

test('source pool strictly scopes questions, distractors, examples, additional references and snapshots',async({page})=>{
 await setup(page);
 const result=await page.evaluate(async()=>{
  const url='/src/services/database.ts',engine='/src/domain/quiz/engine.ts'; const db=(await import(url)).database as LearningDatabase; const e=await import(engine);
  const content={vocabulary:await db.vocabulary.list(),grammar:await db.grammar.list(),examples:await db.examples.list(),categories:[],materials:await db.materials.list()};
  const config:QuizConfig={mode:'mixed',count:10,levels:['N3'],categoryIds:[],types:e.questionTypes.map((q:any)=>q.value),source:{kind:'page',sourcePdfId:'source-test',page:42}};
  const pool=e.buildQuestionPool(content,config); const a=await db.quiz.start(config);
  const scoped=[...content.vocabulary,...content.grammar].filter(i=>i.sourcePdfId==='source-test'&&i.sourcePage===42);
  const noOutside=pool.every((q:any)=>scoped.some(i=>i.id===q.contentId)&&q.sourcePdfId==='source-test'&&q.sourcePage===42&&!['fill-blank','usage','grammar-blank','grammar-sentence','grammar-situation'].includes(q.type));
  const meaningAnswers=pool.filter((q:any)=>q.type==='jp-to-id').flatMap((q:any)=>q.options.map((o:any)=>o.text));
  const allowed=content.vocabulary.filter(i=>i.sourcePdfId==='source-test'&&i.sourcePage===42).map(i=>i.meaning);
  const unit=await db.pdf.saveUnit('source-test',{name:'Unit 3',startPage:42,endPage:43});
  const unitPool=e.buildQuestionPool({...content,materials:await db.materials.list()},{...config,source:{kind:'unit',sourcePdfId:'source-test',unitId:unit}});
  const pdfPool=e.buildQuestionPool(content,{...config,source:{kind:'pdf',sourcePdfId:'source-test'}});
  const outside=content.vocabulary.find(i=>i.sourcePdfId!=='source-test'&&i.jlptLevel==='N3')!;
  await db.vocabulary.update(outside.id,{additionalSources:[{sourcePdfId:'source-test',sourcePage:42}]});
  const extra=e.buildQuestionPool({...content,vocabulary:await db.vocabulary.list()},config).filter((q:any)=>q.contentId===outside.id);
  let invalid=0; for(const source of [{kind:'page',sourcePdfId:'source-test',page:101},{kind:'unit',sourcePdfId:'source-test',unitId:'missing'},{kind:'pdf',sourcePdfId:'missing'},{kind:'page',sourcePdfId:'source-test',page:0}]) {try{await db.quiz.start({...config,source} as QuizConfig);}catch{invalid++;}}
  return {noOutside,distractors:meaningAnswers.every((v:string)=>allowed.includes(v)),snapshot:a.questions.every(q=>q.contentId===q.itemId&&q.sourcePdfName==='source-test.pdf'&&q.sourcePage===42),unitPages:[...new Set(unitPool.map((q:any)=>q.sourcePage))],pdfHasExample:pdfPool.some((q:any)=>q.sourcePage===80),extra:extra.length>0&&extra.every((q:any)=>q.sourcePage===42&&q.sourcePdfId==='source-test'),invalid};
 });
 expect(result).toEqual({noOutside:true,distractors:true,snapshot:true,unitPages:expect.arrayContaining([42,43]),pdfHasExample:true,extra:true,invalid:4});
});

test('unit editor persists, scoped quiz wrong feedback survives refresh and links correct material',async({page})=>{
 await setup(page);
 await page.getByLabel('Cakupan sumber').selectOption('unit'); await page.getByLabel('PDF sumber quiz').selectOption('source-test');
 await page.getByRole('button',{name:'Tambah unit/bab'}).click(); await page.getByLabel('Nama unit/bab').fill('Unit 3'); await page.getByLabel('Halaman awal',{exact:true}).fill('42'); await page.getByLabel('Halaman akhir',{exact:true}).fill('43'); await page.getByRole('button',{name:'Simpan unit',exact:true}).click();
 await expect(page.getByLabel('Unit / Chapter')).toContainText('Unit 3 · Page 42–43');
 await page.reload(); await page.getByLabel('Cakupan sumber').selectOption('unit'); await page.getByLabel('PDF sumber quiz').selectOption('source-test'); await expect(page.getByLabel('Unit / Chapter')).toContainText('Unit 3 · Page 42–43');
 await page.getByRole('button',{name:'Mulai quiz'}).click(); await expect(page).toHaveURL(/attempt=/);
 const a:QuizAttempt=await page.evaluate(async()=>{const url='/src/services/database.ts';return (await ((await import(url)).database as LearningDatabase).quizAttempts.get(new URL(location.href).searchParams.get('attempt')!))!;});
 const q=a.questions[0]; await page.locator(`input[value="${q.options.find(o=>o.id!==q.correctAnswer)!.id}"]`).check(); await page.getByRole('button',{name:'Simpan & berikutnya'}).click();
 await expect(page.getByRole('heading',{name:'❌ Salah'})).toBeVisible(); await page.reload(); await expect(page.getByText('Penjelasan:',{exact:true})).toBeVisible(); await expect(page.locator('.quiz-feedback')).toContainText(`Halaman ${q.sourcePage}`); await expect(page.locator('.quiz-feedback')).toContainText('source-test.pdf');
 await page.getByRole('link',{name:'Review Material',exact:true}).click(); await expect(page).toHaveURL(new RegExp(`/${q.itemType}/${q.contentId}`)); await page.goBack();
 await page.getByRole('link',{name:'Lanjut ke soal berikutnya'}).click(); await expect(page.getByText('Soal 2 / 10',{exact:true})).toBeVisible();
 await page.evaluate(async(id)=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;const a=(await db.quizAttempts.get(id))!;for(let i=1;i<9;i++)await db.quiz.answer(id,i,a.questions[i].correctAnswer,1);},a.id);
 await page.reload(); const last=a.questions[9]; await page.locator(`input[value="${last.options.find(o=>o.id!==last.correctAnswer)!.id}"]`).check(); await page.getByRole('button',{name:'Selesai & lihat hasil'}).click(); await expect(page.getByRole('heading',{name:'❌ Salah'})).toBeVisible(); await page.getByRole('link',{name:'Lihat hasil quiz'}).click();
 await expect(page.locator('.quiz-score')).toHaveText('80%'); await expect(page.locator('.quiz-mistake')).toHaveCount(2); await page.reload(); await expect(page.getByRole('link',{name:'Review Material',exact:true})).toHaveCount(2);
 for(const width of [320,768,1440]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('empty source never falls back; page bounds, unit validation and responsive source setup',async({page})=>{
 await setup(page); await page.getByLabel('Cakupan sumber').selectOption('pdf'); await page.getByLabel('PDF sumber quiz').selectOption('empty-test'); await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeDisabled();
 await page.getByLabel('Cakupan sumber').selectOption('page'); await page.getByLabel('PDF sumber quiz').selectOption('source-test'); await page.getByLabel('Halaman PDF',{exact:true}).fill('42'); await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeEnabled();
 await page.getByLabel('Halaman PDF',{exact:true}).fill('101'); await expect(page.getByText('Nomor halaman sumber tidak valid.',{exact:true})).toBeVisible(); await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeDisabled();
 await page.getByLabel('Cakupan sumber').selectOption('unit'); await page.getByRole('button',{name:'Tambah unit/bab'}).click();await page.getByLabel('Nama unit/bab').fill('Unit 3');await page.getByLabel('Halaman awal',{exact:true}).fill('43');await page.getByLabel('Halaman akhir',{exact:true}).fill('42');await page.getByRole('button',{name:'Simpan unit',exact:true}).click();await expect(page.getByText('Isi nama unit dan rentang halaman PDF yang valid.',{exact:true})).toBeVisible();
 for(const width of [320,390,768,1440]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.screenshot({path:'test-results/source-quiz-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:900});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'test-results/source-quiz-mobile.png',fullPage:true});
});

test('legacy provenance backfill preserves scores and source snapshots survive later content changes',async({page})=>{
 await setup(page);
 const saved=await page.evaluate(async()=>{
  const url='/src/services/database.ts', storage='/src/infrastructure/database/indexeddb.ts';const db=(await import(url)).database as LearningDatabase;const {transact}=await import(storage);
  const unitId=await db.pdf.saveUnit('source-test',{name:'Unit 3',startPage:42,endPage:43});
  const a=await db.quiz.start({mode:'vocabulary',count:10,levels:['N3'],categoryIds:[],types:['jp-to-id','id-to-jp'],source:{kind:'unit',sourcePdfId:'source-test',unitId}});
  for(let i=0;i<a.questions.length;i++) await db.quiz.answer(a.id,i,a.questions[i].options.find(o=>o.id!==a.questions[i].correctAnswer)!.id,1);
  await db.pdf.saveUnit('source-test',{id:unitId,name:'Unit edited',startPage:1,endPage:2});
  const before=(await db.quizResults.get(a.id))!;
  await transact(['quizAttempts','quizResults','meta'],'readwrite',async(tx:any)=>{
   const legacy=(q:any)=>{const {contentId,sourcePdfName,...old}=q;return old;};
   const attempt=await tx.get('quizAttempts',a.id);await tx.put('quizAttempts',{...attempt,questions:attempt.questions.map(legacy)});
   await tx.put('quizResults',{...before,answers:before.answers.map(row=>({...row,questionSnapshot:legacy(row.questionSnapshot)}))});
   await tx.delete('meta','quiz-sources-v1');
  });
  await db.initialize(); const after=(await db.quizResults.get(a.id))!;
  await db.vocabulary.delete(a.questions[0].itemId);
  return {id:a.id,score:after.score,before,after,source:after.config?.sourceLabel};
 });
 expect(saved.after).toEqual(saved.before);
 expect(saved).toMatchObject({score:0,source:'N3 Grammar · Unit 3 · Page 42–43'});
 await page.goto(`/quiz/result?id=${saved.id}`);await expect(page.locator('.quiz-mistake')).toHaveCount(10);await expect(page.getByText('Materi terkait sudah dihapus. Pembahasan dan sumber tersimpan dalam riwayat.').first()).toBeVisible();await expect(page.locator('.quiz-mistake').first()).toContainText('source-test.pdf');
});
