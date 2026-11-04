import type { APIRoute } from 'astro';
import { lookupCharacter } from '../../../lib/characterLookup';
import {
  deleteCharacter,
  findCharacter,
  updateCharacter,
} from '../../../lib/characters';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const character = await findCharacter(userId, params.id!);

  if (!character) {
    return errorResponse('not-found', 404);
  }

  try {
    const info = await lookupCharacter(character.server, character.name);

    if (!info) {
      return errorResponse('not-found', 404);
    }

    await updateCharacter(userId, character.id, info);

    return Response.json({ ...character, ...info });
  } catch {
    return errorResponse('unavailable', 502);
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  return (await deleteCharacter(userId, params.id!))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
