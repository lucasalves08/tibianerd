import { env } from 'cloudflare:workers';
import {
  getDiscordIdTime,
  getNextRoomCheck,
  getRoomMessage,
  MAX_ROOMS,
  ROOM_IDLE_MS,
  type RoomCharacter,
} from '../domain/partyRooms';
import { db } from './db';
import { discord, getMemberRoles, guildPath, syncMember } from './discord';

const CATEGORY_CHANNEL = 4;
const VOICE_CHANNEL = 2;
const CATEGORY_NAME = 'Parties';
const ROLE_OVERWRITE = 0;
const MEMBER_OVERWRITE = 1;
const VIEW_CHANNEL = 1024;
// View, send, read history, connect and speak.
const MEMBER_PERMISSIONS = '3214336';
const MAX_ROOMS_CLEANED = 5;
const MAX_ROOMS_COMPARED = 10;

export type RoomResult =
  | { status: 'ready'; url: string }
  | { status: 'not-in-server' }
  | { status: 'full' }
  | { status: 'unavailable' }
  | { status: 'not-found' };

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  last_message_id?: string | null;
  permission_overwrites?: { id: string; type: number }[];
}

const memberOverwrite = (id: string) => ({
  id,
  type: MEMBER_OVERWRITE,
  allow: MEMBER_PERMISSIONS,
});

// Discord answers with an error for someone outside voice, so only a match counts.
const isInChannel = async (userId: string, channelId: string) => {
  const response = await discord(`${guildPath}/voice-states/${userId}`);

  if (!response.ok) {
    return false;
  }

  const state = (await response.json()) as { channel_id?: string | null };

  return state.channel_id === channelId;
};

const forgetRoom = (adId: string) =>
  db.prepare('DELETE FROM party_rooms WHERE ad_id = ?').bind(adId).run();

const deleteRoom = async (adId: string, channelId: string) => {
  const response = await discord(`/channels/${channelId}`, { method: 'DELETE' });

  if (response.ok || response.status === 404) {
    await forgetRoom(adId);
    return true;
  }

  return false;
};

const readRoom = async (channelId: string) => {
  const response = await discord(`/channels/${channelId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Discord did not answer');
  }

  const channel = (await response.json()) as DiscordChannel;
  const members = (channel.permission_overwrites ?? []).filter(
    ({ id, type }) => type === MEMBER_OVERWRITE && id !== env.DISCORD_CLIENT_ID,
  );
  const presence = await Promise.all(
    members.map(({ id }) => isInChannel(id, channelId)),
  );

  return {
    lastMessageId: channel.last_message_id ?? null,
    isInUse: presence.includes(true),
  };
};

const reviewExpiredRooms = async () => {
  const now = Date.now();
  const { results } = await db
    .prepare(
      'SELECT ad_id AS adId, channel_id AS channelId FROM party_rooms WHERE expires_at <= ? LIMIT ?',
    )
    .bind(now, MAX_ROOMS_CLEANED)
    .all<{ adId: string; channelId: string }>();

  for (const { adId, channelId } of results) {
    const room = await readRoom(channelId);

    if (!room) {
      await forgetRoom(adId);
      continue;
    }

    const nextCheck = getNextRoomCheck({ ...room, now });

    if (nextCheck) {
      await db
        .prepare('UPDATE party_rooms SET expires_at = ? WHERE ad_id = ?')
        .bind(nextCheck, adId)
        .run();
    } else {
      await deleteRoom(adId, channelId);
    }
  }
};

// With every room taken, the one unused for longest gives way to the new party.
const freeRoom = async (): Promise<boolean> => {
  const { results } = await db
    .prepare(
      'SELECT ad_id AS adId, channel_id AS channelId FROM party_rooms ORDER BY expires_at LIMIT ?',
    )
    .bind(MAX_ROOMS_COMPARED)
    .all<{ adId: string; channelId: string }>();
  const rooms = await Promise.all(
    results.map(async (row) => ({ ...row, state: await readRoom(row.channelId) })),
  );
  const candidates = rooms
    .filter(({ state }) => !state?.isInUse)
    .sort(
      (first, second) =>
        (first.state?.lastMessageId
          ? getDiscordIdTime(first.state.lastMessageId)
          : 0) -
        (second.state?.lastMessageId
          ? getDiscordIdTime(second.state.lastMessageId)
          : 0),
    );
  const oldest = candidates[0];

  return oldest ? deleteRoom(oldest.adId, oldest.channelId) : false;
};

const hasFreeRoom = async (): Promise<boolean> => {
  await reviewExpiredRooms();

  const row = await db
    .prepare('SELECT count(*) AS total FROM party_rooms')
    .first<{ total: number }>();

  return (row?.total ?? 0) < MAX_ROOMS || freeRoom();
};

const getCategoryId = async (): Promise<string | null> => {
  const response = await discord(`${guildPath}/channels`);

  if (!response.ok) {
    return null;
  }

  const channels = (await response.json()) as DiscordChannel[];
  const category = channels.find(
    ({ name, type }) => type === CATEGORY_CHANNEL && name === CATEGORY_NAME,
  );

  if (category) {
    return category.id;
  }

  const created = await discord(`${guildPath}/channels`, {
    method: 'POST',
    body: JSON.stringify({ name: CATEGORY_NAME, type: CATEGORY_CHANNEL }),
  });

  return created.ok ? ((await created.json()) as { id: string }).id : null;
};

const createRoom = async (
  name: string,
  purpose: 'hunt' | 'boss',
  memberIds: string[],
): Promise<string | null> => {
  const response = await discord(`${guildPath}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name: `party-${name}-${purpose}`.slice(0, 100),
      type: VOICE_CHANNEL,
      parent_id: await getCategoryId(),
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
): Promise<RoomResult> => {
  if (!env.DISCORD_BOT_TOKEN) {
    return { status: 'unavailable' };
  }

  // Only the two sides of an accepted request reach the room.
  const request = await db
    .prepare(
      `SELECT r.ad_id AS adId, a.purpose, a.note,
        owner.server AS ownerServer, owner.name AS ownerName,
        owner.world AS ownerWorld, owner.vocation AS ownerVocation,
        owner.verified_at IS NOT NULL AS ownerVerified,
        member.server AS memberServer, member.name AS memberName,
        member.world AS memberWorld, member.vocation AS memberVocation,
        member.verified_at IS NOT NULL AS memberVerified,
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
      purpose: 'hunt' | 'boss';
      note: string;
      ownerServer: RoomCharacter['server'];
      ownerName: string;
      ownerWorld: string;
      ownerVocation: RoomCharacter['vocation'];
      ownerVerified: number;
      memberServer: RoomCharacter['server'];
      memberName: string;
      memberWorld: string;
      memberVocation: RoomCharacter['vocation'];
      memberVerified: number;
      ownerDiscordId: string;
      memberDiscordId: string;
    }>();

  if (!request) {
    return { status: 'not-found' };
  }

  const { adId, ownerName, ownerDiscordId, memberDiscordId } = request;
  const [ownerRoles, memberRoles] = await Promise.all([
    getMemberRoles(ownerDiscordId),
    getMemberRoles(memberDiscordId),
  ]);

  if (!ownerRoles || !memberRoles) {
    return { status: 'not-in-server' };
  }

  // Only a proven character changes a name in the server.
  if (request.ownerVerified === 1) {
    await syncMember(ownerDiscordId, ownerRoles, {
      server: request.ownerServer,
      name: ownerName,
      world: request.ownerWorld,
      vocation: request.ownerVocation,
    }).catch(() => false);
  }

  if (request.memberVerified === 1) {
    await syncMember(memberDiscordId, memberRoles, {
      server: request.memberServer,
      name: request.memberName,
      world: request.memberWorld,
      vocation: request.memberVocation,
    }).catch(() => false);
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
    if (!(await hasFreeRoom())) {
      return { status: 'full' };
    }

    channelId = await createRoom(ownerName, request.purpose, [
      ownerDiscordId,
      memberDiscordId,
    ]);

    if (!channelId) {
      return { status: 'unavailable' };
    }

    await db
      .prepare(
        'INSERT INTO party_rooms (ad_id, channel_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(adId, channelId, Date.now() + ROOM_IDLE_MS)
      .run();
    await discord(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: getRoomMessage({
          purpose: request.purpose,
          note: request.note,
          world: request.ownerWorld,
          vocations: [request.ownerVocation, request.memberVocation],
        }),
      }),
    }).catch(() => {});
  }

  return {
    status: 'ready',
    url: `https://discord.com/channels/${env.DISCORD_GUILD_ID}/${channelId}`,
  };
};
