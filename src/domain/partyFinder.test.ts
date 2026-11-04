import { describe, expect, it } from 'vitest';
import {
  AD_LIFETIME_MS,
  cleanAdNote,
  cleanBossName,
  findCompatibleAds,
  getAdExpiry,
  isAdActive,
  isAdPurpose,
  MAX_NOTE_LENGTH,
  type PartyAd,
} from './partyFinder';

const NOW = 1_000_000;

const makeAd = (id: string, changes: Partial<PartyAd> = {}): PartyAd => ({
  id,
  purpose: 'hunt',
  boss: null,
  server: 'rubinot',
  world: 'Vesperia',
  vocation: 'druid',
  level: 967,
  createdAt: NOW - 1000,
  expiresAt: NOW + 1000,
  ...changes,
});

const ids = (ads: PartyAd[]) => ads.map(({ id }) => id);

describe('cleanAdNote', () => {
  it('cleans spaces and cuts long notes', () => {
    expect(cleanAdNote('  hoje   à noite ')).toBe('hoje à noite');
    expect(cleanAdNote('a'.repeat(500))).toHaveLength(MAX_NOTE_LENGTH);
  });

  it('ignores what is not text', () => {
    expect(cleanAdNote(42)).toBe('');
  });
});

describe('cleanBossName', () => {
  it('cleans the name and refuses an empty one', () => {
    expect(cleanBossName('  Ferumbras  ')).toBe('Ferumbras');
    expect(cleanBossName('   ')).toBeNull();
    expect(cleanBossName(42)).toBeNull();
  });
});

describe('isAdPurpose', () => {
  it('accepts only hunt and boss', () => {
    expect(isAdPurpose('boss')).toBe(true);
    expect(isAdPurpose('quest')).toBe(false);
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
  const seeker = { server: 'rubinot', world: 'Vesperia', level: 967 } as const;

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

  it('ignores the level range for boss ads, but not the world', () => {
    const ads = [
      makeAd('near', { purpose: 'boss', level: 100 }),
      makeAd('away', { purpose: 'boss', level: 100, world: 'Solarian' }),
    ];

    expect(ids(findCompatibleAds(ads, seeker, NOW))).toEqual(['near']);
  });

  it('never mixes worlds', () => {
    const ads = [makeAd('other', { world: 'Solarian' })];

    expect(findCompatibleAds(ads, seeker, NOW)).toEqual([]);
  });

  it('never mixes servers', () => {
    const ads = [makeAd('global', { server: 'tibia' })];

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
