import { expect, test, type Locator, type Page } from '@playwright/test';

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

// Text typed before React takes over the page is lost, so this waits for it.
const paste = async (page: Page, text: string, result: Locator) => {
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Hunt Analyser').fill(text);
  await expect(result).toBeVisible();
};

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
  await paste(page, session('11:32:00'), page.getByText('Média real'));

  await expect(page.getByText('7,70kk', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Undead Dragon' }),
  ).toBeVisible();
  await expect(
    page.getByRole('listitem').filter({ hasText: '1x divine plate' }),
  ).toBeVisible();

  await page.getByRole('radio', { name: 'XP', exact: true }).check();

  await expect(page.getByText('55,47kk', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Entre com o Discord' }),
  ).toBeVisible();
});

test('marks a short session as a projection', async ({ page }) => {
  await paste(
    page,
    session('10:46:24'),
    page.getByText(/· Projeção$/),
  );

  await expect(page.getByText('Estimativas neste ritmo')).toBeVisible();
});

test('shows only real values on a very short session', async ({ page }) => {
  await paste(
    page,
    session('10:34:24'),
    page.getByText(/· Sessão curta$/),
  );

  await expect(page.getByText('Estimativas neste ritmo')).toBeHidden();
  await expect(page.getByText('7,78kk', { exact: true })).toBeVisible();
});

const character = (id: string, name: string, level: number) => ({
  id,
  name,
  level,
  server: 'rubinot',
  world: 'Vesperia',
  vocation: 'paladin',
  isVerified: true,
});

test('uses the only character without asking', async ({ page }) => {
  await page.route('**/api/characters', (route) =>
    route.fulfill({ json: [character('c1', 'Lucas', 973)] }),
  );
  await page.route('**/api/hunt-sessions', (route) => route.fulfill({ json: [] }));
  await page.goto('/tools/hunts/');
  await paste(
    page,
    session('11:32:00'),
    page.getByRole('button', { name: 'Salvar', exact: true }),
  );
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Salvar esta sessão' })).toBeVisible();
  await expect(page.getByText('Lucas', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Personagem')).toBeHidden();
});

test('asks which character when there are more', async ({ page }) => {
  await page.route('**/api/characters', (route) =>
    route.fulfill({
      json: [character('c1', 'Lucas', 973), character('c2', 'Ana', 500)],
    }),
  );
  await page.route('**/api/hunt-sessions', (route) => route.fulfill({ json: [] }));
  await page.goto('/tools/hunts/');
  await paste(page, session('11:32:00'), page.getByText('Um nível no 973'));

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByLabel('Personagem').selectOption('c2');

  await expect(page.getByText('Um nível no 500')).toBeVisible();
});

test('gives way to the result and lets the player paste another', async ({
  page,
}) => {
  await paste(page, session('11:32:00'), page.getByText('Média real'));

  await expect(page.getByLabel('Hunt Analyser')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Sessão de 1h00' })).toBeFocused();

  await page.getByRole('button', { name: 'Colar outra' }).click();

  await expect(page.getByLabel('Hunt Analyser')).toBeFocused();
  await expect(page.getByLabel('Hunt Analyser')).toHaveValue('');
});

test('confirms a saved session and opens it', async ({ page }) => {
  let saved: unknown[] = [];

  await page.route('**/api/characters', (route) =>
    route.fulfill({ json: [character('c1', 'Lucas', 973)] }),
  );
  await page.route('**/api/hunt-sessions', (route) => {
    if (route.request().method() === 'POST') {
      saved = [
        {
          id: 's1',
          characterId: 'c1',
          characterName: 'Lucas',
          level: 973,
          huntName: 'Falcon',
          formation: 'solo',
          session: {
            fingerprint: 'a',
            start: '2026-11-06, 10:31:24',
            seconds: 3636,
            rawXp: 7779296,
            xp: 56010905,
            rawXpPerHour: 7704841,
            xpPerHour: 55474833,
            loot: 1,
            supplies: 1,
            balance: 2918806,
            damage: 1,
            damagePerHour: null,
            healing: 1,
            healingPerHour: null,
            monsters: [{ name: 'Vexclaw', count: 43 }],
            items: [],
          },
        },
      ];

      return route.fulfill({ status: 201 });
    }

    return route.fulfill({ json: saved });
  });
  await page.goto('/tools/hunts/');
  await paste(
    page,
    session('11:32:00'),
    page.getByRole('button', { name: 'Salvar', exact: true }),
  );
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByLabel('Nome da hunt').fill('Falcon');
  await page.getByRole('button', { name: 'Salvar sessão' }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Sessão salva.' }),
  ).toBeVisible();
  await expect(page.getByText('Vexclaw')).toBeVisible();
});

test('explains a pasted text it cannot read', async ({ page }) => {
  await paste(page, 'oi', page.getByText('Não reconhecemos'));

  await expect(page.getByRole('alert')).toContainText('Não reconhecemos');
});
