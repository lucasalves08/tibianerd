import type { RubinotWorld } from '../data/rubinotWorlds';
import type { VocationId } from './characterStats';
import { getShareRange } from './partyShare';

export interface PartyAd {
  id: string;
  world: RubinotWorld;
  vocation: VocationId;
  level: number;
  createdAt: number;
  expiresAt: number;
}

export interface PartySeeker {
  world: RubinotWorld;
  level: number;
}

const HOUR_IN_MS = 60 * 60 * 1000;

/** Product choice, not a game rule: a hunt plan rarely lasts longer. */
export const AD_LIFETIME_MS = 6 * HOUR_IN_MS;

export const getAdExpiry = (createdAt: number): number =>
  createdAt + AD_LIFETIME_MS;

export const isAdActive = ({ expiresAt }: PartyAd, now: number): boolean =>
  expiresAt > now;

// Newest first, since a recent ad is more likely to get an answer.
export const findCompatibleAds = (
  ads: PartyAd[],
  { world, level }: PartySeeker,
  now: number,
): PartyAd[] => {
  const { lowest, highest } = getShareRange(level);

  return ads
    .filter(
      (ad) =>
        isAdActive(ad, now) &&
        ad.world === world &&
        ad.level >= lowest &&
        ad.level <= highest,
    )
    .sort((first, second) => second.createdAt - first.createdAt);
};
