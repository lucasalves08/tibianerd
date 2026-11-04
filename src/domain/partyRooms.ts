const HOUR_IN_MS = 60 * 60 * 1000;
const DISCORD_EPOCH_MS = 1420070400000n;
const TIMESTAMP_SHIFT = 22n;

/** Product choices: how long a room can stay unused before it is deleted. */
export const ROOM_IDLE_MS = 12 * HOUR_IN_MS;
export const FIXED_ROOM_IDLE_MS = 30 * 24 * HOUR_IN_MS;

export const getRoomIdleMs = (isFixed: boolean): number =>
  isFixed ? FIXED_ROOM_IDLE_MS : ROOM_IDLE_MS;

/** Discord ids carry the moment they were created. */
export const getDiscordIdTime = (id: string): number =>
  Number((BigInt(id) >> TIMESTAMP_SHIFT) + DISCORD_EPOCH_MS);

/** The next time to look at a room, or null when it can be deleted. */
export const getNextRoomCheck = ({
  lastMessageId,
  isInUse,
  isFixed,
  now,
}: {
  lastMessageId: string | null;
  isInUse: boolean;
  isFixed: boolean;
  now: number;
}): number | null => {
  const idleMs = getRoomIdleMs(isFixed);

  if (isInUse) {
    return now + idleMs;
  }

  const nextCheck = lastMessageId
    ? getDiscordIdTime(lastMessageId) + idleMs
    : 0;

  return nextCheck > now ? nextCheck : null;
};
