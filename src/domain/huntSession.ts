import { parseHuntSection, type HuntEntry } from './parseHuntLog';
import { parseAmount } from './partyHunt';

const HOUR_IN_SECONDS = 3600;
const LOCALE = 'pt-BR';

/** Far above any real paste, and it keeps huge bodies out of the parser. */
export const MAX_SESSION_TEXT_LENGTH = 20000;
export const MAX_HUNT_NAME_LENGTH = 60;
/** Product limit against abuse, not a game rule. */
export const MAX_SAVED_SESSIONS = 500;
/** Product choice: below this, a projection says more about luck than the hunt. */
export const MIN_PROJECTION_SECONDS = 10 * 60;

export const formations = [
  { id: 'solo', name: 'Solo' },
  { id: 'duo', name: 'Duo' },
  { id: 'party', name: 'Party' },
] as const;

export const xpModes = [
  { id: 'raw', name: 'Raw' },
  { id: 'xp', name: 'XP' },
] as const;

export type FormationId = (typeof formations)[number]['id'];
export type XpMode = (typeof xpModes)[number]['id'];
export type SessionKind = 'real' | 'projection' | 'short';

export interface HuntSession {
  fingerprint: string;
  start: string | null;
  seconds: number;
  rawXp: number;
  xp: number;
  rawXpPerHour: number | null;
  xpPerHour: number | null;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  damagePerHour: number | null;
  healing: number;
  healingPerHour: number | null;
  monsters: HuntEntry[];
  items: HuntEntry[];
}

export interface SavedHuntSession {
  id: string;
  characterId: string;
  characterName: string;
  level: number;
  huntName: string;
  formation: FormationId;
  session: HuntSession;
}

export interface HuntAverage {
  key: string;
  huntName: string;
  characterName: string;
  sessions: number;
  seconds: number;
  rawXpPerHour: number;
  xpPerHour: number;
  balancePerHour: number;
}

export const isFormation = (value: unknown): value is FormationId =>
  formations.some(({ id }) => id === value);

const readTime = (value: string): number | null => {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2}),?\s+(\d{2}):(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match.map(Number);

  return Date.UTC(year!, month! - 1, day!, hour!, minute!, second!);
};

// The length in the text is cut to the minute, so the two ends come first.
const readSeconds = (text: string, start: string | null, end: string | null) => {
  const startTime = start && readTime(start);
  const endTime = end && readTime(end);

  if (startTime && endTime && endTime > startTime) {
    return (endTime - startTime) / 1000;
  }

  const length = text.match(/^\s*Session(?: length)?:\s*(\d+):(\d{2})h/im);

  return length
    ? Number(length[1]) * HOUR_IN_SECONDS + Number(length[2]) * 60
    : 0;
};

const readFields = (text: string) => {
  const fields = new Map<string, number>();

  for (const line of text.split(/\r?\n/)) {
    const field = line.trim().match(/^([A-Za-z/ ]+):\s*(-?[\d.,]+)$/);
    const amount = field && parseAmount(field[2]!);

    if (field && amount !== null) {
      fields.set(field[1]!.toLowerCase(), amount!);
    }
  }

  return fields;
};

const byCount = (first: HuntEntry, second: HuntEntry) =>
  second.count - first.count;

// Reads the text copied from the Hunt Analyser. The party one has no XP, so it
// does not pass as a session.
export const parseHuntSession = (text: string): HuntSession | null => {
  const dates = text.match(/^\s*Session data:\s*From\s+(.+?)\s+to\s+(.+?)\s*$/im);
  const start = dates?.[1] ?? null;
  const end = dates?.[2] ?? null;
  const fields = readFields(text);
  const seconds = readSeconds(text, start, end);
  const rawXp = fields.get('raw xp gain');
  const xp = fields.get('xp gain');
  const balance = fields.get('balance');

  if (!seconds || rawXp === undefined || xp === undefined || balance === undefined) {
    return null;
  }

  return {
    fingerprint: [start, end, seconds, xp, balance].join('|'),
    start,
    seconds,
    rawXp,
    xp,
    rawXpPerHour: fields.get('raw xp/h') ?? null,
    xpPerHour: fields.get('xp/h') ?? null,
    loot: fields.get('loot') ?? 0,
    supplies: fields.get('supplies') ?? 0,
    balance,
    damage: fields.get('damage') ?? 0,
    damagePerHour: fields.get('damage/h') ?? null,
    healing: fields.get('healing') ?? 0,
    healingPerHour: fields.get('healing/h') ?? null,
    monsters: parseHuntSection(text, /killed monsters/i).sort(byCount),
    items: /looted items/i.test(text)
      ? parseHuntSection(text, /looted items/i).sort(byCount)
      : [],
  };
};

export const getSessionKind = (seconds: number): SessionKind => {
  if (seconds >= HOUR_IN_SECONDS) {
    return 'real';
  }

  return seconds >= MIN_PROJECTION_SECONDS ? 'projection' : 'short';
};

export const getKillCount = ({ monsters }: HuntSession) =>
  monsters.reduce((sum, { count }) => sum + count, 0);

// The game's own rates come first, so the numbers match what the player saw.
export const getSessionRates = (session: HuntSession) => {
  const perHour = (value: number) =>
    Math.round((value * HOUR_IN_SECONDS) / session.seconds);

  return {
    xp: session.xpPerHour ?? perHour(session.xp),
    rawXp: session.rawXpPerHour ?? perHour(session.rawXp),
    balance: perHour(session.balance),
    kills: perHour(getKillCount(session)),
    damage: session.damagePerHour ?? perHour(session.damage),
    healing: session.healingPerHour ?? perHour(session.healing),
  };
};

/** Minutes for one full level, from the standard Tibia experience table. */
export const getMinutesPerLevel = (level: number, xpPerHour: number) => {
  if (xpPerHour <= 0) {
    return null;
  }

  const experience = 50 * level ** 2 - 150 * level + 200;

  return Math.round((experience / xpPerHour) * 60);
};

// Totals over total time, so a short session weighs less than a long one.
export const getHuntAverages = (saved: SavedHuntSession[]): HuntAverage[] => {
  const groups = new Map<string, SavedHuntSession[]>();

  for (const entry of saved) {
    const key = `${entry.characterId}:${entry.huntName.toLowerCase()}`;

    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return [...groups].map(([key, entries]) => {
    const sum = (read: (session: HuntSession) => number) =>
      entries.reduce((total, { session }) => total + read(session), 0);
    const seconds = sum((session) => session.seconds);
    const perHour = (value: number) =>
      Math.round((value * HOUR_IN_SECONDS) / seconds);

    return {
      key,
      huntName: entries[0]!.huntName,
      characterName: entries[0]!.characterName,
      sessions: entries.length,
      seconds,
      rawXpPerHour: perHour(sum((session) => session.rawXp)),
      xpPerHour: perHour(sum((session) => session.xp)),
      balancePerHour: perHour(sum((session) => session.balance)),
    };
  });
};

export const formatCompact = (value: number): string => {
  const size = Math.abs(value);

  if (size >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}kk`;
  }

  // Below 10 thousand a rounded k hides too much, as 1.715 becoming 2k.
  return size >= 10_000
    ? `${Math.round(value / 1_000).toLocaleString(LOCALE)}k`
    : value.toLocaleString(LOCALE);
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.max(Math.floor(seconds / 60), 1);
  const hours = Math.floor(minutes / 60);

  return hours > 0
    ? `${hours}h${String(minutes % 60).padStart(2, '0')}`
    : `${minutes} min`;
};
