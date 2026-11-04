import type { APIRoute } from 'astro';
import { listRequests } from '../../../lib/partyRequests';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  return userId
    ? Response.json(await listRequests(userId))
    : errorResponse('unauthorized', 401);
};
