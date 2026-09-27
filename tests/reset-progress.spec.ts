import { test, expect, type Page } from '@playwright/test';
test.setTimeout(60_000);
async function prepare(page:Page) {
 await page.goto('/settings');await expect(page.getByRole('button',{name:'Reset progres belajar',exact:true})).toBeEnabled();
 await page.evaluate(async()=>{
  const a='/src/data/seed.ts',b='/src/infrastructure/database/indexeddb.ts',c='/src/services/progress.ts';
  const seed=await import(a),{transact,stores}=await import(b),{newProgress}=await import(c);const stamp=new Date().toISOString();
  await transact(stores,'readwrite',async(tx:any)=>{
   await tx.put('vocabulary',{...seed.seedVocabulary[0],id:'personal-v',isSeed:false,categoryIds:[],sourcePdfId:'pdf'});
   await tx.put('grammar',{...seed.seedGrammar[0],id:'personal-g',isSeed:false,categoryIds:[],sourcePdfId:'pdf'});
   await tx.put('materials',{...seed.seedMaterials[0],id:'pdf',name:'My PDF',isDummy:false,file:'pdf',completedPages:2});
   await tx.put('pdfFiles',{id:'pdf',blob:new Blob(['original PDF'])});
   await tx.put('pdfReading',{id:'pdf',lastPage:3,completedPageNumbers:[1,2],createdAt:stamp,updatedAt:stamp});
   await tx.put('favorites',{id:'pdf-page:pdf:1',target:{type:'pdf-page',materialId:'pdf',pageNumber:1},notes:'Bookmark tetap',createdAt:stamp,updatedAt:stamp});
   await tx.put('progress',{...newProgress('vocabulary','personal-v'),id:'vocabulary:personal-v',notes:'Catatan penting',status:'MASTERED',masteryScore:100,reviewCount:8,correctCount:8,lastReviewed:stamp,createdAt:stamp,updatedAt:stamp});
   await tx.put('progress',{...newProgress('grammar','personal-g'),id:'grammar:personal-g',masteryScore:60,reviewCount:2});
   await tx.put('quizResults',{id:'q',score:85,accuracy:85,answers:[],finishedAt:stamp});
   for(const name of ['schedules','quizAttempts','reviewRuns','sessions','reviewEvents'])await tx.put(name,{id:'old-'+name});
  });
 });
 await page.reload();await expect(page.getByRole('button',{name:'Reset progres belajar',exact:true})).toBeEnabled();
}
async function snapshot(page:Page){return page.evaluate(async()=>{const u='/src/infrastructure/database/indexeddb.ts';const {transact,stores}=await import(u);return transact(stores,'readonly',async(tx:any)=>{const out:any={};for(const s of stores)out[s]=await tx.list(s);out.pdfFiles=await Promise.all(out.pdfFiles.map(async(f:any)=>({id:f.id,text:await f.blob.text()})));return out;});});}
test('reset requires confirmation; cancel and rejected command leave data intact',async({page})=>{
 await prepare(page);const before=await snapshot(page);
 const rejected=await page.evaluate(async()=>{const u='/src/services/database.ts';try{await (await import(u)).database.resetLearningProgress(false);return false;}catch{return true;}});expect(rejected).toBe(true);
 await page.getByRole('button',{name:'Reset progres belajar',exact:true}).click();await expect(page.getByRole('button',{name:'Ya, reset semua progres'})).toBeDisabled();await page.getByRole('button',{name:'Batal',exact:true}).click();expect(await snapshot(page)).toEqual(before);
});
test('confirmed reset clears tracking, preserves content and notes, survives refresh and supports learning again',async({page})=>{
 await prepare(page);const before=await snapshot(page);
 await page.getByRole('button',{name:'Reset progres belajar',exact:true}).click();await page.getByLabel('Ketik RESET untuk melanjutkan').fill('RESET');await page.getByRole('button',{name:'Ya, reset semua progres'}).click();await expect(page.getByRole('status').filter({hasText:'Progres berhasil direset'})).toBeVisible();
 await page.reload();const after=await snapshot(page);
 for(const table of ['vocabulary','grammar','examples','categories','pages','pdfFiles','favorites','extractionRuns','extractionDrafts','meta'])expect(after[table],table).toEqual(before[table]);
 for(const table of ['schedules','quizResults','quizAttempts','reviewRuns','sessions','reviewEvents','pdfReading'])expect(after[table],table).toEqual([]);
 expect(after.materials[0].completedPages).toBe(0);expect(after.materials[0].file).toBe('pdf');
 expect(after.progress).toHaveLength(1);expect(after.progress[0]).toMatchObject({notes:'Catatan penting',status:'NEW',masteryScore:null,reviewCount:0,correctCount:0,wrongCount:0,lastReviewed:null,nextReview:null,dimensions:{}});
 const next=await page.evaluate(async()=>{const u='/src/services/database.ts';return (await import(u)).database.learning.recordVocabularyReview({itemId:'personal-v',rating:2,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:5});});expect(next.reviewCount).toBe(1);expect(next.notes).toBe('Catatan penting');
});
