import type { Grammar, Vocabulary } from '../../domain/models';
import type { DuplicateAction, ImportRow, ImportSource, ImportPreview } from '../../domain/transfer/format';
import { identity, normalize, validateRow } from '../../domain/transfer/format';
import { stores, transact, type Transaction } from './indexeddb';
import { validate } from './validation';

async function snapshot(tx:Transaction){return {vocabulary:await tx.list('vocabulary'),grammar:await tx.list('grammar'),examples:await tx.list('examples'),categories:await tx.list('categories'),materials:await tx.list('materials'),revision:await tx.get('meta','content-transfer-revision')};}
function key(item:Vocabulary|Grammar):string{return identity('kanji'in item?{type:'vocabulary',kanji:item.kanji,kana:item.kana,meaning:item.meaning,level:item.jlptLevel}:{type:'grammar',grammar:item.pattern,pattern:item.formation,meaning:item.meaning,level:item.jlptLevel});}
const matches=(row:ImportRow,items:(Vocabulary|Grammar)[])=>{const exact=row.id&&items.find(i=>i.id===row.id);return exact?[exact]:items.filter(i=>key(i)===identity(row));};
export const transferCommands={
 preview:(input:ImportRow[])=>transact(stores,'readonly',async tx=>{
  if(!Array.isArray(input)||!input.length||input.length>5000)throw new Error('Pilih 1–5000 item valid.');const rows=input.map(r=>validateRow(r));const data=await snapshot(tx);
  return {rows,stamp:JSON.stringify(data),matches:rows.map((row,i)=>({ids:matches(row,data[row.type]).map(x=>x.id),earlier:rows.slice(0,i).findIndex(r=>r.type===row.type&&((r.id&&r.id===row.id)||identity(r)===identity(row))) })).map(m=>({...m,earlier:m.earlier===-1?null:m.earlier}))};
 }),
 commit:(preview:ImportPreview,actions:DuplicateAction[],targets:(string|null)[])=>transact(stores,'readwrite',async tx=>{
  if(!preview||!Array.isArray(preview.rows)||!preview.rows.length||preview.rows.length>5000||actions.length!==preview.rows.length||targets.length!==preview.rows.length||actions.some(a=>!['merge','keep-both','ignore'].includes(a)))throw new Error('Pilihan impor tidak valid.');
  if(JSON.stringify(await snapshot(tx))!==preview.stamp)throw new Error('Materi berubah sejak pratinjau. Periksa ulang berkas sebelum impor. Progres tidak berubah.');
  const rows=preview.rows.map(r=>validateRow(r)),stamp=new Date().toISOString();let created=0,merged=0,ignored=0;const batchTargets=new Map<string,string>();
  const defaultSource:ImportSource={sourcePdfId:'import:manual',sourcePage:1,sourceName:'Impor JSON/CSV — bukan sumber PDF'};
  const refs=rows.flatMap(row=>[row.source??defaultSource,...(row.additionalSources??[]),...(row.examples??[]).filter(e=>e.sourcePdfId).map(e=>e as ImportSource)]);
  async function ensureSource(ref:ImportSource){const existing=await tx.get('materials',ref.sourcePdfId);if(existing){if(ref.sourcePage>existing.pageCount){if(!existing.file&&existing.source==='Referensi dari berkas impor; PDF tidak disertakan.')await tx.put('materials',{...existing,pageCount:ref.sourcePage,totalPages:ref.sourcePage,updatedAt:stamp});else throw new Error(`Halaman ${ref.sourcePage} melebihi sumber ${existing.name}.`);}return;}
   const totalPages=Math.max(...refs.filter(r=>r.sourcePdfId===ref.sourcePdfId).map(r=>r.sourcePage));const name=ref.sourceName??refs.find(r=>r.sourcePdfId===ref.sourcePdfId&&r.sourceName)?.sourceName??`Referensi impor ${ref.sourcePdfId}`;
   await tx.add('materials',{id:ref.sourcePdfId,name,title:name,filename:name,file:null,totalPages,pageCount:totalPages,completedPages:0,source:'Referensi dari berkas impor; PDF tidak disertakan.',isDummy:false,status:'REFERENCE_ONLY',checksum:null,createdAt:stamp,updatedAt:stamp});
  }
  for(let index=0;index<rows.length;index++){
   const row=rows[index],candidates=matches(row,await tx.list(row.type)),action=actions[index];
   if(candidates.length&&action==='ignore'){ignored++;continue;}
   let existing:Vocabulary|Grammar|undefined;
   if(candidates.length&&action==='merge'){existing=candidates.find(i=>i.id===targets[index])??(!targets[index]?candidates.find(i=>i.id===batchTargets.get(identity(row))):undefined)??(candidates.length===1?candidates[0]:undefined);if(!existing)throw new Error(`Item ${index+1}: pilih materi tujuan Merge.`);}
   const source=row.source??(existing?{sourcePdfId:existing.sourcePdfId,sourcePage:existing.sourcePage}:defaultSource);await ensureSource(source);
   const categories=[...(existing?.categoryIds??[])];for(const name of row.category??[]){let c=(await tx.list('categories')).find(c=>normalize(c.name)===normalize(name));if(!c){c={id:crypto.randomUUID(),name,description:'Kategori dari impor berkas.',isSeed:false,createdAt:stamp,updatedAt:stamp};await validate('categories',c,tx);await tx.add('categories',c);}if(!categories.includes(c.id))categories.push(c.id);}
   const extra=[...(existing?.additionalSources??[]),...(row.additionalSources??[])];if(existing&&(existing.sourcePdfId!==source.sourcePdfId||existing.sourcePage!==source.sourcePage))extra.push({sourcePdfId:existing.sourcePdfId,sourcePage:existing.sourcePage});
   const additionalSources=[...new Map(extra.filter(s=>s.sourcePdfId!==source.sourcePdfId||s.sourcePage!==source.sourcePage).map(s=>[`${s.sourcePdfId}:${s.sourcePage}`,{sourcePdfId:s.sourcePdfId,sourcePage:s.sourcePage}])).values()];for(const s of additionalSources)await ensureSource(s);
   const common={id:existing?.id??crypto.randomUUID(),createdAt:existing?.createdAt??stamp,updatedAt:stamp,meaning:row.meaning,jlptLevel:row.level,categoryIds:categories,notes:row.notes??existing?.notes??'',difficulty:existing?.difficulty??3,isSeed:existing?.isSeed??false,sourcePdfId:source.sourcePdfId,sourcePage:source.sourcePage,additionalSources,importedFromFile:true,importDuplicate:existing?.importDuplicate??(candidates.length>0&&action==='keep-both')};
   let item:Vocabulary|Grammar;
   if(row.type==='vocabulary'){const old=existing as Vocabulary|undefined;item={...old,...common,kanji:row.kanji!,kana:row.kana!,romaji:row.romaji??old?.romaji??'',partOfSpeech:row.partOfSpeech??old?.partOfSpeech??''};await validate('vocabulary',item,tx);await tx.put('vocabulary',item);}
   else{const old=existing as Grammar|undefined;item={...old,...common,pattern:row.grammar!,formation:row.pattern!,explanation:row.explanation??old?.explanation??'',commonMistakes:row.commonMistakes??old?.commonMistakes??'',comparisonIds:old?.comparisonIds??[]};await validate('grammar',item,tx);await tx.put('grammar',item);}
   for(const e of row.examples??[]){const ref=e.sourcePdfId?e as ImportSource:source;await ensureSource(ref);const found=(await tx.list('examples')).some(x=>x.itemType===row.type&&x.itemId===item.id&&normalize(x.japanese)===normalize(e.example)&&normalize(x.translation)===normalize(e.translation)&&x.sourcePdfId===ref.sourcePdfId&&x.sourcePage===ref.sourcePage);if(!found){const example={id:crypto.randomUUID(),createdAt:stamp,updatedAt:stamp,itemType:row.type,itemId:item.id,japanese:e.example,translation:e.translation,sourcePdfId:ref.sourcePdfId,sourcePage:ref.sourcePage};await validate('examples',example,tx);await tx.add('examples',example);}}
   if(!batchTargets.has(identity(row)))batchTargets.set(identity(row),item.id);
   if(existing)merged++;else created++;
  }
  await tx.put('meta',{id:'content-transfer-revision',value:crypto.randomUUID()});return {created,merged,ignored};
 }),
 export:()=>transact(stores,'readonly',async tx=>{
  const data=await snapshot(tx);const source=(s:ImportSource):ImportSource=>({sourcePdfId:s.sourcePdfId,sourcePage:s.sourcePage,sourceName:data.materials.find(m=>m.id===s.sourcePdfId)?.filename});
  return (['vocabulary','grammar'] as const).flatMap(type=>data[type].map(item=>({type,id:item.id,meaning:item.meaning,level:item.jlptLevel,category:item.categoryIds.map(id=>data.categories.find(c=>c.id===id)?.name).filter((n):n is string=>!!n),notes:item.notes,source:source(item),additionalSources:item.additionalSources.map(source),examples:data.examples.filter(e=>e.itemType===type&&e.itemId===item.id).map(e=>({example:e.japanese,translation:e.translation,...source(e)})),...('kanji'in item?{kanji:item.kanji,kana:item.kana,romaji:item.romaji,partOfSpeech:item.partOfSpeech}:{grammar:item.pattern,pattern:item.formation,explanation:item.explanation,commonMistakes:item.commonMistakes})})));
 }),
};
