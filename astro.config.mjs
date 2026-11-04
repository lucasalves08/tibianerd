// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  experimental: { clientPrerender: true },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Pixelify Sans',
      cssVariable: '--font-logo',
      weights: [600],
      subsets: ['latin'],
      fallbacks: ['monospace'],
      // The logo should never appear in the fallback font.
      display: 'block',
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Manrope',
      cssVariable: '--font-display',
      weights: [700, 800],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
      // A late font keeps the fallback instead of swapping in front of the reader.
      display: 'optional',
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--font-body',
      weights: [400, 700],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
      // A late font keeps the fallback instead of swapping in front of the reader.
      display: 'optional',
    },
  ],
});
