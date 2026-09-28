import { expect, test, emptyTest } from './fixtures';
import { calculateProgress } from '../src/domain/analytics/progress';
import type { ProgressSnapshot } from '../src/domain/analytics/progress';
import type { LearningDatabase } from '../src/repositories/contracts';
test.setTimeout(90_000);
const empty = (): ProgressSnapshot => ({ vocabulary: [], grammar: [], progress: [], quizResults: [], sessions: [] });
function session(day: string, seconds = 60) { return { id: crypto.randomUUID(), createdAt: '', updatedAt: '', type: 'review' as const, startedAt: '', endedAt: null, timezone: 'Asia/Tokyo', localDate: day, activeDurationSeconds: seconds, itemIds: ['a'] }; }
test('streak uses calendar dates, duplicates, yesterday grace and excludes future activity', () => {
 const data = empty(); data.sessions = ['2025-12-29','2025-12-30','2025-12-31','2025-12-31','2026-01-01','2026-01-04','2026-01-05','2026-01-08'].map(d => session(d));
 const a = calculateProgress(data,'2026-01-06'); expect(a.study.current).toBe(2); expect(a.study.longest).toBe(4); expect(a.study.total).toBe(7); expect(a.study.seconds).toBe(420); expect(calculateProgress(data,'2026-01-07').study.current).toBe(0);
 const dst = empty(); dst.sessions = ['2026-03-07','2026-03-08','2026-03-09'].map(d => session(d)); expect(calculateProgress(dst,'2026-03-09').study.current).toBe(3); expect(calculateProgress(empty(),'2026-03-09').quiz.accuracy).toBeNull();
});
emptyTest('empty progress is honest, charts and metrics have usable mobile and dark layouts', async ({page}) => {
 await page.goto('/progress'); await expect(page.getByTestId('vocabulary-metrics')).toContainText('0'); await expect(page.getByTestId('grammar-metrics')).toContainText('0'); await expect(page.getByTestId('quiz-metrics')).toContainText('—'); await expect(page.getByText('Belum ada quiz selesai.',{exact:false})).toBeVisible();
 for (const width of [320,390,768,1440]) { await page.setViewportSize({width,height:1000}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
 await page.screenshot({path:'test-results/progress-empty.png',fullPage:true});
});
test('real quiz and review history feeds progress and dashboard after refresh', async ({page}) => {
 await page.goto('/progress'); await expect(page.getByTestId('vocabulary-metrics')).toBeVisible();
 const result = await page.evaluate(async () => { const url='/src/services/database.ts'; const db=(await import(url)).database as LearningDatabase; await db.learning.recordVocabularyReview({itemId:'seed-v-N3-01',rating:2,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:12}); const quiz = await db.quiz.start({mode:'mixed',count:10,levels:['N3','N2'],categoryIds:[],types:['jp-to-id','grammar-meaning']}); for(let i=0;i<quiz.questions.length;i++) await db.quiz.answer(quiz.id,i,i<8?quiz.questions[i].correctAnswer:quiz.questions[i].options.find(o=>o.id!==quiz.questions[i].correctAnswer)!.id,3); return { quizzes:await db.quizResults.list(), sessions:await db.sessions.list() }; });
 expect(result.quizzes).toHaveLength(1); expect(result.sessions).toHaveLength(2); await page.reload();
 await expect(page.getByTestId('quiz-metrics')).toContainText('80%'); await expect(page.getByTestId('study-metrics')).toContainText('42 detik'); await expect(page.getByTestId('study-metrics')).toContainText('1 hari'); await page.getByText('Rincian skor quiz',{exact:true}).click(); await expect(page.locator('table').first()).toContainText('80%');
 await page.screenshot({path:'test-results/progress-populated.png',fullPage:true}); await page.setViewportSize({width:320,height:900}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); await page.screenshot({path:'test-results/progress-mobile.png',fullPage:true}); await page.evaluate(()=>document.documentElement.classList.add('dark')); await page.screenshot({path:'test-results/progress-dark.png',fullPage:true});
 await page.goto('/dashboard'); await expect(page.locator('.stat-card').filter({hasText:'Akurasi quiz'})).toContainText('80%'); await expect(page.getByText('42 detik waktu belajar.',{exact:false})).toBeVisible(); await page.reload(); await expect(page.locator('.stat-card').filter({hasText:'Study streak'})).toContainText('1 hari');
});
test('typed content identity, deleted content and mixed-level quiz snapshots aggregate correctly', async ({page}) => {
 await page.goto('/progress'); await expect(page.getByTestId('vocabulary-metrics')).toBeVisible();
 const result=await page.evaluate(async()=>{const u='/src/services/database.ts',a='/src/domain/analytics/progress.ts',p='/src/services/progress.ts'; const db=(await import(u)).database as LearningDatabase; const {calculateProgress}=await import(a);const {newProgress}=await import(p);const v=(await db.vocabulary.list())[0],g=(await db.grammar.list())[0];const now=new Date().toISOString();const question=(level:string,kind:string)=>({jlptLevel:level,itemType:kind,itemId:'deleted'});const data={vocabulary:[{...v,id:'same',jlptLevel:'N3'}],grammar:[{...g,id:'same',jlptLevel:'N3'}],progress:[{...newProgress('vocabulary','same'),masteryScore:90,status:'MASTERED'},{...newProgress('grammar','deleted'),masteryScore:100,status:'MASTERED'}],sessions:[],quizResults:[{id:'one',finishedAt:now,score:50,accuracy:50,answers:[{questionSnapshot:question('N3','vocabulary'),isCorrect:true},{questionSnapshot:question('N2','grammar'),isCorrect:false}]}]};return calculateProgress(data);});
 expect(result.vocabulary.counts.MASTERED).toBe(1);expect(result.grammar.counts.MASTERED).toBe(0);expect(result.levels.find((row:any)=>row.level==='N3')!.quiz).toBe(100);expect(result.levels.find((row:any)=>row.level==='N2')!.quiz).toBe(0);expect(result.levels.find((row:any)=>row.level==='N3')!.overall).toBeCloseTo(190/3);expect(result.study.total).toBe(0);
});
