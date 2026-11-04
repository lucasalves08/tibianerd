import { expect, test } from '@playwright/test';

const makeAd = (id: string, level: number, isMine = false) => ({
  id,
  world: 'Vesperia',
  vocation: 'druid',
  level,
  note: 'Roshamuul',
  createdAt: 1000,
  expiresAt: Date.now() + 60 * 60 * 1000,
  characterName: `Player ${id}`,
  discord: `discord-${id}`,
  isMine,
});

test('asks visitors to sign in and still shows the ads', async ({ page }) => {
  await page.route('**/api/party-ads', (route) =>
    route.fulfill({ json: [makeAd('a', 900)] }),
  );
  await page.route('**/api/characters', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByRole('heading', { name: 'Player a' })).toBeVisible();
  await expect(page.getByText('discord-a')).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Entrar' }),
  ).toBeVisible();
});

test('shows only ads that share experience with the character', async ({
  page,
}) => {
  await page.route('**/api/party-ads', (route) =>
    route.fulfill({ json: [makeAd('near', 900), makeAd('far', 200)] }),
  );
  await page.route('**/api/characters', (route) =>
    route.fulfill({
      json: [
        {
          id: 'c1',
          server: 'rubinot',
          name: 'Lucas',
          world: 'Vesperia',
          vocation: 'paladin',
          level: 967,
        },
      ],
    }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByRole('heading', { name: 'Player near' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player far' })).toBeHidden();
});

test('says when nobody is looking', async ({ page }) => {
  await page.route('**/api/party-ads', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/characters', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByText('Ninguém procurando agora')).toBeVisible();
});
