import type { APIRoute } from 'astro';
import { createRequest } from '../../../../lib/partyRequests';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    characterId?: unknown;
  } | null;

  if (typeof body?.characterId !== 'string') {
    return errorResponse('invalid', 400);
  }

  return (await createRequest(userId, params.id!, body.characterId))
    ? new Response(null, { status: 201 })
    : errorResponse('not-allowed', 403);
};
