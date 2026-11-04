-- Rooms outlive their ad on purpose: a removed ad must not leave a channel behind.
CREATE TABLE party_rooms (
  ad_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX party_rooms_expiry ON party_rooms (expires_at);
