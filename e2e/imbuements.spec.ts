import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/imbuements');
  await page.waitForLoadState('networkidle');
});

test('opens from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Imbuements' }).click();

  await expect(page.getByRole('heading', { name: 'Imbuements', level: 1 })).toBeVisible();
});

test('lists the items of an imbuement', async ({ page }) => {
  await page.getByRole('button', { name: 'Scorch' }).click();

  await expect(page.getByLabel('25× Fiery Heart')).toBeVisible();
  await expect(page.getByLabel('5× Demon Horn')).toBeVisible();
  await expect(page.getByLabel('Gold Token')).toBeHidden();
  await expect(page.getByText('Falta o preço de:')).toBeVisible();
});

test('adds the prices and the shrine fee', async ({ page }) => {
  await page.getByRole('button', { name: 'Scorch' }).click();
  await page.getByRole('button', { name: 'Basic' }).click();
  await page.getByLabel('25× Fiery Heart').fill('1000');

  await expect(page.getByText('32.500')).toBeVisible();
});

test('compares the market with Gold Tokens', async ({ page }) => {
  await page.getByRole('button', { name: 'Void', exact: true }).click();
  await page.getByRole('button', { name: 'Basic' }).click();
  await page.getByLabel('25× Rope Belt').fill('1000');
  await page.getByLabel('Gold Token').fill('5000');

  await expect(page.getByText('O market sai')).toBeHidden();
  await expect(page.getByText('Gold Tokens saem 15.000 gold')).toBeVisible();
});

test('does not scroll horizontally', async ({ page }) => {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
