import { test, expect } from '@playwright/test';
test.setTimeout(60_000);
test('fresh installations stay empty through refresh', async ({page}) => {
 await page.goto('/dashboard');
 await expect(page.getByText('Membuka database pembelajaran…',{exact:true})).toBeHidden();
 for(let i=0;i<2;i++) {
  const counts=await page.evaluate(async()=>{const u='/src/services/database.ts';const {database:d}=await import(u);return [await d.vocabulary.list(),await d.grammar.list()].map(x=>x.length);});
  expect(counts).toEqual([0,0]);await page.reload();await expect(page.locator('main h1')).toBeVisible();
 }
});
test('atomic demo cleanup preserves personal content, progress and history; never reseeds',async({page})=>{
 await page.goto('/dashboard');await expect(page.getByText('Membuka database pembelajaran…',{exact:true})).toBeHidden();
 const result=await page.evaluate(async()=>{
  const a='/src/data/seed.ts',b='/src/infrastructure/database/indexeddb.ts',c='/src/services/database.ts',e='/src/services/progress.ts';
  const seed=await import(a),{transact,stores}=await import(b),{database:d}=await import(c),{newProgress}=await import(e);
  const personal={...seed.seedVocabulary[0],id:'personal',isSeed:false};
  const imported={...seed.seedGrammar[0],importedFromFile:true};
  const progress={...newProgress('vocabulary','personal'),id:'vocabulary:personal',reviewCount:5,correctCount:4,wrongCount:1,masteryScore:60};
  await transact(stores,'readwrite',async(tx:any)=>{
   for(const [table,rows] of Object.entries({vocabulary:seed.seedVocabulary,grammar:seed.seedGrammar,examples:seed.seedExamples,categories:seed.seedCategories}))for(const row of rows as any[])await tx.put(table,row);
   await tx.put('vocabulary',personal);await tx.put('grammar',imported);
   await tx.put('progress',progress);await tx.put('progress',{...progress,id:'vocabulary:'+seed.seedVocabulary[0].id,itemId:seed.seedVocabulary[0].id});
   await tx.put('quizResults',{id:'saved-history',score:85,answers:[]});
   await tx.delete('meta','demo-removed-v1');
  });
  await Promise.all([d.initialize(),d.initialize()]);
  const read=async()=>({v:await d.vocabulary.list(),g:await d.grammar.list(),p:await d.progress.list(),history:await d.quizResults.list()});
  const after=await read();await d.initialize();return {after,again:await read(),personal,imported,progress};
 });
 expect(result.after.v).toEqual([result.personal]);expect(result.after.g).toEqual([result.imported]);expect(result.after.p).toEqual([result.progress]);
 expect(result.after.history[0].score).toBe(85);expect(result.again).toEqual(result.after);
 await page.reload();await expect(page.getByTestId('daily-learning')).toBeVisible();
});
