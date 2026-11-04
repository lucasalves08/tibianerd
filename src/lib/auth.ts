import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';

// Discord only needs to tell us who the player is. Asking for "identify" alone
// keeps the e-mail out of our database, so the required field gets a stand-in.
export const auth = betterAuth({
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
  user: { deleteUser: { enabled: true } },
});
