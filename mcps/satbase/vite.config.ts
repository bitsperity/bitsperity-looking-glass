import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        'index-stdio': resolve(__dirname, 'src/index-stdio.ts'),
        'index-http': resolve(__dirname, 'src/index-http.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        dir: 'dist',
        entryFileNames: '[name].js',
      },
      external: [
        // Node.js built-ins
        'node:crypto',
        'node:path',
        'node:fs',
        'node:url',
        'crypto',
        'path',
        'fs',
        'url',
        'http',
        'https',
        'stream',
        'util',
        'events',
        'async_hooks',
        'buffer',
        'string_decoder',
        // Dependencies
        'express',
        'pino',
        'zod',
        '@modelcontextprotocol/sdk',
        /^@modelcontextprotocol\/sdk\/.*/,
      ]
    },
    sourcemap: true,
    target: 'node22',
    minify: false,
    ssr: true
  }
});
