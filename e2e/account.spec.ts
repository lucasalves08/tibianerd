import { expect, test } from '@playwright/test';

test('reaches the login from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/conta\/$/);
});

test('links the privacy page in the footer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacidade' }).click();

  await expect(
    page.getByRole('heading', { name: 'Privacidade' }),
  ).toBeVisible();
});

test('offers Discord login to visitors', async ({ page }) => {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto('/conta/');

  await expect(
    page.getByRole('button', { name: 'Entrar com Discord' }),
  ).toBeVisible();
});

test('keeps the login button when the session never answers', async ({
  page,
}) => {
  await page.route('**/api/auth/get-session', () => {});
  await page.goto('/conta/');

  await expect(
    page.getByRole('button', { name: 'Entrar com Discord' }),
  ).toBeVisible({ timeout: 12000 });
});

test('shows the signed in player', async ({ page }) => {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user: { name: 'lucas' } } }),
  );
  await page.goto('/conta/');

  await expect(page.getByText('Conectado como')).toContainText('lucas');
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
});
