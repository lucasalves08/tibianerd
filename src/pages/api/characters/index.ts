import type { APIRoute } from 'astro';
import {
  cleanCharacterName,
  isGameServer,
  MAX_CHARACTERS,
} from '../../../domain/characters';
import { lookupCharacter } from '../../../lib/characterLookup';
import {
  countCharacters,
  createCharacter,
  listCharacters,
} from '../../../lib/characters';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  return userId
    ? Response.json(await listCharacters(userId))
    : errorResponse('unauthorized', 401);
};

// The server looks the character up again, so the browser cannot fake a level.
export const POST: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    server?: unknown;
    name?: unknown;
  } | null;
  const server = body?.server;
  const name = cleanCharacterName(body?.name);

  if (!isGameServer(server) || !name) {
    return errorResponse('invalid', 400);
  }

  if ((await countCharacters(userId)) >= MAX_CHARACTERS) {
    return errorResponse('limit', 409);
  }

  try {
    const info = await lookupCharacter(server, name);

    if (!info) {
      return errorResponse('not-found', 404);
    }

    return Response.json(await createCharacter(userId, info), { status: 201 });
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      return errorResponse('duplicate', 409);
    }

    return errorResponse('unavailable', 502);
  }
};
