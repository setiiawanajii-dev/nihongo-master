import {expect,test} from '@playwright/test';
import {parseImport,exportCsv,exportJson,validateRow} from '../src/domain/transfer/format';
import type {LearningDatabase} from '../src/repositories/contracts';
test.setTimeout(120_000);
const sample={type:'vocabulary',kanji:'輸入テスト',kana:'ゆにゅうてすと',meaning:'uji, impor\nbaris "dua"',level:'N3',category:['仕事','日常'],examples:[{example:'テストです。',translation:'Ini tes.'},{example:'次のテスト。',translation:''}]};
test('JSON and CSV preserve Unicode, quotes, lines, categories, examples and formula-like text',()=>{
 const row=validateRow({...sample,notes:'=1+1'});for(const format of ['json','csv'] as const){const encoded=format==='json'?exportJson([row]):exportCsv([row]);const parsed=parseImport(encoded,format);expect(parsed[0].error).toBe('');expect(parsed[0].row).toEqual(row);}
 expect(exportCsv([row])).toContain("'=1+1");expect(parseImport('kanji,kana,meaning,level\r\n木,き,pohon,N5','csv','vocabulary')[0].row?.kanji).toBe('木');
 for(const csv of ['kanji,kanji\na,b','kanji,kana\na,b,c','kanji,kana\n"a,b'])expect(()=>parseImport(csv,'csv')).toThrow();
 expect(parseImport(JSON.stringify([{...sample,kana:''},{grammar:'〜ながら',meaning:'sambil',pattern:'V + ながら',level:'N8'}]),'json').every(r=>!!r.error)).toBe(true);
});

test('merge retains IDs, progress, favorites, schedules and sessions; keep both and ignore work including within-file duplicates',async({page})=>{
 await page.goto('/data-transfer');await expect(page.getByRole('button',{name:'Periksa impor'})).toBeVisible();
 const result=await page.evaluate(async()=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;const v=(await db.vocabulary.list())[0];await db.learning.recordVocabularyReview({itemId:v.id,rating:2,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:5});await db.favorites.create({target:{type:'vocabulary',itemId:v.id},notes:'favorit'});
 const saved=async()=>({p:await db.progress.list(),f:await db.favorites.list(),s:await db.schedules.list(),sessions:await db.sessions.list(),q:await db.quizResults.list()});const before=await saved();
 const row={type:'vocabulary' as const,kanji:v.kanji,kana:v.kana,meaning:'Arti diperbarui dari berkas',level:v.jlptLevel,category:['Kategori impor']};let preview=await db.transfer.preview([row]);const match=preview.matches[0].ids;const merged=await db.transfer.commit(preview,['merge'],[v.id]);
 const afterMerge=await db.vocabulary.get(v.id);preview=await db.transfer.preview([row]);const kept=await db.transfer.commit(preview,['keep-both'],[null]);preview=await db.transfer.preview([row]);const ignored=await db.transfer.commit(preview,['ignore'],[null]);
 await db.vocabulary.update(v.id,{notes:'Tetap bisa diedit setelah Keep Both'});
 const newRow={...row,kanji:'同一ファイル',kana:'どういつふぁいる'};preview=await db.transfer.preview([newRow,newRow]);const within=preview.matches[1].earlier;const repeated=await db.transfer.commit(preview,['ignore','merge'],[null,null]);
 return {before,after:await saved(),match,merged,kept,ignored,repeated,within,id:v.id,afterMerge,copies:(await db.vocabulary.list()).filter(i=>i.kanji===v.kanji&&i.kana===v.kana).length};});
 expect(result.after).toEqual(result.before);expect(result.match).toContain(result.id);expect(result.afterMerge?.id).toBe(result.id);expect(result.afterMerge?.meaning).toBe('Arti diperbarui dari berkas');expect(result.merged.merged).toBe(1);expect(result.kept.created).toBe(1);expect(result.ignored.ignored).toBe(1);expect(result.copies).toBe(2);expect(result.within).toBe(0);expect(result.repeated).toEqual({created:1,merged:1,ignored:0});
 await page.reload();const count=await page.evaluate(async()=>{const u='/src/services/database.ts';return (await ((await import(u)).database as LearningDatabase).progress.list()).length;});expect(count).toBe(1);
});

test('stale preview and invalid source roll back entire import; optional fields are not fabricated',async({page})=>{
 await page.goto('/data-transfer');await expect(page.getByRole('button',{name:'Periksa impor'})).toBeVisible();const result=await page.evaluate(async()=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;
 const row={type:'grammar' as const,grammar:'テスト文型',pattern:'V + テスト',meaning:'uji',level:'N3' as const};let p=await db.transfer.preview([row]);const v=(await db.vocabulary.list())[0];await db.vocabulary.update(v.id,{notes:'perubahan dari tab lain'});let stale=false;try{await db.transfer.commit(p,['ignore'],[null]);}catch{stale=true;}
 const material=(await db.materials.list())[0];const before=(await db.grammar.list()).length;p=await db.transfer.preview([row,{...row,grammar:'無効',source:{sourcePdfId:material.id,sourcePage:material.pageCount+1}}]);let invalid=false;try{await db.transfer.commit(p,['ignore','ignore'],[null,null]);}catch{invalid=true;}const after=(await db.grammar.list()).length;
 p=await db.transfer.preview([row]);await db.transfer.commit(p,['ignore'],[null]);const imported=(await db.grammar.list()).find(g=>g.pattern===row.grammar)!;return {stale,invalid,before,after,explanation:imported.explanation,source:(await db.materials.get(imported.sourcePdfId))?.filename};});
 expect(result.stale).toBe(true);expect(result.invalid).toBe(true);expect(result.after).toBe(result.before);expect(result.explanation).toBe('');expect(result.source).toContain('bukan sumber PDF');
});

test('exported JSON/CSV round-trip into a fresh bank with all examples and sources; reimport merges without duplicates',async({page,context})=>{
 await page.goto('/data-transfer');await expect(page.getByRole('button',{name:'Periksa impor'})).toBeVisible();const portable=await page.evaluate(async()=>{const u='/src/services/database.ts',f='/src/domain/transfer/format.ts';const db=(await import(u)).database as LearningDatabase;const rows=await db.transfer.export();const format=await import(f);return {json:format.exportJson(rows),csv:format.exportCsv(rows),count:rows.length,examples:rows.reduce((n,r)=>n+(r.examples?.length??0),0)};});
 const isolated=await context.browser()!.newContext();const fresh=await isolated.newPage();await fresh.goto('/data-transfer');await expect(fresh.getByRole('button',{name:'Periksa impor'})).toBeVisible();
 const result=await fresh.evaluate(async(payload)=>{const u='/src/services/database.ts',f='/src/domain/transfer/format.ts';const db=(await import(u)).database as LearningDatabase;for(const v of await db.vocabulary.list())await db.vocabulary.delete(v.id);for(const g of await db.grammar.list())await db.grammar.delete(g.id);
 const format=await import(f);const rows=format.parseImport(payload.json,'json').map((r:any)=>r.row);let p=await db.transfer.preview(rows);const first=await db.transfer.commit(p,rows.map(()=> 'ignore'),rows.map(()=>null));const csvRows=format.parseImport(payload.csv,'csv').map((r:any)=>r.row);p=await db.transfer.preview(csvRows);const second=await db.transfer.commit(p,csvRows.map(()=> 'merge'),p.matches.map(m=>m.ids[0]??null));return {first,second,count:(await db.transfer.export()).length,examples:(await db.examples.list()).length,progress:(await db.progress.list()).length};},portable);
 expect(result.first.created).toBe(portable.count);expect(result.second.merged).toBe(portable.count);expect(result.count).toBe(portable.count);expect(result.examples).toBe(portable.examples);expect(result.progress).toBe(0);await isolated.close();
});

test('UI file validation, preview actions, CSV import, exports and responsive layout',async({page})=>{
 await page.goto('/data-transfer');await expect(page.getByRole('button',{name:'Periksa impor'})).toBeVisible();
 await page.getByLabel('Berkas impor').setInputFiles({name:'vocabulary.csv',mimeType:'text/csv',buffer:Buffer.from('kanji,kana,meaning,level,category,example,translation\n輸入語,ゆにゅうご,impor,N3,仕事,輸入語です。,Ini kata impor.')});await page.getByRole('button',{name:'Periksa impor'}).click();await expect(page.getByRole('heading',{name:'Pratinjau impor'})).toBeVisible();await page.getByRole('button',{name:'Simpan impor'}).click();await expect(page.getByRole('status')).toContainText('1 baru');
 await page.getByRole('button',{name:'Periksa impor'}).click();await expect(page.getByLabel('Tindakan item 1')).toHaveValue('ignore');await page.setViewportSize({width:390,height:950});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.locator('h1').click();await page.screenshot({path:'test-results/transfer-preview-mobile.png',fullPage:true});await page.evaluate(()=>document.documentElement.classList.remove('dark'));await page.getByLabel('Tindakan item 1').selectOption('keep-both');await page.getByRole('button',{name:'Simpan impor'}).click();await expect(page.getByRole('status')).toContainText('1 baru');
 for(const name of ['Export JSON','Export CSV']){const download=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();expect((await download).suggestedFilename()).toContain('nihongo-content-');}
 await page.getByLabel('Isi impor').fill('kanji,kana,meaning,level\n壊れた,,arti,N3');await page.getByRole('button',{name:'Periksa impor'}).click();await expect(page.getByRole('alert')).toContainText('kana');await expect(page.getByRole('button',{name:'Simpan impor'})).toHaveCount(0);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.screenshot({path:'test-results/transfer-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:950});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'test-results/transfer-mobile.png',fullPage:true});
});

test('batch duplicates merge deterministically and live progress changes survive the preview window',async({page})=>{
 await page.goto('/data-transfer');await expect(page.getByRole('button',{name:'Periksa impor'})).toBeVisible();const result=await page.evaluate(async()=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;
 const v=(await db.vocabulary.list())[0];const imported={type:'vocabulary' as const,kanji:'追加試験',kana:'ついかしけん',meaning:'pertama',level:'N3' as const,additionalSources:[{sourcePdfId:'portable-reference',sourcePage:2,sourceName:'Sumber tambahan.pdf'}]};
 let preview=await db.transfer.preview([imported,imported,{...imported,meaning:'digabung ke pertama'}]);await db.learning.recordVocabularyReview({itemId:v.id,rating:1,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:7});const progress=await db.progress.list();const summary=await db.transfer.commit(preview,['ignore','keep-both','merge'],[null,null,null]);
 const items=(await db.vocabulary.list()).filter(i=>i.kanji===imported.kanji);const named=(await db.materials.get('portable-reference'))?.filename;
 preview=await db.transfer.preview([{...imported,kanji:'別の語',source:{sourcePdfId:'portable-reference',sourcePage:10}}]);await db.transfer.commit(preview,['ignore'],[null]);return {summary,items:items.map(i=>i.meaning).sort(),progress,after:await db.progress.list(),named,pages:(await db.materials.get('portable-reference'))?.pageCount};});
 expect(result.summary).toEqual({created:2,merged:1,ignored:0});expect(result.items).toEqual(['digabung ke pertama','pertama']);expect(result.after).toEqual(result.progress);expect(result.named).toBe('Sumber tambahan.pdf');expect(result.pages).toBe(10);
});
