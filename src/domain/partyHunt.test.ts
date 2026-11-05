import { describe, expect, it } from 'vitest';
import { formatHuntStart, getLootSplit, parsePartyHunt } from './partyHunt';

const LOG = `Session data: From 2026-11-05, 14:00:00 to 2026-11-05, 15:12:34
Session: 01:12h
Loot Type: Market
Loot: 12,000,000
Supplies: 3,000,000
Balance: 9,000,000
Igdarks soul (Leader)
	Loot: 7,000,000
	Supplies: 1,000,000
	Balance: 6,000,000
	Damage: 10,000,000
	Healing: 500,000
Monkadaz
	Loot: 3,000,000
	Supplies: 1,000,000
	Balance: 2,000,000
	Damage: 8,000,000
	Healing: 0
Jamalzin Soul
	Loot: 2,000,000
	Supplies: 1,000,000
	Balance: 1,000,000
	Damage: 2,000,000
	Healing: 9,000,000`;

describe('parsePartyHunt', () => {
  it('reads the session and each player', () => {
    expect(parsePartyHunt(LOG)).toMatchObject({
      sessionStart: '2026-11-05, 14:00:00',
      duration: '01:12h',
      players: [
        { name: 'Igdarks soul', balance: 6000000 },
        { name: 'Monkadaz', balance: 2000000 },
        { name: 'Jamalzin Soul', balance: 1000000 },
      ],
    });
  });

  it('reads a negative balance and Windows line breaks', () => {
    const hunt = parsePartyHunt(
      LOG.replace('Balance: 2,000,000', 'Balance: -2,000,000').replace(/\n/g, '\r\n'),
    );

    expect(hunt?.players[1]).toEqual({ name: 'Monkadaz', balance: -2000000 });
  });

  it('computes the balance when the log leaves it out', () => {
    const hunt = parsePartyHunt(
      LOG.split('\n')
        .filter((line) => !line.includes('Balance'))
        .join('\n'),
    );

    expect(hunt?.players[0]?.balance).toBe(6000000);
  });

  it('gives the same fingerprint to the same hunt', () => {
    expect(parsePartyHunt(LOG)?.fingerprint).toBe(
      parsePartyHunt(`\n${LOG}\n`)?.fingerprint,
    );
  });

  it('refuses text that is not a party hunt', () => {
    expect(parsePartyHunt('')).toBeNull();
    expect(parsePartyHunt('Oi, vamos caçar hoje?')).toBeNull();
    expect(parsePartyHunt('Killed Monsters:\n  10x Dragon')).toBeNull();
  });
});

describe('getLootSplit', () => {
  it('leaves each player with the same profit', () => {
    expect(
      getLootSplit([
        { name: 'A', balance: 6000000 },
        { name: 'B', balance: 2000000 },
        { name: 'C', balance: 1000000 },
      ]),
    ).toEqual({
      total: 9000000,
      share: 3000000,
      transfers: [
        { from: 'A', to: 'C', amount: 2000000 },
        { from: 'A', to: 'B', amount: 1000000 },
      ],
    });
  });

  it('splits a loss too', () => {
    expect(
      getLootSplit([
        { name: 'A', balance: 100 },
        { name: 'B', balance: -300 },
      ]),
    ).toEqual({
      total: -200,
      share: -100,
      transfers: [{ from: 'A', to: 'B', amount: 200 }],
    });
  });

  it('asks for nothing when the balances are equal', () => {
    expect(
      getLootSplit([
        { name: 'A', balance: 500 },
        { name: 'B', balance: 500 },
      ]).transfers,
    ).toEqual([]);
  });
});

describe('formatHuntStart', () => {
  it('shortens the date from the game', () => {
    expect(formatHuntStart('2026-11-05, 14:00:00')).toBe('05/11 às 14:00');
  });

  it('keeps a format it does not know', () => {
    expect(formatHuntStart('5 Nov 2026')).toBe('5 Nov 2026');
  });
});
