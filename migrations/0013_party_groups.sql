-- A group outlives the ad that found its players. It keeps the id of that ad,
-- so accepted requests and existing rooms still point to it.
CREATE TABLE party_groups (
  id TEXT PRIMARY KEY,
  owner_character_id TEXT REFERENCES characters (id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  server TEXT NOT NULL,
  world TEXT NOT NULL,
  purpose TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX party_groups_expiry ON party_groups (expires_at);

CREATE TABLE party_group_members (
  group_id TEXT NOT NULL REFERENCES party_groups (id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, character_id)
);

CREATE INDEX party_group_members_character ON party_group_members (character_id);

-- Only what the split needs is kept, never the text that was pasted.
CREATE TABLE party_group_hunts (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES party_groups (id) ON DELETE CASCADE,
  added_by TEXT REFERENCES "user" ("id") ON DELETE SET NULL,
  fingerprint TEXT NOT NULL,
  session_start TEXT,
  duration TEXT,
  players TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (group_id, fingerprint)
);

INSERT INTO party_groups (
  id, owner_character_id, owner_name, server, world, purpose, note, created_at, expires_at
)
SELECT a.id, a.character_id, c.name, c.server, a.world, a.purpose, a.note,
  a.created_at, a.created_at + 604800000
FROM party_ads a
JOIN characters c ON c.id = a.character_id
WHERE a.id IN (SELECT ad_id FROM party_join_requests WHERE status = 'accepted');

INSERT INTO party_group_members (group_id, character_id, joined_at)
SELECT id, owner_character_id, created_at FROM party_groups;

INSERT OR IGNORE INTO party_group_members (group_id, character_id, joined_at)
SELECT ad_id, character_id, created_at
FROM party_join_requests
WHERE status = 'accepted';

ALTER TABLE party_rooms RENAME COLUMN ad_id TO group_id;
