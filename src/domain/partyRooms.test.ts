import { describe, expect, it } from 'vitest';
import {
  fixedRoles,
  getDiscordAppUrl,
  getDiscordIdTime,
  getDiscordProfile,
  getNextRoomCheck,
  getRoomCall,
  getRoomMessage,
  isRoomCallDue,
  ROOM_CALL_COOLDOWN_MS,
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

describe('getRoomCall', () => {
  it('mentions who is away, above the summary', () => {
    expect(getRoomCall(['1', '2'], 'Hunt · Vesperia')).toBe(
      '<@1> <@2> a sala do grupo está aberta. Entrem no canal de voz.\nHunt · Vesperia',
    );
  });

  it('keeps only the summary when nobody is away', () => {
    expect(getRoomCall([], 'Hunt · Vesperia')).toBe('Hunt · Vesperia');
  });
});

describe('isRoomCallDue', () => {
  it('calls in a room with no messages', () => {
    expect(isRoomCallDue(null, MESSAGE_TIME)).toBe(true);
  });

  it('waits after the last message', () => {
    expect(
      isRoomCallDue(MESSAGE_ID, MESSAGE_TIME + ROOM_CALL_COOLDOWN_MS - 1),
    ).toBe(false);
    expect(isRoomCallDue(MESSAGE_ID, MESSAGE_TIME + ROOM_CALL_COOLDOWN_MS)).toBe(
      true,
    );
  });
});

describe('getDiscordAppUrl', () => {
  it('points the room link at the app', () => {
    expect(getDiscordAppUrl('https://discord.com/channels/1/2')).toBe(
      'discord://discord.com/channels/1/2',
    );
  });
});

describe('getDiscordProfile', () => {
  const character = {
    server: 'rubinot',
    name: 'Igdarks soul',
    world: 'Vesperia',
    vocation: 'paladin',
  } as const;

  it('uses the character name and its roles', () => {
    expect(getDiscordProfile(character)).toEqual({
      nick: 'Igdarks soul',
      roles: ['RubinOT', 'RP', 'Vesperia'],
    });
  });

  it('maps every vocation', () => {
    const roles = (['knight', 'sorcerer', 'druid', 'monk'] as const).map(
      (vocation) => getDiscordProfile({ ...character, vocation }).roles[1],
    );

    expect(roles).toEqual(['EK', 'MS', 'ED', 'EM']);
  });

  it('respects the nickname limit', () => {
    const name = 'a'.repeat(40);

    expect(getDiscordProfile({ ...character, name }).nick).toHaveLength(32);
  });
});

describe('getRoomMessage', () => {
  it('sums up the group', () => {
    expect(
      getRoomMessage({
        purpose: 'boss',
        note: 'Rotação GT',
        world: 'Vesperia',
        vocations: ['paladin', 'druid', 'paladin'],
      }),
    ).toBe('Boss · Rotação GT · RP, ED · Vesperia');
  });

  it('skips an empty note', () => {
    expect(
      getRoomMessage({
        purpose: 'hunt',
        note: '',
        world: 'Vesperia',
        vocations: ['knight'],
      }),
    ).toBe('Hunt · EK · Vesperia');
  });
});

describe('fixedRoles', () => {
  it('keeps vocations above servers', () => {
    expect(fixedRoles.map(({ name }) => name)).toEqual([
      'EK',
      'RP',
      'MS',
      'ED',
      'EM',
      'RubinOT',
      'Tibia',
    ]);
  });
});

describe('getNextRoomCheck', () => {
  const room = { lastMessageId: null, isInUse: false };

  it('keeps a room while someone is in voice', () => {
    expect(getNextRoomCheck({ ...room, isInUse: true, now: 1000 })).toBe(
      1000 + ROOM_IDLE_MS,
    );
  });

  it('counts the idle time from the last message', () => {
    const now = MESSAGE_TIME + 1000;

    expect(getNextRoomCheck({ ...room, lastMessageId: MESSAGE_ID, now })).toBe(
      MESSAGE_TIME + ROOM_IDLE_MS,
    );
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

  it('deletes a room nobody ever used', () => {
    expect(getNextRoomCheck({ ...room, now: 1000 })).toBeNull();
  });
});
