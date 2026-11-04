import { env } from 'cloudflare:workers';
import type { Character, CharacterInput } from '../domain/characters';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<Row>(): Promise<{ results: Row[] }>;
  first<Row>(): Promise<Row | null>;
  run(): Promise<{ meta: { changes: number } }>;
}

const db = env.DB as unknown as {
  prepare(query: string): D1Statement;
};

// Every query filters by the owner, so nobody reaches another player's data.
export const listCharacters = async (userId: string): Promise<Character[]> => {
  const { results } = await db
    .prepare(
      'SELECT id, name, world, vocation, level FROM characters WHERE user_id = ? ORDER BY created_at',
    )
    .bind(userId)
    .all<Character>();

  return results;
};

export const countCharacters = async (userId: string): Promise<number> => {
  const row = await db
    .prepare('SELECT count(*) AS total FROM characters WHERE user_id = ?')
    .bind(userId)
    .first<{ total: number }>();

  return row?.total ?? 0;
};

export const createCharacter = async (
  userId: string,
  { name, world, vocation, level }: CharacterInput,
): Promise<Character> => {
  const id = crypto.randomUUID();

  await db
    .prepare(
      'INSERT INTO characters (id, user_id, name, world, vocation, level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, userId, name, world, vocation, level, Date.now())
    .run();

  return { id, name, world, vocation, level };
};

export const updateCharacterLevel = async (
  userId: string,
  id: string,
  level: number,
): Promise<boolean> => {
  const { meta } = await db
    .prepare('UPDATE characters SET level = ? WHERE id = ? AND user_id = ?')
    .bind(level, id, userId)
    .run();

  return meta.changes > 0;
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
