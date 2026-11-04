import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/ferramentas/charms');
  await page.waitForLoadState('networkidle');
});

async function addCreature(page: import('@playwright/test').Page, name: string) {
  await page.getByLabel('Buscar criatura').fill(name);
  await page
    .getByRole('button', { name: new RegExp(`^${name} [\\d.]+ HP$`) })
    .click();
}

test('opens from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Charms' }).click();

  await expect(
    page.getByRole('heading', { name: 'Otimizador de charms' }),
  ).toBeVisible();
});

test('recommends a different charm for each creature', async ({ page }) => {
  await addCreature(page, 'Dragon');
  await addCreature(page, 'Dragon Lord');

  const dragon = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Dragon', exact: true }),
  });
  const dragonLord = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Dragon Lord', exact: true }),
  });

  await expect(dragon).toContainText('Wound T2');
  await expect(dragonLord).toContainText('Freeze T2');
});

test('applies the level limit', async ({ page }) => {
  await page.getByLabel('Nível').fill('20');
  await addCreature(page, 'Dragon Lord');

  await expect(page.getByText('limitado pelo nível')).toBeVisible();
});

test('reads a Hunt Analyzer log', async ({ page }) => {
  await page.getByRole('button', { name: 'Colar do Hunt Analyzer' }).click();
  await page
    .getByLabel('Texto do Hunt Analyzer')
    .fill('Killed Monsters:\n  10x dragon\n  3x not a creature');
  await page.getByRole('button', { name: 'Usar estas criaturas' }).click();

  await expect(page.getByRole('heading', { name: 'Dragon' })).toBeVisible();
  await expect(page.getByLabel('Mortes')).toHaveValue('10');
  await expect(page.getByText('not a creature')).toBeVisible();
});

test('remembers the setup after reloading', async ({ page }) => {
  await page.getByLabel('Nível').fill('967');
  await addCreature(page, 'Dragon');
  await page.reload();

  await expect(page.getByLabel('Nível')).toHaveValue('967');
  await expect(page.getByRole('heading', { name: 'Dragon' })).toBeVisible();
});

test('does not scroll horizontally', async ({ page }) => {
  await addCreature(page, 'Dragon');

  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
