import type { APIRoute } from 'astro';
import { removeHunt } from '../../../../../lib/partyGroups';
import { errorResponse, getUserId } from '../../../../../lib/session';

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  return (await removeHunt(userId, params.id!, params.huntId!))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
