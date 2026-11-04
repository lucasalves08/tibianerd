import type { APIRoute } from 'astro';
import { isJoinDecision } from '../../../domain/partyFinder';
import { decideRequest } from '../../../lib/partyRequests';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;

  if (!isJoinDecision(body?.status)) {
    return errorResponse('invalid', 400);
  }

  return (await decideRequest(userId, params.id!, body.status))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
