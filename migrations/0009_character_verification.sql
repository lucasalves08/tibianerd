ALTER TABLE characters ADD COLUMN verification_code TEXT;
ALTER TABLE characters ADD COLUMN verified_at INTEGER;

CREATE INDEX characters_name ON characters (server, name);

-- One-time steps of the Discord server that already ran.
CREATE TABLE discord_setup (
  step TEXT PRIMARY KEY,
  done_at INTEGER NOT NULL
);
