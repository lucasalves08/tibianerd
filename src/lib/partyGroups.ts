import type { AdPurpose } from '../domain/partyFinder';
import {
  getGroupExpiry,
  type GroupDetails,
  type GroupHunt,
  type GroupMember,
  type GroupSummary,
} from '../domain/partyGroups';
import { parsePartyHunt, type HuntPlayer } from '../domain/partyHunt';
import { db, type D1Statement } from './db';
import { closeRoom, removeFromRoom } from './partyRooms';

export type HuntResult = 'added' | 'invalid' | 'duplicate' | 'not-found';

interface GroupAd {
  adId: string;
  ownerCharacterId: string;
  ownerName: string;
  server: string;
  world: string;
  purpose: AdPurpose;
  note: string;
}

const getAccess = async (userId: string, groupId: string) => {
  const row = await db
    .prepare(
      `SELECT
        EXISTS (
          SELECT 1 FROM party_group_members m
          JOIN characters c ON c.id = m.character_id
          WHERE m.group_id = g.id AND c.user_id = ?1
        ) AS isMember,
        EXISTS (
          SELECT 1 FROM characters c
          WHERE c.id = g.owner_character_id AND c.user_id = ?1
        ) AS isLeader
      FROM party_groups g
      WHERE g.id = ?2 AND g.expires_at > ?3`,
    )
    .bind(userId, groupId, Date.now())
    .first<{ isMember: number; isLeader: number }>();

  return {
    isMember: row?.isMember === 1,
    isLeader: row?.isLeader === 1,
  };
};

// An accepted request starts the group, or brings it back if it had gone quiet.
export const getJoinStatements = (
  ad: GroupAd,
  characterId: string,
): D1Statement[] => {
  const now = Date.now();

  return [
    db
      .prepare(
        `INSERT INTO party_groups (
          id, owner_character_id, owner_name, server, world, purpose, note, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET expires_at = excluded.expires_at`,
      )
      .bind(
        ad.adId,
        ad.ownerCharacterId,
        ad.ownerName,
        ad.server,
        ad.world,
        ad.purpose,
        ad.note,
        now,
        getGroupExpiry(now),
      ),
    ...[ad.ownerCharacterId, characterId].map((id) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO party_group_members (group_id, character_id, joined_at) VALUES (?, ?, ?)',
        )
        .bind(ad.adId, id, now),
    ),
  ];
};

export const getLeaveStatement = (groupId: string, characterId: string) =>
  db
    .prepare(
      'DELETE FROM party_group_members WHERE group_id = ? AND character_id = ?',
    )
    .bind(groupId, characterId);

export const listGroups = async (userId: string): Promise<GroupSummary[]> => {
  await db
    .prepare('DELETE FROM party_groups WHERE expires_at <= ?')
    .bind(Date.now())
    .run();

  const { results } = await db
    .prepare(
      `SELECT g.id, g.owner_name AS ownerName, g.purpose, g.world,
        g.expires_at AS expiresAt,
        (SELECT count(*) FROM party_group_members m WHERE m.group_id = g.id) AS memberCount
      FROM party_groups g
      WHERE g.id IN (
        SELECT m.group_id FROM party_group_members m
        JOIN characters c ON c.id = m.character_id
        WHERE c.user_id = ?
      )
      ORDER BY g.expires_at DESC`,
    )
    .bind(userId)
    .all<GroupSummary>();

  return results;
};

export const getGroup = async (
  userId: string,
  groupId: string,
): Promise<GroupDetails | null> => {
  const { isMember, isLeader } = await getAccess(userId, groupId);

  if (!isMember) {
    return null;
  }

  const [group, members, hunts] = await Promise.all([
    db
      .prepare(
        `SELECT id, owner_name AS ownerName, purpose, server, world, note,
          expires_at AS expiresAt
        FROM party_groups WHERE id = ?`,
      )
      .bind(groupId)
      .first<
        Omit<GroupDetails, 'memberCount' | 'isLeader' | 'members' | 'hunts'>
      >(),
    db
      .prepare(
        `SELECT c.id, c.name, c.vocation, c.level, c.server, c.world, c.outfit, c.sex,
          c.verified_at IS NOT NULL AS isVerified,
          c.id IS g.owner_character_id AS isLeader,
          c.user_id = ?1 AS isMine,
          u.name AS discord, x.accountId AS discordId
        FROM party_group_members m
        JOIN party_groups g ON g.id = m.group_id
        JOIN characters c ON c.id = m.character_id
        JOIN "user" u ON u.id = c.user_id
        LEFT JOIN account x ON x.userId = u.id AND x.providerId = 'discord'
        WHERE m.group_id = ?2
        ORDER BY isLeader DESC, m.joined_at`,
      )
      .bind(userId, groupId)
      .all<
        Omit<GroupMember, 'isVerified' | 'isLeader' | 'isMine'> & {
          isVerified: number;
          isLeader: number;
          isMine: number;
        }
      >(),
    db
      .prepare(
        `SELECT id, session_start AS sessionStart, duration, players,
          created_at AS createdAt, added_by AS addedBy
        FROM party_group_hunts
        WHERE group_id = ?
        ORDER BY created_at DESC`,
      )
      .bind(groupId)
      .all<
        Omit<GroupHunt, 'players' | 'canRemove'> & {
          players: string;
          addedBy: string | null;
        }
      >(),
  ]);

  if (!group) {
    return null;
  }

  return {
    ...group,
    isLeader,
    memberCount: members.results.length,
    members: members.results.map((member) => ({
      ...member,
      isVerified: member.isVerified === 1,
      isLeader: member.isLeader === 1,
      isMine: member.isMine === 1,
    })),
    hunts: hunts.results.map(({ addedBy, players, ...hunt }) => ({
      ...hunt,
      players: JSON.parse(players) as HuntPlayer[],
      canRemove: isLeader || addedBy === userId,
    })),
  };
};

export const addHunt = async (
  userId: string,
  groupId: string,
  text: string,
): Promise<HuntResult> => {
  if (!(await getAccess(userId, groupId)).isMember) {
    return 'not-found';
  }

  const hunt = parsePartyHunt(text);

  if (!hunt) {
    return 'invalid';
  }

  const now = Date.now();
  const { meta } = await db
    .prepare(
      `INSERT OR IGNORE INTO party_group_hunts (
        id, group_id, added_by, fingerprint, session_start, duration, players, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      groupId,
      userId,
      hunt.fingerprint,
      hunt.sessionStart,
      hunt.duration,
      JSON.stringify(hunt.players),
      now,
    )
    .run();

  if (meta.changes === 0) {
    return 'duplicate';
  }

  await db
    .prepare('UPDATE party_groups SET expires_at = ? WHERE id = ?')
    .bind(getGroupExpiry(now), groupId)
    .run();

  return 'added';
};

export const removeHunt = async (
  userId: string,
  groupId: string,
  huntId: string,
): Promise<boolean> => {
  const { isMember, isLeader } = await getAccess(userId, groupId);

  if (!isMember) {
    return false;
  }

  const { meta } = await db
    .prepare(
      'DELETE FROM party_group_hunts WHERE id = ?1 AND group_id = ?2 AND (?3 = 1 OR added_by = ?4)',
    )
    .bind(huntId, groupId, isLeader ? 1 : 0, userId)
    .run();

  return meta.changes > 0;
};

// Members leave on their own and the leader removes anyone but themselves.
// Dropping the request lets them ask to join the same ad again.
export const removeMember = async (
  userId: string,
  groupId: string,
  characterId: string,
): Promise<boolean> => {
  const { isLeader } = await getAccess(userId, groupId);
  const member = await db
    .prepare(
      `SELECT c.user_id AS userId, x.accountId AS discordId,
        c.id IS g.owner_character_id AS isOwner
      FROM party_group_members m
      JOIN party_groups g ON g.id = m.group_id
      JOIN characters c ON c.id = m.character_id
      LEFT JOIN account x ON x.userId = c.user_id AND x.providerId = 'discord'
      WHERE m.group_id = ? AND m.character_id = ?`,
    )
    .bind(groupId, characterId)
    .first<{ userId: string; discordId: string | null; isOwner: number }>();

  if (!member || member.isOwner === 1 || (!isLeader && member.userId !== userId)) {
    return false;
  }

  await db.batch([
    getLeaveStatement(groupId, characterId),
    db
      .prepare(
        'DELETE FROM party_join_requests WHERE ad_id = ? AND character_id = ?',
      )
      .bind(groupId, characterId),
  ]);

  if (member.discordId) {
    await removeFromRoom(groupId, member.discordId).catch(() => {});
  }

  return true;
};

export const closeGroup = async (
  userId: string,
  groupId: string,
): Promise<boolean> => {
  if (!(await getAccess(userId, groupId)).isLeader) {
    return false;
  }

  await db.batch([
    db.prepare('DELETE FROM party_groups WHERE id = ?').bind(groupId),
    db
      .prepare(
        "DELETE FROM party_join_requests WHERE ad_id = ? AND status = 'accepted'",
      )
      .bind(groupId),
  ]);
  await closeRoom(groupId).catch(() => {});

  return true;
};
