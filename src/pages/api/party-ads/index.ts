import type { APIRoute } from 'astro';
import {
  cleanAdNote,
  cleanBossName,
  isAdPurpose,
} from '../../../domain/partyFinder';
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
    boss?: unknown;
  } | null;
  const purpose = body?.purpose;
  const boss = purpose === 'boss' ? cleanBossName(body?.boss) : null;

  if (
    typeof body?.characterId !== 'string' ||
    !isAdPurpose(purpose) ||
    (purpose === 'boss' && !boss)
  ) {
    return errorResponse('invalid', 400);
  }

  const isPublished = await publishAd(userId, {
    characterId: body.characterId,
    note: cleanAdNote(body.note),
    purpose,
    boss,
  });

  return isPublished
    ? new Response(null, { status: 201 })
    : errorResponse('not-found', 404);
};
