import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/ferramentas/exercise');
  await page.waitForLoadState('networkidle');
});

async function fillKnightGoal(page: Page) {
  await page.getByLabel('Skill atual').fill('110');
  await page.getByLabel('Skill desejada').fill('120');
}

test('opens from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Calculadora de exercise' }).click();

  await expect(
    page.getByRole('heading', { name: 'Calculadora de exercise' }),
  ).toBeVisible();
});

test('shows the weapons for a Knight', async ({ page }) => {
  await fillKnightGoal(page);

  const mix = page.getByRole('list').filter({ hasText: 'Lasting' });

  await expect(mix).toContainText('105×');
  await expect(mix).toContainText('7×');
  await expect(mix).toContainText('2×');
});

test('reduces the charges with a bonus', async ({ page }) => {
  await fillKnightGoal(page);
  await page.getByLabel('Evento de skill em dobro').check();

  await expect(page.getByRole('list').filter({ hasText: 'Lasting' })).toContainText(
    '52×',
  );
});

test('explains an invalid target after leaving the field', async ({ page }) => {
  await page.getByLabel('Skill atual').fill('120');
  await page.getByLabel('Skill desejada').fill('100');
  await page.getByLabel('Skill desejada').blur();

  await expect(
    page.getByText('A skill desejada precisa ser maior que a atual.'),
  ).toBeVisible();
  await expect(page.getByText('Compra sugerida')).toBeHidden();
});

test('limits skills by vocation', async ({ page }) => {
  await page.getByLabel('Vocação').selectOption('Sorcerer');

  await expect(page.getByRole('combobox').nth(1)).toHaveValue('sorcerer-magic');
});

test('remembers the values after reloading', async ({ page }) => {
  await fillKnightGoal(page);
  await page.reload();

  await expect(page.getByLabel('Skill atual')).toHaveValue('110');
});

test('does not scroll horizontally', async ({ page }) => {
  await fillKnightGoal(page);

  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
