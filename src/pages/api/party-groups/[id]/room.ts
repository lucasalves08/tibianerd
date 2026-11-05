import type { APIRoute } from 'astro';
import { isMemberInServer, openRoom } from '../../../../lib/partyRooms';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

const statusCodes = {
  'not-in-server': 409,
  full: 503,
  unavailable: 503,
  'not-found': 404,
};

export const GET: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const inServer = await isMemberInServer(userId, params.id!).catch(() => null);

  return Response.json({ inServer });
};

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const result = await openRoom(userId, params.id!).catch(
    () => ({ status: 'unavailable' }) as const,
  );

  return result.status === 'ready'
    ? Response.json({
        url: result.url,
        inviteUrl: result.inviteUrl,
        missing: result.missing,
      })
    : errorResponse(result.status, statusCodes[result.status]);
};
