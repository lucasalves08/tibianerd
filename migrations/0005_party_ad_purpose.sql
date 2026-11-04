-- An ad looks for a hunt or for help with a boss.
ALTER TABLE party_ads ADD COLUMN purpose TEXT NOT NULL DEFAULT 'hunt';
ALTER TABLE party_ads ADD COLUMN boss TEXT;
