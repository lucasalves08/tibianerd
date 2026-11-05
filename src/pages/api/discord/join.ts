import type { APIRoute } from 'astro';
import { joinServer } from '../../../lib/discord';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

const statusCodes = { 'not-authorized': 403, unavailable: 503 };

export const POST: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const result = await joinServer(userId).catch(() => 'unavailable' as const);

  return result === 'joined'
    ? new Response(null, { status: 204 })
    : errorResponse(result, statusCodes[result]);
};
