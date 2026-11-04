import type { APIRoute } from 'astro';
import { cleanCharacterName, isGameServer } from '../../../domain/characters';
import { lookupCharacter } from '../../../lib/characterLookup';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

// Login stops this route from working as an open proxy to other sites.
export const GET: APIRoute = async ({ request, url }) => {
  if (!(await getUserId(request))) {
    return errorResponse('unauthorized', 401);
  }

  const server = url.searchParams.get('server');
  const name = cleanCharacterName(url.searchParams.get('name'));

  if (!isGameServer(server) || !name) {
    return errorResponse('invalid', 400);
  }

  try {
    const character = await lookupCharacter(server, name);

    return character
      ? Response.json(character)
      : errorResponse('not-found', 404);
  } catch {
    return errorResponse('unavailable', 502);
  }
};
