import type { APIRoute } from 'astro';
import { listGroups } from '../../../lib/partyGroups';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  return userId
    ? Response.json(await listGroups(userId))
    : errorResponse('unauthorized', 401);
};
