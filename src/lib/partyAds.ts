import { getAdExpiry, type PartyAdView } from '../domain/partyFinder';
import type { RubinotWorld } from '../data/rubinotWorlds';
import { db } from './db';

const MAX_LISTED_ADS = 100;
/** Product choice: an ad leaves the list after this many reports. */
const REPORTS_TO_HIDE = 3;

interface AdRow extends Omit<PartyAdView, 'isMine'> {
  isMine: number;
}

export const listAds = async (
  world: RubinotWorld,
  userId: string | null,
): Promise<PartyAdView[]> => {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.world, c.vocation, a.level, a.note,
        a.created_at AS createdAt, a.expires_at AS expiresAt,
        c.name AS characterName, u.name AS discord,
        c.user_id = ?1 AS isMine
      FROM party_ads a
      JOIN characters c ON c.id = a.character_id
      JOIN "user" u ON u.id = c.user_id
      WHERE a.world = ?2 AND a.expires_at > ?3
        AND (SELECT count(*) FROM party_ad_reports r WHERE r.ad_id = a.id) < ?4
      ORDER BY a.created_at DESC
      LIMIT ?5`,
    )
    .bind(userId ?? '', world, Date.now(), REPORTS_TO_HIDE, MAX_LISTED_ADS)
    .all<AdRow>();

  return results.map((row) => ({ ...row, isMine: row.isMine === 1 }));
};

// One ad per player keeps the list honest: a new ad replaces the old one.
export const publishAd = async (
  userId: string,
  characterId: string,
  note: string,
): Promise<boolean> => {
  const character = await db
    .prepare(
      "SELECT world, level FROM characters WHERE id = ? AND user_id = ? AND server = 'rubinot'",
    )
    .bind(characterId, userId)
    .first<{ world: string; level: number }>();

  if (!character) {
    return false;
  }

  const now = Date.now();

  await db
    .prepare(
      'DELETE FROM party_ads WHERE character_id IN (SELECT id FROM characters WHERE user_id = ?)',
    )
    .bind(userId)
    .run();
  await db
    .prepare(
      'INSERT INTO party_ads (id, character_id, world, level, note, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      crypto.randomUUID(),
      characterId,
      character.world,
      character.level,
      note,
      now,
      getAdExpiry(now),
    )
    .run();

  return true;
};

export const removeAd = async (userId: string, id: string): Promise<boolean> => {
  const { meta } = await db
    .prepare(
      'DELETE FROM party_ads WHERE id = ? AND character_id IN (SELECT id FROM characters WHERE user_id = ?)',
    )
    .bind(id, userId)
    .run();

  return meta.changes > 0;
};

export const reportAd = async (userId: string, id: string): Promise<boolean> => {
  const ad = await db
    .prepare('SELECT id FROM party_ads WHERE id = ?')
    .bind(id)
    .first<{ id: string }>();

  if (!ad) {
    return false;
  }

  await db
    .prepare(
      'INSERT OR IGNORE INTO party_ad_reports (ad_id, reporter_id, created_at) VALUES (?, ?, ?)',
    )
    .bind(id, userId, Date.now())
    .run();

  return true;
};
