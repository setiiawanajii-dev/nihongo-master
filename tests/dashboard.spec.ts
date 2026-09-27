import { expect, test } from '@playwright/test';
import { calculateDashboard } from '../src/domain/analytics/dashboard';
import { seedVocabulary, seedGrammar, seedExamples, seedCategories } from '../src/data/seed';
import { newProgress } from '../src/services/progress';
import { calculateProgress, localDay } from '../src/domain/analytics/progress';
import type { LearningProgress } from '../src/domain/models';
import type { LearningDatabase } from '../src/repositories/contracts';

test.setTimeout(90_000);
const data=()=>({vocabulary:seedVocabulary,grammar:seedGrammar,examples:seedExamples,categories:seedCategories,progress:[] as LearningProgress[],quizResults:[],sessions:[]});
const now=new Date('2026-09-25T12:00:00');
function record(kind:'vocabulary'|'grammar',id:string, changes:Partial<LearningProgress>={}):LearningProgress{return {...newProgress(kind,id),id:`${kind}:${id}`,createdAt:now.toISOString(),updatedAt:now.toISOString(),...changes};}

test('empty and untouched banks produce honest data-derived plans, not fabricated weakness or streaks',()=>{
 const empty={...data(),vocabulary:[],grammar:[],examples:[]};const s=calculateDashboard(empty,now);expect(s.due).toHaveLength(0);expect(s.weak).toHaveLength(0);expect(s.quiz).toBeNull();expect(s.vocabulary.items).toHaveLength(0);expect(s.recommendation).toBeNull();expect(calculateProgress(empty,localDay(now)).study.current).toBe(0);
 const bank=data();bank.progress=[record('vocabulary',seedVocabulary[0].id,{notes:'Catatan saja'})];const fresh=calculateDashboard(bank,now);expect(fresh.weak).toHaveLength(0);expect(fresh.today).toEqual({vocabulary:0,grammar:0,quiz:0,quizzes:0});expect(fresh.vocabulary.items.length).toBe(Math.ceil(Math.sqrt(bank.vocabulary.length)));expect(fresh.quiz?.config.count).toBeLessThanOrEqual(fresh.quiz!.available);
 const reduced=calculateDashboard({...bank,vocabulary:seedVocabulary.slice(0,1),grammar:[],examples:[]},now);expect(reduced.vocabulary.items).toHaveLength(1);expect(reduced.quiz).toBeNull();
});

test('recommendations use mastery and due dates; exclude deleted records and future reviews; clock updates due counts',()=>{
 const bank=data(),v=seedVocabulary[0],g=seedGrammar[0];
 bank.progress=[record('vocabulary',v.id,{status:'WEAK',masteryScore:10,reviewCount:2,wrongCount:2,lastReviewed:now.toISOString(),nextReview:new Date(+now+60_000).toISOString()}),record('grammar',g.id,{status:'LEARNING',masteryScore:54,reviewCount:3,wrongCount:1,correctCount:2,lastReviewed:now.toISOString(),nextReview:new Date(+now-60_000).toISOString()}),record('grammar','deleted',{status:'WEAK',masteryScore:0,reviewCount:1,nextReview:new Date(+now-60_000).toISOString()})];
 const s=calculateDashboard(bank,now);expect(s.due).toHaveLength(1);expect(s.weak).toHaveLength(2);expect(s.recommendation?.item.id).toBe(g.id);expect(s.recommendation?.progress.masteryScore).toBe(54);expect(s.today.vocabulary).toBe(1);expect(s.today.grammar).toBe(1);expect(s.vocabulary.available).toBe(bank.vocabulary.length-1);
 expect(calculateDashboard(bank,new Date(+now+61_000)).due).toHaveLength(2);
 bank.progress[1]={...bank.progress[1],status:'MASTERED',masteryScore:100,nextReview:new Date(+now+86400000).toISOString()};expect(calculateDashboard(bank,now).weak).toHaveLength(1);
});

test('dashboard reflects real saved reviews, actionable recommendations and refresh without writes',async({page})=>{
 await page.goto('/dashboard');await expect(page.getByTestId('daily-learning')).toBeVisible();
 const ids=await page.evaluate(async()=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;const v=(await db.vocabulary.list())[0],g=(await db.grammar.list())[0];
  await db.learning.recordVocabularyReview({itemId:v.id,rating:0,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:8});await db.learning.queueVocabularyReview(v.id);
  await db.learning.recordGrammarReview({itemId:g.id,rating:1,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:12,dimension:'understanding',response:'Latihan grammar'});await db.learning.queueGrammarReview(g.id);
  return {v:v.id,g:g.id,grammar:g.pattern};});
 await page.reload();await expect(page.getByTestId('daily-review')).toContainText('1 Vocabulary');await expect(page.getByTestId('daily-review')).toContainText('1 Grammar');await expect(page.getByTestId('weak-materials')).toContainText(ids.grammar);await expect(page.getByTestId('today-learned')).toContainText('1 vocabulary · 1 grammar');await expect(page.locator('.stat-card').filter({hasText:'Study streak'})).toContainText('1 hari');
 const before=await page.evaluate(async()=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;return {p:await db.progress.list(),s:await db.sessions.list()};});
 await page.getByRole('link',{name:'Review Material',exact:true}).click();await expect(page).toHaveURL(/\/(vocabulary|grammar)\//);await page.goBack();await page.getByRole('link',{name:'Buka semua review (2)'}).click();await expect(page).toHaveURL(/review\?type=mixed/);await expect(page.getByRole('button',{name:'Mulai review (2)'})).toBeEnabled();await page.goto('/dashboard');await page.reload();
 const after=await page.evaluate(async()=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;return {p:await db.progress.list(),s:await db.sessions.list()};});expect(after).toEqual(before);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.screenshot({path:'test-results/smart-dashboard-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:950});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'test-results/smart-dashboard-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Mulai quiz rekomendasi'}).click();await expect(page).toHaveURL(/quiz\?attempt=/);await expect(page.getByText('Soal 1 / 10',{exact:true})).toBeVisible();
});

test('new material suggestions disappear after assessment and database changes propagate across tabs',async({page,context})=>{
 await page.goto('/dashboard');await expect(page.getByTestId('daily-learning')).toBeVisible();await page.getByText('Lihat saran vocabulary',{exact:true}).click();const first=page.getByTestId('daily-learning').locator('details').first().locator('a').first();const href=await first.getAttribute('href');expect(href).toBeTruthy();const id=decodeURIComponent(href!.split('/').pop()!);
 const other=await context.newPage();await other.goto('/dashboard');await expect(other.getByTestId('daily-learning')).toBeVisible();await other.evaluate(async(id)=>{const u='/src/services/database.ts';const db=(await import(u)).database as LearningDatabase;await db.learning.recordVocabularyReview({itemId:id,rating:3,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:10});const c=new BroadcastChannel('nihongo-master:data');c.postMessage('changed');c.close();},id);
 await expect(page.getByTestId('daily-learning').locator(`a[href="${href}"]`)).toHaveCount(0);await expect(page.getByTestId('today-learned')).toContainText('1 vocabulary');await other.close();
});
