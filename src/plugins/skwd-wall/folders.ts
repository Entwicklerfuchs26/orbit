/**
 * External folder sources. The user can point at a real directory and its
 * media files appear in the library WITHOUT being copied into IndexedDB —
 * files are resolved to object URLs on demand.
 *
 * Backend: the File System Access API (Chromium desktop + some Android browsers).
 * `FileSystemDirectoryHandle`s are structured-cloneable, so we persist them in a
 * tiny IndexedDB store and re-request permission after a reload. Platforms
 * without the API (Firefox, the Capacitor WebView) report unsupported and fall
 * back to upload-only — native Android folder access (SAF) comes as its own step.
 */
const DB_NAME = 'sojus-folders';
const STORE = 'handles';

export const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'];
export const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'mkv'];

export function supportsFolders(): boolean {
  return typeof (globalThis as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

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

/** Has the user already granted read access to this folder (no prompt)? */
async function hasPermission(h: DirHandle): Promise<boolean> {
  if (!h.queryPermission) return true;
  try {
    return (await h.queryPermission({ mode: 'read' })) === 'granted';
  } catch {
    return false;
  }
}

/** Open the native picker and persist the chosen directory handle. */
export async function pickFolder(): Promise<{ id: string; name: string } | null> {
  const picker = (globalThis as unknown as { showDirectoryPicker?: () => Promise<DirHandle> }).showDirectoryPicker;
  if (!picker) return null;
  let handle: DirHandle;
  try {
    handle = await picker();
  } catch {
    return null; // user cancelled
  }
  const id = `fld-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  await tx('readwrite', (s) => s.put(handle, id));
  liveHandles.set(id, handle);
  return { id, name: handle.name };
}

export interface ScannedFile {
  name: string;
  kind: 'image' | 'video';
}

/** List the media files in a folder (filtered by the source's kind). */
export async function scanFolder(folderId: string, kind: 'image' | 'video'): Promise<ScannedFile[] | null> {
  const h = await getHandle(folderId);
  if (!h || !h.values) return null;
  if (!(await hasPermission(h))) return null;
  const wanted = kind === 'video' ? VIDEO_EXT : IMAGE_EXT;
  const out: ScannedFile[] = [];
  try {
    for await (const entry of h.values()) {
      if (entry.kind !== 'file') continue;
      if (wanted.includes(ext(entry.name))) out.push({ name: entry.name, kind });
    }
  } catch {
    return null;
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Ask the user (needs a gesture) to re-grant a folder after a reload. */
export async function reconnectFolder(folderId: string): Promise<boolean> {
  const h = await getHandle(folderId);
  if (!h) return false;
  if (await hasPermission(h)) return true;
  if (!h.requestPermission) return true;
  try {
    return (await h.requestPermission({ mode: 'read' })) === 'granted';
  } catch {
    return false;
  }
}

/** Resolve one folder file to a displayable object URL (null if unavailable). */
export async function folderFileUrl(folderId: string, fileName: string): Promise<string | null> {
  const h = await getHandle(folderId);
  if (!h) return null;
  if (!(await hasPermission(h))) return null;
  try {
    const fh = await h.getFileHandle(fileName);
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export async function forgetFolder(folderId: string): Promise<void> {
  liveHandles.delete(folderId);
  await tx('readwrite', (s) => s.delete(folderId));
}
