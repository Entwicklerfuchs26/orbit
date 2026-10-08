// Wallhaven search + download, routed through the Vite proxy (/wh/*) to avoid
// CORS. The app loads from the dev server, so these relative paths work both
// in the browser and the live-reload Android app.

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
  return url
    .replace('https://th.wallhaven.cc', '/wh/th')
    .replace('https://w.wallhaven.cc', '/wh/img');
}

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

  const res = await fetch(`/wh/api/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Wallhaven ${res.status}`);
  const json = await res.json();
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
  const res = await fetch(r.full);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const blob = await res.blob();
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return new File([blob], `wallhaven-${r.id}.${ext}`, { type: blob.type });
}
