import type { APIRoute } from 'astro';
import { MAX_HUNT_TEXT_LENGTH } from '../../../../../domain/partyGroups';
import { addHunt } from '../../../../../lib/partyGroups';
import { errorResponse, getUserId } from '../../../../../lib/session';

export const prerender = false;

const statusCodes = { invalid: 400, duplicate: 409, 'not-found': 404 };

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
  } | null;

  if (typeof body?.text !== 'string' || body.text.length > MAX_HUNT_TEXT_LENGTH) {
    return errorResponse('invalid', 400);
  }

  const result = await addHunt(userId, params.id!, body.text);

  return result === 'added'
    ? new Response(null, { status: 201 })
    : errorResponse(result, statusCodes[result]);
};
