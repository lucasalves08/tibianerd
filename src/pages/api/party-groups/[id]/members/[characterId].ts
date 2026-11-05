import type { APIRoute } from 'astro';
import { removeMember } from '../../../../../lib/partyGroups';
import { errorResponse, getUserId } from '../../../../../lib/session';

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  return (await removeMember(userId, params.id!, params.characterId!))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
