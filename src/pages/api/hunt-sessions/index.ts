import type { APIRoute } from 'astro';
import {
  isFormation,
  MAX_HUNT_NAME_LENGTH,
  MAX_SESSION_TEXT_LENGTH,
} from '../../../domain/huntSession';
import { listSessions, saveSession } from '../../../lib/huntSessions';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

const statusCodes = {
  invalid: 400,
  duplicate: 409,
  full: 409,
  'not-found': 404,
};

export const GET: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  return userId
    ? Response.json(await listSessions(userId))
    : errorResponse('unauthorized', 401);
};

export const POST: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
    characterId?: unknown;
    huntName?: unknown;
    formation?: unknown;
  } | null;
  const huntName =
    typeof body?.huntName === 'string' ? body.huntName.trim() : '';

  if (
    typeof body?.text !== 'string' ||
    body.text.length > MAX_SESSION_TEXT_LENGTH ||
    typeof body.characterId !== 'string' ||
    !huntName ||
    huntName.length > MAX_HUNT_NAME_LENGTH ||
    !isFormation(body.formation)
  ) {
    return errorResponse('invalid', 400);
  }

  const result = await saveSession(userId, {
    text: body.text,
    characterId: body.characterId,
    huntName,
    formation: body.formation,
  });

  return result === 'added'
    ? new Response(null, { status: 201 })
    : errorResponse(result, statusCodes[result]);
};
