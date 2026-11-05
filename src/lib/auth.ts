import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';

// Discord only needs to tell us who the player is. Asking for "identify" alone
// keeps the e-mail out of our database, so the required field gets a stand-in.
// Workers cannot share open I/O between requests, so each one gets its own auth.
export const createAuth = () => betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: env.DB,
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      disableDefaultScope: true,
      scope: ['identify'],
      mapProfileToUser: (profile) => ({
        name: profile.username,
        email: `${profile.id}@discord.invalid`,
      }),
    },
  },
  // Asking for a new permission counts as linking the same Discord account again.
  account: { accountLinking: { trustedProviders: ['discord'] } },
  user: { deleteUser: { enabled: true } },
});
