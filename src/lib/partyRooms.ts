import { env } from 'cloudflare:workers';
import { getNextRoomCheck, getRoomIdleMs } from '../domain/partyRooms';
import { db } from './db';

const API_URL = 'https://discord.com/api/v10';
const VOICE_CHANNEL = 2;
const ROLE_OVERWRITE = 0;
const MEMBER_OVERWRITE = 1;
const VIEW_CHANNEL = 1024;
// View, send, read history, connect and speak.
const MEMBER_PERMISSIONS = '3214336';
const MAX_ROOMS_CLEANED = 5;

export type RoomResult =
  | { status: 'ready'; url: string }
  | { status: 'not-in-server' }
  | { status: 'unavailable' }
  | { status: 'not-found' };

const discord = (path: string, init: RequestInit = {}) =>
  fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

const isInServer = async (userId: string) =>
  (await discord(`/guilds/${env.DISCORD_GUILD_ID}/members/${userId}`)).ok;

const memberOverwrite = (id: string) => ({
  id,
  type: MEMBER_OVERWRITE,
  allow: MEMBER_PERMISSIONS,
});

interface DiscordChannel {
  last_message_id?: string | null;
  permission_overwrites?: { id: string; type: number }[];
}

// Discord answers with an error for someone outside voice, so only a match counts.
const isInChannel = async (userId: string, channelId: string) => {
  const response = await discord(
    `/guilds/${env.DISCORD_GUILD_ID}/voice-states/${userId}`,
  );

  if (!response.ok) {
    return false;
  }

  const state = (await response.json()) as { channel_id?: string | null };

  return state.channel_id === channelId;
};

const reviewRoom = async (adId: string, channelId: string, isFixed: boolean) => {
  const response = await discord(`/channels/${channelId}`);

  // 404 means someone already deleted the channel by hand.
  if (response.status === 404) {
    await db.prepare('DELETE FROM party_rooms WHERE ad_id = ?').bind(adId).run();
    return;
  }

  if (!response.ok) {
    return;
  }

  const channel = (await response.json()) as DiscordChannel;
  const members = (channel.permission_overwrites ?? []).filter(
    ({ id, type }) => type === MEMBER_OVERWRITE && id !== env.DISCORD_CLIENT_ID,
  );
  const presence = await Promise.all(
    members.map(({ id }) => isInChannel(id, channelId)),
  );
  const nextCheck = getNextRoomCheck({
    lastMessageId: channel.last_message_id ?? null,
    isInUse: presence.includes(true),
    isFixed,
    now: Date.now(),
  });

  if (nextCheck) {
    await db
      .prepare('UPDATE party_rooms SET expires_at = ? WHERE ad_id = ?')
      .bind(nextCheck, adId)
      .run();
    return;
  }

  const deleted = await discord(`/channels/${channelId}`, { method: 'DELETE' });

  if (deleted.ok || deleted.status === 404) {
    await db.prepare('DELETE FROM party_rooms WHERE ad_id = ?').bind(adId).run();
  }
};

const reviewExpiredRooms = async () => {
  const { results } = await db
    .prepare(
      'SELECT ad_id AS adId, channel_id AS channelId, is_fixed AS isFixed FROM party_rooms WHERE expires_at <= ? LIMIT ?',
    )
    .bind(Date.now(), MAX_ROOMS_CLEANED)
    .all<{ adId: string; channelId: string; isFixed: number }>();

  for (const { adId, channelId, isFixed } of results) {
    await reviewRoom(adId, channelId, isFixed === 1);
  }
};

const createRoom = async (
  name: string,
  memberIds: string[],
): Promise<string | null> => {
  const response = await discord(`/guilds/${env.DISCORD_GUILD_ID}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name: `party-${name}`.slice(0, 100),
      type: VOICE_CHANNEL,
      permission_overwrites: [
        {
          id: env.DISCORD_GUILD_ID,
          type: ROLE_OVERWRITE,
          deny: String(VIEW_CHANNEL),
        },
        memberOverwrite(env.DISCORD_CLIENT_ID),
        ...memberIds.map(memberOverwrite),
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  return ((await response.json()) as { id: string }).id;
};

const addToRoom = async (channelId: string, userId: string) => {
  const response = await discord(`/channels/${channelId}/permissions/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ type: MEMBER_OVERWRITE, allow: MEMBER_PERMISSIONS }),
  });

  return response.ok;
};

export const openRoom = async (
  userId: string,
  requestId: string,
  isFixed: boolean,
): Promise<RoomResult> => {
  if (!env.DISCORD_BOT_TOKEN) {
    return { status: 'unavailable' };
  }

  // Only the two sides of an accepted request reach the room.
  const request = await db
    .prepare(
      `SELECT r.ad_id AS adId, owner.name AS ownerName,
        ownerAccount.accountId AS ownerDiscordId,
        memberAccount.accountId AS memberDiscordId
      FROM party_join_requests r
      JOIN party_ads a ON a.id = r.ad_id
      JOIN characters owner ON owner.id = a.character_id
      JOIN characters member ON member.id = r.character_id
      JOIN account ownerAccount
        ON ownerAccount.userId = owner.user_id AND ownerAccount.providerId = 'discord'
      JOIN account memberAccount
        ON memberAccount.userId = member.user_id AND memberAccount.providerId = 'discord'
      WHERE r.id = ?1 AND r.status = 'accepted'
        AND (owner.user_id = ?2 OR member.user_id = ?2)`,
    )
    .bind(requestId, userId)
    .first<{
      adId: string;
      ownerName: string;
      ownerDiscordId: string;
      memberDiscordId: string;
    }>();

  if (!request) {
    return { status: 'not-found' };
  }

  const { adId, ownerName, ownerDiscordId, memberDiscordId } = request;
  const members = [ownerDiscordId, memberDiscordId];
  const presence = await Promise.all(members.map(isInServer));

  if (presence.includes(false)) {
    return { status: 'not-in-server' };
  }

  const room = await db
    .prepare('SELECT channel_id AS channelId FROM party_rooms WHERE ad_id = ?')
    .bind(adId)
    .first<{ channelId: string }>();

  let channelId = room?.channelId ?? null;

  if (channelId) {
    if (!(await addToRoom(channelId, memberDiscordId))) {
      return { status: 'unavailable' };
    }
  } else {
    await reviewExpiredRooms();
    channelId = await createRoom(ownerName, members);

    if (!channelId) {
      return { status: 'unavailable' };
    }

    await db
      .prepare(
        'INSERT INTO party_rooms (ad_id, channel_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(adId, channelId, Date.now() + getRoomIdleMs(false))
      .run();
  }

  if (isFixed) {
    await db
      .prepare(
        'UPDATE party_rooms SET is_fixed = 1, expires_at = ? WHERE ad_id = ?',
      )
      .bind(Date.now() + getRoomIdleMs(true), adId)
      .run();
  }

  return {
    status: 'ready',
    url: `https://discord.com/channels/${env.DISCORD_GUILD_ID}/${channelId}`,
  };
};
