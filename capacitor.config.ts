import type { CapacitorConfig } from '@capacitor/cli';

// Set CAP_SERVER_URL to build a dev APK that live-loads the dev server
// (web changes appear on reload, no reinstall needed). Omit for a normal
// bundled build.
const devUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'space.sternenhof.wallpaper',
  appName: 'Wallpaper',
  webDir: 'dist',
  ...(devUrl ? { server: { url: devUrl, cleartext: true } } : {}),
};

export default config;
