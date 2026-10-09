/**
 * The plugin store: where installable plugins come from and how they get in.
 *
 * A `PluginSource` is anything that can produce a catalog of installable
 * plugins. This indirection is the whole point: today the sources are a curated
 * GitHub **manifest list** plus a **direct link**, but a real hosted Orbit
 * website (browse without installing Orbit, maybe buy) can be added later as
 * just another source — no change to the store UI or install flow.
 *
 * Installing = remember the entry in config and `loadFromUrl` its built ESM.
 * The APK ships no feature plugin; everything here is fetched on demand.
 */
import type { ConfigManager, PlatformType } from './types';
import type { PluginLoader } from './loader';
import { Store } from './store';

/** One installable plugin as advertised by a source. */
export interface StorePluginEntry {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  platforms?: PlatformType[];
  /** Preview image URLs for the store card. */
  screenshots?: string[];
  repo?: string;
  homepage?: string;
  /** Rough popularity, if the source tracks it. */
  downloads?: number;
  /** Absolute URL of the built ESM `main.js` to import on install. */
  main: string;
  /** Which source advertised it (filled in by the store). */
  sourceId?: string;
}

/** A catalog provider. `list()` may throw or return [] when offline/missing. */
export interface PluginSource {
  id: string;
  label: string;
  list(): Promise<StorePluginEntry[]>;
}

export interface SourceConfig {
  id: string;
  label: string;
  /** URL of a JSON manifest list: `StorePluginEntry[]` or `{ plugins: [...] }`. */
  url: string;
}

/**
 * Curated default source — GitHub raw. We fetch everything (registry + plugin
 * code) via `fetch` + blob-import (see loader.loadFromUrl), so raw's text/plain
 * MIME is a non-issue, CORS is `*`, and raw revalidates in ~5 min (far fresher
 * than jsDelivr's branch cache, which also ignores query-string cache-busting).
 * Relative `main` paths resolve against this URL → plugin code loads from raw too.
 */
export const DEFAULT_SOURCES: SourceConfig[] = [
  {
    id: 'orbit-official',
    label: 'Orbit (offiziell)',
    url: 'https://raw.githubusercontent.com/Entwicklerfuchs26/orbit-plugins/main/registry.json',
  },
];

const NS = 'core';

/**
 * Rewrite an old jsDelivr gh URL to the raw.githubusercontent equivalent, so
 * entries installed under the previous default source load fresh (jsDelivr's
 * branch cache served stale builds). No-op for any other URL.
 *   https://cdn.jsdelivr.net/gh/U/R@REF/path → https://raw.githubusercontent.com/U/R/REF/path
 */
function normalizeMain(url: string): string {
  const m = url.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^@/]+)@([^/]+)\/(.+)$/);
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}` : url;
}

/** Fetch + normalise a manifest list, resolving relative `main` URLs. */
async function fetchManifestList(url: string): Promise<StorePluginEntry[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as StorePluginEntry[] | { plugins?: StorePluginEntry[] };
  const list = Array.isArray(data) ? data : (data.plugins ?? []);
  return list
    .filter((e) => e && e.id && e.main)
    .map((e) => ({ ...e, main: new URL(e.main, url).href }));
}

/**
 * Resolve a direct link to a plugin's `manifest.json` (raw URL) into a store
 * entry, resolving its `main` relative to the manifest. No GitHub API needed —
 * the user points at the raw manifest.json.
 */
export async function resolveDirectLink(manifestUrl: string): Promise<StorePluginEntry> {
  const res = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest.json nicht erreichbar (HTTP ${res.status}).`);
  const m = (await res.json()) as Partial<StorePluginEntry> & { main?: string };
  if (!m.id || !m.main) throw new Error('manifest.json braucht mindestens "id" und "main".');
  return {
    id: m.id,
    name: m.name ?? m.id,
    description: m.description,
    author: m.author,
    version: m.version,
    platforms: m.platforms,
    screenshots: m.screenshots,
    repo: m.repo,
    homepage: m.homepage,
    main: new URL(m.main, manifestUrl).href,
    sourceId: 'direct-link',
  };
}

export class PluginStore {
  /** Installed remote plugins (persisted in config core.installed). */
  readonly installedStore = new Store<StorePluginEntry[]>([]);

  constructor(
    private config: ConfigManager,
    private loader: PluginLoader,
  ) {}

  // ---- Sources ----

  getSources(): SourceConfig[] {
    return this.config.get<SourceConfig[]>(NS, 'sources') ?? DEFAULT_SOURCES;
  }

  setSources(sources: SourceConfig[]): void {
    this.config.set(NS, 'sources', sources);
  }

  /** Aggregate the catalog across all sources. Failing sources are skipped. */
  async catalog(): Promise<{ entries: StorePluginEntry[]; errors: { source: string; error: string }[] }> {
    const entries: StorePluginEntry[] = [];
    const errors: { source: string; error: string }[] = [];
    for (const s of this.getSources()) {
      try {
        const list = await fetchManifestList(s.url);
        for (const e of list) entries.push({ ...e, sourceId: s.id });
      } catch (e) {
        errors.push({ source: s.label, error: (e as Error)?.message ?? String(e) });
      }
    }
    return { entries, errors };
  }

  // ---- Installed ----

  getInstalled(): StorePluginEntry[] {
    return this.config.get<StorePluginEntry[]>(NS, 'installed') ?? [];
  }

  isInstalled(id: string): boolean {
    return this.getInstalled().some((e) => e.id === id);
  }

  private persistInstalled(list: StorePluginEntry[]): void {
    this.config.set(NS, 'installed', list);
    this.installedStore.set(list);
  }

  /** Install (or update) a plugin: remember it, enable it, load its code now. */
  async install(entry: StorePluginEntry): Promise<{ ok: boolean; error?: string }> {
    // loadFromUrl fetches with cache:'no-store' → always the current build.
    const result = await this.loader.loadFromUrl(entry.main);
    if (!result.ok) return { ok: false, error: result.error };
    const list = this.getInstalled().filter((e) => e.id !== entry.id);
    list.push(entry);
    this.persistInstalled(list);
    this.config.set(entry.id, 'enable', true);
    return { ok: true };
  }

  /** Remove a remote plugin: unload + unregister it, forget it, disable it. */
  async uninstall(id: string): Promise<void> {
    await this.loader.unregister(id);
    this.persistInstalled(this.getInstalled().filter((e) => e.id !== id));
    this.config.set(id, 'enable', false);
  }

  /** Boot: load every installed remote plugin that is enabled. */
  async loadInstalled(): Promise<void> {
    // Migrate any stored jsDelivr URLs to raw so they load the current build.
    let changed = false;
    const list = this.getInstalled().map((e) => {
      const main = normalizeMain(e.main);
      if (main !== e.main) changed = true;
      return { ...e, main };
    });
    if (changed) this.persistInstalled(list);
    else this.installedStore.set(list);

    for (const entry of list) {
      if (this.config.get<boolean>(entry.id, 'enable') === false) continue;
      const result = await this.loader.loadFromUrl(entry.main);
      if (!result.ok) {
        console.warn(`[store] Installiertes Plugin "${entry.id}" nicht geladen: ${result.error}`);
      }
    }
  }
}
