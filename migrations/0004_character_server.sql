-- Existing characters came from the RubinOT worlds list.
ALTER TABLE characters ADD COLUMN server TEXT NOT NULL DEFAULT 'rubinot';
ALTER TABLE characters ADD COLUMN guild TEXT;
