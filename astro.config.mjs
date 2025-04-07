// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import icon from 'astro-icon';
import compressor from 'astro-compressor';
import playformCompress from '@playform/compress';

// https://astro.build/config
export default defineConfig({
  site: 'https://charge.polaris.gdn',
  // Integrations with optimized order
  integrations: [react({
    include: ['**/*.{jsx,tsx}'],
  }), tailwind(), icon(), compressor(), playformCompress()],
  // Performance optimizations
  compressHTML: true,
  scopedStyleStrategy: 'class', // Better CSS specificity control
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  // Build settings
  output: 'static',
  vite: {
    // Vite optimizations
    build: {
      sourcemap: true,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },
  },
});