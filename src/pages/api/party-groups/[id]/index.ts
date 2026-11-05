import type { APIRoute } from 'astro';
import { closeGroup, getGroup } from '../../../../lib/partyGroups';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const group = await getGroup(userId, params.id!);

  return group ? Response.json(group) : errorResponse('not-found', 404);
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  return (await closeGroup(userId, params.id!))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
