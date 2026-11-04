import type { APIRoute } from 'astro';
import { lookupComment } from '../../../../lib/characterLookup';
import {
  confirmVerification,
  findCharacter,
  startVerification,
} from '../../../../lib/characters';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const code = await startVerification(userId, params.id!);

  return code ? Response.json({ code }) : errorResponse('not-found', 404);
};

export const PUT: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const character = await findCharacter(userId, params.id!);

  if (!character?.verificationCode) {
    return errorResponse('not-found', 404);
  }

  try {
    const comment = await lookupComment(character.server, character.name);

    if (!comment?.includes(character.verificationCode)) {
      return errorResponse('code-not-found', 409);
    }
  } catch {
    return errorResponse('unavailable', 502);
  }

  await confirmVerification(userId, character);

  return new Response(null, { status: 204 });
};
