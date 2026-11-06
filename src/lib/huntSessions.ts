import {
  MAX_SAVED_SESSIONS,
  parseHuntSession,
  type FormationId,
  type HuntSession,
  type SavedHuntSession,
} from '../domain/huntSession';
import { db } from './db';

export type SaveResult = 'added' | 'invalid' | 'duplicate' | 'full' | 'not-found';

interface SessionRow {
  id: string;
  characterId: string;
  characterName: string;
  level: number;
  huntName: string;
  formation: FormationId;
  data: string;
}

export const listSessions = async (
  userId: string,
): Promise<SavedHuntSession[]> => {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.character_id AS characterId, c.name AS characterName,
        c.level, s.hunt_name AS huntName, s.formation, s.data
      FROM hunt_sessions s
      JOIN characters c ON c.id = s.character_id
      WHERE c.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT ?`,
    )
    .bind(userId, MAX_SAVED_SESSIONS)
    .all<SessionRow>();

  return results.map(({ data, ...row }) => ({
    ...row,
    session: JSON.parse(data) as HuntSession,
  }));
};

// Only the numbers are kept, never the text that was pasted.
export const saveSession = async (
  userId: string,
  {
    text,
    characterId,
    huntName,
    formation,
  }: {
    text: string;
    characterId: string;
    huntName: string;
    formation: FormationId;
  },
): Promise<SaveResult> => {
  const session = parseHuntSession(text);

  if (!session) {
    return 'invalid';
  }

  const usage = await db
    .prepare(
      `SELECT
        EXISTS (SELECT 1 FROM characters WHERE id = ?1 AND user_id = ?2) AS isMine,
        (SELECT count(*) FROM hunt_sessions s
          JOIN characters c ON c.id = s.character_id
          WHERE c.user_id = ?2) AS total`,
    )
    .bind(characterId, userId)
    .first<{ isMine: number; total: number }>();

  if (!usage?.isMine) {
    return 'not-found';
  }

  if (usage.total >= MAX_SAVED_SESSIONS) {
    return 'full';
  }

  const { meta } = await db
    .prepare(
      `INSERT OR IGNORE INTO hunt_sessions
        (id, character_id, fingerprint, hunt_name, formation, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      characterId,
      session.fingerprint,
      huntName,
      formation,
      JSON.stringify(session),
      Date.now(),
    )
    .run();

  return meta.changes > 0 ? 'added' : 'duplicate';
};

export const removeSession = async (userId: string, id: string) => {
  const { meta } = await db
    .prepare(
      `DELETE FROM hunt_sessions WHERE id = ? AND character_id IN (
        SELECT id FROM characters WHERE user_id = ?
      )`,
    )
    .bind(id, userId)
    .run();

  return meta.changes > 0;
};
