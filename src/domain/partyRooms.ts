import type { VocationId } from './characterStats';
import type { CharacterInfo } from './characters';

const HOUR_IN_MS = 60 * 60 * 1000;
const DISCORD_EPOCH_MS = 1420070400000n;
const TIMESTAMP_SHIFT = 22n;
const MAX_NICKNAME_LENGTH = 32;

/** Product choices: how long a room can stay unused, and how many can exist. */
export const ROOM_IDLE_MS = 7 * 24 * HOUR_IN_MS;
export const MAX_ROOMS = 50;
/** Product choice: a new call in the room waits this long after the last message. */
export const ROOM_CALL_COOLDOWN_MS = 5 * 60 * 1000;

const vocationRoles: Record<VocationId, string> = {
  knight: 'EK',
  paladin: 'RP',
  sorcerer: 'MS',
  druid: 'ED',
  monk: 'EM',
};

const serverRoles = { rubinot: 'RubinOT', tibia: 'Tibia' };

/** Highest first: Discord colors a name by its highest role. */
export const fixedRoles = [
  { name: 'EK', color: 0xe74c3c },
  { name: 'RP', color: 0xf1c40f },
  { name: 'MS', color: 0x3498db },
  { name: 'ED', color: 0x2ecc71 },
  { name: 'EM', color: 0x9b59b6 },
  { name: 'RubinOT', color: 0xe67e22 },
  { name: 'Tibia', color: 0x95a5a6 },
];

export type RoomCharacter = Pick<
  CharacterInfo,
  'server' | 'name' | 'world' | 'vocation'
>;

export interface DiscordProfile {
  nick: string;
  roles: string[];
}

export const getDiscordProfile = ({
  server,
  name,
  world,
  vocation,
}: RoomCharacter): DiscordProfile => ({
  nick: name.slice(0, MAX_NICKNAME_LENGTH),
  roles: [serverRoles[server], vocationRoles[vocation], world],
});

export const getRoomMessage = ({
  purpose,
  note,
  world,
  vocations,
}: {
  purpose: 'hunt' | 'boss';
  note: string;
  world: string;
  vocations: VocationId[];
}): string =>
  [
    purpose === 'boss' ? 'Boss' : 'Hunt',
    note,
    [...new Set(vocations.map((vocation) => vocationRoles[vocation]))].join(', '),
    world,
  ]
    .filter(Boolean)
    .join(' · ');

/** Discord ids carry the moment they were created. */
export const getDiscordIdTime = (id: string): number =>
  Number((BigInt(id) >> TIMESTAMP_SHIFT) + DISCORD_EPOCH_MS);

/** Discord cannot pull anyone into voice, so the bot mentions who is away. */
export const getRoomCall = (discordIds: string[], message: string): string =>
  discordIds.length > 0
    ? `${discordIds.map((id) => `<@${id}>`).join(' ')} a sala do grupo está aberta. Entrem no canal de voz.\n${message}`
    : message;

export const isRoomCallDue = (lastMessageId: string | null, now: number) =>
  !lastMessageId ||
  now - getDiscordIdTime(lastMessageId) >= ROOM_CALL_COOLDOWN_MS;

/** The same room, in the installed Discord app instead of the browser. */
export const getDiscordAppUrl = (url: string) =>
  url.replace('https://', 'discord://');

/** The next time to look at a room, or null when it can be deleted. */
export const getNextRoomCheck = ({
  lastMessageId,
  isInUse,
  now,
}: {
  lastMessageId: string | null;
  isInUse: boolean;
  now: number;
}): number | null => {
  if (isInUse) {
    return now + ROOM_IDLE_MS;
  }

  const nextCheck = lastMessageId
    ? getDiscordIdTime(lastMessageId) + ROOM_IDLE_MS
    : 0;

  return nextCheck > now ? nextCheck : null;
};
