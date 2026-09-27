import type { ExtractionDraft, DraftEdit, ExtractionRun, PDFPage, Vocabulary, Grammar, ExampleSentence } from '../../domain/models';
import { hasEvidence, missingFields } from '../../domain/extraction/identify';
import { transact, type Transaction } from './indexeddb';
import { validate } from './validation';
async function getDraft(tx: Transaction, id: string, revision: number) {
  const d=await tx.get('extractionDrafts',id);
  if(!d || d.status!=='PENDING') throw new Error('Draf sudah diproses atau dihapus. Muat ulang daftar.');
  if(d.revision!==revision) throw new Error('Draf berubah di tab lain. Muat ulang sebelum melanjutkan.');
  return d;
}
async function verifyEvidence(tx: Transaction,d: ExtractionDraft) {
  const m=await tx.get('materials',d.sourcePdfId),p=await tx.get('pages',`${d.sourcePdfId}:page:${d.sourcePage}`);
  if(!m?.file || !p || p.extractionStatus!=='TEXT') throw new Error('Teks sumber tidak tersedia. Ekstraksi atau OCR diperlukan.');
  for(const [key,value] of Object.entries(d.fields)) if(typeof value!=='string' || value.length>20000 || !hasEvidence(p.text,value)) throw new Error(`Isi ${key} harus berasal dari teks halaman sumber. Jangan menambahkan informasi yang tidak ada di PDF.`);
}
export const extractionCommands = {
  runs:()=>transact(['extractionRuns'],'readonly',tx=>tx.list('extractionRuns')),
  drafts:()=>transact(['extractionDrafts'],'readonly',tx=>tx.list('extractionDrafts')),
  begin:(materialId:string,provider:string)=>transact(['materials','extractionRuns','pages'],'readwrite',async tx=>{
    const m=await tx.get('materials',materialId);if(!m?.file)throw new Error('Unggah PDF asli terlebih dahulu.');
    const old=await tx.get('extractionRuns',materialId),stamp=new Date().toISOString();
    const run:ExtractionRun={id:materialId,materialId,provider,token:crypto.randomUUID(),totalPages:m.totalPages,processedPages:old?.processedPages??0,textPages:old?.textPages??0,ocrPages:old?.ocrPages??0,errorPages:old?.errorPages??0,status:'RUNNING',error:'',createdAt:old?.createdAt??stamp,updatedAt:stamp};await tx.put('extractionRuns',run);return run;
  }),
  savePage:(runId:string,token:string,page:PDFPage,drafts:ExtractionDraft[])=>transact(['extractionRuns','extractionDrafts','pages','materials'],'readwrite',async tx=>{
    const run=await tx.get('extractionRuns',runId),m=await tx.get('materials',runId);
    if(!run || run.token!==token || !m?.file)throw new Error('Proses sudah diganti atau PDF dihapus.');
    if(page.materialId!==runId || page.pageNumber<1 || page.pageNumber>m.totalPages || page.id!==`${runId}:page:${page.pageNumber}`)throw new Error('Halaman ekstraksi tidak valid.');
    await tx.put('pages',page);
    for(const d of drafts){if(d.sourcePdfId!==runId || d.sourcePage!==page.pageNumber || !hasEvidence(page.text,d.sourceText) || d.status!=='PENDING' || Object.values(d.fields).some(v=>!hasEvidence(page.text,v)))throw new Error('Draf tidak cocok dengan sumber.');if(!await tx.get('extractionDrafts',d.id))await tx.add('extractionDrafts',d);}
    const pages=(await tx.list('pages')).filter(p=>p.materialId===runId && p.extractionStatus);
    await tx.put('extractionRuns',{...run,processedPages:pages.length,textPages:pages.filter(p=>p.extractionStatus==='TEXT').length,ocrPages:pages.filter(p=>p.extractionStatus==='OCR_REQUIRED').length,errorPages:pages.filter(p=>p.extractionStatus==='ERROR').length,updatedAt:new Date().toISOString()});
  }),
  finish:(runId:string,token:string,status?:'ERROR'|'CANCELLED',error='')=>transact(['extractionRuns'],'readwrite',async tx=>{const run=await tx.get('extractionRuns',runId);if(!run||run.token!==token)return;await tx.put('extractionRuns',{...run,status:status??(run.errorPages?'PARTIAL':!run.textPages?'OCR_REQUIRED':run.ocrPages?'PARTIAL':'COMPLETED'),error,updatedAt:new Date().toISOString()});}),
  edit:(id:string,revision:number,changes:DraftEdit)=>transact(['extractionDrafts','pages','materials'],'readwrite',async tx=>{
    const d=await getDraft(tx,id,revision);
    if(!['vocabulary','grammar','example'].includes(changes.kind) || (changes.jlptLevel!==null && !['N5','N4','N3','N2'].includes(changes.jlptLevel)) || !['vocabulary','grammar'].includes(changes.targetType))throw new Error('Jenis materi atau level tidak valid.');
    if(Object.keys(d.fields).some(k=>typeof changes.fields[k as keyof typeof d.fields]!=='string'))throw new Error('Isian draf tidak lengkap.');
    const updated={...d,kind:changes.kind,fields:changes.fields,jlptLevel:changes.jlptLevel,targetId:changes.targetId,targetType:changes.targetType,revision:d.revision+1,updatedAt:new Date().toISOString()};await verifyEvidence(tx,updated);updated.reasons=['Identifikasi berbasis tata letak/label; periksa konteks dan arti pada PDF.',...(missingFields(updated).length?[`Belum lengkap: ${missingFields(updated).join(', ')}.`]:[])];await tx.put('extractionDrafts',updated);return updated;
  }),
  delete:(id:string,revision:number)=>transact(['extractionDrafts'],'readwrite',async tx=>{const d=await getDraft(tx,id,revision);await tx.put('extractionDrafts',{...d,status:'DELETED',revision:d.revision+1,updatedAt:new Date().toISOString()});}),
  approve:(id:string,revision:number,confirmed:boolean)=>transact(['extractionDrafts','pages','materials','vocabulary','grammar','categories','examples'],'readwrite',async tx=>{
    const existing=await tx.get('extractionDrafts',id);if(existing?.status==='APPROVED' && existing.approvedItemId)return existing.approvedItemId;
    const d=await getDraft(tx,id,revision);if(!confirmed)throw new Error('Periksa kecocokan dengan PDF dan konfirmasi terlebih dahulu.');await verifyEvidence(tx,d);
    const missing=missingFields(d);if(missing.length)throw new Error(`Belum dapat disetujui. Lengkapi dari PDF: ${missing.join(', ')}.`);
    if(d.kind!=='example' && !d.jlptLevel)throw new Error('Pilih level belajar secara manual sebelum menyetujui.');
    const stamp=new Date().toISOString(),itemId=crypto.randomUUID();const source={sourcePdfId:d.sourcePdfId,sourcePage:d.sourcePage};
    if(d.kind==='example'){
      if(!d.targetId || !await tx.get(d.targetType,d.targetId))throw new Error('Pilih vocabulary atau grammar tujuan untuk kalimat contoh.');
    } else {
      const common={id:itemId,createdAt:stamp,updatedAt:stamp,...source,meaning:d.fields.meaning,jlptLevel:d.jlptLevel!,categoryIds:[],notes:'',difficulty:3 as const,isSeed:false,additionalSources:[],extractionDraftId:d.id};
      if(d.kind==='vocabulary'){const item:Vocabulary={...common,kanji:d.fields.kanji,kana:d.fields.kana,romaji:d.fields.romaji,partOfSpeech:d.fields.partOfSpeech};await validate('vocabulary',item,tx);await tx.add('vocabulary',item);}
      else {const item:Grammar={...common,pattern:d.fields.pattern,formation:d.fields.formation,explanation:d.fields.explanation,commonMistakes:'',comparisonIds:[]};await validate('grammar',item,tx);await tx.add('grammar',item);}
    }
    if(d.fields.example){const e:ExampleSentence={id:d.kind==='example'?itemId:crypto.randomUUID(),...source,createdAt:stamp,updatedAt:stamp,itemId:d.kind==='example'?d.targetId:itemId,itemType:d.kind==='example'?d.targetType:d.kind,japanese:d.fields.example,translation:d.fields.translation};
      const duplicate=(await tx.list('examples')).some(row=>row.itemId===e.itemId && row.itemType===e.itemType && row.japanese===e.japanese && row.sourcePdfId===e.sourcePdfId && row.sourcePage===e.sourcePage);if(duplicate)throw new Error('Kalimat contoh ini sudah tersimpan pada materi tujuan.');await validate('examples',e,tx);await tx.add('examples',e);
    }
    await tx.put('extractionDrafts',{...d,status:'APPROVED',approvedItemId:itemId,revision:d.revision+1,updatedAt:stamp});return itemId;
  }),
};
