import { defineConfig } from 'vitest/config';

// Plain Vitest: domain tests need neither Astro nor the Cloudflare runtime.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
