import type { APIRoute } from 'astro';
import { reportAd } from '../../../../lib/partyAds';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  return (await reportAd(userId, params.id!))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
