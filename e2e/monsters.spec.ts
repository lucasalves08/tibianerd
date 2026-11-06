import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/monsters');
  await page.waitForLoadState('networkidle');
});

test('shows the details of a creature', async ({ page }) => {
  await page.getByLabel('Buscar criatura').fill('dragon lord');
  await page.getByRole('button', { name: /^Dragon Lord 1\.900 HP$/ }).click();

  await expect(page.getByRole('heading', { name: 'Dragon Lord' })).toBeVisible();
  await expect(page.getByText('Gelo 110%')).toBeVisible();
  await expect(page.getByText('Freeze')).toBeVisible();
  await expect(page.getByText('Charm Points')).toBeVisible();
  await expect(page.getByText('Mortes por etapa')).toBeVisible();
  await expect(page).toHaveURL(/creature=Dragon/);
});

test('opens a creature from the link', async ({ page }) => {
  await page.goto('/tools/monsters?creature=Dragon');

  await expect(page.getByRole('heading', { name: 'Dragon' })).toBeVisible();
});

test('says when nothing matches', async ({ page }) => {
  await page.getByLabel('Buscar criatura').fill('zzzz');

  await expect(page.getByText('Nenhuma criatura encontrada.')).toBeVisible();
});

test('does not scroll horizontally', async ({ page }) => {
  await page.goto('/tools/monsters?creature=Dragon');

  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
