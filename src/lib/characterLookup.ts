import {
  parseRubinot,
  parseTibiaData,
  readComment,
  type CharacterInfo,
  type GameServerId,
} from '../domain/characters';

const REQUEST_TIMEOUT_MS = 8000;

const sources: Record<
  GameServerId,
  { url: (name: string) => string; parse: (data: never) => CharacterInfo | null }
> = {
  rubinot: {
    url: (name) =>
      `https://rubinot.com.br/api/characters/search?name=${encodeURIComponent(name)}`,
    parse: parseRubinot,
  },
  tibia: {
    url: (name) =>
      `https://api.tibiadata.com/v4/character/${encodeURIComponent(name)}`,
    parse: parseTibiaData,
  },
};

export class LookupUnavailableError extends Error {}

const fetchCharacter = async (server: GameServerId, name: string) => {
  const response = await fetch(sources[server].url(name), {
    headers: { 'User-Agent': 'TibiaNerd' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => {
    throw new LookupUnavailableError();
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new LookupUnavailableError();
  }

  return response.json();
};

export const lookupCharacter = async (
  server: GameServerId,
  name: string,
): Promise<CharacterInfo | null> => {
  const data = await fetchCharacter(server, name);

  return data ? sources[server].parse(data as never) : null;
};

export const lookupComment = async (
  server: GameServerId,
  name: string,
): Promise<string | null> => {
  const data = await fetchCharacter(server, name);

  return data ? readComment(server, data as never) : null;
};
