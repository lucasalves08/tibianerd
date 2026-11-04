import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { findCharacter, findDiscordId } from '../../../../lib/characters';
import { getMemberRoles, syncMember } from '../../../../lib/discord';
import { errorResponse, getUserId } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const userId = await getUserId(request);

  if (!userId) {
    return errorResponse('unauthorized', 401);
  }

  if (!env.DISCORD_BOT_TOKEN) {
    return errorResponse('unavailable', 503);
  }

  const [character, discordId] = await Promise.all([
    findCharacter(userId, params.id!),
    findDiscordId(userId),
  ]);

  if (!character?.isVerified || !discordId) {
    return errorResponse('not-verified', 403);
  }

  try {
    const roles = await getMemberRoles(discordId);

    if (!roles) {
      return errorResponse('not-in-server', 409);
    }

    return (await syncMember(discordId, roles, character))
      ? new Response(null, { status: 204 })
      : errorResponse('unavailable', 503);
  } catch {
    return errorResponse('unavailable', 503);
  }
};
