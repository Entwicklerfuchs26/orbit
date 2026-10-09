/**
 * Runtime API shim for remotely-loaded plugins.
 *
 * A plugin installed from the store is built SEPARATELY from the app, so it
 * cannot `import` the core at build time — it would bundle its own copy of the
 * Plugin/View base classes and the two copies wouldn't be `instanceof`-compatible
 * with the kernel. Instead the kernel publishes the core API on `globalThis.Orbit`
 * at boot, and a remote plugin reads the base classes from there:
 *
 *   const { Plugin, View } = globalThis.Orbit;
 *   export const manifest = { id: 'my-plugin', ... };
 *   export default class extends Plugin { async onload() { ... } }
 *
 * (A plugin build setup maps `@orbit/api` / `@core` to this global, so authors
 * keep writing normal imports.) Keep this surface stable — it's the public ABI
 * every store plugin binds to; bump `version` on breaking changes.
 */
import { Plugin, View } from './types';
import { Store, MapStore } from './store';

export interface OrbitRuntime {
  version: string;
  Plugin: typeof Plugin;
  View: typeof View;
  Store: typeof Store;
  MapStore: typeof MapStore;
}

export const ORBIT_API_VERSION = '0.1.0';

export function installRuntime(): void {
  const runtime: OrbitRuntime = { version: ORBIT_API_VERSION, Plugin, View, Store, MapStore };
  (globalThis as unknown as { Orbit?: OrbitRuntime }).Orbit = runtime;
}
