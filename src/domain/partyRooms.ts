import type { VocationId } from './characterStats';
import type { CharacterInfo } from './characters';

const HOUR_IN_MS = 60 * 60 * 1000;
const DISCORD_EPOCH_MS = 1420070400000n;
const TIMESTAMP_SHIFT = 22n;
const MAX_NICKNAME_LENGTH = 32;

/** Product choices: how long a room can stay unused, and how many can exist. */
export const ROOM_IDLE_MS = 7 * 24 * HOUR_IN_MS;
export const MAX_ROOMS = 50;

const vocationRoles: Record<VocationId, string> = {
  knight: 'EK',
  paladin: 'RP',
  sorcerer: 'MS',
  druid: 'ED',
  monk: 'EM',
};

const serverRoles = { rubinot: 'RubinOT', tibia: 'Tibia' };

export interface DiscordProfile {
  nick: string;
  roles: string[];
}

export const getDiscordProfile = ({
  server,
  name,
  world,
  vocation,
}: Pick<CharacterInfo, 'server' | 'name' | 'world' | 'vocation'>): DiscordProfile => ({
  nick: name.slice(0, MAX_NICKNAME_LENGTH),
  roles: [serverRoles[server], vocationRoles[vocation], world],
});

/** Discord ids carry the moment they were created. */
export const getDiscordIdTime = (id: string): number =>
  Number((BigInt(id) >> TIMESTAMP_SHIFT) + DISCORD_EPOCH_MS);

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
