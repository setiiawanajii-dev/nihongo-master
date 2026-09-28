import { installTestBank } from './fixtures';
import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

const routes = ['/dashboard', '/vocabulary', '/grammar', '/quiz', '/review', '/progress', '/guide', '/feedback', '/data-transfer', '/favorites', '/settings'];

test('every route opens directly and survives a refresh without runtime errors', async ({ page }) => {
  // This scenario performs 22 full page loads; allow time on slower machines.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Membuka database pembelajaran…', { exact: true })).toHaveCount(0);
    await expect(page.locator(`.desktop-sidebar nav a[href="${route}"]`)).toHaveAttribute('aria-current', 'page');
    await page.reload();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Membuka database pembelajaran…', { exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('desktop navigation, browser history, root redirect, and 404 recovery work', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const route of routes) {
    await page.locator(`.desktop-sidebar nav a[href="${route}"]`).last().click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Membuka database pembelajaran…', { exact: true })).toHaveCount(0);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/favorites$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goto('/halaman-tidak-ada');
  await expect(page.getByRole('heading', { name: 'Sepertinya kamu salah jalan.' })).toBeVisible();
  await page.getByRole('link', { name: 'Kembali ke dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('theme persists through navigation and reload, and settings match the header', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.locator('.desktop-sidebar nav a[href="/settings"]').click();
  await expect(page.getByRole('button', { name: 'Mode gelap', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Mode terang', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass('dark');
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass('dark');
  expect(await page.evaluate(() => localStorage.getItem('nihongo-master:theme'))).toBe('light');
});

test('explicit test content search and level filters change results', async ({ page }) => {
  await installTestBank(page);
  await page.goto('/vocabulary');
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('kaigo');
  await expect(page.locator('.content-card')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Filter level JLPT' }).selectOption('N2');
  await expect(page.getByRole('heading', { name: 'Belum ada hasil yang cocok' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter level JLPT' }).selectOption('all');
  await page.getByRole('textbox', { name: 'Cari vocabulary' }).fill('perawatan');
  await expect(page.locator('.content-card')).toHaveCount(1);
  await page.goto('/grammar');
  await page.getByRole('textbox', { name: 'Cari grammar' }).fill('berusaha');
  await expect(page.locator('.content-card')).toHaveCount(1);
});

test('mobile drawer navigates every route and supports Escape and focus trapping', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.locator('.desktop-sidebar')).toBeHidden();
  for (const route of routes) {
    await page.getByRole('button', { name: 'Buka menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu navigasi' });
    await expect(dialog).toBeVisible();
    await dialog.locator(`nav a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  }
  await page.getByRole('button', { name: 'Buka menu' }).click();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Buka menu' })).toBeFocused();
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`all pages fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Membuka database pembelajaran…', { exact: true })).toHaveCount(0);
      const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflowing, `Horizontal overflow at ${route}`).toBe(false);
    }
  });
}

test('capture desktop, dark and mobile dashboard for visual review', async ({ page }, testInfo) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('daily-learning')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Aktifkan mode terang' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
});
