import { vocations, type VocationId } from './characterStats';

export const gameServers = [
  { id: 'rubinot', name: 'RubinOT' },
  { id: 'tibia', name: 'Tibia' },
] as const;

export type GameServerId = (typeof gameServers)[number]['id'];

export type CharacterSex = 'male' | 'female';

export interface CharacterInfo {
  server: GameServerId;
  name: string;
  world: string;
  vocation: VocationId;
  level: number;
  guild: string | null;
  sex: CharacterSex;
  /** Outfit query for the RubinOT image service. Tibia does not expose it. */
  outfit: string | null;
}

export interface Character extends CharacterInfo {
  id: string;
  isVerified: boolean;
  verificationCode: string | null;
  syncedAt: number | null;
}

/** Product limit against abuse, not a game rule. */
export const MAX_CHARACTERS = 20;

const RUBINOT_OUTFIT_URL = 'https://rubinot.com.br/api/outfit';

const NAME_PATTERN = /^\p{L}[\p{L}' -]{1,29}$/u;

export const cleanCharacterName = (name: unknown): string | null => {
  const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';

  return NAME_PATTERN.test(clean) ? clean : null;
};

export const isGameServer = (server: unknown): server is GameServerId =>
  gameServers.some(({ id }) => id === server);

// "Elite Knight" and "Knight" are the same vocation here.
const toVocation = (text: unknown): VocationId | null => {
  const lower = String(text).toLowerCase();

  return vocations.find(({ id }) => lower.includes(id))?.id ?? null;
};

const toInfo = (
  server: GameServerId,
  raw: {
    name?: unknown;
    world?: unknown;
    vocation?: unknown;
    level?: unknown;
    sex?: unknown;
  },
  guild: unknown,
  outfit: string | null = null,
): CharacterInfo | null => {
  const vocation = toVocation(raw.vocation);

  if (
    typeof raw.name !== 'string' ||
    !raw.name ||
    typeof raw.world !== 'string' ||
    !vocation ||
    !Number.isSafeInteger(raw.level)
  ) {
    return null;
  }

  return {
    server,
    name: raw.name,
    world: raw.world,
    vocation,
    level: raw.level as number,
    guild: typeof guild === 'string' && guild ? guild : null,
    sex: String(raw.sex).toLowerCase() === 'female' ? 'female' : 'male',
    outfit,
  };
};

interface TibiaDataResponse {
  character?: {
    character?: {
      name?: unknown;
      world?: unknown;
      vocation?: unknown;
      level?: unknown;
      sex?: unknown;
      comment?: unknown;
      guild?: { name?: unknown };
    };
  };
}

interface RubinotResponse {
  player?: {
    name?: unknown;
    world?: unknown;
    vocation?: unknown;
    level?: unknown;
    sex?: unknown;
    comment?: unknown;
    guild?: { name?: unknown } | string | null;
    looktype?: unknown;
    lookhead?: unknown;
    lookbody?: unknown;
    looklegs?: unknown;
    lookfeet?: unknown;
    lookaddons?: unknown;
  } | null;
}

export const getCharacterSprite = ({
  outfit,
  vocation,
  sex,
}: Pick<CharacterInfo, 'outfit' | 'vocation' | 'sex'>): string =>
  outfit
    ? `${RUBINOT_OUTFIT_URL}?${outfit}&direction=3&animated=1&walk=1&size=0`
    : `/sprites/vocations/${vocation}-${sex}.png`;

export const createVerificationCode = (random: Uint8Array): string =>
  `TN-${[...random].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

export const readComment = (
  server: GameServerId,
  data: TibiaDataResponse & RubinotResponse,
): string | null => {
  const comment =
    server === 'tibia' ? data.character?.character?.comment : data.player?.comment;

  return typeof comment === 'string' ? comment : null;
};

export const parseTibiaData = (data: TibiaDataResponse): CharacterInfo | null => {
  const character = data.character?.character;

  return character ? toInfo('tibia', character, character.guild?.name) : null;
};

export const parseRubinot = (data: RubinotResponse): CharacterInfo | null => {
  const { player } = data;

  if (!player) {
    return null;
  }

  const guild =
    typeof player.guild === 'object' ? player.guild?.name : player.guild;

  const outfit = Number.isSafeInteger(player.looktype)
    ? `type=${player.looktype}&head=${player.lookhead}&body=${player.lookbody}&legs=${player.looklegs}&feet=${player.lookfeet}&addons=${player.lookaddons}`
    : null;

  return toInfo('rubinot', player, guild, outfit);
};
