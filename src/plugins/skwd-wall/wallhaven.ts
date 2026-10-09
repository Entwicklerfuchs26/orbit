// Wallhaven search + download.
//  - Web / dev: routed through the Vite proxy (/wh/*) to avoid CORS.
//  - Standalone native app (no dev server): call Wallhaven DIRECTLY. The JSON
//    API is CORS-fetched via CapacitorHttp (native, bypasses CORS) and images
//    load straight from th./w.wallhaven.cc (cross-origin <img> needs no CORS).
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const native = Capacitor.isNativePlatform();

/** Fetch JSON from Wallhaven — native uses CapacitorHttp (no CORS), web uses the proxy. */
async function whJson(url: string): Promise<any> {
  if (native) {
    const res = await CapacitorHttp.get({ url });
    if (res.status < 200 || res.status >= 300) throw new Error(`Wallhaven ${res.status}`);
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wallhaven ${res.status}`);
  return res.json();
}

export interface WhResult {
  id: string;
  thumb: string; // proxied thumbnail URL (for <img>)
  full: string; // proxied full-image URL (for download)
  width: number;
  height: number;
  resolution: string;
}

export type WhSorting = 'toplist' | 'date_added' | 'views' | 'favorites' | 'random' | 'relevance';
export type WhRatio = 'all' | 'landscape' | 'portrait';

export interface WhFilters {
  query: string;
  sorting: WhSorting;
  /** [general, anime, people] */
  categories: [boolean, boolean, boolean];
  ratio: WhRatio;
}

export const WH_SORTINGS: { value: WhSorting; label: string }[] = [
  { value: 'toplist', label: 'Top' },
  { value: 'date_added', label: 'Neu' },
  { value: 'views', label: 'Beliebt' },
  { value: 'favorites', label: 'Favoriten' },
  { value: 'random', label: 'Zufall' },
  { value: 'relevance', label: 'Relevanz' },
];

export const WH_CATEGORIES = ['Allgemein', 'Anime', 'Menschen'];

export const DEFAULT_WH_FILTERS: WhFilters = {
  query: '',
  sorting: 'toplist',
  categories: [true, true, true],
  ratio: 'all',
};

function proxify(url: string): string {
  // Native: use the real URLs (images load cross-origin in <img> without CORS).
  if (native) return url;
  return url
    .replace('https://th.wallhaven.cc', '/wh/th')
    .replace('https://w.wallhaven.cc', '/wh/img');
}

/** Base for the search API: direct on native, proxied on web. */
const WH_API = native ? 'https://wallhaven.cc/api/v1' : '/wh/api';

/** Search Wallhaven (SFW only). Returns a page of results + the last page no. */
export async function searchWallhaven(
  f: WhFilters,
  page = 1,
): Promise<{ results: WhResult[]; lastPage: number }> {
  const q = f.query.trim();
  let sorting: WhSorting = f.sorting;
  if (sorting === 'relevance' && !q) sorting = 'toplist';

  const cats = f.categories.map((b) => (b ? '1' : '0')).join('');
  const params = new URLSearchParams({
    purity: '100', // SFW only
    categories: cats === '000' ? '111' : cats,
    sorting,
    page: String(page),
  });
  if (q) params.set('q', q);
  if (sorting === 'toplist') params.set('topRange', '1M');
  if (f.ratio === 'landscape') params.set('ratios', 'landscape');
  else if (f.ratio === 'portrait') params.set('ratios', 'portrait');

  const json = await whJson(`${WH_API}/search?${params.toString()}`);
  const data: any[] = json?.data ?? [];
  const lastPage: number = json?.meta?.last_page ?? page;
  return {
    results: data.map((d) => ({
      id: String(d.id),
      thumb: proxify(d.thumbs?.small ?? d.thumbs?.original ?? ''),
      full: proxify(d.path ?? ''),
      width: d.dimension_x ?? 0,
      height: d.dimension_y ?? 0,
      resolution: d.resolution ?? '',
    })),
    lastPage,
  };
}

/** Download a full image (proxied URL) as a File for import. */
export async function downloadWallhaven(r: WhResult): Promise<File> {
  let blob: Blob;
  if (native) {
    // Direct URL → CapacitorHttp (bypasses CORS); returns the body as base64.
    const res = await CapacitorHttp.get({ url: r.full, responseType: 'blob' });
    if (res.status < 200 || res.status >= 300) throw new Error(`Download ${res.status}`);
    const mime = res.headers?.['Content-Type'] || res.headers?.['content-type'] || 'image/jpeg';
    blob = await (await fetch(`data:${mime};base64,${res.data}`)).blob();
  } else {
    const res = await fetch(r.full);
    if (!res.ok) throw new Error(`Download ${res.status}`);
    blob = await res.blob();
  }
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return new File([blob], `wallhaven-${r.id}.${ext}`, { type: blob.type });
}
