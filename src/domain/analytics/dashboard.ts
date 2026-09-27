import type { ContentKind, QuizConfig, Vocabulary, Grammar } from '../models';
import type { ProgressSnapshot } from './progress';
import type { QuizContent } from '../quiz/engine';
import { localDay } from './progress';
import { buildQuestionPool, questionTypes } from '../quiz/engine';
import { selectReviewQueue } from '../learning/review-queue';
import { effectiveReviewDate, reviewPriority } from '../learning/spaced-repetition';

export function calculateDashboard(data: ProgressSnapshot & QuizContent, now = new Date()) {
 const today = localDay(now), time = now.getTime();
 const live = new Map<string, Vocabulary | Grammar>([...data.vocabulary.map(item => [`vocabulary:${item.id}`, item] as const), ...data.grammar.map(item => [`grammar:${item.id}`, item] as const)]);
 const records = data.progress.filter(p => live.has(`${p.itemType}:${p.itemId}`));
 const byKey = new Map(records.map(p => [`${p.itemType}:${p.itemId}`, p]));
 const due = selectReviewQueue(data.vocabulary,data.grammar,records,{mode:'mixed'},time);
 const weak = records.filter(p => p.status === 'WEAK' || (p.masteryScore !== null && p.masteryScore < 60 && p.reviewCount > 0)).map(p => {
  const item = live.get(`${p.itemType}:${p.itemId}`)!;
  return { item, progress:p, title:'kanji' in item ? item.kanji : item.pattern, nextReview:effectiveReviewDate(p), priority:reviewPriority(p,time) };
 }).sort((a,b) => Number(due.some(d=>d.progress.id===b.progress.id))-Number(due.some(d=>d.progress.id===a.progress.id)) || b.priority-a.priority || a.progress.id.localeCompare(b.progress.id));
 const plan = (kind: ContentKind) => {
  const available = data[kind].filter(item => { const p = byKey.get(`${kind}:${item.id}`); return !p || (p.masteryScore === null && p.reviewCount === 0 && !effectiveReviewDate(p) && p.status !== 'MASTERED'); }).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  // A starter batch grows with the available bank, rather than a fixed daily target.
  return { available:available.length, items:available.slice(0,Math.ceil(Math.sqrt(available.length))) };
 };
 const levels = [...new Set([...data.vocabulary,...data.grammar].map(i=>i.jlptLevel))];
 let quiz: { config:QuizConfig; available:number } | null = null;
 if (levels.length) {
  const base:QuizConfig={mode:'mixed',count:10,levels,categoryIds:[],types:questionTypes.map(q=>q.value)};
  const pool=buildQuestionPool(data,base), v=pool.filter(q=>q.itemType==='vocabulary').length,g=pool.length-v;
  const mode:QuizConfig['mode']=Math.min(v,g)*2>=10?'mixed':v>=g?'vocabulary':'grammar';
  const available=mode==='mixed'?Math.min(v,g)*2:Math.max(v,g);
  const history=data.quizResults.filter(q=>Date.parse(q.finishedAt)<=time && q.answers.length>0);
  const typical=history.length ? history.reduce((sum,q)=>sum+q.answers.length,0)/history.length : base.count;
  const count=([10,20,30,50] as const).filter(n=>n<=available).sort((a,b)=>Math.abs(a-typical)-Math.abs(b-typical)||a-b)[0];
  if(count) quiz={config:{...base,mode,count},available};
 }
 const studied = (kind:ContentKind) => records.filter(p=>p.itemType===kind && p.reviewCount>0 && p.lastReviewed && Date.parse(p.lastReviewed)<=time && localDay(new Date(p.lastReviewed))===today).length;
 const quizzesToday=data.quizResults.filter(q=>Date.parse(q.finishedAt)<=time && localDay(new Date(q.finishedAt))===today);
 return { due, weak, vocabulary:plan('vocabulary'), grammar:plan('grammar'), quiz,
  today:{vocabulary:studied('vocabulary'),grammar:studied('grammar'),quiz:quizzesToday.reduce((n,q)=>n+q.answers.length,0),quizzes:quizzesToday.length},
  recommendation:weak.find(row=>due.some(d=>d.progress.id===row.progress.id)) ?? due[0] ?? weak[0] ?? null };
}
