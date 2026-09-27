import type { ContentKind, JLPTLevel } from '../models';
export type DuplicateAction = 'merge' | 'keep-both' | 'ignore';
export interface ImportSource { sourcePdfId: string; sourcePage: number; sourceName?: string }
export interface ImportExample extends Partial<ImportSource> { example: string; translation: string }
export interface ImportRow {
 type: ContentKind; id?: string; kanji?: string; kana?: string; grammar?: string; meaning: string; pattern?: string; level: JLPTLevel;
 category?: string[]; examples?: ImportExample[]; source?: ImportSource; additionalSources?: ImportSource[];
 romaji?: string; partOfSpeech?: string; explanation?: string; notes?: string; commonMistakes?: string;
}
export interface ImportPreview { rows:ImportRow[]; matches:{ids:string[]; earlier:number|null}[]; stamp:string }
export const normalize = (s:string) => s.normalize('NFKC').trim().toLocaleLowerCase('id');
export function identity(row:ImportRow) { return row.type+':'+(row.type==='vocabulary' ? [row.kanji!,row.kana!].map(normalize).join('\u0000') : normalize(row.grammar!)); }
const headers=['csvEncoding','type','id','kanji','kana','grammar','meaning','pattern','level','category','example','translation','examples','romaji','partOfSpeech','explanation','notes','commonMistakes','source','additionalSources'];
const optional=['id','romaji','partOfSpeech','explanation','notes','commonMistakes'] as const;
function str(value:unknown,label:string,required=false) { if(typeof value!=='string' || value.length>20_000 || (required&&!value.trim())) throw new Error(`${label}: teks ${required?'wajib diisi dan ':''}maksimal 20.000 karakter.`);return value.trim(); }
function source(value:unknown):ImportSource { const x=value as Record<string,unknown>;if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Referensi sumber tidak valid.');const id=str(x.sourcePdfId,'sourcePdfId',true);const page=Number(x.sourcePage);if(!Number.isSafeInteger(page)||page<1||page>100_000)throw new Error('sourcePage harus 1–100000.');return {sourcePdfId:id,sourcePage:page,...(x.sourceName?{sourceName:str(x.sourceName,'sourceName')}: {})}; }
function jsonCell(value:unknown) { return typeof value==='string'?JSON.parse(value):value; }
export function validateRow(value:unknown, fallback?:ContentKind):ImportRow {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Item harus berupa object.');const x=value as Record<string,unknown>;
 const type=x.type??fallback??(x.kanji?'vocabulary':x.grammar?'grammar':'');if(type!=='vocabulary'&&type!=='grammar')throw new Error('Pilih type vocabulary atau grammar.');
 const level=str(x.level??x.jlptLevel,'level',true).toUpperCase();if(!['N5','N4','N3','N2'].includes(level))throw new Error('level harus N5, N4, N3, atau N2.');
 const row:ImportRow={type,level:level as JLPTLevel,meaning:str(x.meaning,'meaning',true)};
 if(type==='vocabulary'){row.kanji=str(x.kanji,'kanji',true);row.kana=str(x.kana,'kana',true);}else{row.grammar=str(x.grammar,'grammar',true);row.pattern=str(x.pattern,'pattern',true);}
 for(const key of optional)if(x[key]!==undefined&&x[key]!=='')row[key]=str(x[key],key);
 if(x.category!==undefined&&x.category!=='') {const c=typeof x.category==='string'?(x.category.trim().startsWith('[')?jsonCell(x.category):x.category.split(';')):x.category;if(!Array.isArray(c)||c.length>100)throw new Error('category harus teks dipisahkan ; atau array nama.');row.category=[...new Set(c.map(v=>str(v,'category',true)))];}
 if(x.examples!==undefined&&x.examples!=='') {const examples=jsonCell(x.examples);if(!Array.isArray(examples)||examples.length>100)throw new Error('examples harus array maksimal 100 contoh.');row.examples=examples.map(e=>{if(!e||typeof e!=='object')throw new Error('Contoh tidak valid.');return {example:str(e.example,'example',true),translation:str(e.translation??'','translation'),...(e.sourcePdfId?source(e):{})};});}
 else if(x.example!==undefined&&x.example!==''){row.examples=[{example:str(x.example,'example',true),translation:str(x.translation??'','translation')}];}
 else if(x.translation)throw new Error('translation memerlukan example.');
 if(x.source!==undefined&&x.source!=='')row.source=source(jsonCell(x.source));
 if(x.additionalSources!==undefined&&x.additionalSources!==''){const refs=jsonCell(x.additionalSources);if(!Array.isArray(refs)||refs.length>100)throw new Error('additionalSources tidak valid.');row.additionalSources=refs.map(source);}
 return row;
}
// RFC 4180: commas, doubled quotes, multiline fields, CRLF and UTF-8 BOM.
export function readCsv(input:string):Record<string,string>[] {
 const text=input.replace(/^\uFEFF/,'');const records:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){if(field||closed)throw new Error('CSV: tanda kutip tidak valid.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(field);field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v!==''))records.push(row);row=[];}}
  else{if(closed)throw new Error('CSV: karakter setelah tanda kutip.');field+=c;}
 }
 if(quoted)throw new Error('CSV: tanda kutip belum ditutup.');if(field||row.length||closed){row.push(field);if(row.some(v=>v!==''))records.push(row);}
 const names=records.shift()?.map(n=>n.trim());if(!names?.length||names.some(n=>!n)||new Set(names).size!==names.length)throw new Error('CSV: header kosong atau duplikat.');
 return records.map((r,i)=>{if(r.length!==names.length)throw new Error(`CSV baris ${i+2}: jumlah kolom tidak cocok.`);const obj=Object.fromEntries(names.map((n,j)=>[n,r[j]]));if(obj.csvEncoding==='apostrophe-v1')for(const key of Object.keys(obj))if(obj[key].startsWith("'"))obj[key]=obj[key].slice(1);return obj;});
}
export function parseImport(text:string,format:'json'|'csv',fallback?:ContentKind) {
 if(new TextEncoder().encode(text).length>10*1024*1024)throw new Error('Batas berkas 10 MB.');let values:unknown[];
 if(format==='csv')values=readCsv(text);else{const x=JSON.parse(text.replace(/^\uFEFF/,''));if(Array.isArray(x))values=x;else if(x&&typeof x==='object'&&(Array.isArray(x.vocabulary)||Array.isArray(x.grammar))){if(x.version!==undefined&&x.version!==1)throw new Error('Versi format belum didukung.');values=[...(x.vocabulary??[]).map((r:object)=>({...r,type:'vocabulary'})),...(x.grammar??[]).map((r:object)=>({...r,type:'grammar'}))];}else throw new Error('JSON harus array atau object berisi vocabulary/grammar.');}
 if(!values.length||values.length>5000)throw new Error('Impor harus berisi 1–5000 item.');
 return values.map((value,index)=>{try{return {line:index+1,row:validateRow(value,fallback),error:''};}catch(e){return {line:index+1,row:null,error:e instanceof Error?e.message:'Item tidak valid.'};}});
}
export function exportJson(rows:ImportRow[]) { return JSON.stringify({format:'nihongo-content',version:1,vocabulary:rows.filter(r=>r.type==='vocabulary'),grammar:rows.filter(r=>r.type==='grammar')},null,2); }
export function exportCsv(rows:ImportRow[]) {
 const cell=(value:unknown)=>{const s=value===undefined?'':typeof value==='string'?value:JSON.stringify(value);const safe=/^[=+@'\-\t\r]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"';};
 return '\uFEFF'+headers.join(',')+'\r\n'+rows.map(row=>headers.map(h=>cell(h==='csvEncoding'?'apostrophe-v1':h==='example'?row.examples?.[0]?.example:h==='translation'?row.examples?.[0]?.translation:row[h as keyof ImportRow])).join(',')).join('\r\n');
}
