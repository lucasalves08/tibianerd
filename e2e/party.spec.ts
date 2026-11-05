import { expect, test } from '@playwright/test';

const makeAd = (id: string, level: number, isMine = false) => ({
  id,
  purpose: 'hunt',
  server: 'rubinot',
  world: 'Vesperia',
  vocation: 'druid',
  level,
  note: 'Roshamuul',
  createdAt: 1000,
  expiresAt: Date.now() + 60 * 60 * 1000,
  characterName: `Player ${id}`,
  outfit: null,
  sex: 'male',
  isVerified: false,
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
      json: [{ ...makeAd('boss', 200), purpose: 'boss', note: 'Rotação GT' }],
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

  await expect(page.getByText('Rotação GT')).toBeVisible();
});

test('leads to the group after the answer', async ({ page }) => {
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
          },
        ],
      },
    }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByRole('link', { name: 'Ver grupo' })).toHaveAttribute(
    'href',
    '/tools/party/group/near/',
  );
});

test('shows the group with its members and the loot split', async ({ page }) => {
  await page.route('**/api/party-groups/g1', (route) =>
    route.fulfill({
      json: {
        id: 'g1',
        ownerName: 'Lucas',
        purpose: 'hunt',
        server: 'rubinot',
        world: 'Vesperia',
        note: '',
        memberCount: 2,
        expiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
        isLeader: false,
        members: [
          {
            id: 'c1',
            name: 'Lucas',
            vocation: 'paladin',
            level: 967,
            server: 'rubinot',
            world: 'Vesperia',
            outfit: null,
            sex: 'male',
            isVerified: false,
            isLeader: true,
            isMine: false,
            discord: 'lucas',
            discordId: '123',
          },
          {
            id: 'c2',
            name: 'Ana',
            vocation: 'druid',
            level: 900,
            server: 'rubinot',
            world: 'Vesperia',
            outfit: null,
            sex: 'female',
            isVerified: false,
            isLeader: false,
            isMine: true,
            discord: 'ana',
            discordId: '456',
          },
        ],
        hunts: [
          {
            id: 'h1',
            sessionStart: '2026-11-05, 14:00:00',
            duration: '01:12h',
            players: [
              { name: 'Lucas', balance: 3000 },
              { name: 'Ana', balance: 1000 },
            ],
            createdAt: 1000,
            canRemove: false,
          },
        ],
      },
    }),
  );
  await page.goto('/tools/party/group/g1/');

  await expect(
    page.getByRole('heading', { name: 'Grupo de Lucas' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /perfil de lucas/ })).toHaveAttribute(
    'href',
    'https://discord.com/users/123',
  );
  await expect(page.getByRole('button', { name: 'Sair do grupo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Encerrar grupo' })).toBeHidden();
  await expect(page.getByText('Lucas paga Ana')).toBeVisible();
  await expect(page.getByText('1.000', { exact: true })).toBeVisible();
});

test('explains a pasted text it cannot read', async ({ page }) => {
  await page.route('**/api/party-groups/g1', (route) =>
    route.fulfill({
      json: {
        id: 'g1',
        ownerName: 'Lucas',
        purpose: 'hunt',
        server: 'rubinot',
        world: 'Vesperia',
        note: '',
        memberCount: 0,
        expiresAt: Date.now() + 60 * 60 * 1000,
        isLeader: false,
        members: [],
        hunts: [],
      },
    }),
  );
  await page.route('**/api/party-groups/g1/hunts', (route) =>
    route.fulfill({ status: 400, json: { error: 'invalid' } }),
  );
  await page.goto('/tools/party/group/g1/');

  await page.getByLabel('Party Hunt Analyser').fill('oi');
  await page.getByRole('button', { name: 'Adicionar hunt' }).click();

  await expect(page.getByRole('alert')).toContainText('Não reconhecemos');
});

test('says when a group is not available', async ({ page }) => {
  await page.route('**/api/party-groups/g1', (route) =>
    route.fulfill({ status: 404, json: { error: 'not-found' } }),
  );
  await page.goto('/tools/party/group/g1/');

  await expect(
    page.getByRole('heading', { name: 'Grupo não encontrado' }),
  ).toBeVisible();
});

test('says when nobody is looking', async ({ page }) => {
  await page.route('**/api/party-ads', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/characters', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto('/tools/party/');

  await expect(page.getByText('Ninguém procurando agora')).toBeVisible();
});

test('explains the ad limit', async ({ page }) => {
  await page.route('**/api/party-ads', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 409, json: { error: 'limit' } })
      : route.fulfill({ json: [makeAd('mine', 900, true)] }),
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

  await expect(page.getByRole('heading', { name: 'Player mine' })).toBeVisible();
  await page.getByRole('button', { name: 'Publicar anúncio' }).click();

  await expect(page.getByRole('alert')).toContainText('Você já tem 4 anúncios');
});
