import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index-stdio.ts',
      formats: ['es'],
      fileName: 'index-stdio'
    },
    rollupOptions: {
      external: [
        // Node built-ins (both node: and plain specifiers)
        'node:crypto','node:path','node:fs','node:url','node:http','node:https','node:stream','node:util','node:events','node:async_hooks','node:buffer','node:string_decoder','node:process',
        'crypto','path','fs','url','http','https','stream','util','events','async_hooks','buffer','string_decoder','process',
        // Dependencies we don't want bundled
        'pino','pino-pretty','zod','@modelcontextprotocol/sdk', /^@modelcontextprotocol\/sdk\/.*/
      ]
    }
  }
});


