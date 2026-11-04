import {
  canJoinAd,
  type IncomingRequest,
  type JoinDecision,
  type OutgoingRequest,
} from '../domain/partyFinder';
import { db } from './db';

// Discord details only leave the database once a request is accepted.
const DISCORD_COLUMNS = `
  CASE WHEN r.status = 'accepted' THEN u.name END AS discord,
  CASE WHEN r.status = 'accepted' THEN x.accountId END AS discordId`;

export const listRequests = async (userId: string) => {
  const now = Date.now();
  const [incoming, outgoing] = await Promise.all([
    db
      .prepare(
        `SELECT r.id, r.status, c.name AS characterName, c.vocation, c.level,
          ${DISCORD_COLUMNS}
        FROM party_join_requests r
        JOIN party_ads a ON a.id = r.ad_id
        JOIN characters owner ON owner.id = a.character_id
        JOIN characters c ON c.id = r.character_id
        JOIN "user" u ON u.id = c.user_id
        LEFT JOIN account x ON x.userId = u.id AND x.providerId = 'discord'
        WHERE owner.user_id = ? AND a.expires_at > ? AND r.status <> 'declined'
        ORDER BY r.created_at`,
      )
      .bind(userId, now)
      .all<IncomingRequest>(),
    db
      .prepare(
        `SELECT r.id, r.ad_id AS adId, r.status,
          owner.name AS characterName, ${DISCORD_COLUMNS}
        FROM party_join_requests r
        JOIN party_ads a ON a.id = r.ad_id
        JOIN characters c ON c.id = r.character_id
        JOIN characters owner ON owner.id = a.character_id
        JOIN "user" u ON u.id = owner.user_id
        LEFT JOIN account x ON x.userId = u.id AND x.providerId = 'discord'
        WHERE c.user_id = ? AND a.expires_at > ?
        ORDER BY r.created_at DESC`,
      )
      .bind(userId, now)
      .all<OutgoingRequest>(),
  ]);

  return { incoming: incoming.results, outgoing: outgoing.results };
};

export const createRequest = async (
  userId: string,
  adId: string,
  characterId: string,
): Promise<boolean> => {
  const ad = await db
    .prepare(
      `SELECT a.world, a.level, a.purpose, a.expires_at AS expiresAt,
        c.server, c.user_id AS ownerId
      FROM party_ads a JOIN characters c ON c.id = a.character_id
      WHERE a.id = ?`,
    )
    .bind(adId)
    .first<{
      world: string;
      level: number;
      purpose: 'hunt' | 'boss';
      expiresAt: number;
      server: 'tibia' | 'rubinot';
      ownerId: string;
    }>();
  const character = await db
    .prepare('SELECT server, world, level FROM characters WHERE id = ? AND user_id = ?')
    .bind(characterId, userId)
    .first<{ server: 'tibia' | 'rubinot'; world: string; level: number }>();

  if (
    !ad ||
    !character ||
    ad.ownerId === userId ||
    !canJoinAd(ad, character, Date.now())
  ) {
    return false;
  }

  await db
    .prepare(
      'INSERT OR IGNORE INTO party_join_requests (id, ad_id, character_id, created_at) VALUES (?, ?, ?, ?)',
    )
    .bind(crypto.randomUUID(), adId, characterId, Date.now())
    .run();

  return true;
};

// Only the owner of the ad decides, so the filter goes through the ad.
export const decideRequest = async (
  userId: string,
  id: string,
  status: JoinDecision,
): Promise<boolean> => {
  const { meta } = await db
    .prepare(
      `UPDATE party_join_requests SET status = ?
      WHERE id = ? AND ad_id IN (
        SELECT a.id FROM party_ads a
        JOIN characters c ON c.id = a.character_id
        WHERE c.user_id = ?
      )`,
    )
    .bind(status, id, userId)
    .run();

  return meta.changes > 0;
};
