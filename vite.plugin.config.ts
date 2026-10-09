import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

/**
 * Build ONE plugin as a standalone, remotely-loadable ESM bundle.
 *
 *   PLUGIN=welcome npm run build:plugin
 *   → plugins-dist/welcome/main.js
 *
 * Only the core API (`@core`) is left external and rebound to the host's
 * `globalThis.Orbit` at runtime (see src/core/runtime.ts) — so a plugin shares
 * the kernel's Plugin/View/Store classes instead of bundling its own copy.
 * Everything else (Svelte runtime, @shell helpers, libraries) is bundled so the
 * plugin is self-contained and the APK needs to ship nothing.
 */
const pluginId = process.env.PLUGIN;
if (!pluginId) {
  throw new Error('PLUGIN env var required, e.g. `PLUGIN=welcome npm run build:plugin`');
}

const VIRTUAL_CORE = '\0orbit-core-runtime';

export default defineConfig({
  plugins: [
    {
      name: 'orbit-core-external',
      enforce: 'pre',
      resolveId(id) {
        if (id === '@core' || id === '@core/index' || id.startsWith('@core/')) {
          return VIRTUAL_CORE;
        }
        return null;
      },
      load(id) {
        if (id === VIRTUAL_CORE) {
          // Re-export the runtime values the host published. Type-only imports
          // (App, PluginManifest, …) are erased by the TS transform, so they
          // never reach here.
          return [
            'const O = globalThis.Orbit;',
            'export const Plugin = O.Plugin;',
            'export const View = O.View;',
            'export const Store = O.Store;',
            'export const MapStore = O.MapStore;',
          ].join('\n');
        }
        return null;
      },
    },
    // emitCss:false → component styles are injected by JS at runtime instead of
    // extracted to a .css file. A remotely-loaded plugin is only a JS import, so
    // its styles must travel inside that JS and self-apply when it mounts.
    svelte({ emitCss: false }),
  ],
  resolve: {
    alias: {
      '@shell': resolve(__dirname, 'src/shell'),
      '@platform': resolve(__dirname, 'src/platform'),
    },
  },
  build: {
    outDir: `plugins-dist/${pluginId}`,
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
    lib: {
      entry: resolve(__dirname, `src/plugins/${pluginId}/index.ts`),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
