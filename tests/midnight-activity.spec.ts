import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'Asia/Tokyo' });

test('flashcards, grammar, review and quiz retain both days without doubling sessions', async ({ page }) => {
 await page.clock.install({ time: new Date('2026-09-28T23:59:00+09:00') });
 await page.goto('/favicon.svg');
 await page.evaluate(async () => {
  const p='/src/infrastructure/database/indexeddb.ts'; const {transact,stores}=await import(p);
  const stamp=new Date().toISOString();
  await transact(stores,'readwrite',async (tx:any) => {
   for(const id of ['v1','v2']) {
    await tx.put('vocabulary',{id,kanji:'テスト',kana:'てすと',meaning:'tes',jlptLevel:'N3',categoryIds:[]});
    await tx.put('progress',{id:'vocabulary:'+id,itemId:id,itemType:'vocabulary',status:'NEW',masteryScore:null,dimensions:{},reviewCount:0,correctCount:0,wrongCount:0,lastReviewed:null,nextReview:stamp,notes:'',createdAt:stamp,updatedAt:stamp});
   }
   await tx.put('grammar',{id:'g',pattern:'〜から',meaning:'karena',jlptLevel:'N3',categoryIds:[]});
   const questions=['v1','v2'].map((id,i)=>({id:'q'+i,itemId:id,contentId:id,itemType:'vocabulary',type:'jp-to-id',dimension:'meaning',prompt:'テスト',answerFormat:'text',correctAnswer:'tes',options:[],explanation:'tes',jlptLevel:'N3',createdAt:stamp,updatedAt:stamp}));
   await tx.put('quizAttempts',{id:'quiz',config:{mode:'vocabulary',count:10,levels:['N3'],categoryIds:[],types:['jp-to-id']},questions,answers:[],questionSeconds:[0,0],status:'ACTIVE',startedAt:stamp,completedAt:null,createdAt:stamp,updatedAt:stamp});
  });
 });
 // Review queue starts before flashcards alter their own entries.
 const runId=await page.evaluate(async()=>{const p='/src/infrastructure/database/review.ts'; const {reviewCommands}=await import(p);return (await reviewCommands.start({mode:'vocabulary',level:'all'},10)).id;});
 const record = async (index:number) => page.evaluate(async ({index,runId})=>{
  const v='/src/infrastructure/database/vocabulary-learning.ts',g='/src/infrastructure/database/grammar-learning.ts',r='/src/infrastructure/database/review.ts',q='/src/infrastructure/database/quiz.ts';
  await (await import(r)).reviewCommands.answer(runId,index,3,'tes',60);
  await (await import(v)).recordVocabularyReview({itemId:'v1',rating:3,eventId:'v'+index,sessionId:'flash',activeDurationSeconds:60});
  await (await import(g)).recordGrammarReview({itemId:'g',rating:3,dimension:'understanding',response:'karena',eventId:'g'+index,sessionId:'grammar',activeDurationSeconds:60});
  await (await import(q)).quizCommands.answer('quiz',index,'tes',60);
 },{index,runId});
 await record(0);
 await page.clock.setFixedTime(new Date('2026-09-29T00:01:00+09:00'));
 await record(1);
 // Repeated submission must not duplicate time.
 await page.evaluate(async()=>{const p='/src/infrastructure/database/vocabulary-learning.ts';await (await import(p)).recordVocabularyReview({itemId:'v1',rating:3,eventId:'v1',sessionId:'flash',activeDurationSeconds:60});});
 const read = () => page.evaluate(async()=>{
  const p='/src/infrastructure/database/indexeddb.ts',a='/src/domain/analytics/progress.ts';
  const {transact}=await import(p); const sessions=await transact(['sessions'],'readonly',(tx:any)=>tx.list('sessions'));
  return {sessions,study:(await import(a)).calculateProgress({sessions,vocabulary:[],grammar:[],progress:[],quizResults:[]},'2026-09-29').study};
 });
 const result=await read();
 expect(result.sessions).toHaveLength(4);
 for(const s of result.sessions) { expect(s.activeDurationSeconds).toBe(120); expect(s.dailyActivity).toEqual({'2026-09-28':60,'2026-09-29':60}); }
 expect(result.study.total).toBe(4); expect(result.study.seconds).toBe(480);
 expect(result.study.current).toBe(2); expect(result.study.longest).toBe(2);
 expect(result.study.today).toEqual({sessions:4,seconds:240});
 await page.reload(); expect(await read()).toEqual(result);
});

test('legacy sessions recover from events once and keep unknown history on its original date', async ({page})=>{
 await page.goto('/favicon.svg');
 await page.evaluate(async()=>{
  await new Promise<void>((resolve,reject)=>{
   const open=indexedDB.open('nihongo-master',8);
   open.onupgradeneeded=()=>{for(const s of ['sessions','reviewEvents'])open.result.createObjectStore(s,{keyPath:'id'});};
   open.onsuccess=()=>{const db=open.result,tx=db.transaction(['sessions','reviewEvents'],'readwrite');
    const session={id:'old',type:'flashcards',startedAt:'2026-09-28T14:59:00Z',endedAt:'2026-09-28T15:01:00Z',activeDurationSeconds:120,timezone:'Asia/Tokyo',localDate:'2026-09-28',itemIds:['v'],createdAt:'2026-09-28T14:59:00Z',updatedAt:'2026-09-28T15:01:00Z'};
    tx.objectStore('sessions').put(session);tx.objectStore('sessions').put({...session,id:'missing'});
    for(const [id,stamp] of [['a','2026-09-28T14:59:00Z'],['b','2026-09-28T15:01:00Z']])tx.objectStore('reviewEvents').put({id,sessionId:'old',createdAt:stamp,activeDurationSeconds:60});
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
   };
  });
 });
 const read=()=>page.evaluate(async()=>{const p='/src/infrastructure/database/indexeddb.ts';return (await import(p)).transact(['sessions'],'readonly',(tx:any)=>tx.list('sessions'));});
 const result=await read();
 expect(result.find((s:any)=>s.id==='old').dailyActivity).toEqual({'2026-09-28':60,'2026-09-29':60});
 expect(result.find((s:any)=>s.id==='missing').dailyActivity).toEqual({'2026-09-28':120});
 await page.reload();expect(await read()).toEqual(result);
});
