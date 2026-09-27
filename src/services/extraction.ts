import { database } from './database';
import { identifyPage } from '../domain/extraction/identify';
import type { TextExtractionProvider } from '../domain/extraction/provider';
import type { PDFPage } from '../domain/models';
import type { LearningDatabase } from '../repositories/contracts';
export async function extractMaterial(materialId:string,options:{signal?:AbortSignal;onProgress?:()=>Promise<void>;provider?:TextExtractionProvider;db?:LearningDatabase}={}) {
 const db=options.db??database;
 const work=async()=>{
  const m=await db.materials.get(materialId);if(!m?.file)throw new Error('PDF tidak tersedia.');
  const blob=await db.pdf.getFile(m.file);if(!blob)throw new Error('Berkas PDF tidak ditemukan.');
  const provider=options.provider??(await import('../infrastructure/pdf/text-extraction')).pdfTextProvider;
  const run=await db.extraction.begin(materialId,provider.id);await options.onProgress?.();
  let doc:Awaited<ReturnType<TextExtractionProvider['open']>>|undefined;
  try {
   doc=await provider.open(blob);
   const cached=new Map((await db.pages.list()).filter(p=>p.materialId===materialId).map(p=>[p.pageNumber,p]));
   for(let n=1;n<=doc.totalPages;n++){
    if(options.signal?.aborted){await db.extraction.finish(run.id,run.token,'CANCELLED');return;}
    const previous=cached.get(n);if(previous?.extractionProvider===provider.id && ['TEXT','OCR_REQUIRED'].includes(previous.extractionStatus??''))continue;
    const stamp=new Date().toISOString();let page:PDFPage={id:`${materialId}:page:${n}`,materialId,pageNumber:n,printedPageLabel:null,text:'',createdAt:previous?.createdAt??stamp,updatedAt:stamp,extractionProvider:provider.id,extractionStatus:'ERROR',extractionError:''};
    try {const extracted=await doc.page(n);page={...page,text:extracted.text,extractionStatus:extracted.text.trim()?'TEXT':'OCR_REQUIRED'};}
    catch(error){page.extractionError=error instanceof Error?error.message:'Halaman gagal diekstrak.';}
    if(options.signal?.aborted){await db.extraction.finish(run.id,run.token,'CANCELLED');return;}
    await db.extraction.savePage(run.id,run.token,page,page.extractionStatus==='TEXT'?identifyPage(page):[]);await options.onProgress?.();
   }
   await db.extraction.finish(run.id,run.token);
  } catch(error){await db.extraction.finish(run.id,run.token,'ERROR',error instanceof Error?error.message:'Ekstraksi gagal.');throw error;}
  finally {await doc?.close();await options.onProgress?.();}
 };
 if(navigator.locks) await navigator.locks.request(`nihongo-extraction:${materialId}`,{ifAvailable:true},async lock=>{if(!lock)throw new Error('PDF ini sedang diekstrak di tab lain.');await work();});else await work();
}
