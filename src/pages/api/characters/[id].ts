import type { APIRoute } from 'astro';
import { isValidLevel } from '../../../domain/characters';
import {
  deleteCharacter,
  updateCharacterLevel,
} from '../../../lib/characters';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    level?: unknown;
  } | null;

  if (!isValidLevel(body?.level)) {
    return errorResponse('invalid', 400);
  }

  return (await updateCharacterLevel(userId, params.id!, body.level))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
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
