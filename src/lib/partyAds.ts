import {
  getAdExpiry,
  MAX_ADS_PER_ACCOUNT,
  type AdPurpose,
  type PartyAdView,
} from '../domain/partyFinder';
import { db } from './db';

const MAX_LISTED_ADS = 200;
/** Product choice: an ad leaves the list after this many reports. */
const REPORTS_TO_HIDE = 3;

interface AdRow extends Omit<PartyAdView, 'isMine' | 'isVerified'> {
  isMine: number;
  isVerified: number;
}

export const listAds = async (userId: string | null): Promise<PartyAdView[]> => {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.purpose, c.server, a.world, c.vocation, a.level, a.note,
        a.created_at AS createdAt, a.expires_at AS expiresAt,
        c.name AS characterName, c.outfit, c.sex,
        c.verified_at IS NOT NULL AS isVerified,
        c.user_id = ?1 AS isMine
      FROM party_ads a
      JOIN characters c ON c.id = a.character_id
      WHERE a.expires_at > ?2
        AND (SELECT count(*) FROM party_ad_reports r WHERE r.ad_id = a.id) < ?3
      ORDER BY a.created_at DESC
      LIMIT ?4`,
    )
    .bind(userId ?? '', Date.now(), REPORTS_TO_HIDE, MAX_LISTED_ADS)
    .all<AdRow>();

  return results.map((row) => ({
    ...row,
    isMine: row.isMine === 1,
    isVerified: row.isVerified === 1,
  }));
};

export type PublishResult = 'published' | 'not-found' | 'limit';

// One ad of each kind per character keeps the list honest: a new ad replaces
// the old one, and the account limit stops one player from filling a world.
export const publishAd = async (
  userId: string,
  {
    characterId,
    note,
    purpose,
  }: {
    characterId: string;
    note: string;
    purpose: AdPurpose;
  },
): Promise<PublishResult> => {
  const character = await db
    .prepare('SELECT world, level FROM characters WHERE id = ? AND user_id = ?')
    .bind(characterId, userId)
    .first<{ world: string; level: number }>();

  if (!character) {
    return 'not-found';
  }

  const now = Date.now();
  const otherAds = await db
    .prepare(
      `SELECT count(*) AS total
      FROM party_ads a
      JOIN characters c ON c.id = a.character_id
      WHERE c.user_id = ? AND a.expires_at > ?
        AND NOT (a.character_id = ? AND a.purpose = ?)`,
    )
    .bind(userId, now, characterId, purpose)
    .first<{ total: number }>();

  if ((otherAds?.total ?? 0) >= MAX_ADS_PER_ACCOUNT) {
    return 'limit';
  }

  await db.batch([
    db
      .prepare('DELETE FROM party_ads WHERE character_id = ? AND purpose = ?')
      .bind(characterId, purpose),
    db
      .prepare(
        'INSERT INTO party_ads (id, character_id, world, level, note, purpose, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        crypto.randomUUID(),
        characterId,
        character.world,
        character.level,
        note,
        purpose,
        now,
        getAdExpiry(now),
      ),
  ]);

  return 'published';
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
