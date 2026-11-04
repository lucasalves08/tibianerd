import {
  createVerificationCode,
  type Character,
  type CharacterInfo,
} from '../domain/characters';
import { db } from './db';

const CHARACTER_COLUMNS = `id, server, name, world, vocation, level, guild,
  verified_at IS NOT NULL AS isVerified, verification_code AS verificationCode`;
const CODE_BYTES = 3;

type CharacterRow = Omit<Character, 'isVerified'> & { isVerified: number };

const toCharacter = (row: CharacterRow): Character => ({
  ...row,
  isVerified: row.isVerified === 1,
});

// Every query filters by the owner, so nobody reaches another player's data.
export const listCharacters = async (userId: string): Promise<Character[]> => {
  const { results } = await db
    .prepare(
      `SELECT ${CHARACTER_COLUMNS} FROM characters WHERE user_id = ? ORDER BY created_at`,
    )
    .bind(userId)
    .all<CharacterRow>();

  return results.map(toCharacter);
};

export const findCharacter = async (
  userId: string,
  id: string,
): Promise<Character | null> => {
  const row = await db
    .prepare(
      `SELECT ${CHARACTER_COLUMNS} FROM characters WHERE id = ? AND user_id = ?`,
    )
    .bind(id, userId)
    .first<CharacterRow>();

  return row ? toCharacter(row) : null;
};

export const findDiscordId = async (userId: string): Promise<string | null> => {
  const row = await db
    .prepare(
      "SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'",
    )
    .bind(userId)
    .first<{ accountId: string }>();

  return row?.accountId ?? null;
};

/** Once someone proves a character is theirs, nobody else can register it. */
export const isClaimedByOther = async (
  userId: string,
  { server, name }: Pick<CharacterInfo, 'server' | 'name'>,
): Promise<boolean> => {
  const row = await db
    .prepare(
      'SELECT id FROM characters WHERE server = ? AND name = ? AND user_id <> ? AND verified_at IS NOT NULL',
    )
    .bind(server, name, userId)
    .first<{ id: string }>();

  return row !== null;
};

export const startVerification = async (
  userId: string,
  id: string,
): Promise<string | null> => {
  const code = createVerificationCode(
    crypto.getRandomValues(new Uint8Array(CODE_BYTES)),
  );
  const { meta } = await db
    .prepare(
      'UPDATE characters SET verification_code = ? WHERE id = ? AND user_id = ?',
    )
    .bind(code, id, userId)
    .run();

  return meta.changes > 0 ? code : null;
};

// Unproven copies of the same character disappear with the proof.
export const confirmVerification = async (
  userId: string,
  { id, server, name }: Pick<Character, 'id' | 'server' | 'name'>,
): Promise<void> => {
  await db
    .prepare(
      'UPDATE characters SET verified_at = ?, verification_code = NULL WHERE id = ? AND user_id = ?',
    )
    .bind(Date.now(), id, userId)
    .run();
  await db
    .prepare(
      'DELETE FROM characters WHERE server = ? AND name = ? AND user_id <> ?',
    )
    .bind(server, name, userId)
    .run();
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

  return { id, ...info, isVerified: false, verificationCode: null };
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
