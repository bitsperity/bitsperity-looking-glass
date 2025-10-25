import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    ssr: true,
    rollupOptions: {
      input: {
        'index-stdio': 'src/index-stdio.ts',
        'index-http': 'src/index-http.ts'
      },
      output: {
        dir: 'dist',
        entryFileNames: '[name].js'
      },
      external: [
        /^node:.*/,
        'express',
        '@modelcontextprotocol/sdk',
        /^@modelcontextprotocol\/sdk\/.*/,
        'pino',
        'zod'
      ]
    }
  }
});


