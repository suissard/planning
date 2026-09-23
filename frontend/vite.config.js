import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || process.env.BASE_PATH || (process.env.GITHUB_PAGES ? '/planning/' : '/'),
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-vuetify': ['vuetify'],
          'vendor-utils': ['axios'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    fs: {
      allow: ['..']
    }
  },
});
