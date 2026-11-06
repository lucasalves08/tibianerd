import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/charms');
  await page.waitForLoadState('networkidle');
});

async function addCreature(page: import('@playwright/test').Page, name: string) {
  await page.getByLabel('Buscar criatura').fill(name);
  await page
    .getByRole('button', { name: new RegExp(`^${name} [\\d.]+ HP$`) })
    .click();
}

test('lists creatures when the search is clicked', async ({ page }) => {
  await page.getByLabel('Buscar criatura').click();

  await expect(page.getByRole('button', { name: /HP$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /HP$/ }).first().click();

  await expect(page.getByLabel('Mortes')).toHaveValue('1');
  await expect(page.getByRole('button', { name: /HP$/ })).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Hunt Analyzer' }).click();
  await page
    .getByLabel('Texto do Hunt Analyzer')
    .fill('Killed Monsters:\n  10x dragon\n  3x not a creature');
  await page.getByRole('button', { name: 'Usar estas criaturas' }).click();

  await expect(page.getByRole('heading', { name: 'Dragon' })).toBeVisible();
  await expect(page.getByLabel('Mortes')).toHaveValue('10');
  await expect(page.getByText('not a creature')).toBeVisible();
});

test('fills life and mana from the vocation and level', async ({ page }) => {
  await page.getByLabel('Vocação').selectOption('paladin');
  await page.getByLabel('Nível').fill('967');

  await expect(page.getByLabel('Vida máxima')).toHaveValue('9775');
  await expect(page.getByLabel('Mana máxima')).toHaveValue('14475');

  await page.getByLabel('Vida máxima').fill('11000');
  await expect(page.getByLabel('Vida máxima')).toHaveValue('11000');
});

test('adds the creatures of a hunting place', async ({ page }) => {
  await page.getByRole('button', { name: 'Hunting place' }).click();
  await page.getByLabel('Hunting place').fill('elf cave');
  await page.getByRole('button', { name: /^Ab'Dendriel Elf Cave/ }).click();

  await expect(page.getByRole('heading', { name: 'Elf Scout' })).toBeVisible();
  await expect(page.getByText('Com o Hunt Analyzer')).toBeVisible();
});

test('remembers the setup after reloading', async ({ page }) => {
  await page.getByLabel('Nível').fill('967');
  await addCreature(page, 'Dragon');
  await page.reload();

  await expect(page.getByLabel('Nível')).toHaveValue('967');
  await expect(page.getByRole('heading', { name: 'Dragon' })).toBeVisible();
});

test('keeps the charm list closed on phones until asked', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');

  const wound = page.getByRole('checkbox', { name: 'Wound' });
  await expect(wound).toBeHidden();

  await page.getByRole('button', { name: /Seus charms/ }).click();

  await expect(wound).toBeVisible();
});

test('shows a loading state until the tool is ready', async ({ page }) => {
  let release = () => {};
  const scriptsHeld = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(/\/_astro\/.*\.js/, async (route) => {
    await scriptsHeld;
    await route.continue();
  });
  await page.goto('/tools/charms', { waitUntil: 'commit' });

  await expect(page.getByRole('status')).toHaveText('Carregando sua caçada…');

  release();

  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.getByText('Adicione as criaturas')).toBeVisible();
});

test('does not scroll horizontally', async ({ page }) => {
  await addCreature(page, 'Dragon');

  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
