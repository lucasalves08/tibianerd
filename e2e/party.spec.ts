import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/party');
  await page.waitForLoadState('networkidle');
});

async function fillMember(
  page: import('@playwright/test').Page,
  index: number,
  vocation: string,
  level: string,
) {
  await page.getByLabel('Vocação').nth(index).selectOption(vocation);
  await page.getByLabel('Nível').nth(index).fill(level);
}

test('shows who can join a single player', async ({ page }) => {
  await fillMember(page, 0, 'paladin', '967');

  await expect(page.getByText('645 a 1.450')).toBeVisible();
});

test('shows the bonus of a party that shares', async ({ page }) => {
  await fillMember(page, 0, 'knight', '500');
  await fillMember(page, 1, 'paladin', '500');
  await page.getByRole('button', { name: 'Adicionar membro' }).click();
  await fillMember(page, 2, 'druid', '500');

  await expect(page.getByText('Divide XP', { exact: true })).toBeVisible();
  await expect(page.getByText('70%')).toBeVisible();
  await expect(page.getByText('56,7%')).toBeVisible();
});

test('explains why a party does not share', async ({ page }) => {
  await fillMember(page, 0, 'knight', '100');
  await fillMember(page, 1, 'druid', '200');

  await expect(page.getByText('Não divide XP')).toBeVisible();
  await expect(page.getByText('pelo menos 134')).toBeVisible();
});

test('remembers the party after reloading', async ({ page }) => {
  await fillMember(page, 0, 'paladin', '967');
  await page.reload();

  await expect(page.getByLabel('Nível').first()).toHaveValue('967');
});

test('does not scroll horizontally', async ({ page }) => {
  await page.getByRole('button', { name: 'Adicionar membro' }).click();

  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });

  expect(overflow).toBe(0);
});
