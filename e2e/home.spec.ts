import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows the home page without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'Deixa que o nerd faz a conta.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('shows a card for every tool', async ({ page }) => {
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(6);
});

test('marks the unfinished tools as under construction', async ({ page }) => {
  await expect(page.getByText('Em construção')).toHaveCount(4);

  await page.goto('/tools/exercise');
  await expect(page.getByText('Em construção:')).toBeVisible();

  await page.goto('/tools/charms');
  await expect(page.getByText('Em construção:')).toBeHidden();
});

test('opens a tool from its card', async ({ page }) => {
  await page.getByRole('link', { name: 'Hunting places' }).click();

  await expect(page).toHaveURL(/\/tools\/hunting-places\/$/);
});

test('only shows the tool menu inside a tool', async ({ page }) => {
  await expect(page.getByRole('navigation')).toBeHidden();

  await page.goto('/tools/charms');

  await expect(page.getByRole('navigation')).toBeVisible();
});

test('opens the tool menu on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');

  await page.goto('/tools/charms');
  await page.waitForLoadState('networkidle');
  const link = page.getByRole('link', { name: 'Exercise' });

  await expect(link).toBeHidden();

  await page.getByRole('button', { name: 'Menu' }).click();
  await link.click();

  await expect(page).toHaveURL(/\/tools\/exercise\/$/);
});

test('does not scroll horizontally', async ({ page }) => {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});

test('shows the fan site notice with spacing intact', async ({ page }) => {
  const footer = page.getByRole('contentinfo');

  await expect(footer).toContainText('site de fãs, sem vínculo com a CipSoft');
  await expect(footer).toContainText('O Tibia é feito pela CipSoft');
  await expect(
    footer.getByRole('link', { name: 'Tibia', exact: true }),
  ).toBeVisible();
  await expect(footer.getByRole('link', { name: 'CipSoft' })).toBeVisible();
});
