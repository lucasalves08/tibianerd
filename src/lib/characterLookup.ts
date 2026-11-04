import {
  parseRubinot,
  parseTibiaData,
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

export const lookupCharacter = async (
  server: GameServerId,
  name: string,
): Promise<CharacterInfo | null> => {
  const { url, parse } = sources[server];
  const response = await fetch(url(name), {
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

  return parse((await response.json()) as never);
};
