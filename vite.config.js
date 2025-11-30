import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Good for relative paths, keeps it flexible
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: 'index.html' 
      },
      output: {
        manualChunks: undefined,
      }
    }
  },
  // REMOVED: server block with proxy is no longer needed
  optimizeDeps: {
    exclude: ['stockfish.wasm']
  },
  worker: {
    format: 'es'
  }
});