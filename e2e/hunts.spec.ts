import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/ferramentas/hunting-places');
  await page.waitForLoadState('networkidle');
});

test('opens from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Hunting places' }).click();

  await expect(
    page.getByRole('heading', { name: 'Hunting places', level: 1 }),
  ).toBeVisible();
});

test('shows spots up to the player level', async ({ page }) => {
  const count = page.getByRole('status');
  const before = await count.textContent();

  await page.getByLabel('Seu nível').fill('50');

  await expect(count).not.toHaveText(before ?? '');
  await expect(page.getByRole('link', { name: 'Alchemist Quarter' })).toBeVisible();
});

test('finds a spot by name', async ({ page }) => {
  await page.getByLabel('Buscar spot').fill('alchemist quarter');

  await expect(page.getByRole('status')).toHaveText('1 spot encontrado');
  await expect(page.getByText('Melhor dano:')).toBeVisible();
});

test('remembers the level after reloading', async ({ page }) => {
  await page.getByLabel('Seu nível').fill('967');
  await page.reload();

  await expect(page.getByLabel('Seu nível')).toHaveValue('967');
});

test('does not scroll horizontally', async ({ page }) => {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
