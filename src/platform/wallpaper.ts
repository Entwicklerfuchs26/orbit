import { registerPlugin, Capacitor } from '@capacitor/core';

export interface WallpaperNativePlugin {
  setWallpaper(options: { data: string; target?: 'home' | 'lock' | 'both' }): Promise<void>;
  setLiveMedia(options: { data: string; kind: 'image' | 'video' }): Promise<void>;
  writeLiveVideoChunk(options: { data: string; reset: boolean }): Promise<void>;
  finishLiveVideo(): Promise<void>;
  clearLivePool(): Promise<void>;
  addLivePoolImage(options: { data: string; index: number }): Promise<void>;
  startLivePool(options: { count: number; interval: number; random: boolean }): Promise<void>;
  setLiveTransition(options: { type: string; ms: number }): Promise<void>;
  openLiveWallpaperPicker(): Promise<void>;
  isLiveWallpaperActive(): Promise<{ active: boolean }>;
}

const Wallpaper = registerPlugin<WallpaperNativePlugin>('Wallpaper');

/** True only inside the installed Android/iOS app (not the browser). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Push the current media to the SKWD live-wallpaper service. Native only. */
export async function setLiveWallpaperMedia(
  url: string,
  kind: 'image' | 'video',
): Promise<void> {
  // Images are downscaled first: sending a full-res Wallhaven image (several MB)
  // as base64 over the Capacitor bridge froze the main thread → ANR. A screen-
  // sized JPEG is a few hundred KB and transfers instantly.
  if (kind === 'video') {
    await setLiveWallpaperVideo(url);
    return;
  }
  const base64 = await downscaledBase64(url, 1920);
  await Wallpaper.setLiveMedia({ data: base64, kind: 'image' });
}

/**
 * Stream a video to the live service in small chunks. Each bridge call is tiny
 * and `await` yields between them, so the main thread never blocks (no ANR).
 */
export async function setLiveWallpaperVideo(url: string): Promise<void> {
  const res = await fetch(url);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const CHUNK = 256 * 1024;
  for (let off = 0; off < bytes.length; off += CHUNK) {
    const slice = bytes.subarray(off, Math.min(off + CHUNK, bytes.length));
    await Wallpaper.writeLiveVideoChunk({ data: base64FromBytes(slice), reset: off === 0 });
  }
  await Wallpaper.finishLiveVideo();
}

/**
 * Push a rotation pool of images (downscaled) to the live service, which then
 * cycles them on its OWN timer — so the home screen keeps changing even when
 * the app is closed. Each image is a small single bridge call (no ANR).
 */
export async function setLivePool(
  urls: string[],
  intervalMs: number,
  random: boolean,
): Promise<void> {
  await Wallpaper.clearLivePool();
  let written = 0;
  for (const url of urls) {
    try {
      const b64 = await downscaledBase64(url, 1280);
      await Wallpaper.addLivePoolImage({ data: b64, index: written });
      written++;
    } catch {
      // Skip an image that fails to load/encode rather than aborting the pool.
    }
  }
  if (written > 0) {
    await Wallpaper.startLivePool({ count: written, interval: intervalMs, random });
  }
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  const sub = 0x8000;
  for (let i = 0; i < bytes.length; i += sub) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + sub)));
  }
  return btoa(binary);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Load, cover-scale to maxDim, re-encode as JPEG, return raw base64. */
async function downscaledBase64(url: string, maxDim: number): Promise<string> {
  const img = await loadImage(url);
  const w0 = img.naturalWidth || maxDim;
  const h0 = img.naturalHeight || maxDim;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return urlToBase64(url);
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

/** Open Android's live-wallpaper picker preset to the SKWD service. */
export async function openLiveWallpaperPicker(): Promise<void> {
  await Wallpaper.openLiveWallpaperPicker();
}

/** Tell the live service which transition (type + ms) to use on each change. */
export async function setLiveTransition(type: string, ms: number): Promise<void> {
  try {
    await Wallpaper.setLiveTransition({ type, ms });
  } catch {
    /* ignore */
  }
}

/** Whether the SKWD live wallpaper is currently the active OS wallpaper. */
export async function isLiveWallpaperActive(): Promise<boolean> {
  try {
    const { active } = await Wallpaper.isLiveWallpaperActive();
    return active;
  } catch {
    return false;
  }
}

/** Set the real OS wallpaper from a data:/blob: URL. Native only. */
export async function setSystemWallpaper(
  url: string,
  target: 'home' | 'lock' | 'both' = 'both',
): Promise<void> {
  const base64 = await urlToBase64(url);
  await Wallpaper.setWallpaper({ data: base64, target });
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result as string;
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
