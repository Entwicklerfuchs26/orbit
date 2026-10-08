/**
 * Tiny IndexedDB store for wallpaper image blobs. Images are too big for
 * localStorage, so the config only keeps metadata (ids/names) and the blobs
 * live here. Returns object URLs for display.
 */
const DB_NAME = 'sojus-wallpapers';
const STORE = 'images';

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

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const store = db.transaction(STORE, mode).objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, id));
}

export async function getImage(id: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>('readonly', (s) => s.get(id));
}

export async function deleteImage(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

/** Resolve an id to a displayable object URL (or null if missing). */
export async function imageUrl(id: string): Promise<string | null> {
  const blob = await getImage(id);
  return blob ? URL.createObjectURL(blob) : null;
}
