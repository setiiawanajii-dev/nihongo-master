import type { Grammar, Vocabulary } from '../../domain/models';
import type { DuplicateAction, ImportRow, ImportPreview } from '../../domain/transfer/format';
import { identity, normalize, validateRow } from '../../domain/transfer/format';
import { stores, transact, type Transaction } from './indexeddb';
import { validate } from './validation';

async function snapshot(tx:Transaction){return {vocabulary:await tx.list('vocabulary'),grammar:await tx.list('grammar'),examples:await tx.list('examples'),categories:await tx.list('categories'),revision:await tx.get('meta','content-transfer-revision')};}
function key(item:Vocabulary|Grammar):string{return identity('kanji'in item?{type:'vocabulary',kanji:item.kanji,kana:item.kana,meaning:item.meaning,level:item.jlptLevel}:{type:'grammar',grammar:item.pattern,pattern:item.formation,meaning:item.meaning,level:item.jlptLevel});}
function contentIndex(items:(Vocabulary|Grammar)[]) {
 const ids = new Map<string,Vocabulary|Grammar>(), keys = new Map<string,Map<string,Vocabulary|Grammar>>();
 const put = (item:Vocabulary|Grammar) => {
  const id = `${'kanji' in item ? 'vocabulary' : 'grammar'}:${item.id}`, old=ids.get(id);
  if(old) keys.get(key(old))?.delete(old.id);
  ids.set(id,item);const k=key(item);if(!keys.has(k))keys.set(k,new Map());keys.get(k)!.set(item.id,item);
 };
 items.forEach(put);
 return {put, matches:(row:ImportRow)=>{const exact=row.id ? ids.get(`${row.type}:${row.id}`) : undefined;return exact?[exact]:[...(keys.get(identity(row))?.values()??[])];}};
}
const exampleKey=(type:string,id:string,japanese:string,translation:string)=>JSON.stringify([type,id,normalize(japanese),normalize(translation)]);
export const transferCommands={
 preview:(input:ImportRow[])=>transact(stores,'readonly',async tx=>{
  if(!Array.isArray(input)||!input.length||input.length>5000)throw new Error('Pilih 1–5000 item valid.');const rows=input.map(r=>validateRow(r));const data=await snapshot(tx);
  const index=contentIndex([...data.vocabulary,...data.grammar]), earlierKeys=new Map<string,number>(), earlierIds=new Map<string,number>();
  const matches=rows.map((row,i)=>{const k=identity(row), id=row.id?`${row.type}:${row.id}`:null;
   const positions=[earlierKeys.get(k),id?earlierIds.get(id):undefined].filter((n):n is number=>n!==undefined);
   const earlier=positions.length?Math.min(...positions):null;
   if(!earlierKeys.has(k))earlierKeys.set(k,i);if(id&&!earlierIds.has(id))earlierIds.set(id,i);
   return {ids:index.matches(row).map(item=>item.id),earlier};
  });
  return {rows,stamp:JSON.stringify(data),matches};
 }),
 commit:(preview:ImportPreview,actions:DuplicateAction[],targets:(string|null)[])=>transact(stores,'readwrite',async tx=>{
  if(!preview||!Array.isArray(preview.rows)||!preview.rows.length||preview.rows.length>5000||actions.length!==preview.rows.length||targets.length!==preview.rows.length||actions.some(a=>!['merge','keep-both','ignore'].includes(a)))throw new Error('Pilihan impor tidak valid.');
  await tx.cacheStores(['vocabulary','grammar','categories','examples']);
  const data=await snapshot(tx);
  if(JSON.stringify(data)!==preview.stamp)throw new Error('Materi berubah sejak pratinjau. Periksa ulang berkas sebelum impor. Progres tidak berubah.');
  const rows=preview.rows.map(r=>validateRow(r)),stamp=new Date().toISOString();let created=0,merged=0,ignored=0;const batchTargets=new Map<string,string>();
  const indexByContent=contentIndex([...data.vocabulary,...data.grammar]);
  const categoryNames=new Map(data.categories.map(c=>[normalize(c.name),c]));
  const exampleKeys=new Set(data.examples.map(e=>exampleKey(e.itemType,e.itemId,e.japanese,e.translation)));
  for(let index=0;index<rows.length;index++){
   const row=rows[index],candidates=indexByContent.matches(row),action=actions[index];
   if(candidates.length&&action==='ignore'){ignored++;continue;}
   let existing:Vocabulary|Grammar|undefined;
   if(candidates.length&&action==='merge'){existing=candidates.find(i=>i.id===targets[index])??(!targets[index]?candidates.find(i=>i.id===batchTargets.get(identity(row))):undefined)??(candidates.length===1?candidates[0]:undefined);if(!existing)throw new Error(`Item ${index+1}: pilih materi tujuan Merge.`);}
   const categories=[...(existing?.categoryIds??[])];for(const name of row.category??[]){let c=categoryNames.get(normalize(name));if(!c){c={id:crypto.randomUUID(),name,description:'Kategori dari impor berkas.',isSeed:false,createdAt:stamp,updatedAt:stamp};await validate('categories',c,tx);await tx.add('categories',c);categoryNames.set(normalize(name),c);}if(!categories.includes(c.id))categories.push(c.id);}
   const common={id:existing?.id??crypto.randomUUID(),createdAt:existing?.createdAt??stamp,updatedAt:stamp,meaning:row.meaning,jlptLevel:row.level,categoryIds:categories,notes:row.notes??existing?.notes??'',difficulty:existing?.difficulty??3,isSeed:existing?.isSeed??false,importedFromFile:true,importDuplicate:existing?.importDuplicate??(candidates.length>0&&action==='keep-both')};
   let item:Vocabulary|Grammar;
   if(row.type==='vocabulary'){const old=existing as Vocabulary|undefined;item={...old,...common,kanji:row.kanji!,kana:row.kana!,romaji:row.romaji??old?.romaji??'',partOfSpeech:row.partOfSpeech??old?.partOfSpeech??''};await validate('vocabulary',item,tx);await tx.put('vocabulary',item);}
   else{const old=existing as Grammar|undefined;item={...old,...common,pattern:row.grammar!,formation:row.pattern!,explanation:row.explanation??old?.explanation??'',commonMistakes:row.commonMistakes??old?.commonMistakes??'',comparisonIds:old?.comparisonIds??[],quizTemplate:row.quizTemplate === undefined ? old?.quizTemplate : row.quizTemplate};await validate('grammar',item,tx);await tx.put('grammar',item);}
   indexByContent.put(item);
   for(const e of row.examples??[]){const ek=exampleKey(row.type,item.id,e.example,e.translation);const found=exampleKeys.has(ek);if(!found){const example={id:crypto.randomUUID(),createdAt:stamp,updatedAt:stamp,itemType:row.type,itemId:item.id,japanese:e.example,translation:e.translation};await validate('examples',example,tx);await tx.add('examples',example);exampleKeys.add(ek);}}
   if(!batchTargets.has(identity(row)))batchTargets.set(identity(row),item.id);
   if(existing)merged++;else created++;
  }
  await tx.put('meta',{id:'content-transfer-revision',value:crypto.randomUUID()});return {created,merged,ignored};
 }),
 export:()=>transact(stores,'readonly',async tx=>{
  const data=await snapshot(tx);
  return (['vocabulary','grammar'] as const).flatMap(type=>data[type].map(item=>({type,id:item.id,meaning:item.meaning,level:item.jlptLevel,category:item.categoryIds.map(id=>data.categories.find(c=>c.id===id)?.name).filter((n):n is string=>!!n),notes:item.notes,examples:data.examples.filter(e=>e.itemType===type&&e.itemId===item.id).map(e=>({example:e.japanese,translation:e.translation})),...('kanji'in item?{kanji:item.kanji,kana:item.kana,romaji:item.romaji,partOfSpeech:item.partOfSpeech}:{grammar:item.pattern,pattern:item.formation,explanation:item.explanation,commonMistakes:item.commonMistakes,quizTemplate:item.quizTemplate})})));
 }),
};
