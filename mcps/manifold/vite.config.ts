import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    ssr: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        'index-stdio': 'src/index-stdio.ts'
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
});


