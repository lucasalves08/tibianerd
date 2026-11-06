import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatDuration,
  getHuntAverages,
  getKillCount,
  getMinutesPerLevel,
  getSessionKind,
  getSessionRates,
  parseHuntSession,
  type HuntSession,
  type SavedHuntSession,
} from './huntSession';

const SAMPLE = `Session data: From 2026-11-06, 10:31:24 to 2026-11-06, 11:32:00
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
\t332x Blightwalker
\t181x Hellflayer
\t434x Undead Dragon
\t43x Vexclaw
Looted Items:
\t219x black pearl
\t1x divine plate
\t3475x platinum coin
`;

const session = parseHuntSession(SAMPLE) as HuntSession;

describe('parseHuntSession', () => {
  it('reads a real session', () => {
    expect(session).toMatchObject({
      start: '2026-11-06, 10:31:24',
      seconds: 3636,
      rawXp: 7779296,
      xp: 56010905,
      xpPerHour: 55474833,
      rawXpPerHour: 7704841,
      loot: 3175948,
      supplies: 257272,
      balance: 2918806,
      damagePerHour: 9395428,
      healingPerHour: 2305317,
    });
  });

  it('orders monsters and items by count', () => {
    expect(session.monsters[0]).toEqual({ name: 'Undead Dragon', count: 434 });
    expect(session.items[0]).toEqual({ name: 'platinum coin', count: 3475 });
    expect(session.items).toHaveLength(3);
  });

  it('accepts a loss', () => {
    const loss = SAMPLE.replace('Balance: 2.918.806', 'Balance: -12.000');

    expect(parseHuntSession(loss)?.balance).toBe(-12000);
  });

  it('falls back on the session length', () => {
    const text = SAMPLE.replace(/^Session data.*$/m, '');

    expect(parseHuntSession(text)?.seconds).toBe(3600);
  });

  it('refuses text that is not a session', () => {
    expect(parseHuntSession('oi')).toBeNull();
    expect(
      parseHuntSession(
        'Session data: From 2026-11-05, 14:03:20 to 2026-11-05, 15:15:40\nSession: 01:12h\nLoot: 100\nBalance: 50',
      ),
    ).toBeNull();
  });
});

describe('getSessionKind', () => {
  it('separates real averages, projections and short sessions', () => {
    expect(getSessionKind(3600)).toBe('real');
    expect(getSessionKind(3599)).toBe('projection');
    expect(getSessionKind(600)).toBe('projection');
    expect(getSessionKind(599)).toBe('short');
  });
});

describe('getSessionRates', () => {
  it('keeps the rates of the game and works out the others', () => {
    expect(getKillCount(session)).toBe(990);
    expect(getSessionRates(session)).toMatchObject({
      xp: 55474833,
      rawXp: 7704841,
      balance: 2889906,
      kills: 980,
    });
  });

  it('projects a short session when the game gives no rate', () => {
    const short = { ...session, seconds: 900, xpPerHour: null, xp: 1_000_000 };

    expect(getSessionRates(short).xp).toBe(4_000_000);
  });
});

describe('getMinutesPerLevel', () => {
  it('uses the experience of the level', () => {
    expect(getMinutesPerLevel(973, 55474833)).toBe(51);
  });

  it('gives nothing without experience', () => {
    expect(getMinutesPerLevel(973, 0)).toBeNull();
  });
});

describe('getHuntAverages', () => {
  const entry = (
    huntName: string,
    seconds: number,
    rawXp: number,
  ): SavedHuntSession => ({
    id: huntName,
    characterId: 'c1',
    characterName: 'Igdarks soul',
    level: 973,
    huntName,
    formation: 'solo',
    session: { ...session, seconds, rawXp, xp: rawXp, balance: 0 },
  });

  it('weighs each session by its time', () => {
    const [average] = getHuntAverages([
      entry('Falcon', 3600, 8_000_000),
      entry('falcon', 900, 500_000),
    ]);

    expect(average).toMatchObject({
      sessions: 2,
      seconds: 4500,
      rawXpPerHour: 6_800_000,
    });
  });

  it('keeps different hunts apart', () => {
    expect(
      getHuntAverages([entry('Falcon', 3600, 1), entry('Roshamuul', 3600, 1)]),
    ).toHaveLength(2);
  });
});

describe('formats', () => {
  it('shortens big numbers', () => {
    expect(formatCompact(55474833)).toBe('55,47kk');
    expect(formatCompact(-918000)).toBe('-918k');
    expect(formatCompact(980)).toBe('980');
  });

  it('writes the duration', () => {
    expect(formatDuration(3636)).toBe('1h00');
    expect(formatDuration(900)).toBe('15 min');
  });
});
