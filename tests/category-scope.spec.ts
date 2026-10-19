import {test,expect} from './fixtures';

test('category filters and editors are scoped by content, survive refresh, and clear foreign URL filters',async({page})=>{
 await page.goto('/vocabulary');
 await expect(page.getByLabel('Filter kategori')).toBeVisible();
 const ids=await page.evaluate(async()=>{
  const path='/src/services/database.ts';const db=(await import(path)).database;
  const make=(name:string)=>db.categories.create({name,description:'scope test',isSeed:false});
  const v=await make('Vocabulary only'),g=await make('Grammar only'),both=await make('Shared category'),unused=await make('Unused category');
  const vocab=(await db.vocabulary.list())[0],grammar=(await db.grammar.list())[0];
  await db.vocabulary.update(vocab.id,{categoryIds:[v.id,both.id]});
  await db.grammar.update(grammar.id,{categoryIds:[g.id,both.id]});
  return {v:v.id,g:g.id,both:both.id,unused:unused.id};
 });
 for(const kind of ['vocabulary','grammar'] as const){
  const own=kind==='vocabulary'?ids.v:ids.g,other=kind==='vocabulary'?ids.g:ids.v;
  await page.goto('/'+kind);
  const select=page.getByLabel('Filter kategori');
  await expect(select.locator(`option[value="${own}"]`)).toHaveCount(1);
  await expect(select.locator(`option[value="${other}"]`)).toHaveCount(0);
  await expect(select.locator(`option[value="${ids.both}"]`)).toHaveCount(1);
  await expect(select.locator(`option[value="${ids.unused}"]`)).toHaveCount(0);
  await select.selectOption(own);await expect(page.locator('.content-card')).toHaveCount(1);
  await page.reload();await expect(select).toHaveValue(own);
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByLabel(kind==='vocabulary'?'Vocabulary only':'Grammar only',{exact:true})).toBeChecked();
  await expect(dialog.getByLabel(kind==='vocabulary'?'Grammar only':'Vocabulary only',{exact:true})).toHaveCount(0);
  await expect(dialog.getByLabel('Shared category',{exact:true})).toBeChecked();
  await expect(dialog.getByLabel('Unused category',{exact:true})).toBeVisible();
  await page.goto('/'+kind+'?category='+other+'&page=3&level=N3');
  await expect(select).toHaveValue('all');
  await expect(page).not.toHaveURL(/category=|page=/);
  await expect(page).toHaveURL(/level=N3/);
 }
});
