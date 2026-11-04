-- Roles the bot created, so it never touches the ones made by hand.
CREATE TABLE discord_roles (
  name TEXT PRIMARY KEY,
  role_id TEXT NOT NULL
);
