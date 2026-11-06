-- Only the numbers read from the analyser are kept, never the text pasted.
CREATE TABLE hunt_sessions (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  hunt_name TEXT NOT NULL,
  formation TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (character_id, fingerprint)
);
