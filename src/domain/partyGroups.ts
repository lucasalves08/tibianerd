import type { VocationId } from './characterStats';
import type { CharacterSex, GameServerId } from './characters';
import type { AdPurpose } from './partyFinder';
import type { HuntPlayer } from './partyHunt';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Product choice: a group with no new hunt for this long is over. */
export const GROUP_IDLE_DAYS = 7;

/** Far above any real paste, and it keeps huge bodies out of the parser. */
export const MAX_HUNT_TEXT_LENGTH = 20000;

export interface GroupSummary {
  id: string;
  ownerName: string;
  purpose: AdPurpose;
  world: string;
  memberCount: number;
  expiresAt: number;
}

export interface GroupMember {
  id: string;
  name: string;
  vocation: VocationId;
  level: number;
  server: GameServerId;
  world: string;
  outfit: string | null;
  sex: CharacterSex;
  isVerified: boolean;
  isLeader: boolean;
  isMine: boolean;
  discord: string | null;
  discordId: string | null;
}

export interface GroupHunt {
  id: string;
  sessionStart: string | null;
  duration: string | null;
  players: HuntPlayer[];
  createdAt: number;
  canRemove: boolean;
}

export interface GroupDetails extends GroupSummary {
  server: GameServerId;
  note: string;
  isLeader: boolean;
  members: GroupMember[];
  hunts: GroupHunt[];
}

export const getGroupExpiry = (now: number): number =>
  now + GROUP_IDLE_DAYS * DAY_IN_MS;

export const getDaysLeft = (expiresAt: number, now: number): number =>
  Math.max(Math.ceil((expiresAt - now) / DAY_IN_MS), 1);
