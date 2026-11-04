import { describe, expect, it } from 'vitest';
import {
  FIXED_ROOM_IDLE_MS,
  getDiscordIdTime,
  getNextRoomCheck,
  ROOM_IDLE_MS,
} from './partyRooms';

// Example from the Discord documentation: 2016-04-30T11:18:25.796Z.
const MESSAGE_ID = '175928847299117063';
const MESSAGE_TIME = 1462015105796;

describe('getDiscordIdTime', () => {
  it('reads the time inside a Discord id', () => {
    expect(getDiscordIdTime(MESSAGE_ID)).toBe(MESSAGE_TIME);
  });
});

describe('getNextRoomCheck', () => {
  const room = { lastMessageId: null, isInUse: false, isFixed: false };

  it('keeps a room while someone is in voice', () => {
    expect(getNextRoomCheck({ ...room, isInUse: true, now: 1000 })).toBe(
      1000 + ROOM_IDLE_MS,
    );
  });

  it('counts the idle time from the last message', () => {
    const now = MESSAGE_TIME + 1000;

    expect(
      getNextRoomCheck({ ...room, lastMessageId: MESSAGE_ID, now }),
    ).toBe(MESSAGE_TIME + ROOM_IDLE_MS);
  });

  it('deletes a room with no use for too long', () => {
    expect(
      getNextRoomCheck({
        ...room,
        lastMessageId: MESSAGE_ID,
        now: MESSAGE_TIME + ROOM_IDLE_MS,
      }),
    ).toBeNull();
  });

  it('gives a fixed room much longer', () => {
    expect(
      getNextRoomCheck({
        ...room,
        isFixed: true,
        lastMessageId: MESSAGE_ID,
        now: MESSAGE_TIME + ROOM_IDLE_MS,
      }),
    ).toBe(MESSAGE_TIME + FIXED_ROOM_IDLE_MS);
  });

  it('deletes a room nobody ever used', () => {
    expect(getNextRoomCheck({ ...room, now: 1000 })).toBeNull();
  });
});
