import type { VocationId } from './characterStats';
import type { GameServerId } from './characters';
import { getShareRange } from './partyShare';

export interface PartyAd {
  id: string;
  server: GameServerId;
  world: string;
  vocation: VocationId;
  level: number;
  createdAt: number;
  expiresAt: number;
}

export interface PartyAdView extends PartyAd {
  characterName: string;
  discord: string;
  note: string;
  isMine: boolean;
}

export interface PartySeeker {
  server: GameServerId;
  world: string;
  level: number;
}

const HOUR_IN_MS = 60 * 60 * 1000;

export const MAX_NOTE_LENGTH = 140;

/** Product choice, not a game rule: a hunt plan rarely lasts longer. */
export const AD_LIFETIME_MS = 6 * HOUR_IN_MS;

export const getAdExpiry = (createdAt: number): number =>
  createdAt + AD_LIFETIME_MS;

export const cleanAdNote = (note: unknown): string =>
  typeof note === 'string'
    ? note.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_LENGTH)
    : '';

export const isAdActive = ({ expiresAt }: PartyAd, now: number): boolean =>
  expiresAt > now;

// Newest first, since a recent ad is more likely to get an answer.
export const findCompatibleAds = <Ad extends PartyAd>(
  ads: Ad[],
  { server, world, level }: PartySeeker,
  now: number,
): Ad[] => {
  const { lowest, highest } = getShareRange(level);

  return ads
    .filter(
      (ad) =>
        isAdActive(ad, now) &&
        ad.server === server &&
        ad.world === world &&
        ad.level >= lowest &&
        ad.level <= highest,
    )
    .sort((first, second) => second.createdAt - first.createdAt);
};
