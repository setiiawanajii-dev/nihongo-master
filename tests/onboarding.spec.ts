import { test, expect } from '@playwright/test';

test('empty mobile dashboard guides manual entry and first flashcard without changing progress', async ({page}, info) => {
 await page.setViewportSize({width:390,height:844});
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Selamat datang di Nihongo Master 👋'})).toBeVisible();
 await expect(page.getByRole('list',{name:'Langkah belajar'})).toBeVisible();
 await page.screenshot({path:info.outputPath('welcome-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Tambah materi pertama'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Tambah materi pertama'})).toBeFocused();
 await page.getByRole('button',{name:'Tambah materi pertama'}).click();
 await page.getByRole('dialog').getByRole('link',{name:'Tambah vocabulary',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Kanji / kata Jepang').fill('学校');await dialog.getByLabel('Kana',{exact:true}).fill('がっこう');await dialog.getByLabel('Romaji').fill('gakkou');await dialog.getByLabel('Arti Indonesia').fill('sekolah');
 await dialog.getByRole('button',{name:'Simpan materi'}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('status')).toContainText('Materimu sudah tersimpan!');
 await page.getByRole('link',{name:'Belajar dengan flashcard',exact:true}).click();
 await expect(page.getByRole('button',{name:'Balik kartu untuk melihat jawaban'})).toBeVisible();
 await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Tambah materi pertama'})).toHaveCount(0);
 await expect(page.getByTestId('daily-learning')).toBeVisible();
 await page.reload();await expect(page.getByTestId('daily-learning')).toBeVisible();
 const progress = await page.evaluate(async()=>{const p='/src/services/database.ts';return (await import(p)).database.progress.list();});expect(progress).toEqual([]);
});

test('file option opens import page; mobile dark mode and manual grammar success are usable',async({page},info)=>{
 await page.setViewportSize({width:320,height:844});await page.goto('/dashboard');
 await page.getByRole('button',{name:'Aktifkan mode gelap'}).click();
 await page.getByRole('button',{name:'Tambah materi pertama'}).click();
 expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('choices-dark-mobile.png'),fullPage:true});
 await page.getByRole('link',{name:'Pilih file materi'}).click();await expect(page).toHaveURL(/data-transfer#import-materi$/);
 await expect(page.getByRole('heading',{name:'Impor dari file'})).toBeVisible();
 await page.getByRole('link',{name:'Tambah grammar',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Grammar pattern').fill('〜てから');await dialog.getByLabel('Pola pembentukan').fill('Vて + から');await dialog.getByLabel('Penjelasan',{exact:true}).fill('Urutan kegiatan.');await dialog.getByLabel('Arti Indonesia').fill('setelah');
 await dialog.getByRole('button',{name:'Simpan materi'}).click();await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('status')).toContainText('Materimu sudah tersimpan!');
 await expect(page.getByRole('link',{name:'Belajar dengan flashcard'})).toHaveCount(0);
 await page.getByRole('link',{name:'Buka materi',exact:true}).click();await expect(page.locator('main h1')).toHaveText('〜てから');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
