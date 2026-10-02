import {expect, test} from './fixtures';

test('quiz chooses the available N5 level and respects an explicit empty level', async({page})=>{
 await page.goto('/quiz');
 await expect(page.getByLabel('Level quiz',{exact:true})).toBeVisible();
 await page.evaluate(async()=>{
  const path='/src/infrastructure/database/indexeddb.ts';
  await (await import(path)).transact(['vocabulary','grammar'],'readwrite',async(tx:any)=>{
   for(const store of ['vocabulary','grammar'])for(const row of await tx.list(store))await tx.put(store,{...row,jlptLevel:'N5'});
  });
 });
 await page.reload();
 await expect(page.getByLabel('Level quiz',{exact:true})).toHaveValue('N5');
 await expect(page.getByRole('button',{name:'Mulai quiz',exact:true})).toBeEnabled();
 await page.getByLabel('Level quiz',{exact:true}).selectOption('N4');
 await expect(page.getByRole('button',{name:'Mulai quiz',exact:true})).toBeDisabled();
 await page.getByLabel('Jumlah soal').selectOption('20');
 await expect(page.getByLabel('Level quiz',{exact:true})).toHaveValue('N4');
});

test('paginated import keeps off-page duplicate actions and saves all pages',async({page})=>{
 await page.goto('/data-transfer');
 const rows=Array.from({length:26},(_,i)=>({type:'vocabulary',kanji:`検証${i}`,kana:`けんしょう${i}`,meaning:`uji ${i}`,level:'N5'}));
 rows.push({...rows[0]});
 await page.getByLabel('Isi impor').fill(JSON.stringify(rows));
 await page.getByRole('button',{name:'Periksa impor'}).click();
 await expect(page.getByLabel('Tindakan item 27')).toHaveCount(0);
 await page.getByRole('button',{name:'Pratinjau berikutnya'}).click();
 await page.getByLabel('Tindakan item 27').selectOption('keep-both');
 await page.getByRole('button',{name:'Pratinjau sebelumnya'}).click();
 await page.getByRole('button',{name:'Pratinjau berikutnya'}).click();
 await expect(page.getByLabel('Tindakan item 27')).toHaveValue('keep-both');
 await page.setViewportSize({width:320,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Simpan impor'}).click();
 await expect(page.getByRole('status')).toContainText('27 baru');
 await page.reload();
 const count=await page.evaluate(async()=>{const path='/src/services/database.ts';return (await (await import(path)).database.vocabulary.list()).filter((v:any)=>v.kanji.startsWith('検証')).length;});
 expect(count).toBe(27);
});

test('cached import remains atomic on a late failure and rejects stale previews',async({page})=>{
 await page.goto('/data-transfer');
 await expect(page.getByRole('button',{name:'Periksa impor'})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const path='/src/services/database.ts';const db=(await import(path)).database;
  const duplicate={type:'vocabulary',kanji:'重複検証',kana:'じゅうふくけんしょう',meaning:'duplicate test',level:'N5'};
  let p=await db.transfer.preview([duplicate,duplicate]);
  await db.transfer.commit(p,['ignore','keep-both'],[null,null]);
  const snapshot=async()=>JSON.stringify(await db.transfer.export());
  const before=await snapshot();
  p=await db.transfer.preview([{...duplicate,kanji:'取消検証',category:['Cancelled category'],examples:[{example:'これはテストです。',translation:'Ini tes.'}]},duplicate]);
  let failed=false;try{await db.transfer.commit(p,['ignore','merge'],[null,null]);}catch{failed=true;}
  const after=await snapshot();
  const categories=await db.categories.list();
  p=await db.transfer.preview([{...duplicate,kanji:'古い検証'}]);
  const v=(await db.vocabulary.list())[0];await db.vocabulary.update(v.id,{notes:'changed after preview'});
  let stale='';try{await db.transfer.commit(p,['ignore'],[null]);}catch(e){stale=String(e);}
  return {failed,before,after,cancelledCategory:categories.some((c:any)=>c.name==='Cancelled category'),stale};
 });
 expect(result.failed).toBe(true);expect(result.after).toBe(result.before);expect(result.cancelledCategory).toBe(false);expect(result.stale).toContain('Materi berubah sejak pratinjau');
});
