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

test('shows the player photo in the header', async ({ page }) => {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      json: { user: { name: 'lucas', image: '/favicon.svg' } },
    }),
  );
  await page.goto('/conta/');
  await expect(page.getByText('Conectado como')).toBeVisible();
  await page.goto('/');

  const link = page.getByRole('link', { name: 'Sua conta: lucas' });

  await expect(link.locator('img')).toBeVisible();
});

test('adds and lists characters', async ({ page }) => {
  const characters: object[] = [];
  const info = {
    server: 'rubinot',
    name: 'Lucas Teste',
    world: 'Vesperia',
    vocation: 'paladin',
    level: 967,
    guild: null,
  };

  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user: { name: 'lucas' } } }),
  );
  await page.route('**/api/characters/lookup*', (route) =>
    route.fulfill({ json: info }),
  );
  await page.route('**/api/characters', (route) => {
    if (route.request().method() === 'POST') {
      const character = { id: '1', ...info };

      characters.push(character);
      return route.fulfill({ status: 201, json: character });
    }

    return route.fulfill({ json: characters });
  });
  await page.goto('/conta/');

  await page.getByLabel('Nome do personagem').fill('Lucas Teste');
  await page.getByRole('button', { name: 'Adicionar personagem' }).click();

  await expect(page.getByRole('listitem').getByText('Lucas Teste')).toBeVisible();
  await expect(page.getByRole('listitem').getByText('RubinOT, Vesperia')).toBeVisible();
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
