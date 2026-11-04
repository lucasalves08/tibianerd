import type { VocationId } from './characterStats';
import type { CharacterSex, GameServerId } from './characters';
import { getShareRange } from './partyShare';

export const adPurposes = [
  { id: 'hunt', name: 'Hunt' },
  { id: 'boss', name: 'Boss' },
] as const;

export type AdPurpose = (typeof adPurposes)[number]['id'];

export interface PartyAd {
  id: string;
  purpose: AdPurpose;
  server: GameServerId;
  world: string;
  vocation: VocationId;
  level: number;
  createdAt: number;
  expiresAt: number;
}

export interface PartyAdView extends PartyAd {
  characterName: string;
  outfit: string | null;
  sex: CharacterSex;
  isVerified: boolean;
  note: string;
  isMine: boolean;
}

export const joinDecisions = ['accepted', 'declined'] as const;

export type JoinDecision = (typeof joinDecisions)[number];
export type JoinStatus = 'pending' | JoinDecision;

interface JoinRequest {
  id: string;
  status: JoinStatus;
  characterName: string;
  discord: string | null;
  discordId: string | null;
}

export interface IncomingRequest extends JoinRequest {
  vocation: VocationId;
  level: number;
}

export interface OutgoingRequest extends JoinRequest {
  adId: string;
}

export interface PartySeeker {
  server: GameServerId;
  world: string;
  level: number;
}

const HOUR_IN_MS = 60 * 60 * 1000;

export const MAX_NOTE_LENGTH = 140;

/** Product choice, not a game rule: a hunt plan rarely lasts longer. */
export const AD_LIFETIME_MS = 12 * HOUR_IN_MS;

export const getAdExpiry = (createdAt: number): number =>
  createdAt + AD_LIFETIME_MS;

export const cleanAdNote = (note: unknown): string =>
  typeof note === 'string'
    ? note.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_LENGTH)
    : '';

export const isAdPurpose = (purpose: unknown): purpose is AdPurpose =>
  adPurposes.some(({ id }) => id === purpose);

export const isJoinDecision = (status: unknown): status is JoinDecision =>
  joinDecisions.some((decision) => decision === status);

export const isAdActive = (
  { expiresAt }: Pick<PartyAd, 'expiresAt'>,
  now: number,
): boolean =>
  expiresAt > now;

export const canJoinAd = (
  ad: Pick<PartyAd, 'server' | 'world' | 'purpose' | 'level' | 'expiresAt'>,
  { server, world, level }: PartySeeker,
  now: number,
): boolean => {
  const { lowest, highest } = getShareRange(level);

  return (
    isAdActive(ad, now) &&
    ad.server === server &&
    ad.world === world &&
    (ad.purpose === 'boss' || (ad.level >= lowest && ad.level <= highest))
  );
};

// A boss needs help, not shared experience, so its ads ignore the level range.
// Newest first, since a recent ad is more likely to get an answer.
export const findCompatibleAds = <Ad extends PartyAd>(
  ads: Ad[],
  seeker: PartySeeker,
  now: number,
): Ad[] =>
  ads
    .filter((ad) => canJoinAd(ad, seeker, now))
    .sort((first, second) => second.createdAt - first.createdAt);
