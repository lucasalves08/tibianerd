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
  await expect(page.getByRole('status')).toHaveText('6 ferramentas encontradas');
  expect(errors).toEqual([]);
});

test('filters tools while ignoring accents', async ({ page }) => {
  await page.getByLabel('Buscar ferramenta').fill('resistencias');

  await expect(page.getByRole('status')).toHaveText('1 ferramenta encontrada');
  await expect(
    page.getByRole('heading', { name: 'Consulta de monstros' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Imbuements' })).toBeHidden();
});

test('applies a search typed before hydration', async ({ page }) => {
  await page.route('**/_astro/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByLabel('Buscar ferramenta').fill('resistencias');

  await expect(page.getByRole('status')).toHaveText('1 ferramenta encontrada');
});

test('shows an empty state and recovers after clearing', async ({ page }) => {
  const searchBox = page.getByLabel('Buscar ferramenta');

  await searchBox.fill('rashid');
  await expect(page.getByRole('status')).toHaveText('0 ferramentas encontradas');
  await expect(page.getByText('Nenhuma ferramenta encontrada.')).toBeVisible();

  await searchBox.clear();
  await expect(page.getByRole('status')).toHaveText('6 ferramentas encontradas');
  await expect(page.getByText('Nenhuma ferramenta encontrada.')).toBeHidden();
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
  await expect(footer.getByRole('link', { name: 'Tibia' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'CipSoft' })).toBeVisible();
});
