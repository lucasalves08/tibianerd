declare module 'cloudflare:workers' {
  import type { BetterAuthOptions } from 'better-auth';

  export const env: {
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    DB: NonNullable<BetterAuthOptions['database']>;
    DISCORD_CLIENT_ID: string;
    DISCORD_CLIENT_SECRET: string;
  };
}
