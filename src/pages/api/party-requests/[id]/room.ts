import type { APIRoute } from 'astro';
import { openRoom } from '../../../../lib/partyRooms';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

const statusCodes = { 'not-in-server': 409, unavailable: 503, 'not-found': 404 };

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as {
    isFixed?: unknown;
  } | null;
  const result = await openRoom(
    userId,
    params.id!,
    body?.isFixed === true,
  ).catch(
    () => ({ status: 'unavailable' }) as const,
  );

  return result.status === 'ready'
    ? Response.json({ url: result.url })
    : errorResponse(result.status, statusCodes[result.status]);
};
