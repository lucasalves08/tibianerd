CREATE TABLE party_join_requests (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL REFERENCES party_ads (id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  UNIQUE (ad_id, character_id)
);

CREATE INDEX party_join_requests_ad ON party_join_requests (ad_id);
CREATE INDEX party_join_requests_character ON party_join_requests (character_id);
