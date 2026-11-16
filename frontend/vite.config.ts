import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // base: './' — относительные пути, чтобы сборка работала на GitHub Pages
  // (сайт доступен по адресу https://<user>.github.io/<repo>/) и в любом подкаталоге.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    // host: true — доступ с телефона в локальной сети (для тестов через туннель).
    host: true,
  },
});
