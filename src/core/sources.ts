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
 * Curated default source — served via jsDelivr (CDN over GitHub), NOT
 * raw.githubusercontent: raw serves .js as text/plain, which the browser
 * refuses to `import()` as a module (MIME check). jsDelivr serves the correct
 * application/javascript + permissive CORS. Relative `main` paths in the
 * registry resolve against this URL, so plugin code loads from jsDelivr too.
 */
export const DEFAULT_SOURCES: SourceConfig[] = [
  {
    id: 'orbit-official',
    label: 'Orbit (offiziell)',
    url: 'https://cdn.jsdelivr.net/gh/Entwicklerfuchs26/orbit-plugins@main/registry.json',
  },
];

const NS = 'core';

/** Fetch + normalise a manifest list, resolving relative `main` URLs. */
async function fetchManifestList(url: string): Promise<StorePluginEntry[]> {
  const res = await fetch(url, { cache: 'no-cache' });
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
    const result = await this.loader.loadFromUrl(entry.main);
    if (!result.ok) return { ok: false, error: result.error };
    const list = this.getInstalled().filter((e) => e.id !== entry.id);
    list.push(entry);
    this.persistInstalled(list);
    this.config.set(entry.id, 'enable', true);
    return { ok: true };
  }

  /** Remove a remote plugin: unload it and forget it. */
  async uninstall(id: string): Promise<void> {
    await this.loader.unload(id);
    this.persistInstalled(this.getInstalled().filter((e) => e.id !== id));
  }

  /** Boot: load every installed remote plugin that is enabled. */
  async loadInstalled(): Promise<void> {
    this.installedStore.set(this.getInstalled());
    for (const entry of this.getInstalled()) {
      if (this.config.get<boolean>(entry.id, 'enable') === false) continue;
      const result = await this.loader.loadFromUrl(entry.main);
      if (!result.ok) {
        console.warn(`[store] Installiertes Plugin "${entry.id}" nicht geladen: ${result.error}`);
      }
    }
  }
}
