import type { App } from '@core/index';
import { Store } from '@core/index';
import type {
  WallpaperState,
  WallpaperItem,
  Collection,
  ScheduleRule,
  ThemePreset,
  ViewMode,
  MenuSide,
  MenuMode,
  PaletteBehaviour,
  FillMode,
  TransitionType,
  GeometryPreset,
  FolderSource,
} from './types';
import { DEFAULT_STATE, TRANSITIONS, RECOLOUR_PALETTES } from './types';
import { applyEffect } from './effects';
import { putImage, deleteImage, imageUrl, clearAllImages } from './storage';
import { generateTheme, seedFromImage, type SchemeCharacter, type Finish } from '../theme/palette';

const PLUGIN_ID = 'skwd-wall';

/**
 * Owns the wallpaper library + the active selection. Metadata persists to
 * config; image blobs live in IndexedDB. Applies the active wallpaper and its
 * derived palette through the SHARED theme engine (app.theme), so every other
 * plugin sees the same wallpaper + colours.
 */
export class WallpaperManager {
  readonly state: Store<WallpaperState>;
  /** id → object URL cache for display, reactive. */
  readonly urls = new Store<Record<string, string>>({});
  private unsubResolved?: () => void;
  private idCounter = 0;

  constructor(private app: App) {
    const saved = app.config.get<Partial<WallpaperState>>(PLUGIN_ID, 'state');
    // Merge with defaults so older saved states gain new fields.
    const merged: WallpaperState = { ...DEFAULT_STATE, ...(saved ?? {}) };
    // Self-heal duplicate ids: the legacy id scheme (wp-<len>-<counter>) could
    // collide across sessions because the counter resets on reload. Svelte's
    // keyed {#each} throws `each_key_duplicate` and blanks the whole view, so
    // drop later duplicates (they already share one IndexedDB blob anyway).
    const seen = new Set<string>();
    const deduped = (merged.items ?? []).filter((it) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    const hadDupes = deduped.length !== (merged.items ?? []).length;
    merged.items = deduped;
    // Migration: old hex default (9 columns) made tiny tiles + too few rows to
    // scroll on a phone. Clamp to a mobile-sensible count.
    let migrated = hadDupes;
    if (merged.hexColumns > 6) {
      merged.hexColumns = 3;
      migrated = true;
    }
    this.state = new Store<WallpaperState>(merged);
    if (migrated) this.persist();
  }

  // Platform powers via the core capability API. Each is undefined where the
  // current device can't provide it (e.g. no folders on a non-Chromium browser,
  // no wallpaper on web), so every call site uses optional chaining.
  private get folders() {
    return this.app.capabilities.get('folders');
  }
  private get live() {
    return this.app.capabilities.get('live-wallpaper');
  }
  private get sysWallpaper() {
    return this.app.capabilities.get('wallpaper');
  }

  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private scheduleTimer: ReturnType<typeof setInterval> | null = null;
  private firedScheduleKeys = new Set<string>();

  async start(): Promise<void> {
    // Silently probe folder sources (query-only, no permission prompt) so the
    // UI shows the right connected/disconnected state after a reload.
    void this.probeFolders();
    // Resolve object URLs for all stored items.
    await this.refreshUrls();
    void this.cleanupTrash();
    this.applyActive();
    this.applyFill();
    this.restartRotation();
    this.restartScheduler();
    // Re-push the active media to the live-wallpaper service on every start, so
    // a fresh install / app reopen gives the native service something to show
    // (otherwise it has no file yet and renders black).
    this.pushLive();
    this.unsubResolved = this.app.theme.resolved.subscribe(() => this.applyActive());
  }

  stop(): void {
    this.unsubResolved?.();
    this.stopRotation();
    this.stopScheduler();
    for (const url of Object.values(this.urls.get())) URL.revokeObjectURL(url);
  }

  /**
   * Wipe ALL plugin data: uploaded image blobs (IndexedDB) + the whole state
   * (library, collections, folder sources, settings) back to defaults. Used by
   * the "Daten löschen" action in the Plugins area.
   */
  async clearAllData(): Promise<void> {
    for (const url of Object.values(this.urls.get())) URL.revokeObjectURL(url);
    this.urls.set({});
    await clearAllImages();
    this.state.set({ ...DEFAULT_STATE });
    this.persist();
    this.lastLiveSig = null;
    this.applyActive();
    this.pushLive();
  }

  /** Apply the wallpaper fit mode as CSS vars read by the #app-wallpaper layer. */
  applyFill(): void {
    const root = document.documentElement.style;
    const map: Record<FillMode, [string, string, string]> = {
      cover: ['cover', 'no-repeat', 'center'],
      contain: ['contain', 'no-repeat', 'center'],
      stretch: ['100% 100%', 'no-repeat', 'center'],
      center: ['auto', 'no-repeat', 'center'],
      tile: ['auto', 'repeat', 'top left'],
    };
    const [size, repeat, pos] = map[this.state.get().fillMode] ?? map.cover;
    root.setProperty('--wallpaper-size', size);
    root.setProperty('--wallpaper-repeat', repeat);
    root.setProperty('--wallpaper-position', pos);
  }

  // --- Auto rotation ---
  stopRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
  restartRotation(): void {
    this.stopRotation();
    const s = this.state.get();
    if (!s.randomEnabled) return;
    const ms = Math.max(5, s.randomIntervalSec) * 1000;
    this.rotationTimer = setInterval(() => this.rotateOnce(), ms);
  }
  private rotateOnce(): void {
    const s = this.state.get();
    let pool = s.items.filter((i) => {
      const k = i.kind ?? 'image';
      if (k === 'image' && !s.includeImages) return false;
      if (k === 'video' && !s.includeVideos) return false;
      return true;
    });
    if (s.activeCollectionId) {
      const col = s.collections.find((c) => c.id === s.activeCollectionId);
      const ids = new Set(col?.itemIds ?? []);
      pool = pool.filter((i) => ids.has(i.id));
    }
    if (s.randomFavOnly) pool = pool.filter((i) => i.favorite);
    if (pool.length < 2) return;
    const others = pool.filter((i) => i.id !== s.activeId);
    const pick = others[Math.floor(Math.random() * others.length)] ?? pool[0];
    this.setActive(pick.id);
    this.pushToOsIfEnabled(pick.id);
  }

  /** Mirror a wallpaper to the real OS home/lock screen if those toggles are on. */
  private pushToOsIfEnabled(id: string): void {
    const s = this.state.get();
    // When the live wallpaper is active it IS the system background — setting a
    // static bitmap on top would show Android's "wallpaper set" toast and bounce
    // the user to the home screen on every change. Skip it.
    if (s.liveWallpaper) return;
    if (!((s.randomSetHome || s.randomSetLock) && this.sysWallpaper)) return;
    const target = s.randomSetHome && s.randomSetLock ? 'both' : s.randomSetHome ? 'home' : 'lock';
    void (async () => {
      const full = await this.fullUrl(id); // full-res, not the gallery thumbnail
      if (!full) return;
      try {
        await this.sysWallpaper?.setSystem(full, target);
      } catch {
        /* ignore */
      } finally {
        URL.revokeObjectURL(full);
      }
    })();
  }

  // --- Time scheduling ---
  stopScheduler(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }
  restartScheduler(): void {
    this.stopScheduler();
    if (!this.state.get().scheduleEnabled) return;
    // Check twice a minute so an HH:MM match is never missed.
    this.scheduleTimer = setInterval(() => this.checkSchedule(), 30_000);
    this.checkSchedule();
  }
  private checkSchedule(): void {
    const s = this.state.get();
    if (!s.scheduleEnabled || s.schedule.length === 0) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const cur = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    for (const rule of s.schedule) {
      if (rule.time !== cur) continue;
      const key = `${day}-${rule.id}-${cur}`;
      if (this.firedScheduleKeys.has(key)) continue;
      this.firedScheduleKeys.add(key);
      this.applyScheduleRule(rule);
    }
    // Keep the fired-set from growing forever: only today's keys matter.
    if (this.firedScheduleKeys.size > 200) {
      for (const k of this.firedScheduleKeys) if (!k.startsWith(day)) this.firedScheduleKeys.delete(k);
    }
  }
  private applyScheduleRule(rule: ScheduleRule): void {
    const s = this.state.get();
    if (rule.targetType === 'item' && rule.targetId) {
      if (s.items.some((i) => i.id === rule.targetId)) {
        this.setActive(rule.targetId);
        this.pushToOsIfEnabled(rule.targetId);
      }
    } else if (rule.targetType === 'collection' && rule.targetId) {
      this.setActiveCollection(rule.targetId);
      const col = s.collections.find((c) => c.id === rule.targetId);
      const first = col?.itemIds.find((id) => s.items.some((i) => i.id === id));
      if (first) {
        this.setActive(first);
        this.pushToOsIfEnabled(first);
      }
    } else {
      // random
      const pick = s.items[Math.floor(Math.random() * s.items.length)];
      if (pick) {
        this.setActive(pick.id);
        this.pushToOsIfEnabled(pick.id);
      }
    }
  }

  private persist(): void {
    this.app.config.set(PLUGIN_ID, 'state', this.state.get());
  }

  private async refreshUrls(): Promise<void> {
    const map: Record<string, string> = {};
    const s = this.state.get();
    // Eagerly resolve IndexedDB blobs (fast, local). Folder-sourced items are
    // resolved LAZILY via ensureUrl() when a tile scrolls into view, so a huge
    // external folder never reads every file at once. The active item is
    // resolved eagerly regardless (theme + live wallpaper need it now).
    for (const item of [...s.items, ...s.trashedItems]) {
      if (!item.folderId) {
        const url = await imageUrl(item.id);
        if (url) map[item.id] = url;
      }
    }
    this.urls.set(map);
    const activeId = s.activeId;
    if (activeId) void this.ensureUrl(activeId);
  }

  private resolving = new Set<string>();

  /** Resolve a single item's object URL on demand (idempotent). */
  async ensureUrl(id: string): Promise<void> {
    if (this.urls.get()[id] || this.resolving.has(id)) return;
    const all = [...this.state.get().items, ...this.state.get().trashedItems];
    const item = all.find((it) => it.id === id);
    if (!item) return;
    this.resolving.add(id);
    try {
      // Gallery display uses a small thumbnail for folder items (low memory,
      // smooth scroll). IndexedDB blobs are already screen-sized.
      const url = item.folderId
        ? ((await this.folders?.thumbUrl(item.folderId, item.fileName ?? item.name, item.kind ?? 'image')) ?? null)
        : await imageUrl(item.id);
      if (url) {
        this.urls.update((m) => ({ ...m, [id]: url }));
        // If this is the active wallpaper, (re)apply it to the app background now
        // that its URL exists. On boot, folder-sourced items resolve lazily/async,
        // so applyActive() at start() ran with a null URL → the background stayed
        // blank until the user re-selected. This sets it as soon as it's ready.
        if (id === this.state.get().activeId) this.applyActive();
      }
    } finally {
      this.resolving.delete(id);
    }
  }

  /** A fresh FULL-resolution object URL for applying (system/live wallpaper).
   *  Caller must revokeObjectURL() when done. Null if unavailable. */
  async fullUrl(id: string): Promise<string | null> {
    const item = [...this.state.get().items, ...this.state.get().trashedItems].find((it) => it.id === id);
    if (!item) return null;
    return item.folderId
      ? ((await this.folders?.fileUrl(item.folderId, item.fileName ?? item.name)) ?? null)
      : imageUrl(item.id);
  }

  /** Free a folder-backed object URL once its tile scrolls far off screen, so
   *  a big external folder keeps only the on-screen images in memory. IndexedDB
   *  blobs are cheap to keep; only folder sources (full-res, native reads) are
   *  released. Never releases the active item. */
  releaseUrl(id: string): void {
    if (id === this.state.get().activeId) return;
    const item = this.state.get().items.find((it) => it.id === id);
    if (!item?.folderId) return;
    const url = this.urls.get()[id];
    if (!url) return;
    URL.revokeObjectURL(url);
    this.urls.update((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
  }

  getUrl(id: string): string | undefined {
    return this.urls.get()[id];
  }

  /**
   * Generic setter used by the declarative settings UI (SettingsView): write any
   * state field by key + run the right side effect. Keeps settings DRY.
   */
  setField(key: string, value: unknown): void {
    this.state.update((s) => ({ ...s, [key]: value }) as WallpaperState);
    this.persist();
    switch (key) {
      case 'schemeCharacter':
      case 'finish':
      case 'paletteBehaviour':
      case 'fixedSeed':
      case 'themeContrast':
      case 'sourceColourIndex':
        this.applyTheme();
        break;
      case 'uiScale':
        this.applyTheme();
        this.applyUiScale();
        break;
      case 'fillMode':
        this.applyFill();
        break;
      case 'dim':
        this.applyActive();
        break;
      case 'randomEnabled':
      case 'randomIntervalSec':
      case 'randomFavOnly':
      case 'includeImages':
      case 'includeVideos':
      case 'activeCollectionId':
        this.restartRotation();
        this.lastLiveSig = null;
        this.pushLive();
        break;
      case 'scheduleEnabled':
        this.restartScheduler();
        break;
      case 'transitionType':
      case 'transitionMs':
      case 'randomShader':
        this.syncLiveTransition();
        break;
      case 'liveWallpaper':
      case 'deviceMobile':
        this.lastLiveSig = null;
        this.pushLive();
        break;
      case 'muteVideo':
      case 'videoVolume':
        this.applyVideoAudio();
        break;
    }
  }

  private randomGpuType(): TransitionType {
    const gpu = TRANSITIONS.filter((t) => t.gpu).map((t) => t.value);
    return gpu.length ? gpu[Math.floor(Math.random() * gpu.length)] : 'fade';
  }

  /** Apply mute/volume to the in-app background video (if any). */
  private applyVideoAudio(): void {
    const v = document.querySelector('#app-wallpaper video') as HTMLVideoElement | null;
    if (!v) return;
    const s = this.state.get();
    v.muted = s.muteVideo;
    v.volume = Math.max(0, Math.min(1, s.videoVolume / 100));
  }

  // --- Trash (soft-delete with recovery) ---
  restoreFromTrash(id: string): void {
    const t = this.state.get().trashedItems.find((x) => x.id === id);
    if (!t) return;
    this.state.update((s) => ({
      ...s,
      trashedItems: s.trashedItems.filter((x) => x.id !== id),
      items: [...s.items, { id: t.id, name: t.name, kind: t.kind, accent: t.accent, tags: t.tags, folderId: t.folderId, fileName: t.fileName }],
    }));
    this.persist();
    if (!this.state.get().activeId) this.setActive(id);
    this.lastLiveSig = null;
    this.pushLive();
  }
  async purgeFromTrash(id: string): Promise<void> {
    await deleteImage(id);
    const url = this.urls.get()[id];
    if (url) URL.revokeObjectURL(url);
    this.urls.update((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
    this.state.update((s) => ({ ...s, trashedItems: s.trashedItems.filter((x) => x.id !== id) }));
    this.persist();
  }
  async emptyTrash(): Promise<void> {
    for (const t of [...this.state.get().trashedItems]) await this.purgeFromTrash(t.id);
  }
  private async cleanupTrash(): Promise<void> {
    const s = this.state.get();
    if (!s.trashAutoDelete) return;
    const cutoff = Date.now() - s.trashRetentionDays * 86400000;
    for (const t of s.trashedItems.filter((x) => x.deletedAt < cutoff)) {
      await this.purgeFromTrash(t.id);
    }
  }

  // --- Geometry presets (SELECTOR C1–C4) ---
  saveGeometryPreset(slot: number): void {
    const s = this.state.get();
    const snap: GeometryPreset = {
      viewMode: s.viewMode,
      wallColumns: s.wallColumns,
      slicesSkew: s.slicesSkew,
      slicesHeight: s.slicesHeight,
      hexSize: s.hexSize,
      hexRows: s.hexRows,
      hexColumns: s.hexColumns,
      hexScrollStep: s.hexScrollStep,
      hexArc: s.hexArc,
      hexArcIntensity: s.hexArcIntensity,
      depthTilt: s.depthTilt,
      handSpread: s.handSpread,
    };
    this.state.update((st) => {
      const presets = [...st.geometryPresets];
      presets[slot] = snap;
      return { ...st, geometryPresets: presets };
    });
    this.persist();
  }
  applyGeometryPreset(slot: number): void {
    const p = this.state.get().geometryPresets[slot];
    if (!p) return;
    this.state.update((s) => ({ ...s, ...p }));
    this.persist();
  }
  clearGeometryPreset(slot: number): void {
    this.state.update((st) => {
      const presets = [...st.geometryPresets];
      presets[slot] = null;
      return { ...st, geometryPresets: presets };
    });
    this.persist();
  }

  getActive(): WallpaperItem | undefined {
    const s = this.state.get();
    return s.items.find((i) => i.id === s.activeId) ?? undefined;
  }

  applyActive(): void {
    const s = this.state.get();
    const active = this.getActive();
    const url = active ? (this.getUrl(active.id) ?? null) : null;
    const type = s.randomShader ? this.randomGpuType() : s.transitionType;
    this.app.theme.setWallpaper({
      url,
      dim: s.dim,
      transition: { type, ms: s.transitionMs },
      kind: active?.kind ?? 'image',
    });
    this.applyTheme();
    this.applyUiScale();
    this.applyVideoAudio();
  }

  /** Regenerate + apply the full theme (chrome tokens + palette roles). */
  applyTheme(): void {
    const s = this.state.get();
    if (s.paletteBehaviour === 'keep') return;
    const active = this.getActive();
    const seed =
      s.paletteBehaviour === 'fixed' ? s.fixedSeed : (active?.accent ?? s.fixedSeed);
    const { tokens, roles } = generateTheme(
      seed,
      this.app.theme.resolvedMode(),
      s.schemeCharacter,
      s.finish,
      s.themeContrast,
    );
    // Fold the UI scale into the spacing tokens.
    const sc = s.uiScale;
    tokens['space-1'] = `${Math.round(4 * sc)}px`;
    tokens['space-2'] = `${Math.round(8 * sc)}px`;
    tokens['space-3'] = `${Math.round(12 * sc)}px`;
    tokens['space-4'] = `${Math.round(16 * sc)}px`;
    tokens['space-5'] = `${Math.round(24 * sc)}px`;
    tokens['space-6'] = `${Math.round(32 * sc)}px`;
    this.app.theme.setTokens(tokens);
    this.app.theme.setPalette(roles);
  }

  applyUiScale(): void {
    document.documentElement.style.fontSize = `${Math.round(16 * this.state.get().uiScale)}px`;
  }

  async addImage(file: File, opts?: { skipRecolour?: boolean }): Promise<void> {
    // Collision-proof id: time + random + per-session counter. The old
    // `wp-<len>-<counter>` scheme could repeat after a reload (see constructor).
    const id = `wp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}-${this.idCounter++}`;
    const kind: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
    await putImage(id, file);
    const url = URL.createObjectURL(file);
    this.urls.update((m) => ({ ...m, [id]: url }));

    // Extract a seed colour for theming (images only; videos keep the fallback).
    const accent = kind === 'image' ? ((await seedFromImage(url)) ?? undefined) : undefined;

    const item: WallpaperItem = { id, name: file.name.replace(/\.[^.]+$/, ''), kind, accent };
    this.state.update((s) => ({ ...s, items: [...s.items, item] }));
    this.persist();

    // First import becomes active automatically.
    if (!this.state.get().activeId) this.setActive(id);
    this.lastLiveSig = null; // pool grew → re-sync live rotation
    this.pushLive();

    // Auto-recolour: save a palette-recoloured copy alongside the original.
    if (!opts?.skipRecolour && kind === 'image' && this.state.get().autoRecolour) {
      void this.addRecolouredCopy(url, item.name).catch(() => {});
    }
  }

  // ---- External folder sources -------------------------------------------
  // Point at a real directory; its media appear in the library without being
  // copied. Items carry {folderId, fileName} and resolve on demand.

  /** Open the picker, scan the folder and add its media as referenced items. */
  async addFolder(kind: 'image' | 'video'): Promise<{ ok: boolean; count: number }> {
    const picked = (await this.folders?.pick()) ?? null;
    if (!picked) return { ok: false, count: 0 };
    const files = (await this.folders?.scan(picked.id, kind)) ?? [];
    const newItems: WallpaperItem[] = files.map((f) => ({
      id: `fi-${picked.id}-${f.name}`,
      name: f.name.replace(/\.[^.]+$/, ''),
      kind: f.kind,
      folderId: picked.id,
      fileName: f.locator,
    }));
    const source: FolderSource = { id: picked.id, name: picked.name, kind, connected: true, count: files.length };
    this.state.update((s) => {
      // Drop any prior items from this folder id (re-add = refresh).
      const kept = s.items.filter((it) => it.folderId !== picked.id);
      return { ...s, folders: [...s.folders, source], items: [...kept, ...newItems] };
    });
    this.persist();
    await this.refreshUrls();
    if (!this.state.get().activeId && newItems[0]) this.setActive(newItems[0].id);
    this.lastLiveSig = null;
    this.pushLive();
    return { ok: true, count: files.length };
  }

  /** Remove a folder source and all items that came from it. */
  async removeFolder(folderId: string): Promise<void> {
    this.state.update((s) => ({
      ...s,
      folders: s.folders.filter((f) => f.id !== folderId),
      items: s.items.filter((it) => it.folderId !== folderId),
    }));
    this.persist();
    await this.folders?.forget(folderId);
    await this.refreshUrls();
    this.lastLiveSig = null;
    this.pushLive();
  }

  /** Query-only check (no prompt) of which folders are still readable. */
  private async probeFolders(): Promise<void> {
    const folders = this.state.get().folders;
    if (!folders.length) return;
    let changed = false;
    for (const f of folders) {
      const files = (await this.folders?.scan(f.id, f.kind)) ?? null; // null when no permission
      const connected = files !== null;
      if (connected !== f.connected) {
        changed = true;
        this.state.update((s) => ({
          ...s,
          folders: s.folders.map((x) => (x.id === f.id ? { ...x, connected, count: files ? files.length : x.count } : x)),
        }));
      }
    }
    if (changed) {
      this.persist();
      await this.refreshUrls();
    }
  }

  /** Re-grant permission (user gesture) and rescan every folder after a reload. */
  async reconnectFolders(): Promise<void> {
    const folders = this.state.get().folders;
    for (const f of folders) {
      const ok = (await this.folders?.reconnect(f.id)) ?? false;
      let count = f.count;
      let items: WallpaperItem[] | null = null;
      if (ok) {
        const files = (await this.folders?.scan(f.id, f.kind)) ?? [];
        count = files.length;
        items = files.map((file) => ({
          id: `fi-${f.id}-${file.name}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          kind: file.kind,
          folderId: f.id,
          fileName: file.locator,
        }));
      }
      this.state.update((s) => ({
        ...s,
        folders: s.folders.map((x) => (x.id === f.id ? { ...x, connected: ok, count } : x)),
        items: items ? [...s.items.filter((it) => it.folderId !== f.id), ...items] : s.items,
      }));
    }
    this.persist();
    await this.refreshUrls();
    this.lastLiveSig = null;
    this.pushLive();
  }

  private recolourColors(): string[] {
    const s = this.state.get();
    if (s.recolourPalette !== 'theme') {
      const pal = RECOLOUR_PALETTES.find((p) => p.value === s.recolourPalette);
      if (pal?.colors.length) return pal.colors;
    }
    const p = this.app.theme.palette.get();
    return [p.primary, p.secondary, p.tertiary, p.surface, p.surfaceVariant, p.outline, p.onSurface, '#000000', '#ffffff'];
  }

  private async addRecolouredCopy(srcUrl: string, name: string): Promise<void> {
    const blob = await applyEffect(srcUrl, 'recolor', this.recolourColors());
    const file = new File([blob], `${name} · recolor.jpg`, { type: 'image/jpeg' });
    await this.addImage(file, { skipRecolour: true });
  }

  /** Soft-delete: move to trash (keep the blob) so it can be restored. */
  async removeImage(id: string): Promise<void> {
    const item = this.state.get().items.find((i) => i.id === id);
    this.state.update((s) => {
      const items = s.items.filter((i) => i.id !== id);
      const activeId = s.activeId === id ? (items[0]?.id ?? null) : s.activeId;
      // Also drop the deleted image from every collection.
      const collections = s.collections.map((c) => ({
        ...c,
        itemIds: c.itemIds.filter((x) => x !== id),
      }));
      const trashedItems = item
        ? [
            ...s.trashedItems,
            { id: item.id, name: item.name, kind: item.kind, accent: item.accent, tags: item.tags, folderId: item.folderId, fileName: item.fileName, deletedAt: Date.now() },
          ]
        : s.trashedItems;
      return { ...s, items, activeId, collections, trashedItems };
    });
    this.persist();
    this.applyActive();
    this.lastLiveSig = null; // pool shrank → re-sync live rotation
    this.pushLive();
  }

  setActive(id: string): void {
    this.state.update((s) => ({ ...s, activeId: id }));
    this.persist();
    this.applyActive();
    this.pushLive();
  }

  private lastLiveSig: string | null = null;

  /** The pool auto-rotation picks from (collection + favourites filters, images only). */
  private rotationPool(): WallpaperItem[] {
    const s = this.state.get();
    let pool = s.items;
    if (s.activeCollectionId) {
      const col = s.collections.find((c) => c.id === s.activeCollectionId);
      const ids = new Set(col?.itemIds ?? []);
      pool = pool.filter((i) => ids.has(i.id));
    }
    if (s.randomFavOnly) pool = pool.filter((i) => i.favorite);
    return pool.filter((i) => (i.kind ?? 'image') === 'image');
  }

  /**
   * Keep the native live-wallpaper service in sync. With auto-change on, push a
   * rotation pool (the service cycles it on its OWN timer → the home screen keeps
   * changing even when the app is closed). Otherwise push the single active media.
   * Deduped by signature; deferred + downscaled/chunked so it never blocks.
   */
  /** Keep the live service's transition (type + duration) in sync with settings. */
  private syncLiveTransition(): void {
    const s = this.state.get();
    if (!(s.liveWallpaper && s.deviceMobile && this.live)) return;
    const ms = s.transitionType === 'none' ? 1 : s.transitionMs;
    void this.live.setTransition(s.transitionType, ms);
  }

  private pushLive(): void {
    const s = this.state.get();
    if (!(s.liveWallpaper && s.deviceMobile && this.live)) return;
    this.syncLiveTransition();

    if (s.randomEnabled) {
      const pool = this.rotationPool().slice(0, 20);
      if (pool.length === 0) return;
      const sig = `rotate:${pool.map((i) => i.id).join(',')}:${s.randomIntervalSec}`;
      if (sig === this.lastLiveSig) return;
      this.lastLiveSig = sig;
      setTimeout(() => {
        void (async () => {
          // Resolve full-res URLs (not gallery thumbnails) for the pool, send,
          // then revoke — the native side has downscaled+copied them by now.
          const fulls = (await Promise.all(pool.map((i) => this.fullUrl(i.id)))).filter(
            (u): u is string => !!u,
          );
          if (fulls.length === 0) {
            this.lastLiveSig = null;
            return;
          }
          try {
            await this.live?.setPool(fulls, Math.max(2, s.randomIntervalSec) * 1000, true);
          } catch {
            this.lastLiveSig = null;
          } finally {
            for (const u of fulls) URL.revokeObjectURL(u);
          }
        })();
      }, 300);
    } else {
      const active = this.getActive();
      if (!active) return;
      const sig = `single:${active.id}`;
      if (sig === this.lastLiveSig) return;
      this.lastLiveSig = sig;
      const kind = active.kind ?? 'image';
      setTimeout(() => {
        void (async () => {
          const full = await this.fullUrl(active.id);
          if (!full) {
            this.lastLiveSig = null;
            return;
          }
          try {
            await this.live?.setMedia(full, kind);
          } catch {
            this.lastLiveSig = null;
          } finally {
            URL.revokeObjectURL(full);
          }
        })();
      }, 300);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.state.update((s) => ({ ...s, viewMode: mode }));
    this.persist();
  }

  setMenuSide(side: MenuSide): void {
    this.state.update((s) => ({ ...s, menuSide: side }));
    this.persist();
  }

  setMenuMode(mode: MenuMode): void {
    this.state.update((s) => ({ ...s, menuMode: mode }));
    this.persist();
  }

  setAutoHideMs(ms: number): void {
    this.state.update((s) => ({ ...s, autoHideMs: ms }));
    this.persist();
  }

  setSchemeCharacter(c: SchemeCharacter): void {
    this.state.update((s) => ({ ...s, schemeCharacter: c }));
    this.persist();
    this.applyTheme();
  }

  setFinish(f: Finish): void {
    this.state.update((s) => ({ ...s, finish: f }));
    this.persist();
    this.applyTheme();
  }

  setPaletteBehaviour(b: PaletteBehaviour): void {
    this.state.update((s) => ({ ...s, paletteBehaviour: b }));
    this.persist();
    this.applyTheme();
  }

  setFixedSeed(hex: string): void {
    this.state.update((s) => ({ ...s, fixedSeed: hex }));
    this.persist();
    if (this.state.get().paletteBehaviour === 'fixed') this.applyTheme();
  }

  setUiScale(scale: number): void {
    this.state.update((s) => ({ ...s, uiScale: scale }));
    this.persist();
    this.applyTheme();
    this.applyUiScale();
  }

  setThemeContrast(c: number): void {
    this.state.update((s) => ({ ...s, themeContrast: Math.max(-1, Math.min(1, c)) }));
    this.persist();
    this.applyTheme();
  }

  // --- Theme presets ---
  saveThemePreset(name: string): void {
    const s = this.state.get();
    const preset: ThemePreset = {
      id: `tp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      name: name.trim() || 'Preset',
      schemeCharacter: s.schemeCharacter,
      finish: s.finish,
      paletteBehaviour: s.paletteBehaviour,
      fixedSeed: s.fixedSeed,
      contrast: s.themeContrast,
    };
    this.state.update((st) => ({ ...st, themePresets: [...st.themePresets, preset] }));
    this.persist();
  }
  applyThemePreset(id: string): void {
    const p = this.state.get().themePresets.find((x) => x.id === id);
    if (!p) return;
    this.state.update((s) => ({
      ...s,
      schemeCharacter: p.schemeCharacter,
      finish: p.finish,
      paletteBehaviour: p.paletteBehaviour,
      fixedSeed: p.fixedSeed,
      themeContrast: p.contrast,
    }));
    this.persist();
    this.applyTheme();
  }
  deleteThemePreset(id: string): void {
    this.state.update((s) => ({ ...s, themePresets: s.themePresets.filter((x) => x.id !== id) }));
    this.persist();
  }
  exportThemePresets(): string {
    return JSON.stringify(this.state.get().themePresets, null, 2);
  }
  /** Import presets from JSON; appends with fresh ids. Returns count or -1 on error. */
  importThemePresets(json: string): number {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return -1;
      const valid: ThemePreset[] = parsed
        .filter((p) => p && typeof p.name === 'string' && typeof p.fixedSeed === 'string')
        .map((p, i) => ({
          id: `tp-${Date.now().toString(36)}-${i}-${Math.floor(Math.random() * 1e6).toString(36)}`,
          name: String(p.name),
          schemeCharacter: p.schemeCharacter ?? 'vibrant',
          finish: p.finish ?? 'natural',
          paletteBehaviour: p.paletteBehaviour ?? 'fixed',
          fixedSeed: String(p.fixedSeed),
          contrast: typeof p.contrast === 'number' ? p.contrast : 0,
        }));
      if (!valid.length) return 0;
      this.state.update((s) => ({ ...s, themePresets: [...s.themePresets, ...valid] }));
      this.persist();
      return valid.length;
    } catch {
      return -1;
    }
  }

  setWallpaperTargets(home: boolean, lock: boolean): void {
    this.state.update((s) => ({ ...s, setHome: home, setLock: lock }));
    this.persist();
  }

  setFillMode(m: FillMode): void {
    this.state.update((s) => ({ ...s, fillMode: m }));
    this.persist();
    this.applyFill();
  }
  setTileSize(px: number): void {
    this.state.update((s) => ({ ...s, tileSize: px }));
    this.persist();
  }
  setTileRadius(px: number): void {
    this.state.update((s) => ({ ...s, tileRadius: px }));
    this.persist();
  }
  setRandomEnabled(on: boolean): void {
    this.state.update((s) => ({ ...s, randomEnabled: on }));
    this.persist();
    this.restartRotation();
    this.lastLiveSig = null; // mode changed → re-sync live service
    this.pushLive();
  }
  setRandomInterval(sec: number): void {
    this.state.update((s) => ({ ...s, randomIntervalSec: sec }));
    this.persist();
    this.restartRotation();
    this.pushLive();
  }
  setRandomFavOnly(on: boolean): void {
    this.state.update((s) => ({ ...s, randomFavOnly: on }));
    this.persist();
    this.pushLive();
  }
  setRandomSetHome(on: boolean): void {
    this.state.update((s) => ({ ...s, randomSetHome: on }));
    this.persist();
  }
  setRandomSetLock(on: boolean): void {
    this.state.update((s) => ({ ...s, randomSetLock: on }));
    this.persist();
  }
  setTransitionType(t: TransitionType): void {
    this.state.update((s) => ({ ...s, transitionType: t }));
    this.persist();
    this.syncLiveTransition();
  }
  setTransitionMs(ms: number): void {
    this.state.update((s) => ({ ...s, transitionMs: ms }));
    this.persist();
    this.syncLiveTransition();
  }
  setDeviceMobile(on: boolean): void {
    this.state.update((s) => ({ ...s, deviceMobile: on }));
    this.persist();
  }
  setLiveWallpaper(on: boolean): void {
    this.state.update((s) => ({ ...s, liveWallpaper: on }));
    this.persist();
    if (on) this.pushLive();
  }
  setWallColumns(n: number): void {
    this.state.update((s) => ({ ...s, wallColumns: n }));
    this.persist();
  }
  setSlicesSkew(deg: number): void {
    this.state.update((s) => ({ ...s, slicesSkew: deg }));
    this.persist();
  }
  setSlicesHeight(n: number): void {
    this.state.update((s) => ({ ...s, slicesHeight: n }));
    this.persist();
  }
  setHexSize(px: number): void {
    this.state.update((s) => ({ ...s, hexSize: px }));
    this.persist();
  }
  setDepthTilt(deg: number): void {
    this.state.update((s) => ({ ...s, depthTilt: deg }));
    this.persist();
  }
  setHandSpread(deg: number): void {
    this.state.update((s) => ({ ...s, handSpread: deg }));
    this.persist();
  }

  // --- Collections / playlists ---
  createCollection(name: string): string {
    const id = `col-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const col: Collection = { id, name: name.trim() || 'Neue Sammlung', itemIds: [] };
    this.state.update((s) => ({ ...s, collections: [...s.collections, col] }));
    this.persist();
    return id;
  }
  renameCollection(id: string, name: string): void {
    this.state.update((s) => ({
      ...s,
      collections: s.collections.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)),
    }));
    this.persist();
  }
  deleteCollection(id: string): void {
    this.state.update((s) => ({
      ...s,
      collections: s.collections.filter((c) => c.id !== id),
      activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId,
    }));
    this.persist();
    this.restartRotation();
  }
  toggleInCollection(collectionId: string, itemId: string): void {
    this.state.update((s) => ({
      ...s,
      collections: s.collections.map((c) => {
        if (c.id !== collectionId) return c;
        const has = c.itemIds.includes(itemId);
        return { ...c, itemIds: has ? c.itemIds.filter((x) => x !== itemId) : [...c.itemIds, itemId] };
      }),
    }));
    this.persist();
  }
  setActiveCollection(id: string | null): void {
    this.state.update((s) => ({ ...s, activeCollectionId: id }));
    this.persist();
    this.restartRotation();
    this.lastLiveSig = null; // pool changed → re-sync live service
    this.pushLive();
  }

  // --- Schedule rules ---
  setScheduleEnabled(on: boolean): void {
    this.state.update((s) => ({ ...s, scheduleEnabled: on }));
    this.persist();
    this.restartScheduler();
  }
  addScheduleRule(): string {
    const id = `sch-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const rule: ScheduleRule = { id, time: '08:00', targetType: 'random' };
    this.state.update((s) => ({ ...s, schedule: [...s.schedule, rule] }));
    this.persist();
    return id;
  }
  updateScheduleRule(id: string, patch: Partial<Omit<ScheduleRule, 'id'>>): void {
    this.state.update((s) => ({
      ...s,
      schedule: s.schedule.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    this.persist();
    this.restartScheduler();
  }
  removeScheduleRule(id: string): void {
    this.state.update((s) => ({ ...s, schedule: s.schedule.filter((r) => r.id !== id) }));
    this.persist();
  }

  toggleFavorite(id: string): void {
    this.state.update((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i)),
    }));
    this.persist();
    if (this.state.get().randomFavOnly) {
      this.lastLiveSig = null; // favourites-only pool changed
      this.pushLive();
    }
  }

  renameItem(id: string, name: string): void {
    this.state.update((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, name } : i)),
    }));
    this.persist();
  }

  addTag(id: string, tag: string): void {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    this.state.update((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === id ? { ...i, tags: [...new Set([...(i.tags ?? []), t])] } : i,
      ),
    }));
    this.persist();
  }
  removeTag(id: string, tag: string): void {
    this.state.update((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === id ? { ...i, tags: (i.tags ?? []).filter((x) => x !== tag) } : i,
      ),
    }));
    this.persist();
  }

  setDim(dim: number): void {
    this.state.update((s) => ({ ...s, dim }));
    this.persist();
    this.applyActive();
  }
}
