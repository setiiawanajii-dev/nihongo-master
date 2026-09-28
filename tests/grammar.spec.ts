import { expect, test } from './fixtures';
import type { LearningDatabase } from '../src/repositories/contracts';
test.setTimeout(90_000);
const detail = '/grammar/seed-g-N3-01';
test('grammar filters, pagination and canonical detail preserve URL on refresh', async ({ page }) => {
 await page.goto('/grammar'); await expect(page.locator('.content-card')).toHaveCount(12);
 await page.getByRole('button', { name: 'Berikutnya', exact: true }).click(); await expect(page).toHaveURL(/page=2/);
 await page.getByLabel('Filter level JLPT').selectOption('N2'); await expect(page.locator('.content-card')).toHaveCount(10);
 await page.getByLabel('Cari grammar').fill('次第'); await expect(page.locator('.content-card')).toHaveCount(1);
 await page.reload(); await expect(page.getByLabel('Cari grammar')).toHaveValue('次第');
 await page.getByRole('link', { name: 'Detail', exact: true }).click(); await expect(page).toHaveURL(/grammar\/seed-g-N2-10$/);
 for (const name of ['Pola pembentukan','Penjelasan','Kesalahan umum','Grammar terkait','Contoh & terjemahan','Catatan materi']) await expect(page.getByRole('heading', {name, exact:true})).toBeVisible();
 await page.getByRole('link', { name: 'Kembali ke grammar', exact:true }).click(); await expect(page.getByLabel('Filter level JLPT')).toHaveValue('N2');
 await page.goto('/grammar/missing'); await expect(page.getByRole('heading', {name:'Materi tidak ditemukan'})).toBeVisible();
});
test('grammar favorite, related link, review queue and self-assessment survive refresh', async ({ page }) => {
 await page.goto(detail); await expect(page.getByRole('button',{name:'Favoritkan',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Favoritkan',exact:true}).click(); await page.reload(); await expect(page.getByRole('button',{name:'Hapus favorit',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Edit materi',exact:true}).click(); await page.getByRole('dialog').getByLabel('〜ようになる', {exact:true}).check(); await page.getByLabel('Kesalahan umum',{exact:true}).fill('Bedakan kebiasaan yang diusahakan dengan perubahan kemampuan.'); await page.getByRole('checkbox',{name:/Saya sudah memeriksa/}).check(); await page.getByRole('button',{name:'Simpan materi',exact:true}).click(); await expect(page.getByRole('dialog')).toBeHidden();
 await page.getByRole('link',{name:/〜ようになる ·/}).click(); await expect(page).toHaveURL(/seed-g-N3-02$/); await page.goto(detail);
 await page.getByRole('button',{name:'Review sekarang',exact:true}).click(); await page.getByRole('link',{name:'Lihat antrean review'}).click(); await expect(page.locator('.content-card')).toHaveCount(1);
 await page.getByRole('link',{name:'Detail',exact:true}).click(); await expect(page.getByRole('link',{name:'Kembali ke review'})).toHaveAttribute('href','/review?type=grammar');
 await page.getByLabel('Jawaban latihan').fill('Mengusahakan kebiasaan secara sadar.'); await page.getByRole('button',{name:'Bandingkan jawaban'}).click(); await page.getByRole('button',{name:'😵 Belum paham',exact:true}).click(); await expect(page.getByText('Penilaian grammar tersimpan. Jadwal review telah diperbarui.')).toBeVisible();
 await page.reload(); await expect(page.locator('.detail-evidence')).toContainText('WEAK');
 const saved = await page.evaluate(async () => { const path='/src/services/database.ts'; const db=(await import(path)).database as LearningDatabase; return { p: await db.progress.get('grammar:seed-g-N3-01'), events: await db.reviewEvents.list(), sessions:await db.sessions.list() }; });
 expect(saved.p?.reviewCount).toBe(1); expect(saved.events[0]).toMatchObject({itemType:'grammar', response:'Mengusahakan kebiasaan secara sadar.', dimension:'understanding'}); expect(saved.sessions[0].type).toBe('review');
 await page.goto('/grammar?status=WEAK'); await expect(page.locator('.content-card')).toHaveCount(1);
});
test('grammar mastery requires all dimensions; retries are idempotent, invalid input rolls back and deletion cascades',async ({page}) => {
 await page.goto(detail); await expect(page.getByLabel('Jawaban latihan')).toBeVisible();
 const result=await page.evaluate(async()=>{const path='/src/services/database.ts'; const db=(await import(path)).database as LearningDatabase;
 const id='seed-g-N3-01'; const initial=await db.learning.queueGrammarReview(id); const states=[initial.status];
 const input={itemId:id,dimension:'understanding' as const,response:'Jawaban latihan',rating:1 as const,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),activeDurationSeconds:10};
 const learning=await db.learning.recordGrammarReview(input); states.push(learning.status); await Promise.all([db.learning.recordGrammarReview(input),db.learning.recordGrammarReview(input)]);
 const count=(await db.progress.get('grammar:'+id))!.reviewCount;
 await db.progress.delete('grammar:'+id);
 for(const dimension of ['understanding','usage','sentence'] as const) for(let i=0;i<3;i++) {const p=await db.learning.recordGrammarReview({...input, dimension,rating:3,eventId:crypto.randomUUID(),sessionId:crypto.randomUUID()}); states.push(p.status);}
 const mastered=await db.progress.get('grammar:'+id); let invalid=false;
 try{await db.learning.recordGrammarReview({...input,response:' ',eventId:crypto.randomUUID()});}catch{invalid=true;}
 const unchanged=(await db.progress.get('grammar:'+id))!.reviewCount;
 await db.grammar.delete(id); return {states,count,mastered,invalid,unchanged,remaining:(await db.reviewEvents.list()).filter(e=>e.itemType==='grammar'&&e.itemId===id).length,schedule:await db.schedules.get('grammar:'+id)};
 });
 expect(result.count).toBe(1); expect(result.states[0]).toBe('NEW'); expect(result.states[1]).toBe('LEARNING'); expect(result.states[2]).toBe('REVIEW'); expect(result.states.slice(2,-1)).not.toContain('MASTERED'); expect(result.mastered).toMatchObject({status:'MASTERED',masteryScore:100,reviewCount:9}); expect(result.invalid).toBe(true);expect(result.unchanged).toBe(9);expect(result.remaining).toBe(0);expect(result.schedule).toBeUndefined();
});
test('grammar mobile and dark layout do not overflow',async({page})=>{
 for(const width of [320,390,768,1440]) {await page.setViewportSize({width,height:900}); await page.goto('/grammar');await expect(page.getByText('Membuka database pembelajaran…',{exact:true})).toBeHidden({timeout:15_000});await expect(page.locator('.content-card').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.goto(detail);await expect(page.getByLabel('Jawaban latihan')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.evaluate(()=>document.documentElement.classList.add('dark')); await page.screenshot({path:'test-results/grammar-detail.png',fullPage:true});
});
