import { test, expect } from '@playwright/test';
const template = {
 sentence: 'ご飯を食べてから、勉強します。', translation: 'Setelah makan, saya belajar.', blankAnswer: '食べてから',
 wrongSentences: ['ご飯を食べるてから、勉強します。','ご飯を食べたてから、勉強します。','ご飯を食べますてから、勉強します。'],
 explanation: 'Gunakan bentuk て dari 食べる, yaitu 食べて, lalu tambahkan から.', validated: true,
};

test('personal grammar templates generate both question types and reject incomplete evidence', async ({ page }) => {
 await page.goto('/favicon.svg');
 const result = await page.evaluate(async template => {
  const path = '/src/domain/quiz/engine.ts', vp = '/src/domain/quiz/grammar-template.ts';
  const { buildQuestionPool } = await import(path), { validateGrammarTemplate } = await import(vp);
  const g = {id:'personal-id',pattern:'〜てから',formation:'Vて + から',meaning:'setelah',explanation:'Urutan kegiatan.',comparisonIds:[],categoryIds:[],jlptLevel:'N3',quizTemplate:template};
  const config = {mode:'grammar',count:10,levels:['N3'],categoryIds:[],types:['grammar-blank','grammar-sentence']};
  const pool = (item: object) => buildQuestionPool({vocabulary:[],grammar:[item],examples:[],categories:[]},config);
  const rejected = [ {...template,validated:false}, {...template,blankAnswer:'ありません'}, {...template,wrongSentences:[template.sentence,...template.wrongSentences.slice(1)]}, {...template,wrongSentences:template.wrongSentences.slice(1)} ].map(x => { try { validateGrammarTemplate(x); return false; } catch { return true; } });
  return {questions:pool(g), missing:pool({...g,quizTemplate:undefined}), unvalidated:pool({...g,quizTemplate:{...template,validated:false}}), blankOnly:pool({...g,quizTemplate:{...template,wrongSentences:[]}}),rejected};
 },template);
 expect(result.questions.map((q: any) => q.type)).toEqual(['grammar-blank','grammar-sentence']);
 expect(result.questions[0].prompt).toContain('ご飯を＿＿＿、勉強します。');
 expect(result.questions[1].options).toHaveLength(4);
 expect(result.missing).toEqual([]); expect(result.unvalidated).toEqual([]);
 expect(result.blankOnly).toHaveLength(1); expect(result.rejected).toEqual([true,true,true,true]);
});

test('manual template validation, persistence, JSON/CSV roundtrip and availability', async ({ page }) => {
 await page.goto('/grammar?add=1');
 const dialog = page.getByRole('dialog');
 await dialog.getByLabel('Grammar pattern').fill('〜てから');
 await dialog.getByLabel('Pola pembentukan').fill('Vて + から');
 await dialog.getByLabel('Penjelasan',{exact:true}).fill('Urutan kegiatan.');
 await dialog.getByLabel('Arti Indonesia').fill('setelah');
 await dialog.getByText('Soal grammar tervalidasi (opsional)',{exact:true}).click();
 await dialog.getByLabel('Kalimat benar',{exact:true}).fill(template.sentence);
 await dialog.getByLabel('Terjemahan kalimat quiz').fill(template.translation);
 await dialog.getByLabel('Jawaban bagian kosong').fill(template.blankAnswer);
 await dialog.getByLabel('Pembahasan jawaban').fill(template.explanation);
 for (let n=1;n<=3;n++) await dialog.getByLabel('Kalimat pengecoh '+n).fill(template.wrongSentences[n-1]);
 await dialog.getByRole('button',{name:'Simpan materi'}).click();
 await expect(dialog.getByText('Periksa kebenaran template dan centang konfirmasi sebelum menyimpan.')).toBeVisible();
 await dialog.getByRole('checkbox',{name:/Saya sudah memeriksa/}).check();
 await dialog.getByRole('button',{name:'Simpan materi'}).click(); await expect(dialog).toHaveCount(0);
 await page.reload();
 const saved = await page.evaluate(async () => {
  const path = '/src/services/database.ts', fp = '/src/domain/transfer/format.ts';
  const { database } = await import(path), { exportJson,exportCsv,parseImport } = await import(fp);
  const rows = await database.transfer.export();
  const original = (await database.grammar.list())[0];
  const json = parseImport(exportJson(rows),'json')[0], csv = parseImport(exportCsv(rows),'csv')[0];
  const preview = await database.transfer.preview([csv.row]);
  await database.transfer.commit(preview,['merge'],[original.id]);
  return {json,csv,original,merged:(await database.grammar.list())[0]};
 });
 expect(saved.original.quizTemplate).toEqual(template);
 expect(saved.json.row.quizTemplate).toEqual(template); expect(saved.csv.row.quizTemplate).toEqual(template);
 expect(saved.merged.id).toBe(saved.original.id); expect(saved.merged.quizTemplate).toEqual(template);
 await page.goto('/quiz'); await page.getByLabel('Materi quiz',{exact:true}).selectOption('grammar');
 await expect(page.getByText(/Fill in blank grammar: 1 soal · Correct sentence: 1 soal/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Mulai quiz'})).toBeDisabled();
 await page.getByLabel('Level quiz',{exact:true}).selectOption('N2');
 await expect(page.getByText(/Materi belum mendukung sebagian/)).toBeVisible();
});

test('ten personal grammar questions complete and save; blank templates export safely', async ({ page }) => {
 await page.goto('/favicon.svg');
 const result = await page.evaluate(async template => {
  const dp='/src/services/database.ts', fp='/src/domain/transfer/format.ts';
  const {database}=await import(dp), {exportCsv,parseImport}=await import(fp);
  const rows=Array.from({length:5},(_,i)=>({type:'grammar',grammar:'〜てから '+i,pattern:'Vて + から',meaning:'setelah',level:'N3',quizTemplate:template}));
  const preview=await database.transfer.preview(rows);
  await database.transfer.commit(preview,rows.map(()=> 'keep-both'),rows.map(()=>null));
  const attempt=await database.quiz.start({mode:'grammar',count:10,levels:['N3'],categoryIds:[],types:['grammar-blank','grammar-sentence']});
  for(let i=0;i<attempt.questions.length;i++) await database.quiz.answer(attempt.id,i,attempt.questions[i].correctAnswer,1);
  const empty = parseImport(exportCsv([{...rows[0],quizTemplate:null}]),'csv')[0];
  return { id:attempt.id,types:attempt.questions.map((q:any)=>q.type), empty };
 },template);
 expect(result.types.filter((t:string)=>t==='grammar-blank')).toHaveLength(5);
 expect(result.types.filter((t:string)=>t==='grammar-sentence')).toHaveLength(5);
 expect(result.empty.error).toBe(''); expect(result.empty.row.quizTemplate).toBeNull();
 await page.goto('/quiz/result?id='+result.id);
 await expect(page.getByText('100%',{exact:true}).first()).toBeVisible();
 await page.reload();
 await expect(page.getByText('100%',{exact:true}).first()).toBeVisible();
});
