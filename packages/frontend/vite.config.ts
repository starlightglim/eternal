import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to dist folder for Cloudflare Pages
    outDir: 'dist',
    // Generate source maps for debugging (optional, can be disabled in prod)
    sourcemap: false,
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers
    target: 'es2020',
    // Rollup options
    rollupOptions: {
      output: {
        // Chunk vendor dependencies separately
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state': ['zustand'],
        },
      },
    },
  },
  // Preview server config (for local testing of production build)
  preview: {
    port: 4173,
  },
  // Dev server config
  server: {
    port: 5173,
    // Proxy API requests to the Worker in development
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
