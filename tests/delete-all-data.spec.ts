import { test, expect } from '@playwright/test';

test('delete all requires confirmation, clears every user store atomically, and stays empty after reload', async ({page}) => {
 await page.goto('/settings');
 await expect(page.getByRole('button',{name:'Hapus semua data',exact:true})).toBeEnabled();
 await page.evaluate(async () => {
  const path='/src/infrastructure/database/indexeddb.ts';const {stores,transact}=await import(path);
  await transact(stores,'readwrite',async(tx:any)=>{for(const store of stores)if(store!=='meta')await tx.put(store,{id:'test-only'});});
  localStorage.setItem('nihongo-master:feedback-draft','preserve me');
 });
 const counts=()=>page.evaluate(async()=>{const path='/src/infrastructure/database/indexeddb.ts';const {stores,transact}=await import(path);return transact(stores,'readonly',async(tx:any)=>Object.fromEntries(await Promise.all(stores.map(async(s:string)=>[s,(await tx.list(s)).length]))));});
 const before=await counts();
 await page.getByRole('button',{name:'Hapus semua data',exact:true}).click();
 await expect(page.getByRole('button',{name:'Ya, hapus semua data',exact:true})).toBeDisabled();
 await page.getByLabel('Ketik HAPUS SEMUA untuk melanjutkan').fill('HAPUS');
 await expect(page.getByRole('button',{name:'Ya, hapus semua data',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Batal',exact:true}).click();
 expect(await counts()).toEqual(before);
 const rejected=await page.evaluate(async()=>{const p='/src/services/database.ts';try{await (await import(p)).database.deleteAllLearningData('');return false;}catch{return true;}});expect(rejected).toBe(true);
 expect(await counts()).toEqual(before);
 await page.getByRole('button',{name:'Hapus semua data',exact:true}).click();
 await page.getByLabel('Ketik HAPUS SEMUA untuk melanjutkan').fill('HAPUS SEMUA');
 await page.getByRole('button',{name:'Ya, hapus semua data',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Semua data belajar berhasil dihapus'})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Semua data belajar berhasil dihapus',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Mengerti',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.reload();await expect(page.getByRole('button',{name:'Hapus semua data',exact:true})).toBeEnabled();
 const after=await counts();for(const [name,count] of Object.entries(after))expect(count,name).toBe(name==='meta'?before.meta:0);
 expect(await page.evaluate(()=>localStorage.getItem('nihongo-master:feedback-draft'))).toBe('preserve me');
 // An exception after clearing a table must roll the entire transaction back.
 const rollback=await page.evaluate(async()=>{const p='/src/infrastructure/database/indexeddb.ts';const {transact}=await import(p);await transact(['categories'],'readwrite',(tx:any)=>tx.put('categories',{id:'rollback',name:'Retained'}));try{await transact(['categories'],'readwrite',async(tx:any)=>{await tx.clear('categories');throw new Error('simulated failure');});}catch{}return transact(['categories'],'readonly',(tx:any)=>tx.get('categories','rollback'));});expect(rollback.name).toBe('Retained');
});
