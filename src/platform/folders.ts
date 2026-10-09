/**
 * External folder sources. The user points at a real directory and its media
 * appear in the library WITHOUT being copied — files resolve to object URLs on
 * demand (lazily, so a big folder never reads everything at once).
 *
 * Two backends behind one interface:
 *  - Native Android: the `FolderAccess` Capacitor plugin (Storage Access
 *    Framework). The folder id is the tree content:// URI, the per-file locator
 *    is the document content:// URI; permission persists across reboots.
 *  - Web (Chromium): the File System Access API. The folder id is a generated
 *    key for a persisted `FileSystemDirectoryHandle`; the locator is the file
 *    name; permission must be re-granted after a reload.
 *
 * This is a platform adapter: it implements the core `FoldersCapability`
 * contract and is registered into `app.capabilities` at boot (see index.ts).
 */
import { registerPlugin, Capacitor } from '@capacitor/core';
import type { FoldersCapability, ScannedFile } from '@core/capabilities';

interface FolderAccessNative {
  pickFolder(): Promise<{ uri?: string; name?: string; cancelled?: boolean }>;
  listFolder(o: { uri: string; kind: string }): Promise<{ files: { name: string; uri: string }[] }>;
  readFile(o: { uri: string }): Promise<{ data: string; mime: string }>;
  thumbnail(o: { uri: string; max: number }): Promise<{ data: string; mime: string }>;
  hasAccess(o: { uri: string }): Promise<{ granted: boolean }>;
}
const Native = registerPlugin<FolderAccessNative>('FolderAccess');

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

const DB_NAME = 'sojus-folders';
const STORE = 'handles';

export const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'];
export const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'mkv'];

/** Whether this platform can offer folder access at all. */
export function supportsFolders(): boolean {
  return (
    isNative() ||
    typeof (globalThis as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  );
}

// ---- Web (File System Access) handle persistence -------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: string }) => Promise<PermissionState>;
  values?: () => AsyncIterable<FileSystemHandle>;
};

const liveHandles = new Map<string, DirHandle>();

async function getHandle(folderId: string): Promise<DirHandle | undefined> {
  if (liveHandles.has(folderId)) return liveHandles.get(folderId);
  const h = await tx<DirHandle | undefined>('readonly', (s) => s.get(folderId));
  if (h) liveHandles.set(folderId, h);
  return h;
}

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

async function webHasPermission(h: DirHandle): Promise<boolean> {
  if (!h.queryPermission) return true;
  try {
    return (await h.queryPermission({ mode: 'read' })) === 'granted';
  } catch {
    return false;
  }
}

// ---- Public API (platform-branching) -------------------------------------

/** Open the native/OS picker and return a stable folder id + display name. */
async function pickFolder(): Promise<{ id: string; name: string } | null> {
  if (isNative()) {
    const r = await Native.pickFolder();
    if (!r || r.cancelled || !r.uri) return null;
    return { id: r.uri, name: r.name || 'Ordner' };
  }
  const picker = (globalThis as unknown as { showDirectoryPicker?: () => Promise<DirHandle> }).showDirectoryPicker;
  if (!picker) return null;
  let handle: DirHandle;
  try {
    handle = await picker();
  } catch {
    return null; // cancelled
  }
  const id = `fld-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  await tx('readwrite', (s) => s.put(handle, id));
  liveHandles.set(id, handle);
  return { id, name: handle.name };
}

/** List media in the folder (null = no access / unavailable). */
async function scanFolder(folderId: string, kind: 'image' | 'video'): Promise<ScannedFile[] | null> {
  if (isNative()) {
    try {
      const r = await Native.listFolder({ uri: folderId, kind });
      const files = (r.files ?? []).map((f) => ({ name: f.name, kind, locator: f.uri }));
      files.sort((a, b) => a.name.localeCompare(b.name));
      return files;
    } catch {
      return null;
    }
  }
  const h = await getHandle(folderId);
  if (!h || !h.values) return null;
  if (!(await webHasPermission(h))) return null;
  const wanted = kind === 'video' ? VIDEO_EXT : IMAGE_EXT;
  const out: ScannedFile[] = [];
  try {
    for await (const entry of h.values()) {
      if (entry.kind !== 'file') continue;
      if (wanted.includes(ext(entry.name))) out.push({ name: entry.name, kind, locator: entry.name });
    }
  } catch {
    return null;
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Re-establish access after a reload (native: persisted; web: needs a gesture). */
async function reconnectFolder(folderId: string): Promise<boolean> {
  if (isNative()) {
    try {
      return (await Native.hasAccess({ uri: folderId })).granted;
    } catch {
      return false;
    }
  }
  const h = await getHandle(folderId);
  if (!h) return false;
  if (await webHasPermission(h)) return true;
  if (!h.requestPermission) return true;
  try {
    return (await h.requestPermission({ mode: 'read' })) === 'granted';
  } catch {
    return false;
  }
}

/** Resolve one file to a displayable object URL (null if unavailable). */
async function folderFileUrl(folderId: string, locator: string): Promise<string | null> {
  if (isNative()) {
    try {
      const { data, mime } = await Native.readFile({ uri: locator });
      // Let the browser decode the base64 (native, off the hot path) instead of
      // an atob() char loop on the main thread — much less scroll jank.
      const blob = await (await fetch(`data:${mime};base64,${data}`)).blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }
  const h = await getHandle(folderId);
  if (!h) return null;
  if (!(await webHasPermission(h))) return null;
  try {
    const fh = await h.getFileHandle(locator);
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

/** Resolve a small DOWNSCALED thumbnail for gallery display (low memory, smooth
 *  scrolling). Full resolution is only loaded via folderFileUrl() when applying. */
async function folderThumbUrl(
  folderId: string,
  locator: string,
  kind: 'image' | 'video',
  max = 420,
): Promise<string | null> {
  // Videos: no cheap frame thumbnail yet → fall back to the full file.
  if (kind === 'video') return folderFileUrl(folderId, locator);
  if (isNative()) {
    try {
      const { data, mime } = await Native.thumbnail({ uri: locator, max });
      const blob = await (await fetch(`data:${mime};base64,${data}`)).blob();
      return URL.createObjectURL(blob);
    } catch {
      return folderFileUrl(folderId, locator);
    }
  }
  // Web: decode-and-downscale with createImageBitmap (efficient) → canvas → blob.
  const full = await folderFileUrl(folderId, locator);
  if (!full) return null;
  try {
    const resp = await fetch(full);
    const srcBlob = await resp.blob();
    const bmp = await createImageBitmap(srcBlob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const thumb = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    URL.revokeObjectURL(full);
    return thumb ? URL.createObjectURL(thumb) : full;
  } catch {
    return full;
  }
}

async function forgetFolder(folderId: string): Promise<void> {
  if (isNative()) return; // SAF permission can stay; nothing to clean up here
  liveHandles.delete(folderId);
  await tx('readwrite', (s) => s.delete(folderId));
}

/** The core capability object wired into `app.capabilities` when supported. */
export const foldersCapability: FoldersCapability = {
  pick: pickFolder,
  scan: scanFolder,
  reconnect: reconnectFolder,
  fileUrl: folderFileUrl,
  thumbUrl: folderThumbUrl,
  forget: forgetFolder,
};
