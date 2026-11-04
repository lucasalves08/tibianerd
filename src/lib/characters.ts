import type { Character, CharacterInfo } from '../domain/characters';
import { db } from './db';

const CHARACTER_COLUMNS = 'id, server, name, world, vocation, level, guild';

// Every query filters by the owner, so nobody reaches another player's data.
export const listCharacters = async (userId: string): Promise<Character[]> => {
  const { results } = await db
    .prepare(
      `SELECT ${CHARACTER_COLUMNS} FROM characters WHERE user_id = ? ORDER BY created_at`,
    )
    .bind(userId)
    .all<Character>();

  return results;
};

export const findCharacter = (
  userId: string,
  id: string,
): Promise<Character | null> =>
  db
    .prepare(
      `SELECT ${CHARACTER_COLUMNS} FROM characters WHERE id = ? AND user_id = ?`,
    )
    .bind(id, userId)
    .first<Character>();

export const countCharacters = async (userId: string): Promise<number> => {
  const row = await db
    .prepare('SELECT count(*) AS total FROM characters WHERE user_id = ?')
    .bind(userId)
    .first<{ total: number }>();

  return row?.total ?? 0;
};

export const createCharacter = async (
  userId: string,
  info: CharacterInfo,
): Promise<Character> => {
  const { server, name, world, vocation, level, guild } = info;
  const id = crypto.randomUUID();

  await db
    .prepare(
      'INSERT INTO characters (id, user_id, server, name, world, vocation, level, guild, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, userId, server, name, world, vocation, level, guild, Date.now())
    .run();

  return { id, ...info };
};

export const updateCharacter = async (
  userId: string,
  id: string,
  { world, vocation, level, guild }: CharacterInfo,
): Promise<void> => {
  await db
    .prepare(
      'UPDATE characters SET world = ?, vocation = ?, level = ?, guild = ? WHERE id = ? AND user_id = ?',
    )
    .bind(world, vocation, level, guild, id, userId)
    .run();
};

export const deleteCharacter = async (
  userId: string,
  id: string,
): Promise<boolean> => {
  const { meta } = await db
    .prepare('DELETE FROM characters WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();

  return meta.changes > 0;
};
