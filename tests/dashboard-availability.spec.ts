import { expect, test } from '@playwright/test';
import { seedVocabulary, seedGrammar, seedExamples, seedCategories } from '../src/data/seed';
import { buildQuestionPool, chooseQuestions, countQuestionAvailability, questionTypes, type QuizContent } from '../src/domain/quiz/engine';
import { calculateDashboard, dashboardQuizAvailability } from '../src/domain/analytics/dashboard';
import type { QuizConfig } from '../src/domain/models';

const bank: QuizContent = { vocabulary: seedVocabulary, grammar: seedGrammar, examples: seedExamples, categories: seedCategories };
const base: QuizConfig = { mode: 'mixed', count: 10, levels: ['N3','N2'], categoryIds: [], types: questionTypes.map(q=>q.value) };
function compare(content: QuizContent, config: QuizConfig) {
 const pool = buildQuestionPool(content, config);
 expect(countQuestionAvailability(content, config)).toEqual({ vocabulary: pool.filter(q=>q.itemType==='vocabulary').length, grammar: pool.filter(q=>q.itemType==='grammar').length });
}

test('lightweight availability matches quiz generation for every type, mode and filter', () => {
 for (const mode of ['mixed','vocabulary','grammar'] as const) {
  compare(bank,{...base,mode});
  for (const q of questionTypes) compare(bank,{...base,mode,types:[q.value]});
 }
 compare(bank,{...base,levels:['N5']});
 for (const category of seedCategories) compare(bank,{...base,categoryIds:[category.id]});
 compare({...bank,vocabulary:[],grammar:[],examples:[]},base);
});

test('small banks, repeated answers, examples and grammar templates obey the same eligibility rules', () => {
 for (const count of [1,2,3,4,6]) {
  const vocabulary=seedVocabulary.slice(0,count).map((v,i)=>({...v,meaning:i<2?'sama':v.meaning,kana:i<3?'あ':v.kana}));
  const grammar=seedGrammar.slice(0,count).map((g,i)=>({...g,meaning:i<2?'sama':g.meaning,quizTemplate:{sentence:'本を読んでください。',translation:'Tolong baca buku.',blankAnswer:'読んで',explanation:'Permintaan.',wrongSentences:[],validated:true as const}}));
  compare({...bank,vocabulary,grammar},base);
 }
 const grammar=[{...seedGrammar[0],quizTemplate:{sentence:'本を読んでください。',translation:'Tolong baca buku.',blankAnswer:'読んで',explanation:'Permintaan.',wrongSentences:['本を読むください。','本を読んだください。','本を読まないください。'],validated:true as const}}];
 compare({...bank,grammar},base);
});

test('dashboard availability does not use randomness; cached counts retain current review deadlines', () => {
 const original=Math.random;
 let availability: ReturnType<typeof dashboardQuizAvailability>;
 try { Math.random=()=>{throw new Error('Dashboard must not shuffle answers');}; availability=dashboardQuizAvailability(bank); }
 finally { Math.random=original; }
 const data={...bank,progress:[],quizResults:[],sessions:[]};
 const dashboard=calculateDashboard(data,new Date('2026-10-02T12:00:00Z'),availability);
 expect(dashboard.quiz).not.toBeNull();
 const config=dashboard.quiz!.config;
 expect(chooseQuestions(buildQuestionPool(bank,config),config)).toHaveLength(config.count);
 expect(calculateDashboard(data,new Date('2026-10-03T12:00:00Z'),availability).quiz).toEqual(dashboard.quiz);
});
