import { expect, test } from '@playwright/test';

test('skip link moves keyboard focus into main content', async ({ page }) => {
 await page.goto('/dashboard');
 await expect(page.locator('#page-title')).toBeVisible();
 await page.locator('.skip-link').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#main-content')).toBeFocused();
});

test('mobile menu exposes state and buttons have usable touch targets', async ({page}) => {
 await page.setViewportSize({width:390,height:844});
 await page.goto('/settings');
 const menu=page.getByRole('button',{name:'Buka menu'});
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await menu.click();
 await expect(menu).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(menu).toBeFocused();
 await menu.click();
 await page.getByRole('dialog').getByRole('link', {name:'Vocabulary 単語'}).click();
 await expect(page.locator('#page-title')).toBeFocused();
 for (const button of [menu,page.getByRole('button',{name:'Aktifkan mode gelap'})]) {
  const bounds=await button.boundingBox(); expect(bounds!.height).toBeGreaterThanOrEqual(44); expect(bounds!.width).toBeGreaterThanOrEqual(44);
 }
});

test('lazy page failure offers recovery without exposing a stack trace', async ({page}) => {
 await page.route('**/features/transfer/TransferPage.tsx*', route=>route.abort());
 await page.goto('/data-transfer');
 await expect(page.getByRole('heading',{name:'Halaman belum dapat dibuka.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Muat ulang halaman'})).toBeVisible();
 await expect(page.locator('body')).not.toContainText('Unexpected Application Error');
 await page.unroute('**/features/transfer/TransferPage.tsx*');
 await page.getByRole('button',{name:'Muat ulang halaman'}).click();
 await expect(page.locator('main #page-title')).toBeVisible();
 await expect(page.locator('#page-title')).toBeFocused();
});

test('reduced motion suppresses decorative transitions', async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/dashboard');
 const button=page.getByRole('button',{name:'Aktifkan mode gelap'});
 const duration=await button.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration));
 expect(duration).toBeLessThan(0.01);
});
