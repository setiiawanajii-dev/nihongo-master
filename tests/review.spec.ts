import {expect,test} from './fixtures';
import type {Page} from '@playwright/test';
import type {LearningDatabase} from '../src/repositories/contracts';
import type {ReviewRun} from '../src/domain/models';
test.setTimeout(100_000);
async function ready(page:Page,route='/review'){await page.goto(route);await expect(page.locator('main h1')).toBeVisible();await expect(page.getByText('Membuka database pembelajaran…',{exact:true})).toBeHidden();}
async function queue(page:Page){await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;await db.learning.queueVocabularyReview('seed-v-N3-01');await db.learning.queueGrammarReview('seed-g-N3-01');});await page.reload();}
async function current(page:Page):Promise<ReviewRun>{return page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;return (await db.reviewRuns.get(new URL(location.href).searchParams.get('session')!))!;});}

test('due selection respects future dates, notes only, weakness and all priority evidence',async({page})=>{
 await ready(page);await expect(page.getByRole('heading',{name:'Tidak ada review yang jatuh tempo'})).toBeVisible();
 const result=await page.evaluate(async()=>{const url='/src/services/database.ts',defaults='/src/services/progress.ts',policy='/src/domain/learning/spaced-repetition.ts',queueUrl='/src/domain/learning/review-queue.ts';const db=(await import(url)).database as LearningDatabase;const {newProgress}=await import(defaults);const {reviewPriority}=await import(policy);const {selectReviewQueue}=await import(queueUrl);const now=Date.now();
 const due=new Date(now-86_400_000).toISOString(),future=new Date(now+86_400_000).toISOString();
 await db.progress.create(newProgress('vocabulary','seed-v-N3-03','Catatan saja'));
 const a=await db.progress.create({...newProgress('vocabulary','seed-v-N3-01'),status:'WEAK',masteryScore:25,reviewCount:4,correctCount:1,wrongCount:3,lastReviewed:due,nextReview:due});
 await db.progress.create({...newProgress('grammar','seed-g-N3-01'),status:'REVIEW',masteryScore:75,reviewCount:4,correctCount:4,wrongCount:0,lastReviewed:due,nextReview:due});
 await db.progress.create({...newProgress('vocabulary','seed-v-N3-02'),status:'WEAK',masteryScore:0,reviewCount:5,correctCount:0,wrongCount:5,lastReviewed:due,nextReview:future});
 const rows=selectReviewQueue(await db.vocabulary.list(),await db.grammar.list(),await db.progress.list(),{mode:'mixed'},now);
 const base=reviewPriority(a,now);return {ids:rows.map((r:{progress:{id:string}})=>r.progress.id),base,variants:[{wrongCount:4},{correctCount:2},{masteryScore:30},{reviewCount:5},{lastReviewed:new Date(now-172800000).toISOString()},{nextReview:new Date(now-172800000).toISOString()}].map(p=>reviewPriority({...a,...p},now))};
 });
 expect(result.ids).toEqual(['vocabulary:seed-v-N3-01','grammar:seed-g-N3-01']);for(const value of result.variants)expect(value).not.toBe(result.base);
 await page.goto('/review?type=mixed');await expect(page.locator('.content-card')).toHaveCount(2);await expect(page.locator('.content-card').first()).toContainText('介護');
});

test('interval ladders and persisted schedules grow; Wrong relearns, manual queue preserves interval',async({page})=>{
 await ready(page);const result=await page.evaluate(async()=>{const url='/src/services/database.ts',policy='/src/domain/learning/spaced-repetition.ts';const db=(await import(url)).database as LearningDatabase;const {nextInterval}=await import(policy);
 const ladder=(grade:number)=>{let schedule: {intervalDays:number;lastRating:number}|undefined;const values:number[]=[];for(let i=0;i<4;i++){const intervalDays:number=nextInterval(schedule,grade);values.push(intervalDays);schedule={intervalDays,lastRating:grade};}return values;};
 const persisted=[];for(let i=0;i<3;i++){await db.learning.queueVocabularyReview('seed-v-N3-01');const run=await db.review.start({mode:'vocabulary'},10);await db.review.answer(run.id,0,3,'Jawaban benar',2);persisted.push((await db.schedules.get('vocabulary:seed-v-N3-01'))!.intervalDays);}
 return {easy:ladder(3),good:ladder(2),hard:ladder(1),wrong:ladder(0),cap:nextInterval({intervalDays:180,lastRating:3},3),persisted,p:await db.progress.get('vocabulary:seed-v-N3-01')};});
 expect(result.easy).toEqual([7,14,30,60]);expect(result.good).toEqual([3,7,14,28]);expect(result.hard).toEqual([1,3,3,3]);expect(result.wrong[0]).toBeCloseTo(10/1440);expect(result.wrong.slice(1)).toEqual([1,1,1]);expect(result.cap).toBe(180);expect(result.persisted).toEqual([7,14,30]);expect(result.p).toMatchObject({reviewCount:3,correctCount:3,wrongCount:0});expect(result.p?.lastReviewed).toBeTruthy();expect(result.p?.nextReview).toBeTruthy();
});

test('mixed session updates every progress field, survives refresh and displays durable completion',async({page})=>{
 await ready(page);await queue(page);await page.goto('/review?type=mixed');await expect(page.locator('.content-card')).toHaveCount(2);await page.getByRole('button',{name:'Mulai review (2)',exact:true}).click();await expect(page).toHaveURL(/session=/);const session=await current(page);
 await expect(page.getByRole('button',{name:/🙂 Good/})).toBeDisabled();await page.getByLabel('Jawaban review').fill('Saya mengingat makna dan penggunaannya.');await page.getByRole('button',{name:'Lihat jawaban',exact:true}).click();await page.getByRole('button',{name:/😐 Hard/}).click();await expect(page.getByText('Materi 2 / 2',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Materi 2 / 2',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Lihat jawaban',exact:true}).click();await expect(page.getByRole('button',{name:/🔥 Easy/})).toBeDisabled();await page.getByRole('button',{name:/😵 Wrong/}).click();await expect(page.getByRole('heading',{name:'Jadwal berikutnya sudah tersimpan.'})).toBeVisible();await expect(page.locator('.review-outcome')).toHaveCount(2);await page.reload();await expect(page.locator('.review-outcome')).toHaveCount(2);
 const saved=await page.evaluate(async(id)=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;return {run:await db.reviewRuns.get(id),p:await db.progress.list(),s:await db.schedules.list(),events:await db.reviewEvents.list(),session:await db.sessions.get(id)};},session.id);
 expect(saved.run?.status).toBe('COMPLETED');expect(saved.p).toHaveLength(2);expect(saved.p.reduce((n,p)=>n+p.correctCount,0)).toBe(1);expect(saved.p.reduce((n,p)=>n+p.wrongCount,0)).toBe(1);for(const p of saved.p){expect(p.reviewCount).toBe(1);expect(p.masteryScore).not.toBeNull();expect(p.lastReviewed).toBeTruthy();expect(p.nextReview).toBeTruthy();expect(saved.s.find(s=>s.id===p.id)?.nextReview).toBe(p.nextReview);}expect(saved.events).toHaveLength(2);expect(saved.session?.endedAt).toBeTruthy();await page.getByRole('link',{name:'Kembali ke antrean review'}).click();await expect(page.locator('.content-card')).toHaveCount(0);
});

test('idempotent ratings, conflicting tabs and skipped/deleted items cannot award duplicate progress',async({page})=>{
 await ready(page);const result=await page.evaluate(async()=>{const url='/src/services/database.ts';const db=(await import(url)).database as LearningDatabase;await db.learning.queueVocabularyReview('seed-v-N3-01');const a=await db.review.start({mode:'vocabulary'},10),b=await db.review.start({mode:'vocabulary'},10);
 await Promise.all([db.review.answer(a.id,0,2,'Jawaban',1),db.review.answer(a.id,0,2,'Jawaban',1)]);const stale=await db.review.answer(b.id,0,3,'Jawaban lain',1);let conflict=false;try{await db.review.answer(a.id,0,0,'',1);}catch{conflict=true;}
 const p=await db.progress.get('vocabulary:seed-v-N3-01');await db.learning.queueGrammarReview('seed-g-N3-01');const c=await db.review.start({mode:'grammar'},10);await db.grammar.delete('seed-g-N3-01');const deleted=await db.review.answer(c.id,0,2,'Jawaban',1);
 await db.learning.queueVocabularyReview('seed-v-N3-02');const d=await db.review.start({mode:'vocabulary'},10);const skipped=await db.review.skip(d.id,0);
 return {p,stale,conflict,deleted,skipped,events:(await db.reviewEvents.list()).length,untouched:await db.progress.get('vocabulary:seed-v-N3-02')};});
 expect(result.p?.reviewCount).toBe(1);expect(result.conflict).toBe(true);expect(result.stale.outcomes[0].rating).toBeNull();expect(result.deleted.outcomes[0].skippedReason).toContain('dihapus');expect(result.skipped.outcomes[0].rating).toBeNull();expect(result.events).toBe(1);expect(result.untouched).toMatchObject({reviewCount:0,masteryScore:null});
});

test('quiz wrong answers schedule once per item and correctly enter the future review queue',async({page})=>{
 await ready(page);const result=await page.evaluate(async()=>{const url='/src/services/database.ts',queueUrl='/src/domain/learning/review-queue.ts';const db=(await import(url)).database as LearningDatabase;const {selectReviewQueue}=await import(queueUrl);const run=await db.quiz.start({mode:'mixed',count:20,levels:['N3'],categoryIds:[],types:['jp-to-id','multiple-choice','grammar-meaning','grammar-choice']});
 for(let i=0;i<run.questions.length;i++){const q=run.questions[i];await db.quiz.answer(run.id,i,i===0?q.options.find(o=>o.id!==q.correctAnswer)!.id:q.correctAnswer,2);}
 const p=await db.progress.list(),s=await db.schedules.list();const wrong=run.questions[0];return {count:s.length,unique:new Set(run.questions.map(q=>q.itemType+q.itemId)).size,wrongSchedule:s.find(s=>s.itemId===wrong.itemId&&s.itemType===wrong.itemType),due:selectReviewQueue(await db.vocabulary.list(),await db.grammar.list(),p,{mode:'mixed'},Date.now()+11*60_000).map((r:{progress:{id:string}})=>r.progress.id),wrongKey:wrong.itemType+':'+wrong.itemId};});
 expect(result.count).toBe(result.unique);expect(result.wrongSchedule?.intervalDays).toBeCloseTo(10/1440);expect(result.due).toEqual([result.wrongKey]);
});

test('legacy quiz evidence gets a schedule without resetting progress; new notes stay unscheduled',async({page})=>{
 await ready(page);const result=await page.evaluate(async()=>{const url='/src/services/database.ts',defaults='/src/services/progress.ts',storage='/src/infrastructure/database/indexeddb.ts';const db=(await import(url)).database as LearningDatabase;const {newProgress}=await import(defaults);const {transact}=await import(storage);const stamp=new Date(Date.now()-172800000).toISOString();await db.progress.create({...newProgress('grammar','seed-g-N3-01'),status:'WEAK',reviewCount:2,correctCount:0,wrongCount:2,masteryScore:0,lastReviewed:stamp});await db.progress.create(newProgress('vocabulary','seed-v-N3-01','Catatan lama'));await transact(['meta'],'readwrite',async(tx:{delete:(s:string,id:string)=>Promise<void>})=>tx.delete('meta','review-schedule-v1'));await db.initialize();const first=await db.progress.get('grammar:seed-g-N3-01');await db.initialize();return {first,second:await db.progress.get('grammar:seed-g-N3-01'),notes:await db.progress.get('vocabulary:seed-v-N3-01'),schedule:await db.schedules.get('grammar:seed-g-N3-01')};});
 expect(result.first).toEqual(result.second);expect(result.first).toMatchObject({reviewCount:2,wrongCount:2,correctCount:0,masteryScore:0});expect(result.first?.nextReview).toBeTruthy();expect(result.schedule?.nextReview).toBe(result.first?.nextReview);expect(result.notes?.nextReview).toBeNull();await page.goto('/review?type=grammar');await expect(page.locator('.content-card')).toHaveCount(1);
});

test('review mobile, dark mode, unknown session and empty queue are usable',async({page})=>{
 await ready(page,'/review?session=missing');await expect(page.getByRole('heading',{name:'Sesi review tidak ditemukan'})).toBeVisible();await page.goto('/review');await expect(page.getByRole('button',{name:'Mulai review (0)'})).toBeDisabled();await queue(page);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/review?type=mixed');await expect(page.locator('.content-card')).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'Mulai review (2)'}).click();await page.setViewportSize({width:320,height:900});await expect(page.locator('.review-word')).toHaveCSS('font-size','28px');await page.getByLabel('Jawaban review').fill('Contoh jawaban');await page.getByRole('button',{name:'Lihat jawaban',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/review-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.documentElement.classList.add('dark'));await expect(page.locator('.desktop-sidebar .nav-item.active')).toHaveCSS('background-color','rgb(42, 65, 51)');await page.screenshot({path:'test-results/review-dark.png',fullPage:true});
});
