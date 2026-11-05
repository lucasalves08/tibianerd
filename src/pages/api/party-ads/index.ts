import type { APIRoute } from 'astro';
import { cleanAdNote, isAdPurpose } from '../../../domain/partyFinder';
import { listAds, publishAd } from '../../../lib/partyAds';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  Response.json(await listAds(await getUserId(request)));

export const POST: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    characterId?: unknown;
    note?: unknown;
    purpose?: unknown;
  } | null;
  const purpose = body?.purpose;
  const note = cleanAdNote(body?.note);

  if (
    typeof body?.characterId !== 'string' ||
    !isAdPurpose(purpose) ||
    (purpose === 'boss' && !note)
  ) {
    return errorResponse('invalid', 400);
  }

  const result = await publishAd(userId, {
    characterId: body.characterId,
    note,
    purpose,
  });

  if (result === 'limit') {
    return errorResponse('limit', 409);
  }

  return result === 'published'
    ? new Response(null, { status: 201 })
    : errorResponse('not-found', 404);
};
