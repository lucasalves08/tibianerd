-- Characters are not verified, so one player must not block a name for another.
-- These tables held no data when this ran.

DROP TABLE party_ad_reports;
DROP TABLE party_ads;
DROP TABLE characters;

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  name TEXT NOT NULL,
  world TEXT NOT NULL,
  vocation TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level > 0),
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, world, name)
);

CREATE INDEX characters_user ON characters (user_id);

CREATE TABLE party_ads (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  world TEXT NOT NULL,
  level INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX party_ads_list ON party_ads (world, expires_at);

CREATE TABLE party_ad_reports (
  ad_id TEXT NOT NULL REFERENCES party_ads (id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (ad_id, reporter_id)
);
