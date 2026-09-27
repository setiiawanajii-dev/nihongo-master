import type { FlashcardRating, GrammarDimension, ReviewFilter, ReviewOutcome, ReviewRun } from '../../domain/models';
import { progressKey } from '../../domain/models';
import { advanceEvidence, effectiveReviewDate, reviewFingerprint, weakestDimension } from '../../domain/learning/spaced-repetition';
import { selectReviewQueue } from '../../domain/learning/review-queue';
import { stores, transact, type Transaction } from './indexeddb';
import { validate } from './validation';

export async function backfillReviewSchedules(tx: Transaction) {
 if (await tx.get('meta','review-schedule-v1')) return;
 for (const p of await tx.list('progress')) {
  if (p.nextReview || !await tx.get(p.itemType,p.itemId)) continue;
  const nextReview = effectiveReviewDate(p); if (!nextReview || !p.lastReviewed) continue;
  await tx.put('progress',{...p,nextReview});
  await tx.put('schedules',{id:p.id,itemId:p.itemId,itemType:p.itemType,intervalDays:(Date.parse(nextReview)-Date.parse(p.lastReviewed))/86_400_000,lastRating:null,lastReviewed:p.lastReviewed,nextReview,reviewCount:p.reviewCount,createdAt:p.createdAt,updatedAt:p.updatedAt});
 }
 await tx.put('meta',{id:'review-schedule-v1',value:new Date().toISOString()});
}
async function finishEntry(tx: Transaction, run: ReviewRun, outcome: ReviewOutcome) {
 run.outcomes.push(outcome); run.updatedAt=outcome.answeredAt;
 if (run.outcomes.length===run.entries.length) { run.status='COMPLETED'; run.finishedAt=outcome.answeredAt; const session=await tx.get('sessions',run.id); if(session) await tx.put('sessions',{...session,endedAt:run.finishedAt,updatedAt:run.finishedAt}); }
 await tx.put('reviewRuns',run); return run;
}
async function getRun(tx: Transaction,id:string,index:number) {
 if(!Number.isInteger(index)||index<0) throw new Error('Urutan review tidak valid.');
 const run=await tx.get('reviewRuns',id); if(!run) throw new Error('Sesi review tidak ditemukan.');
 if(index>run.outcomes.length || !run.entries[index]) throw new Error('Urutan review berubah. Muat ulang sesi.');
 return run;
}
export const reviewCommands = {
 async start(filter: ReviewFilter,limit:number) {
  if(!filter || !['vocabulary','grammar','mixed'].includes(filter.mode)||![10,20,50].includes(limit) || (filter.level && !['all','N5','N4','N3','N2'].includes(filter.level)) || (filter.query!==undefined&&typeof filter.query!=='string') || (filter.categoryId!==undefined&&typeof filter.categoryId!=='string')) throw new Error('Pengaturan review tidak valid.');
  return transact(stores,'readwrite',async tx=>{
   const queue=selectReviewQueue(await tx.list('vocabulary'),await tx.list('grammar'),await tx.list('progress'),filter).slice(0,limit);
   if(!queue.length) throw new Error('Belum ada materi jatuh tempo untuk filter ini.');
   const stamp=new Date().toISOString();
   const run:ReviewRun={id:crypto.randomUUID(),filter,entries:queue.map(row=>({itemId:row.item.id,itemType:row.progress.itemType,title:row.title,dimension:weakestDimension(row.progress,row.item),fingerprint:reviewFingerprint(row.progress)})),outcomes:[],status:'ACTIVE',finishedAt:null,createdAt:stamp,updatedAt:stamp};
   await tx.add('reviewRuns',run);return run;
  });
 },
 async answer(id:string,index:number,rating:FlashcardRating,response:string,seconds:number) {
  if(![0,1,2,3].includes(rating)||typeof response!=='string'||response.length>4000||(rating>0&&!response.trim())||!Number.isFinite(seconds)||seconds<0||seconds>86_400) throw new Error('Isi jawaban atau pilih Wrong jika belum ingat.');
  return transact(stores,'readwrite',async tx=>{
   const run=await getRun(tx,id,index), existing=run.outcomes[index];
   if(existing){if(existing.skippedReason || (existing.rating===rating&&existing.response===response.trim())) return run;throw new Error('Penilaian ini sudah tersimpan dengan jawaban lain. Muat ulang sesi.');}
   const entry=run.entries[index], stamp=new Date().toISOString(), now=new Date(stamp), key=progressKey(entry.itemType,entry.itemId);
   const item=await tx.get(entry.itemType,entry.itemId), current=await tx.get('progress',key);
   const base={...entry,response:response.trim(),answeredAt:stamp};
   if(!item||!current) return finishEntry(tx,run,{...base,rating:null,nextReview:null,masteryScore:null,skippedReason:'Materi atau progres sudah dihapus.'});
   if(reviewFingerprint(current)!==entry.fingerprint || Date.parse(effectiveReviewDate(current)??'')>now.getTime()) return finishEntry(tx,run,{...base,rating:null,nextReview:current.nextReview,masteryScore:current.masteryScore,skippedReason:'Progres atau jadwal berubah sejak sesi dimulai.'});
   // In this review UI, Hard explicitly means a correct recall with difficulty.
   const next=advanceEvidence(current,await tx.get('schedules',key),rating,entry.dimension,now,rating>0);
   await validate('progress',next.progress,tx);await tx.put('progress',next.progress);await tx.put('schedules',next.schedule);
   const duration=Math.min(300,Math.round(seconds));
   const event={id:`review:${run.id}:${index}`,itemId:entry.itemId,rating,sessionId:run.id,nextReview:next.nextReview,activeDurationSeconds:duration,response:response.trim(),createdAt:stamp,updatedAt:stamp};
   if(entry.itemType==='grammar') await tx.add('reviewEvents',{...event,itemType:'grammar',dimension:entry.dimension as GrammarDimension});
   else await tx.add('reviewEvents',{...event,itemType:'vocabulary',dimension:entry.dimension});
   const session=await tx.get('sessions',run.id);
   await tx.put('sessions',{id:run.id,type:'review',startedAt:run.createdAt,endedAt:null,activeDurationSeconds:(session?.activeDurationSeconds??0)+duration,timezone:session?.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone,localDate:session?.localDate??`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,itemIds:[...new Set([...(session?.itemIds??[]),entry.itemId])],createdAt:session?.createdAt??run.createdAt,updatedAt:stamp});
   return finishEntry(tx,run,{...base,rating,nextReview:next.nextReview,masteryScore:next.progress.masteryScore});
  });
 },
 async skip(id:string,index:number) {
  return transact(stores,'readwrite',async tx=>{
   const run=await getRun(tx,id,index);if(run.outcomes[index])return run;
   return finishEntry(tx,run,{...run.entries[index],rating:null,response:'',nextReview:null,masteryScore:null,answeredAt:new Date().toISOString(),skippedReason:'Dilewati tanpa penilaian.'});
  });
 },
};
