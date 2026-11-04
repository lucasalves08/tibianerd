import type { APIRoute } from 'astro';
import { cleanAdNote } from '../../../domain/partyFinder';
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
  } | null;

  if (typeof body?.characterId !== 'string') {
    return errorResponse('invalid', 400);
  }

  const isPublished = await publishAd(
    userId,
    body.characterId,
    cleanAdNote(body.note),
  );

  return isPublished
    ? new Response(null, { status: 201 })
    : errorResponse('not-found', 404);
};
