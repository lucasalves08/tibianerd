// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Pixelify Sans',
      cssVariable: '--font-display',
      weights: [600],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['monospace'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--font-body',
      weights: [400, 700],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['sans-serif'],
    },
  ],
});
