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
 */
import { registerPlugin, Capacitor } from '@capacitor/core';

interface FolderAccessNative {
  pickFolder(): Promise<{ uri?: string; name?: string; cancelled?: boolean }>;
  listFolder(o: { uri: string; kind: string }): Promise<{ files: { name: string; uri: string }[] }>;
  readFile(o: { uri: string }): Promise<{ data: string; mime: string }>;
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

export function supportsFolders(): boolean {
  return (
    isNative() ||
    typeof (globalThis as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  );
}

export interface ScannedFile {
  name: string;
  kind: 'image' | 'video';
  /** Per-file locator: file name (web) or document URI (native). */
  locator: string;
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
export async function pickFolder(): Promise<{ id: string; name: string } | null> {
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
export async function scanFolder(folderId: string, kind: 'image' | 'video'): Promise<ScannedFile[] | null> {
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
export async function reconnectFolder(folderId: string): Promise<boolean> {
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
export async function folderFileUrl(folderId: string, locator: string): Promise<string | null> {
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

export async function forgetFolder(folderId: string): Promise<void> {
  if (isNative()) return; // SAF permission can stay; nothing to clean up here
  liveHandles.delete(folderId);
  await tx('readwrite', (s) => s.delete(folderId));
}
