import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/hunting-places');
  await page.waitForLoadState('networkidle');
});

test('shows spots up to the player level', async ({ page }) => {
  const count = page.getByRole('status');
  const before = await count.textContent();

  await page.getByLabel('Seu nível').fill('50');

  await expect(count).not.toHaveText(before ?? '');

  await page.getByLabel('Buscar lugar').fill('alchemist quarter');

  await expect(page.getByRole('link', { name: 'Alchemist Quarter' })).toBeVisible();
});

test('finds a spot by name', async ({ page }) => {
  await page.getByLabel('Buscar lugar').fill('alchemist quarter');

  await expect(page.getByRole('status')).toHaveText('1 lugar encontrado');
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
