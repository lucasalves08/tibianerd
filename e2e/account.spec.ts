import { expect, test } from '@playwright/test';

test('offers Discord login to visitors', async ({ page }) => {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto('/conta/');

  await expect(
    page.getByRole('button', { name: 'Entrar com Discord' }),
  ).toBeVisible();
});

test('shows the signed in player', async ({ page }) => {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user: { name: 'lucas' } } }),
  );
  await page.goto('/conta/');

  await expect(page.getByText('Conectado como')).toContainText('lucas');
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
});
