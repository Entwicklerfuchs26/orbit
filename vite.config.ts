import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import fs from 'fs';

// Serve the built APK with the correct package MIME so Android/GrapheneOS
// offers the installer instead of treating it as a .zip archive.
const serveApk = {
  name: 'serve-apk',
  configureServer(server: any) {
    server.middlewares.use('/wallpaper.apk', (_req: any, res: any) => {
      const apk = resolve(__dirname, 'android/app/build/outputs/apk/debug/app-debug.apk');
      if (!fs.existsSync(apk)) {
        res.statusCode = 404;
        res.end('APK not built yet');
        return;
      }
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="wallpaper.apk"');
      res.setHeader('Content-Length', fs.statSync(apk).size);
      fs.createReadStream(apk).pipe(res);
    });
  },
};

export default defineConfig({
  plugins: [svelte(), serveApk],
  publicDir: 'static',
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@shell': resolve(__dirname, 'src/shell'),
      '@platform': resolve(__dirname, 'src/platform'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Proxy Wallhaven so the app (which loads from this dev server) avoids CORS.
    proxy: {
      '/wh/api': {
        target: 'https://wallhaven.cc/api/v1',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/wh\/api/, ''),
      },
      '/wh/img': {
        target: 'https://w.wallhaven.cc',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/wh\/img/, ''),
      },
      '/wh/th': {
        target: 'https://th.wallhaven.cc',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/wh\/th/, ''),
      },
    },
  },
});
