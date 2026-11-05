import { env, waitUntil } from 'cloudflare:workers';
import {
  getDiscordIdTime,
  getNextRoomCheck,
  getRoomCall,
  getRoomMessage,
  isRoomCallDue,
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
const ROOM_INVITE_AGE_SECONDS = 60 * 60;

export type RoomResult =
  | { status: 'ready'; url: string; inviteUrl: string | null; missing: string[] }
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

const findRoom = (groupId: string) =>
  db
    .prepare('SELECT channel_id AS channelId FROM party_rooms WHERE group_id = ?')
    .bind(groupId)
    .first<{ channelId: string }>();

const forgetRoom = (groupId: string) =>
  db.prepare('DELETE FROM party_rooms WHERE group_id = ?').bind(groupId).run();

const deleteRoom = async (groupId: string, channelId: string) => {
  const response = await discord(`/channels/${channelId}`, { method: 'DELETE' });

  if (response.ok || response.status === 404) {
    await forgetRoom(groupId);
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
      'SELECT group_id AS groupId, channel_id AS channelId FROM party_rooms WHERE expires_at <= ? LIMIT ?',
    )
    .bind(now, MAX_ROOMS_CLEANED)
    .all<{ groupId: string; channelId: string }>();

  for (const { groupId, channelId } of results) {
    const room = await readRoom(channelId);

    if (!room) {
      await forgetRoom(groupId);
      continue;
    }

    const nextCheck = getNextRoomCheck({ ...room, now });

    if (nextCheck) {
      await db
        .prepare('UPDATE party_rooms SET expires_at = ? WHERE group_id = ?')
        .bind(nextCheck, groupId)
        .run();
    } else {
      await deleteRoom(groupId, channelId);
    }
  }
};

// With every room taken, the one unused for longest gives way to the new party.
const freeRoom = async (): Promise<boolean> => {
  const { results } = await db
    .prepare(
      'SELECT group_id AS groupId, channel_id AS channelId FROM party_rooms ORDER BY expires_at LIMIT ?',
    )
    .bind(MAX_ROOMS_COMPARED)
    .all<{ groupId: string; channelId: string }>();
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

  return oldest ? deleteRoom(oldest.groupId, oldest.channelId) : false;
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

// Only the mentioned players get a ping, whatever the note of the group says.
const callMembers = (channelId: string, discordIds: string[], message: string) =>
  discord(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: getRoomCall(discordIds, message),
      allowed_mentions: { parse: [], users: discordIds },
    }),
  }).catch(() => {});

const findMembersAway = async (channelId: string, discordIds: string[]) => {
  const presence = await Promise.all(
    discordIds.map((id) => isInChannel(id, channelId)),
  );

  return discordIds.filter((_, index) => !presence[index]);
};

const callMembersAway = async (
  channelId: string,
  discordIds: string[],
  message: string,
) => {
  const response = await discord(`/channels/${channelId}`);

  if (!response.ok) {
    return;
  }

  const { last_message_id: lastMessageId } =
    (await response.json()) as DiscordChannel;

  if (!isRoomCallDue(lastMessageId ?? null, Date.now())) {
    return;
  }

  const away = await findMembersAway(channelId, discordIds);

  if (away.length > 0) {
    await callMembers(channelId, away, message);
  }
};

// An invite to a voice channel is the closest thing to joining it from a site.
// Without one, the link to the channel still works.
const createRoomInvite = async (channelId: string) => {
  const response = await discord(`/channels/${channelId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ max_age: ROOM_INVITE_AGE_SECONDS }),
  });

  if (!response.ok) {
    return null;
  }

  const { code } = (await response.json()) as { code: string };

  return `https://discord.com/invite/${code}`;
};

const addToRoom = async (channelId: string, userId: string) => {
  const response = await discord(`/channels/${channelId}/permissions/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ type: MEMBER_OVERWRITE, allow: MEMBER_PERMISSIONS }),
  });

  return response.ok;
};

export const removeFromRoom = async (groupId: string, userId: string) => {
  const room = await findRoom(groupId);

  if (room) {
    await discord(`/channels/${room.channelId}/permissions/${userId}`, {
      method: 'DELETE',
    });
  }
};

export const closeRoom = async (groupId: string) => {
  const room = await findRoom(groupId);

  if (room) {
    await deleteRoom(groupId, room.channelId);
  }
};

// Null means Discord gave no clear answer, so the page does not turn anyone away.
export const isMemberInServer = async (
  userId: string,
  groupId: string,
): Promise<boolean | null> => {
  if (!env.DISCORD_BOT_TOKEN) {
    return null;
  }

  const member = await db
    .prepare(
      `SELECT x.accountId AS discordId
      FROM party_group_members m
      JOIN characters c ON c.id = m.character_id
      JOIN account x ON x.userId = c.user_id AND x.providerId = 'discord'
      WHERE m.group_id = ? AND c.user_id = ?`,
    )
    .bind(groupId, userId)
    .first<{ discordId: string }>();

  if (!member) {
    return null;
  }

  const response = await discord(`${guildPath}/members/${member.discordId}`);

  if (response.status === 404) {
    return false;
  }

  return response.ok ? true : null;
};

// Any member opens the room for everyone. Who is outside the server stays out
// and comes in the next time someone opens it.
export const openRoom = async (
  userId: string,
  groupId: string,
): Promise<RoomResult> => {
  if (!env.DISCORD_BOT_TOKEN) {
    return { status: 'unavailable' };
  }

  const group = await db
    .prepare(
      `SELECT owner_name AS ownerName, purpose, note, world
      FROM party_groups WHERE id = ? AND expires_at > ?`,
    )
    .bind(groupId, Date.now())
    .first<{
      ownerName: string;
      purpose: 'hunt' | 'boss';
      note: string;
      world: string;
    }>();
  const { results } = await db
    .prepare(
      `SELECT c.user_id AS userId, c.server, c.name, c.world, c.vocation,
        c.verified_at IS NOT NULL AS isVerified, x.accountId AS discordId
      FROM party_group_members m
      JOIN characters c ON c.id = m.character_id
      JOIN account x ON x.userId = c.user_id AND x.providerId = 'discord'
      WHERE m.group_id = ?`,
    )
    .bind(groupId)
    .all<
      RoomCharacter & { userId: string; isVerified: number; discordId: string }
    >();

  if (!group || !results.some((member) => member.userId === userId)) {
    return { status: 'not-found' };
  }

  const members = await Promise.all(
    results.map(async (member) => ({
      ...member,
      roles: await getMemberRoles(member.discordId),
    })),
  );
  const present = members.filter(({ roles }) => roles);

  if (!present.some((member) => member.userId === userId)) {
    return { status: 'not-in-server' };
  }

  // Only a proven character changes a name in the server. This takes many
  // Discord calls, so the room does not wait for it.
  waitUntil(
    (async () => {
      for (const { isVerified, discordId, roles, ...character } of present) {
        if (isVerified === 1) {
          await syncMember(discordId, roles!, character).catch(() => false);
        }
      }
    })(),
  );

  const discordIds = [...new Set(present.map(({ discordId }) => discordId))];
  const others = [
    ...new Set(
      present
        .filter((member) => member.userId !== userId)
        .map(({ discordId }) => discordId),
    ),
  ];
  const message = getRoomMessage({
    purpose: group.purpose,
    note: group.note,
    world: group.world,
    vocations: present.map(({ vocation }) => vocation),
  });
  const room = await findRoom(groupId);
  let channelId = room?.channelId ?? null;

  if (channelId) {
    const roomId = channelId;
    const added = await Promise.all(
      discordIds.map((id) => addToRoom(roomId, id)),
    );

    if (added.includes(false)) {
      return { status: 'unavailable' };
    }

    await callMembersAway(roomId, others, message);
  } else {
    if (!(await hasFreeRoom())) {
      return { status: 'full' };
    }

    channelId = await createRoom(group.ownerName, group.purpose, discordIds);

    if (!channelId) {
      return { status: 'unavailable' };
    }

    await db
      .prepare(
        'INSERT INTO party_rooms (group_id, channel_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(groupId, channelId, Date.now() + ROOM_IDLE_MS)
      .run();
    await callMembers(channelId, others, message);
  }

  return {
    status: 'ready',
    url: `https://discord.com/channels/${env.DISCORD_GUILD_ID}/${channelId}`,
    inviteUrl: await createRoomInvite(channelId).catch(() => null),
    missing: members.filter(({ roles }) => !roles).map(({ name }) => name),
  };
};
