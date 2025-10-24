import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
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
    outDir: 'dist',
    sourcemap: true,
    target: 'node22',
    minify: false,
    ssr: true
  }
});

