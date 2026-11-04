import type { APIRoute } from 'astro';
import { removeAd } from '../../../../lib/partyAds';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  return (await removeAd(userId, params.id!))
    ? new Response(null, { status: 204 })
    : errorResponse('not-found', 404);
};
