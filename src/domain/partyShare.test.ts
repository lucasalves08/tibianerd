import { describe, expect, it } from 'vitest';
import type { VocationId } from './characterStats';
import { getSharedBonus, hasUnlistedBonus, summarizeParty } from './partyShare';

const member = (vocation: VocationId, level: number) => ({ vocation, level });

describe('getSharedBonus', () => {
  it('grows with the number of different vocations', () => {
    expect(getSharedBonus(['knight', 'knight'])).toBe(0.2);
    expect(getSharedBonus(['knight', 'druid'])).toBe(0.35);
    expect(getSharedBonus(['knight', 'paladin', 'druid'])).toBe(0.7);
    expect(getSharedBonus(['knight', 'paladin', 'druid', 'sorcerer'])).toBe(1);
  });

  it('counts Sorcerer and Druid as different vocations', () => {
    expect(getSharedBonus(['sorcerer', 'druid'])).toBe(0.35);
  });

  it('keeps the last listed bonus for 5 vocations and flags it', () => {
    const all: VocationId[] = ['knight', 'paladin', 'druid', 'sorcerer', 'monk'];

    expect(getSharedBonus(all)).toBe(1);
    expect(hasUnlistedBonus(all)).toBe(true);
    expect(hasUnlistedBonus(['knight'])).toBe(false);
  });
});

describe('summarizeParty', () => {
  it('has no result without members', () => {
    expect(summarizeParty([])).toBeNull();
  });

  it('shows who can join a single player', () => {
    expect(summarizeParty([member('paladin', 967)])?.joinRange).toEqual({
      lowest: 645,
      highest: 1450,
    });
  });

  it('matches the examples of the 2/3 rule', () => {
    expect(
      summarizeParty([member('knight', 40), member('druid', 60)])
        ?.sharesExperience,
    ).toBe(true);
    expect(
      summarizeParty([member('knight', 200), member('druid', 300)])
        ?.sharesExperience,
    ).toBe(true);
    expect(
      summarizeParty([member('knight', 199), member('druid', 300)])
        ?.sharesExperience,
    ).toBe(false);
  });

  it('narrows the range to what fits every member', () => {
    expect(
      summarizeParty([member('knight', 200), member('druid', 300)])?.joinRange,
    ).toEqual({ lowest: 200, highest: 300 });
  });

  it('says the level needed when the party cannot share', () => {
    const summary = summarizeParty([member('knight', 100), member('druid', 200)]);

    expect(summary?.sharesExperience).toBe(false);
    expect(summary?.requiredLowest).toBe(134);
    expect(summary?.joinRange).toBeNull();
  });

  it('splits the creature experience with the bonus', () => {
    const summary = summarizeParty([
      member('knight', 500),
      member('paladin', 500),
      member('druid', 500),
    ]);

    expect(summary?.experiencePerMember).toBeCloseTo(1.7 / 3);
  });
});
