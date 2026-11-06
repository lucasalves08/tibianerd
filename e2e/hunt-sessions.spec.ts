import { expect, test } from '@playwright/test';

const session = (end: string) => `Session data: From 2026-11-06, 10:31:24 to 2026-11-06, ${end}
Session length: 01:00h
Raw XP Gain: 7.779.296
XP Gain: 56.010.905
XP/h: 55.474.833
Raw XP/h: 7.704.841
Loot: 3.175.948
Supplies: 257.272
Balance: 2.918.806
Damage: 9.488.713
Damage/h: 9.395.428
Healing: 2.328.120
Healing/h: 2.305.317
Killed Monsters:
\t434x Undead Dragon
\t43x Vexclaw
Looted Items:
\t1x divine plate
\t219x black pearl
`;

test.beforeEach(async ({ page }) => {
  await page.route('**/api/characters', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.route('**/api/hunt-sessions', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.goto('/tools/hunts/');
});

test('shows a session and switches between Raw XP and XP', async ({ page }) => {
  await page.getByLabel('Hunt Analyser').fill(session('11:32:00'));

  await expect(page.getByText('Média real')).toBeVisible();
  await expect(page.getByText('7,70kk', { exact: true })).toBeVisible();
  await expect(page.getByText('Undead Dragon')).toBeVisible();
  await expect(page.getByText('1x divine plate')).toBeVisible();

  await page.getByRole('radio', { name: 'XP', exact: true }).check();

  await expect(page.getByText('55,47kk', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Entre com o Discord' }),
  ).toBeVisible();
});

test('marks a short session as a projection', async ({ page }) => {
  await page.getByLabel('Hunt Analyser').fill(session('10:46:24'));

  await expect(page.getByText('Projeção', { exact: true })).toBeVisible();
  await expect(page.getByText('Estimativas neste ritmo')).toBeVisible();
});

test('shows only real values on a very short session', async ({ page }) => {
  await page.getByLabel('Hunt Analyser').fill(session('10:34:24'));

  await expect(page.getByText('Sessão curta', { exact: true })).toBeVisible();
  await expect(page.getByText('Estimativas neste ritmo')).toBeHidden();
  await expect(page.getByText('7,78kk', { exact: true })).toBeVisible();
});

test('explains a pasted text it cannot read', async ({ page }) => {
  await page.getByLabel('Hunt Analyser').fill('oi');

  await expect(page.getByRole('alert')).toContainText('Não reconhecemos');
});
