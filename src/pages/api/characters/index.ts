import type { APIRoute } from 'astro';
import { MAX_CHARACTERS, parseCharacter } from '../../../domain/characters';
import {
  countCharacters,
  createCharacter,
  listCharacters,
} from '../../../lib/characters';
import { errorResponse, getUserId } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  return userId
    ? Response.json(await listCharacters(userId))
    : errorResponse('unauthorized', 401);
};

export const POST: APIRoute = async ({ request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  const character = parseCharacter(await request.json().catch(() => null));

  if (!character) {
    return errorResponse('invalid', 400);
  }

  if ((await countCharacters(userId)) >= MAX_CHARACTERS) {
    return errorResponse('limit', 409);
  }

  try {
    return Response.json(await createCharacter(userId, character), {
      status: 201,
    });
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      return errorResponse('duplicate', 409);
    }

    throw error;
  }
};
