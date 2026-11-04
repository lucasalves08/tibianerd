import { describe, expect, it } from 'vitest';
import { LAUNCH_WORLD, rubinotWorlds } from '../data/rubinotWorlds';
import {
  AD_LIFETIME_MS,
  cleanAdNote,
  findCompatibleAds,
  getAdExpiry,
  isAdActive,
  MAX_NOTE_LENGTH,
  type PartyAd,
} from './partyFinder';

const NOW = 1_000_000;

const makeAd = (id: string, changes: Partial<PartyAd> = {}): PartyAd => ({
  id,
  world: 'Vesperia',
  vocation: 'druid',
  level: 967,
  createdAt: NOW - 1000,
  expiresAt: NOW + 1000,
  ...changes,
});

const ids = (ads: PartyAd[]) => ads.map(({ id }) => id);

describe('rubinotWorlds', () => {
  it('lists the 16 worlds and launches on one of them', () => {
    expect(rubinotWorlds).toHaveLength(16);
    expect(rubinotWorlds).toContain(LAUNCH_WORLD);
  });
});

describe('cleanAdNote', () => {
  it('cleans spaces and cuts long notes', () => {
    expect(cleanAdNote('  hoje   à noite ')).toBe('hoje à noite');
    expect(cleanAdNote('a'.repeat(500))).toHaveLength(MAX_NOTE_LENGTH);
  });

  it('ignores what is not text', () => {
    expect(cleanAdNote(42)).toBe('');
  });
});

describe('ad expiry', () => {
  it('ends after the ad lifetime', () => {
    const ad = makeAd('a', { expiresAt: getAdExpiry(NOW) });

    expect(isAdActive(ad, NOW + AD_LIFETIME_MS - 1)).toBe(true);
    expect(isAdActive(ad, NOW + AD_LIFETIME_MS)).toBe(false);
  });
});

describe('findCompatibleAds', () => {
  const seeker = { world: 'Vesperia', level: 967 } as const;

  it('keeps the ads inside the level range', () => {
    const ads = [
      makeAd('low', { level: 644 }),
      makeAd('lowest', { level: 645 }),
      makeAd('highest', { level: 1450 }),
      makeAd('high', { level: 1451 }),
    ];

    expect(ids(findCompatibleAds(ads, seeker, NOW)).sort()).toEqual([
      'highest',
      'lowest',
    ]);
  });

  it('never mixes worlds', () => {
    const ads = [makeAd('other', { world: 'Solarian' })];

    expect(findCompatibleAds(ads, seeker, NOW)).toEqual([]);
  });

  it('drops expired ads', () => {
    const ads = [makeAd('old', { expiresAt: NOW })];

    expect(findCompatibleAds(ads, seeker, NOW)).toEqual([]);
  });

  it('shows the newest ads first', () => {
    const ads = [
      makeAd('older', { createdAt: NOW - 500 }),
      makeAd('newer', { createdAt: NOW - 100 }),
    ];

    expect(ids(findCompatibleAds(ads, seeker, NOW))).toEqual(['newer', 'older']);
  });
});
