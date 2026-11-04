import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/ferramentas/bestiary');
  await page.waitForLoadState('networkidle');
});

async function trackDragon(page: import('@playwright/test').Page, kills: string) {
  await page.getByLabel('Buscar criatura').fill('dragon');

  const dragon = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Dragon', exact: true }),
  });

  await dragon.getByLabel('Mortes').fill(kills);

  return dragon;
}

test('opens from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Bestiary' }).click();

  await expect(page.getByRole('heading', { name: 'Bestiary', level: 1 })).toBeVisible();
});

test('shows the stage and the kills left', async ({ page }) => {
  const dragon = await trackDragon(page, '600');

  await expect(dragon).toContainText('Etapa 2 de 3');
  await expect(dragon).toContainText('faltam 400 mortes');
});

test('adds Charm Points when an entry is complete', async ({ page }) => {
  const dragon = await trackDragon(page, '1000');

  await expect(dragon).toContainText('Completo');
  await expect(page.getByText('Charm Points ganhos').locator('..')).toContainText('25');
});

test('remembers progress after reloading', async ({ page }) => {
  await trackDragon(page, '600');
  await page.reload();
  await page.getByLabel('Buscar criatura').fill('dragon');

  const dragon = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Dragon', exact: true }),
  });

  await expect(dragon.getByLabel('Mortes')).toHaveValue('600');
});

test('does not scroll horizontally', async ({ page }) => {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
