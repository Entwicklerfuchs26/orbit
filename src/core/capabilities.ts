/**
 * Capabilities = the platform-specific powers the universal core offers to
 * every plugin through ONE typed API.
 *
 * Native code (Android/iOS wallpaper, folder access) can't be shipped as a
 * downloadable plugin — it lives in the core/platform layer and is published
 * here as a generic capability. A plugin asks `app.capabilities.has('folders')`
 * and, if present, pulls the typed implementation via `app.capabilities.get`,
 * without ever knowing which platform backs it. A build that can't provide a
 * capability (e.g. macOS has no Android wallpaper API) simply never registers
 * it, so `has()` is an honest runtime check rather than a guess from the OS
 * string.
 *
 * The core only defines the CONTRACTS here; the implementations are wired in
 * `src/platform/` and installed at boot (see `installCapabilities`).
 */

export interface ScannedFile {
  name: string;
  kind: 'image' | 'video';
  /** Per-file locator: file name (web) or document URI (native). */
  locator: string;
}

/**
 * Access to real external folders, without copying their files. Backed by the
 * Storage Access Framework (native Android) or the File System Access API
 * (Chromium web); unavailable where neither exists.
 */
export interface FoldersCapability {
  /** Open the OS picker; returns a stable folder id + display name (null = cancelled). */
  pick(): Promise<{ id: string; name: string } | null>;
  /** List media of one kind in the folder (null = no access / unavailable). */
  scan(folderId: string, kind: 'image' | 'video'): Promise<ScannedFile[] | null>;
  /** Re-establish access after a reload (native: persisted; web: needs a gesture). */
  reconnect(folderId: string): Promise<boolean>;
  /** Resolve one file to a full-resolution object URL (null if unavailable). */
  fileUrl(folderId: string, locator: string): Promise<string | null>;
  /** Resolve a downscaled thumbnail for gallery display (low memory). */
  thumbUrl(folderId: string, locator: string, kind: 'image' | 'video', max?: number): Promise<string | null>;
  /** Drop any cached handle/permission bookkeeping for a folder. */
  forget(folderId: string): Promise<void>;
}

/** Set the real OS wallpaper (static image). Native only. */
export interface WallpaperCapability {
  setSystem(url: string, target?: 'home' | 'lock' | 'both'): Promise<void>;
}

/** The GL live-wallpaper service (animated home screen that runs on its own). Native only. */
export interface LiveWallpaperCapability {
  setMedia(url: string, kind: 'image' | 'video'): Promise<void>;
  setPool(urls: string[], intervalMs: number, random: boolean): Promise<void>;
  setTransition(type: string, ms: number): Promise<void>;
  openPicker(): Promise<void>;
  isActive(): Promise<boolean>;
}

/**
 * Maps capability names → their contract. Extend this as new capabilities land
 * (notifications, biometrics, launcher…) and `has`/`get` stay fully typed.
 */
export interface CapabilityMap {
  folders: FoldersCapability;
  wallpaper: WallpaperCapability;
  'live-wallpaper': LiveWallpaperCapability;
}

export type CapabilityName = keyof CapabilityMap;

export class CapabilityRegistry {
  private impls = new Map<CapabilityName, unknown>();

  register<K extends CapabilityName>(name: K, impl: CapabilityMap[K]): void {
    this.impls.set(name, impl);
  }

  has(name: CapabilityName): boolean {
    return this.impls.has(name);
  }

  /** The implementation, or undefined if this platform doesn't provide it. */
  get<K extends CapabilityName>(name: K): CapabilityMap[K] | undefined {
    return this.impls.get(name) as CapabilityMap[K] | undefined;
  }

  /** Names of all available capabilities (for settings/store display). */
  list(): CapabilityName[] {
    return [...this.impls.keys()];
  }
}
