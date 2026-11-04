import { env } from 'cloudflare:workers';
import {
  fixedRoles,
  getDiscordProfile,
  type RoomCharacter,
} from '../domain/partyRooms';
import { db } from './db';

const API_URL = 'https://discord.com/api/v10';
const TEXT_CHANNEL = 0;
const ROLE_OVERWRITE = 0;
const MEMBER_OVERWRITE = 1;
const VIEW_CHANNEL = 1024;
const SEND_MESSAGES = 2048;
const WELCOME_STEP = 'welcome-channel';

export const guildPath = `/guilds/${env.DISCORD_GUILD_ID}`;

export const discord = (path: string, init: RequestInit = {}) =>
  fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

export const getMemberRoles = async (
  userId: string,
): Promise<string[] | null> => {
  const response = await discord(`${guildPath}/members/${userId}`);

  if (!response.ok) {
    return null;
  }

  return ((await response.json()) as { roles: string[] }).roles;
};

const getRoleId = async (name: string, color = 0): Promise<string | null> => {
  const saved = await db
    .prepare('SELECT role_id AS roleId FROM discord_roles WHERE name = ?')
    .bind(name)
    .first<{ roleId: string }>();

  if (saved) {
    return saved.roleId;
  }

  const response = await discord(`${guildPath}/roles`, {
    method: 'POST',
    body: JSON.stringify({ name, color, mentionable: true }),
  });

  if (!response.ok) {
    return null;
  }

  const { id } = (await response.json()) as { id: string };

  await db
    .prepare('INSERT OR IGNORE INTO discord_roles (name, role_id) VALUES (?, ?)')
    .bind(name, id)
    .run();

  return id;
};

const welcomeMessage = () => `**Boas-vindas ao TibiaNerd!**

Aqui você encontra gente para caçar no Tibia e no RubinOT.

**Como começar**
1. Entre em ${env.BETTER_AUTH_URL}/account/ com o Discord.
2. Cadastre e verifique seu personagem.
3. Use **Usar no Discord** para receber seu nome e seus cargos.
4. Procure grupo em ${env.BETTER_AUTH_URL}/tools/party/

**Regras**
- Respeite todo mundo.
- Nada de cheats, bots ou comércio por dinheiro real.
- Não finja ser outro jogador.

O TibiaNerd é um site de fãs, sem vínculo com a CipSoft.`;

// Runs once. The channel stays read-only, so the rules do not get buried.
const createWelcomeChannel = async () => {
  const done = await db
    .prepare('SELECT step FROM discord_setup WHERE step = ?')
    .bind(WELCOME_STEP)
    .first<{ step: string }>();

  if (done) {
    return;
  }

  const channel = await discord(`${guildPath}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'boas-vindas',
      type: TEXT_CHANNEL,
      permission_overwrites: [
        {
          id: env.DISCORD_GUILD_ID,
          type: ROLE_OVERWRITE,
          allow: String(VIEW_CHANNEL),
          deny: String(SEND_MESSAGES),
        },
        {
          id: env.DISCORD_CLIENT_ID,
          type: MEMBER_OVERWRITE,
          allow: String(VIEW_CHANNEL + SEND_MESSAGES),
        },
      ],
    }),
  });

  if (!channel.ok) {
    return;
  }

  const { id } = (await channel.json()) as { id: string };

  await db
    .prepare('INSERT OR IGNORE INTO discord_setup (step, done_at) VALUES (?, ?)')
    .bind(WELCOME_STEP, Date.now())
    .run();
  await discord(`/channels/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content: welcomeMessage() }),
  });
};

// New roles land at the bottom, so creating in order keeps vocations on top.
const createFixedRoles = async () => {
  for (const { name, color } of fixedRoles) {
    await getRoleId(name, color);
  }
};

export const syncMember = async (
  userId: string,
  currentRoles: string[],
  character: RoomCharacter,
): Promise<boolean> => {
  await createWelcomeChannel();
  await createFixedRoles();

  const { nick, roles } = getDiscordProfile(character);
  const { results } = await db
    .prepare('SELECT role_id AS roleId FROM discord_roles')
    .all<{ roleId: string }>();
  const managed = new Set(results.map(({ roleId }) => roleId));
  const wanted: (string | null)[] = [];

  for (const name of roles) {
    wanted.push(await getRoleId(name));
  }

  const kept = currentRoles.filter((roleId) => !managed.has(roleId));
  const memberPath = `${guildPath}/members/${userId}`;
  const response = await discord(memberPath, {
    method: 'PATCH',
    body: JSON.stringify({
      roles: [...kept, ...wanted.filter((roleId) => roleId !== null)],
    }),
  });

  // The server owner cannot be renamed, so this one may fail on its own.
  await discord(memberPath, {
    method: 'PATCH',
    body: JSON.stringify({ nick }),
  });

  return response.ok;
};
