import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/main.ts',
      name: 'orchestrator',
      fileName: 'main',
      formats: ['es']
    },
    target: 'node22',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: [
        'ai',
        '@ai-sdk/anthropic',
        '@anthropic-ai/sdk',
        '@modelcontextprotocol/sdk',
        'node-cron',
        'pino',
        'pino-pretty',
        'yaml',
        'zod',
        'dotenv',
        'cross-spawn',
        'which',
        'isexe',
        // Node.js built-ins
        'fs',
        'fs/promises',
        'path',
        'crypto',
        'url',
        'events',
        'node:stream',
        'node:process'
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js'
      }
    }
  },
  ssr: {
    noExternal: []
  }
});
