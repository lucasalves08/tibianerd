import {
  canJoinAd,
  type AdPurpose,
  type IncomingRequest,
  type JoinDecision,
  type OutgoingRequest,
} from '../domain/partyFinder';
import { db } from './db';
import { getJoinStatements, getLeaveStatement } from './partyGroups';

export const listRequests = async (userId: string) => {
  const now = Date.now();
  const [incoming, outgoing] = await Promise.all([
    db
      .prepare(
        `SELECT r.id, r.status, c.name AS characterName, c.vocation, c.level,
          r.ad_id AS adId
        FROM party_join_requests r
        JOIN party_ads a ON a.id = r.ad_id
        JOIN characters owner ON owner.id = a.character_id
        JOIN characters c ON c.id = r.character_id
        WHERE owner.user_id = ? AND a.expires_at > ? AND r.status <> 'declined'
        ORDER BY r.created_at`,
      )
      .bind(userId, now)
      .all<IncomingRequest>(),
    db
      .prepare(
        `SELECT r.id, r.ad_id AS adId, r.status, owner.name AS characterName
        FROM party_join_requests r
        JOIN party_ads a ON a.id = r.ad_id
        JOIN characters c ON c.id = r.character_id
        JOIN characters owner ON owner.id = a.character_id
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
  const request = await db
    .prepare(
      `SELECT r.character_id AS characterId, a.id AS adId,
        a.character_id AS ownerCharacterId, owner.name AS ownerName,
        owner.server, a.world, a.purpose, a.note
      FROM party_join_requests r
      JOIN party_ads a ON a.id = r.ad_id
      JOIN characters owner ON owner.id = a.character_id
      WHERE r.id = ? AND owner.user_id = ?`,
    )
    .bind(id, userId)
    .first<{
      characterId: string;
      adId: string;
      ownerCharacterId: string;
      ownerName: string;
      server: string;
      world: string;
      purpose: AdPurpose;
      note: string;
    }>();

  if (!request) {
    return false;
  }

  await db.batch([
    db
      .prepare('UPDATE party_join_requests SET status = ? WHERE id = ?')
      .bind(status, id),
    ...(status === 'accepted'
      ? getJoinStatements(request, request.characterId)
      : [getLeaveStatement(request.adId, request.characterId)]),
  ]);

  return true;
};
