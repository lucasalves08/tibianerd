import { expect, test } from '@playwright/test';

const makeAd = (id: string, level: number, isMine = false) => ({
  id,
  purpose: 'hunt',
  boss: null,
  server: 'rubinot',
  world: 'Vesperia',
  vocation: 'druid',
  level,
  note: 'Roshamuul',
  createdAt: 1000,
  expiresAt: Date.now() + 60 * 60 * 1000,
  characterName: `Player ${id}`,
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

test('shows boss ads from the same world at any level', async ({ page }) => {
  await page.route('**/api/party-ads', (route) =>
    route.fulfill({
      json: [{ ...makeAd('boss', 200), purpose: 'boss', boss: 'Ferumbras' }],
    }),
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

  await expect(page.getByText('Boss: Ferumbras')).toBeVisible();
});

test('asks to join and shows the Discord after the answer', async ({ page }) => {
  await page.route('**/api/party-ads', (route) =>
    route.fulfill({ json: [makeAd('near', 900)] }),
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
  await page.route('**/api/party-requests', (route) =>
    route.fulfill({
      json: {
        incoming: [],
        outgoing: [
          {
            id: 'r1',
            adId: 'near',
            status: 'accepted',
            characterName: 'Player near',
            discord: 'player-near',
            discordId: '123',
          },
        ],
      },
    }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByRole('button', { name: /Pedir para entrar/ })).toBeDisabled();
  await expect(page.getByText('player-near')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir perfil' })).toHaveAttribute(
    'href',
    'https://discord.com/users/123',
  );
});

test('says when nobody is looking', async ({ page }) => {
  await page.route('**/api/party-ads', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/characters', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByText('Ninguém procurando agora')).toBeVisible();
});
