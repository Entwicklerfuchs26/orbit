<script lang="ts">
  import type { App } from '@core/index';
  import { useStore } from '@shell/reactive.svelte';
  import Icon from '@shell/Icon.svelte';
  import type { WallpaperManager } from './manager';
  import type { WallpaperItem } from './types';
  import { VIEW_MODES, SORTS, COLOR_FAMILIES, MEDIA_TABS } from './types';
  import type { SortBy, MediaTab } from './types';
  import { colorFamily, lightness, rainbowKey } from './color';
  import { applyEffect, EFFECTS, type EffectType } from './effects';
  import WallpaperSettings from './WallpaperSettings.svelte';
  import { isNativeApp, setSystemWallpaper } from '../../platform/wallpaper';
  import {
    searchWallhaven,
    downloadWallhaven,
    WH_SORTINGS,
    WH_CATEGORIES,
    DEFAULT_WH_FILTERS,
    type WhResult,
    type WhFilters,
    type WhRatio,
  } from './wallhaven';

  interface Props {
    app: App;
    manager: WallpaperManager;
  }
  let { app, manager }: Props = $props();

  const wpState = useStore(manager.state);
  const urls = useStore(manager.urls);
  const themeMode = useStore(app.theme.mode);
  let themeIcon = $derived(
    themeMode.value === 'light' ? 'sun' : themeMode.value === 'dark' ? 'moon' : 'theme-auto',
  );
  function cycleTheme() {
    const order = ['auto', 'light', 'dark'] as const;
    const cur = app.theme.mode.get();
    app.theme.setMode(order[(order.indexOf(cur as any) + 1) % order.length]);
  }

  let railVisible = $state(false);
  let scrubbing = $state(false);
  let highlightedRail = $state<string | null>(null);
  let activePanel = $state<string | null>(null);
  let uploading = $state(false);
  let galleryWidth = $state(0);
  let settingsOpen = $state(false);
  let applying = $state(false);
  let applyMsg = $state('');
  let sysWpOpen = $state(false);
  const native = isNativeApp();

  let setHome = $derived(wpState.value.setHome);
  let setLock = $derived(wpState.value.setLock);

  async function setAsSystem() {
    if (!activeId) return;
    const url = urls.value[activeId];
    if (!url) return;
    const target = setHome && setLock ? 'both' : setHome ? 'home' : setLock ? 'lock' : null;
    if (!target) {
      applyMsg = 'Mind. ein Ziel wählen';
      setTimeout(() => (applyMsg = ''), 2500);
      return;
    }
    applying = true;
    applyMsg = '';
    cancelHide();
    try {
      await setSystemWallpaper(url, target);
      applyMsg = 'Als Hintergrund gesetzt ✓';
    } catch (e) {
      applyMsg = 'Fehler: ' + (e instanceof Error ? e.message : String(e));
    }
    applying = false;
    if (applyMsg.startsWith('Gesetzt') || applyMsg.includes('✓')) {
      setTimeout(() => {
        applyMsg = '';
        sysWpOpen = false;
      }, 1100);
    } else {
      setTimeout(() => (applyMsg = ''), 3500);
    }
  }

  let side = $derived(wpState.value.menuSide);
  let pinned = $derived(wpState.value.menuMode === 'pinned');
  let mode = $derived(wpState.value.viewMode);
  let allItems = $derived(wpState.value.items);
  let activeId = $derived(wpState.value.activeId);
  let railShown = $derived(pinned || railVisible || wpState.value.alwaysFilterBar);

  // ---- Filters & sorting ----
  let search = $state('');
  let sortBy = $state<SortBy>('newest');
  let shuffleSeed = $state(1);
  let mediaTab = $state<MediaTab>('all');
  let favOnly = $state(false);
  let colorKey = $state<string | null>(null);
  let selectedTags = $state<string[]>([]);

  // All tags in use, for the filter chip bar.
  let allTags = $derived.by(() => {
    const set = new Set<string>();
    for (const it of allItems) for (const t of it.tags ?? []) set.add(t);
    return [...set].sort();
  });
  function toggleTag(t: string) {
    selectedTags = selectedTags.includes(t)
      ? selectedTags.filter((x) => x !== t)
      : [...selectedTags, t];
  }

  // Active collection (playlist) narrows the gallery to its members.
  let activeCollection = $derived(
    wpState.value.activeCollectionId
      ? (wpState.value.collections.find((c) => c.id === wpState.value.activeCollectionId) ?? null)
      : null,
  );

  let items = $derived.by(() => {
    const q = search.trim().toLowerCase();
    const colIds = activeCollection ? new Set(activeCollection.itemIds) : null;
    const list = allItems.filter((it) => {
      const k = it.kind ?? 'image';
      if (mediaTab === 'image' && k !== 'image') return false;
      if (mediaTab === 'video' && k !== 'video') return false;
      if (mediaTab === 'we') return false; // Wallpaper Engine items can't exist here
      if (colIds && !colIds.has(it.id)) return false;
      if (favOnly && !it.favorite) return false;
      if (colorKey && colorFamily(it.accent) !== colorKey) return false;
      // Tag chips: item must carry ALL selected tags (narrowing filter).
      if (selectedTags.length && !selectedTags.every((t) => (it.tags ?? []).includes(t)))
        return false;
      if (q && !it.name.toLowerCase().includes(q) && !(it.tags ?? []).some((t) => t.includes(q)))
        return false;
      return true;
    });
    // Base order is oldest→newest (insertion). Build from there.
    const sorted = [...list];
    if (sortBy === 'newest') sorted.reverse();
    else if (sortBy === 'oldest') {
      /* already oldest-first */
    } else if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'nameDesc') sorted.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortBy === 'rainbow') sorted.sort((a, b) => rainbowKey(a.accent) - rainbowKey(b.accent));
    else if (sortBy === 'color') sorted.sort((a, b) => lightness(b.accent) - lightness(a.accent));
    else if (sortBy === 'colorDark') sorted.sort((a, b) => lightness(a.accent) - lightness(b.accent));
    else if (sortBy === 'favorites') {
      sorted.reverse(); // newest first…
      sorted.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)); // …favorites on top (stable)
    } else if (sortBy === 'shuffle') {
      const h = (s: string) => {
        let x = shuffleSeed;
        for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
        return x;
      };
      sorted.sort((a, b) => h(a.id) - h(b.id));
    }
    return sorted;
  });

  let filtersActive = $derived(
    favOnly || colorKey !== null || search.trim() !== '' || selectedTags.length > 0,
  );
  function clearFilters() {
    favOnly = false;
    colorKey = null;
    search = '';
    selectedTags = [];
    if (wpState.value.activeCollectionId) manager.setActiveCollection(null);
  }

  // ---- Collections (playlists) ----
  let collections = $derived(wpState.value.collections);
  let activeCollectionId = $derived(wpState.value.activeCollectionId);
  let collBarCreating = $state(false);
  let newCollName = $state('');
  function createCollectionFromBar() {
    const name = newCollName.trim();
    newCollName = '';
    collBarCreating = false;
    if (!name) return;
    const id = manager.createCollection(name);
    manager.setActiveCollection(id);
  }
  // Flip-card: create a collection and drop the current image into it.
  let detailCollCreating = $state(false);
  let detailNewColl = $state('');
  function createCollForDetail() {
    const name = detailNewColl.trim();
    const item = detailItem;
    detailNewColl = '';
    detailCollCreating = false;
    if (!name || !item) return;
    const id = manager.createCollection(name);
    manager.toggleInCollection(id, item.id);
  }

  // ---- Long-press → flip-card detail (favorite / tags / effect / delete) ----
  let detailItem = $state<WallpaperItem | null>(null);
  let flipped = $state(false);
  let tagInput = $state('');
  let detailData = $derived(
    detailItem ? allItems.find((i) => i.id === detailItem!.id) : undefined,
  );
  let detailFav = $derived(detailData?.favorite ?? false);
  let detailTags = $derived(detailData?.tags ?? []);

  function openDetail(item: WallpaperItem) {
    detailItem = item;
    tagInput = '';
    flipped = false;
    cancelHide();
    setTimeout(() => (flipped = true), 40);
  }
  function closeDetail() {
    flipped = false;
    setTimeout(() => (detailItem = null), 220);
  }
  function commitTag() {
    if (!detailItem) return;
    const parts = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    for (const p of parts) manager.addTag(detailItem.id, p);
    tagInput = '';
  }
  function deleteFromDetail() {
    if (!detailItem) return;
    const id = detailItem.id;
    flipped = false;
    detailItem = null;
    void manager.removeImage(id);
  }

  // ---- Photo effects ----
  let effectItem = $state<WallpaperItem | null>(null);
  let effectType = $state<EffectType>('none');
  let effectPreview = $state<string | null>(null);
  let effectBusy = $state(false);

  function paletteHex(): string[] {
    const p = app.theme.palette.get();
    return [p.primary, p.secondary, p.tertiary, p.surface, p.surfaceVariant, p.outline, p.onSurface, '#000000', '#ffffff'];
  }
  function openEffects(item: WallpaperItem) {
    closeDetail();
    effectItem = item;
    effectType = 'none';
    if (effectPreview) URL.revokeObjectURL(effectPreview);
    effectPreview = urls.value[item.id] ?? null;
  }
  function closeEffects() {
    if (effectPreview && effectType !== 'none') URL.revokeObjectURL(effectPreview);
    effectPreview = null;
    effectItem = null;
  }
  async function selectEffect(e: EffectType) {
    if (!effectItem) return;
    effectType = e;
    const src = urls.value[effectItem.id];
    if (!src) return;
    if (e === 'none') {
      effectPreview = src;
      return;
    }
    effectBusy = true;
    try {
      const blob = await applyEffect(src, e, paletteHex());
      if (effectPreview && effectPreview !== src) URL.revokeObjectURL(effectPreview);
      effectPreview = URL.createObjectURL(blob);
    } catch {
      /* keep previous preview */
    }
    effectBusy = false;
  }
  async function saveEffect() {
    if (!effectItem || effectType === 'none') return;
    const src = urls.value[effectItem.id];
    if (!src) return;
    effectBusy = true;
    try {
      const blob = await applyEffect(src, effectType, paletteHex());
      const name = `${effectItem.name} · ${EFFECTS.find((x) => x.value === effectType)?.label ?? ''}`.trim();
      const file = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
      await manager.addImage(file);
      closeEffects();
    } catch {
      /* ignore */
    }
    effectBusy = false;
  }

  interface LongPressOpts {
    onLong: () => void;
    onTap: () => void;
  }
  function longpress(node: HTMLElement, opts: LongPressOpts) {
    let current = opts;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;
    let sx = 0;
    let sy = 0;
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const down = (e: PointerEvent) => {
      fired = false;
      sx = e.clientX;
      sy = e.clientY;
      timer = setTimeout(() => {
        fired = true;
        current.onLong();
      }, 480);
    };
    const move = (e: PointerEvent) => {
      if (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12) clear();
    };
    const click = (e: MouseEvent) => {
      if (fired) {
        e.preventDefault();
        e.stopPropagation();
        fired = false;
        return;
      }
      current.onTap();
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', clear);
    node.addEventListener('pointercancel', clear);
    node.addEventListener('pointerleave', clear);
    node.addEventListener('click', click);
    return {
      update(o: LongPressOpts) {
        current = o;
      },
      destroy() {
        clear();
        node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', clear);
        node.removeEventListener('pointercancel', clear);
        node.removeEventListener('pointerleave', clear);
        node.removeEventListener('click', click);
      },
    };
  }

  function bg(id: string): string {
    const u = urls.value[id];
    return u ? `background-image:url(${u})` : '';
  }

  // Wall grid: fixed columns if set, else auto-fit by tile size.
  let wallGrid = $derived(
    wpState.value.wallColumns > 0
      ? `repeat(${wpState.value.wallColumns}, 1fr)`
      : 'repeat(auto-fill, minmax(var(--tile-size, 130px), 1fr))',
  );

  // ---- Honeycomb geometry (geometric mode) — horizontal arc scroller (SKWD-style) ----
  // Fixed number of rows (hexRows); items fill column by column and the strip
  // scrolls horizontally. With "Arc" on, tiles curve and fade toward the edges.
  let hexRowCount = $derived(Math.max(1, wpState.value.hexRows));
  let hexW = $derived.by(() => {
    if (wpState.value.hexSize > 0) return wpState.value.hexSize;
    const cols = Math.max(1, wpState.value.hexColumns);
    return galleryWidth > 0 ? Math.max(56, Math.floor((galleryWidth / cols) * 1.08)) : 108;
  });
  let hexH = $derived(Math.round(hexW * 1.1547));
  let hexStepX = $derived(Math.round(hexW * 0.78) + 4);
  let hexVStep = $derived(hexH + 6);
  let hexColCount = $derived(Math.ceil(items.length / hexRowCount));
  let hexWrapW = $derived(hexColCount * hexStepX + hexW);
  let hexWrapH = $derived(hexRowCount * hexVStep + hexVStep / 2 + 14);
  let hexScroll = $state(0);
  function hexBase(i: number) {
    const col = Math.floor(i / hexRowCount);
    const row = i % hexRowCount;
    return { x: col * hexStepX, y: row * hexVStep + (col % 2 ? hexVStep / 2 : 0) };
  }
  function hexStyle(i: number): string {
    const b = hexBase(i);
    let ty = 0;
    let op = 1;
    if (wpState.value.hexArc && galleryWidth > 0) {
      const centerX = hexScroll + galleryWidth / 2;
      const d = (b.x + hexW / 2 - centerX) / (galleryWidth / 2); // -1..1 across viewport
      ty = wpState.value.hexArcIntensity * 1.3 * (d * d); // edges dip down → arc
      const ad = Math.abs(d);
      op = ad > 0.78 ? Math.max(0, 1 - (ad - 0.78) / 0.22) : 1; // fade outer ~22%
    }
    return `left:${b.x}px;top:${b.y}px;width:${hexW}px;height:${hexH}px;transform:translateY(${ty}px);opacity:${op};`;
  }

  // ---- Card hand (fan) transforms ----
  function handTf(i: number, n: number) {
    const c = (n - 1) / 2;
    const rot = (i - c) * wpState.value.handSpread;
    const lift = Math.pow(Math.abs(i - c), 1.3) * 9;
    return `transform:rotate(${rot}deg) translateY(${lift}px);z-index:${i};`;
  }
  // ---- Collection (tilted stack) transforms ----
  function collTf(i: number, n: number) {
    const c = (n - 1) / 2;
    return `transform:translate(${(i - c) * 8}px, ${(i - c) * 4}px) rotate(${(i - c) * 2.5}deg);z-index:${i};`;
  }

  // ---- Vertical swipe-select rail (SKWD-style, right/left edge) ----
  // Order follows SKWD's horizontal bar (left→right ⇒ top→bottom); settings last.
  // `sub: true` → opens a second swipe-rail (flyout) next to the main one.
  const RAIL_ITEMS: { id: string; icon: string; label: string; sub?: boolean }[] = [
    { id: 'media', icon: 'film', label: 'Medien', sub: true },
    { id: 'add', icon: 'plus', label: 'Hinzufügen' },
    { id: 'favorites', icon: 'heart', label: 'Favoriten' },
    { id: 'color', icon: 'palette', label: 'Farbe', sub: true },
    { id: 'sort', icon: 'sort', label: 'Sortieren', sub: true },
    { id: 'random', icon: 'sync', label: 'Zufall' },
    { id: 'search', icon: 'search', label: 'Suche' },
    { id: 'theme', icon: 'theme-auto', label: 'Hell/Dunkel' },
    ...(native ? [{ id: 'syswp', icon: 'image', label: 'Als Hintergrund' }] : []),
    { id: 'settings', icon: 'settings', label: 'Einstellungen' },
  ];
  // Hide phone-only items when the Handy device is off, and hide the static
  // "set as system wallpaper" when the live wallpaper is on (it would replace
  // the live wallpaper with a static image and break the live rotation).
  let railItems = $derived(
    RAIL_ITEMS.filter(
      (it) => it.id !== 'syswp' || (wpState.value.deviceMobile && !wpState.value.liveWallpaper),
    ),
  );

  // --- Add overlay (upload + Wallhaven) ---
  let addOpen = $state(false);
  let addTab = $state<'upload' | 'web'>('upload');
  let whFilters = $state<WhFilters>({ ...DEFAULT_WH_FILTERS });
  let whResults = $state<WhResult[]>([]);
  let whPage = $state(1);
  let whLastPage = $state(1);
  let whLoading = $state(false);
  let whError = $state('');
  let whAdding = $state<string | null>(null);
  let whPreview = $state<WhResult | null>(null);
  let whFiltersOpen = $state(false);
  let whFiltersActive = $derived(
    whFilters.sorting !== 'toplist' ||
      whFilters.ratio !== 'all' ||
      !whFilters.categories.every((c) => c),
  );

  async function doSearch() {
    whLoading = true;
    whError = '';
    whPage = 1;
    try {
      const { results, lastPage } = await searchWallhaven(whFilters, 1);
      whResults = results;
      whLastPage = lastPage;
    } catch (e) {
      whError = e instanceof Error ? e.message : String(e);
      whResults = [];
    }
    whLoading = false;
  }
  async function loadMore() {
    if (whLoading || whPage >= whLastPage) return;
    whLoading = true;
    try {
      const next = whPage + 1;
      const { results, lastPage } = await searchWallhaven(whFilters, next);
      whResults = [...whResults, ...results];
      whPage = next;
      whLastPage = lastPage;
    } catch (e) {
      whError = e instanceof Error ? e.message : String(e);
    }
    whLoading = false;
  }
  function onWhScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) void loadMore();
  }
  function openWebTab() {
    addTab = 'web';
    if (whResults.length === 0 && !whLoading) void doSearch();
  }
  function toggleCategory(i: number) {
    const c = [...whFilters.categories] as [boolean, boolean, boolean];
    c[i] = !c[i];
    if (!c[0] && !c[1] && !c[2]) c[i] = true; // keep at least one
    whFilters.categories = c;
    void doSearch();
  }
  async function addFromWeb(r: WhResult) {
    whAdding = r.id;
    whError = '';
    try {
      const file = await downloadWallhaven(r);
      await manager.addImage(file);
      whPreview = null;
    } catch (e) {
      whError = 'Download fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e));
    }
    whAdding = null;
  }

  // Sub-rail (flyout) state for color / sort.
  let subFor = $state<string | null>(null);
  let subHighlight = $state<string | null>(null);
  let subItems = $derived.by(() => {
    if (subFor === 'color')
      return COLOR_FAMILIES.map((c) => ({ id: c.key, label: c.label, swatch: c.swatch }));
    if (subFor === 'sort') return SORTS.map((s) => ({ id: s.value, label: s.label, swatch: '' }));
    if (subFor === 'media')
      return MEDIA_TABS.filter((t) => t.value !== 'we' || app.platform.isDesktop).map((t) => ({
        id: t.value,
        label: t.label,
        swatch: '',
      }));
    return [] as { id: string; label: string; swatch: string }[];
  });

  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  function cancelHide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }
  function scheduleRailHide() {
    // Note: an open sub-flyout (subFor) must NOT block hiding — otherwise a
    // sticky flyout keeps the whole rail open forever. The timeout closes both.
    if (pinned || activePanel || settingsOpen || sysWpOpen || scrubbing) return;
    cancelHide();
    hideTimer = setTimeout(() => {
      railVisible = false;
      subFor = null;
    }, wpState.value.autoHideMs);
  }

  function updateHighlight(e: PointerEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const sub = el?.closest('[data-sub-id]') as HTMLElement | null;
    if (sub) {
      subHighlight = sub.dataset.subId ?? subHighlight;
      return;
    }
    const item = el?.closest('[data-rail-id]') as HTMLElement | null;
    if (item) {
      highlightedRail = item.dataset.railId ?? highlightedRail;
      subHighlight = null;
      const it = RAIL_ITEMS.find((x) => x.id === highlightedRail);
      subFor = it?.sub ? highlightedRail : null;
      return;
    }
    // Finger is off the rail/flyout entirely → clear the pending selection, so
    // releasing out here cancels instead of firing the last-highlighted item.
    if (!el?.closest('.rail-zone')) {
      highlightedRail = null;
      subHighlight = null;
    }
  }
  function startScrub(e: PointerEvent) {
    scrubbing = true;
    railVisible = true;
    cancelHide();
    updateHighlight(e);
    window.addEventListener('pointermove', onScrubMove);
    window.addEventListener('pointerup', onScrubEnd);
    window.addEventListener('pointercancel', onScrubEnd);
  }
  function onScrubMove(e: PointerEvent) {
    if (scrubbing) updateHighlight(e);
  }
  function onScrubEnd() {
    window.removeEventListener('pointermove', onScrubMove);
    window.removeEventListener('pointerup', onScrubEnd);
    window.removeEventListener('pointercancel', onScrubEnd);
    scrubbing = false;
    const sub = subHighlight;
    const main = highlightedRail;
    const forId = subFor;
    highlightedRail = null;
    subHighlight = null;
    if (sub && forId) {
      applySub(forId, sub);
      subFor = null;
    } else if (main) {
      const it = RAIL_ITEMS.find((x) => x.id === main);
      if (it?.sub) {
        // Toggle the flyout: keep it open so you can also tap a value.
        subFor = subFor === main ? main : main;
      } else {
        subFor = null;
        activateRail(main);
      }
    }
    scheduleRailHide();
  }
  function applySub(forId: string, id: string) {
    // Toggle: swiping the active colour again removes the filter (like SKWD).
    if (forId === 'color') colorKey = colorKey === id ? null : id;
    else if (forId === 'sort') {
      if (id === 'shuffle') shuffleSeed = (shuffleSeed * 1103515245 + 12345) >>> 0; // reshuffle each pick
      sortBy = id as SortBy;
    } else if (forId === 'media') mediaTab = id as MediaTab;
  }
  function activateRail(id: string) {
    cancelHide();
    switch (id) {
      case 'add': addOpen = true; break;
      case 'search': activePanel = activePanel === 'search' ? null : 'search'; break;
      case 'favorites': favOnly = !favOnly; scheduleRailHide(); break;
      case 'random': applyRandom(); scheduleRailHide(); break;
      case 'syswp': if (activeId) sysWpOpen = true; break;
      case 'theme': cycleTheme(); scheduleRailHide(); break;
      case 'settings': settingsOpen = true; break;
    }
  }
  function applyRandom() {
    const pool = items.length ? items : allItems;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    manager.setActive(pick.id);
  }
  function closePanel() {
    activePanel = null;
    scheduleRailHide();
  }
  function closeSub() {
    subFor = null;
    scheduleRailHide();
  }

  async function onUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    uploading = true;
    for (const f of Array.from(files)) await manager.addImage(f);
    uploading = false;
    input.value = '';
    scheduleRailHide();
  }
  function select(id: string) {
    manager.setActive(id);
    // "Close on selection": collapse the rail/panels right after picking.
    if (wpState.value.closeOnSelection) {
      activePanel = null;
      railVisible = false;
    }
  }

  // "Always show search bar": keep the search panel open.
  $effect(() => {
    if (wpState.value.alwaysSearchBar && !activePanel) activePanel = 'search';
  });
</script>

{#snippet tileInner(item: WallpaperItem)}
  {#if item.kind === 'video'}
    {#if urls.value[item.id]}
      <video class="tile-video" src={urls.value[item.id] + '#t=0.1'} muted loop playsinline preload="metadata"></video>
    {/if}
    <span class="tile-vidbadge" aria-hidden="true">▶</span>
  {/if}
  {#if item.id === activeId}
    <span class="badge"><Icon name="check" size={14} /></span>
  {/if}
  {#if item.favorite}
    <span class="tile-favmark"><Icon name="heart" size={13} /></span>
  {/if}
  {#if mode !== 'geometric' && mode !== 'hand'}<span class="tile-name">{item.name}</span>{/if}
{/snippet}

<div class="picker" data-mode={mode} data-side={side} class:pinned
  style="--tile-size:{wpState.value.tileSize}px;--tile-radius:{wpState.value.tileRadius}px;--wall-grid:{wallGrid};--slices-skew:{wpState.value.slicesSkew}deg;--slices-aspect:24 / {wpState.value.slicesHeight};--depth-tilt:{wpState.value.depthTilt}deg;">
  <div class="gallery-scroll" bind:clientWidth={galleryWidth}>
    {#if collections.length || collBarCreating}
      <div class="coll-bar">
        <button class="coll-chip" class:on={activeCollectionId === null} onclick={() => manager.setActiveCollection(null)}>Alle</button>
        {#each collections as c (c.id)}
          <button class="coll-chip" class:on={activeCollectionId === c.id} onclick={() => manager.setActiveCollection(c.id)}>
            {c.name} <span class="coll-count">{c.itemIds.length}</span>
          </button>
        {/each}
        {#if collBarCreating}
          <input class="coll-new" bind:value={newCollName} placeholder="Name…" spellcheck="false"
            onkeydown={(e) => { if (e.key === 'Enter') createCollectionFromBar(); if (e.key === 'Escape') { collBarCreating = false; newCollName = ''; } }}
            onblur={createCollectionFromBar} />
        {:else}
          <button class="coll-add" onclick={() => { collBarCreating = true; }} title="Neue Sammlung" aria-label="Neue Sammlung">＋</button>
        {/if}
      </div>
    {/if}
    {#if mediaTab === 'we'}
      <div class="empty">
        <h2>Wallpaper Engine</h2>
        <p>Wallpaper-Engine-Szenen laufen nur auf dem PC (Windows/Linux). Auf dem Handy &amp; im Web gibt es sie nicht — hier gehen Bilder und Videos.</p>
      </div>
    {:else if allItems.length === 0}
      <div class="empty">
        <h2>Noch keine Wallpaper</h2>
        <p>Lade dein erstes Bild hoch — die ganze App nimmt die Farben an.</p>
        <label class="upload-cta">
          <Icon name="upload" size={18} /> Wallpaper hochladen
          <input type="file" accept="image/*,video/*" multiple onchange={onUpload} hidden />
        </label>
      </div>
    {:else if items.length === 0}
      <div class="empty">
        <h2>Keine Treffer</h2>
        <p>Kein Wallpaper passt zu den Filtern.</p>
        <button class="upload-cta" onclick={clearFilters}>Filter zurücksetzen</button>
      </div>
    {:else if mode === 'geometric'}
      <div class="hexscroll" style="height:{hexWrapH}px" onscroll={(e) => (hexScroll = (e.currentTarget as HTMLElement).scrollLeft)}>
        <div class="hexwrap" style="width:{hexWrapW}px;height:{hexWrapH}px">
          {#each items as item, i (item.id)}
            <button class="tile hex" class:active={item.id === activeId} use:longpress={{ onLong: () => openDetail(item), onTap: () => select(item.id) }}
              style="{hexStyle(i)}{bg(item.id)}" title={item.name}>
              {@render tileInner(item)}
            </button>
          {/each}
        </div>
      </div>
    {:else if mode === 'sandy'}
      <div class="sandy">
        <button class="tile featured" class:active={items[0].id === activeId} use:longpress={{ onLong: () => openDetail(items[0]), onTap: () => select(items[0].id) }} style={bg(items[0].id)} title={items[0].name}>
          {@render tileInner(items[0])}
        </button>
        {#if items.length > 1}
          <div class="sandy-row">
            {#each items.slice(1) as item (item.id)}
              <button class="tile dot" class:active={item.id === activeId} use:longpress={{ onLong: () => openDetail(item), onTap: () => select(item.id) }} style={bg(item.id)} title={item.name}></button>
            {/each}
          </div>
        {/if}
      </div>
    {:else if mode === 'hand'}
      <div class="hand">
        {#each items as item, i (item.id)}
          <button class="tile fan" class:active={item.id === activeId} use:longpress={{ onLong: () => openDetail(item), onTap: () => select(item.id) }}
            style="{handTf(i, items.length)}{bg(item.id)}" title={item.name}>
            {@render tileInner(item)}
          </button>
        {/each}
      </div>
    {:else if mode === 'collection'}
      <div class="collection">
        {#each items as item, i (item.id)}
          <button class="tile stack" class:active={item.id === activeId} use:longpress={{ onLong: () => openDetail(item), onTap: () => select(item.id) }}
            style="{collTf(i, items.length)}{bg(item.id)}" title={item.name}>
            {@render tileInner(item)}
          </button>
        {/each}
      </div>
    {:else}
      <div class="gallery">
        {#each items as item (item.id)}
          <button class="tile" class:active={item.id === activeId}
            class:featured={mode === 'slices' && wpState.value.slicesFeatured && item.id === activeId}
            use:longpress={{ onLong: () => openDetail(item), onTap: () => select(item.id) }} style={bg(item.id)} title={item.name}>
            {@render tileInner(item)}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if subFor}
    <div class="sub-backdrop" onpointerdown={closeSub} role="presentation"></div>
  {/if}

  <!-- Vertical swipe-select rail: tap the edge and slide; release activates the one under your finger -->
  <div class="rail-zone" data-side={side} onpointerdown={startScrub} role="toolbar" tabindex="0" aria-label="Werkzeugleiste">
    <!-- Sub-rail flyout (color / sort): swipe into it, release to pick -->
    {#if subFor}
      <aside class="subrail" class:color={subFor === 'color'} data-side={side}>
        {#each subItems as s (s.id)}
          <div
            class="sub-item"
            class:color={subFor === 'color'}
            data-sub-id={s.id}
            class:hi={subHighlight === s.id}
            class:on={(subFor === 'color' && colorKey === s.id) || (subFor === 'sort' && sortBy === s.id) || (subFor === 'media' && mediaTab === s.id)}
            style={s.swatch ? `--sw:${s.swatch}` : ''}
            title={s.label}
          >
            {#if subFor !== 'color'}<span class="sub-label">{s.label}</span>{/if}
          </div>
        {/each}
      </aside>
    {/if}

    <aside class="rail" class:shown={railShown} class:scrubbing>
      {#each railItems as it (it.id)}
        <div
          class="rail-item"
          data-rail-id={it.id}
          class:hi={highlightedRail === it.id}
          class:open={it.sub && subFor === it.id}
          class:on={(it.id === 'favorites' && favOnly) ||
            (it.id === 'settings' && settingsOpen) ||
            (it.id === 'search' && activePanel === 'search') ||
            (it.id === 'color' && colorKey !== null) ||
            (it.id === 'media' && mediaTab !== 'all')}
        >
          <Icon name={it.id === 'theme' ? themeIcon : it.icon} size={20} />
          {#if scrubbing && highlightedRail === it.id && subFor !== it.id}<span class="rail-flag">{it.label}</span>{/if}
        </div>
      {/each}
    </aside>
  </div>

  <!-- Search panel (needs a text field, so it stays a small panel) -->
  {#if activePanel === 'search'}
    <div class="panel-backdrop" onclick={closePanel} role="presentation"></div>
    <div class="side-panel" data-side={side}>
      <div class="sp-head"><Icon name="search" size={16} /> Suche &amp; Tags</div>
      <input class="sp-input" placeholder="Name oder Tag…" bind:value={search} spellcheck="false" />
      {#if allTags.length}
        <div class="sp-taglabel">Nach Tags filtern</div>
        <div class="sp-tags">
          {#each allTags as t (t)}
            <button class="sp-tag" class:on={selectedTags.includes(t)} onclick={() => toggleTag(t)}>{t}</button>
          {/each}
        </div>
      {/if}
      {#if filtersActive}
        <button class="sp-clear" onclick={clearFilters}>Filter zurücksetzen</button>
      {/if}
    </div>
  {/if}

  <!-- Fullscreen settings window (SKWD-style) -->
  {#if settingsOpen}
    <div class="settings-full">
      <div class="settings-head">
        <span>Einstellungen</span>
        <button class="icon-btn" onclick={() => { settingsOpen = false; scheduleRailHide(); }} title="Schließen">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div class="settings-body"><WallpaperSettings {app} {manager} /></div>
    </div>
  {/if}

  <!-- Add overlay: upload from device OR search/download from Wallhaven -->
  {#if addOpen}
    <div class="settings-full">
      <div class="settings-head">
        <span>Wallpaper hinzufügen</span>
        <button class="icon-btn" onclick={() => { addOpen = false; scheduleRailHide(); }} title="Schließen">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div class="add-tabs">
        <button class:on={addTab === 'upload'} onclick={() => (addTab = 'upload')}>
          <Icon name="upload" size={16} /> Hochladen
        </button>
        <button class:on={addTab === 'web'} onclick={openWebTab}>
          <Icon name="search" size={16} /> Online
        </button>
      </div>
      {#if addTab === 'upload'}
        <div class="settings-body">
          <label class="add-upload">
            <Icon name="upload" size={26} />
            <span>{uploading ? 'Lädt…' : 'Bilder vom Gerät wählen'}</span>
            <input type="file" accept="image/*,video/*" multiple onchange={onUpload} hidden />
          </label>
        </div>
      {:else}
        <!-- Wallhaven: search + filters (fixed) + scrollable result grid -->
        <div class="wh-head">
          <div class="wh-search">
            <input placeholder="z.B. landscape, anime, minimal…" bind:value={whFilters.query} onkeydown={(e) => e.key === 'Enter' && doSearch()} spellcheck="false" />
            <button onclick={doSearch} disabled={whLoading} aria-label="Suchen"><Icon name="search" size={16} /></button>
            <button class="wh-filter-btn" class:on={whFiltersOpen || whFiltersActive} onclick={() => (whFiltersOpen = !whFiltersOpen)} aria-label="Filter">
              <Icon name="filter" size={16} />
            </button>
          </div>
          {#if whFiltersOpen}
            <div class="wh-filters">
              {#each WH_SORTINGS as s}
                <button class="wh-chip" class:on={whFilters.sorting === s.value} onclick={() => { whFilters.sorting = s.value; doSearch(); }}>{s.label}</button>
              {/each}
            </div>
            <div class="wh-filters">
              {#each WH_CATEGORIES as c, i}
                <button class="wh-chip" class:on={whFilters.categories[i]} onclick={() => toggleCategory(i)}>{c}</button>
              {/each}
              <span class="wh-sep"></span>
              {#each [['all', 'Alle'], ['landscape', 'Quer'], ['portrait', 'Hoch']] as [v, l]}
                <button class="wh-chip" class:on={whFilters.ratio === v} onclick={() => { whFilters.ratio = v as WhRatio; doSearch(); }}>{l}</button>
              {/each}
            </div>
          {/if}
        </div>
        {#if whError}<p class="wh-error">{whError}</p>{/if}
        <div class="wh-scroll" onscroll={onWhScroll}>
          <div class="wh-grid" style="grid-template-columns:repeat({wpState.value.whColumns}, 1fr)">
            {#each whResults as r (r.id)}
              <button class="wh-tile" onclick={() => (whPreview = r)} style="background-image:url({r.thumb})" title="Ansehen">
                <span class="wh-res">{r.resolution}</span>
              </button>
            {/each}
          </div>
          {#if whLoading}<p class="wh-info">Lädt…</p>{/if}
          {#if !whLoading && whResults.length === 0 && !whError}<p class="wh-info">Keine Treffer.</p>{/if}
          {#if !whLoading && whPage >= whLastPage && whResults.length > 0}<p class="wh-info">Ende der Ergebnisse.</p>{/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Fullscreen preview of a Wallhaven result + download button -->
  {#if whPreview}
    {@const p = whPreview}
    <div class="wh-preview">
      <div class="syswp-top">
        <button class="syswp-x" onclick={() => (whPreview = null)} title="Zurück"><Icon name="close" size={22} /></button>
      </div>
      <div class="wh-preview-img" style="background-image:url({p.full})"></div>
      <div class="syswp-bottom">
        {#if whError}<span class="syswp-msg">{whError}</span>{/if}
        <span class="wh-preview-meta">{p.resolution}</span>
        <button class="syswp-set" onclick={() => addFromWeb(p)} disabled={whAdding === p.id}>
          {whAdding === p.id ? 'Lädt…' : 'Herunterladen'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Photo effects overlay (recolor / filters) -->
  {#if effectItem}
    <div class="wh-preview">
      <div class="syswp-top">
        <button class="syswp-x" onclick={closeEffects} title="Zurück"><Icon name="close" size={22} /></button>
      </div>
      <div class="wh-preview-img" style={effectPreview ? `background-image:url(${effectPreview})` : ''}></div>
      <div class="syswp-bottom">
        <div class="fx-chips">
          {#each EFFECTS as e}
            <button class="fx-chip" class:on={effectType === e.value} onclick={() => selectEffect(e.value)} disabled={effectBusy}>{e.label}</button>
          {/each}
        </div>
        <button class="syswp-set" onclick={saveEffect} disabled={effectBusy || effectType === 'none'}>
          {effectBusy ? 'Verarbeite…' : 'Als neues Wallpaper speichern'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Fullscreen system-wallpaper preview + target choice -->
  {#if sysWpOpen}
    <div
      class="syswp"
      style={activeId && urls.value[activeId] ? `background-image:url(${urls.value[activeId]})` : ''}
    >
      <div class="syswp-top">
        <button class="syswp-x" onclick={() => (sysWpOpen = false)} title="Schließen">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div class="syswp-bottom">
        {#if applyMsg}<span class="syswp-msg">{applyMsg}</span>{/if}
        <div class="syswp-checks">
          <button
            class="syswp-chip"
            class:on={setHome}
            onclick={() => manager.setWallpaperTargets(!setHome, setLock)}
          >
            <Icon name="home" size={18} /> Startbildschirm
          </button>
          <button
            class="syswp-chip"
            class:on={setLock}
            onclick={() => manager.setWallpaperTargets(setHome, !setLock)}
          >
            <Icon name="lock" size={18} /> Sperrbildschirm
          </button>
        </div>
        <button class="syswp-set" onclick={setAsSystem} disabled={applying}>
          {applying ? 'Setze…' : 'Setzen'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Long-press flip-card: image flips to a back with favorite / name / delete -->
  {#if detailItem}
    {@const d = detailItem}
    <div class="detail-overlay" onclick={closeDetail} role="presentation">
      <div class="flip-card" class:flipped role="presentation" onclick={(e) => e.stopPropagation()}>
        <div class="flip-inner">
          <div class="flip-front" style={bg(d.id)}></div>
          <div class="flip-back">
            <button class="fav-big" class:on={detailFav} onclick={() => manager.toggleFavorite(d.id)}>
              <Icon name="star" size={30} />
              <span>{detailFav ? 'Favorit ✓' : 'Favorisieren'}</span>
            </button>
            <div class="tag-field">
              <span class="tf-label">Tags</span>
              <div class="tag-list">
                {#each detailTags as t (t)}
                  <span class="tag-chip">{t}<button onclick={() => manager.removeTag(d.id, t)} aria-label="Tag entfernen">×</button></span>
                {/each}
                {#if detailTags.length === 0}<span class="tag-empty">Noch keine Tags</span>{/if}
              </div>
              <input class="tag-input" bind:value={tagInput} placeholder="Tag eingeben + Enter…" onkeydown={(e) => e.key === 'Enter' && commitTag()} onblur={commitTag} spellcheck="false" />
            </div>
            <div class="tag-field">
              <span class="tf-label">Sammlungen</span>
              <div class="coll-chiprow">
                {#each collections as c (c.id)}
                  <button class="coll-chip sm" class:on={c.itemIds.includes(d.id)} onclick={() => manager.toggleInCollection(c.id, d.id)}>{c.name}</button>
                {/each}
                {#if detailCollCreating}
                  <input class="coll-new sm" bind:value={detailNewColl} placeholder="Name…" spellcheck="false"
                    onkeydown={(e) => { if (e.key === 'Enter') createCollForDetail(); if (e.key === 'Escape') { detailCollCreating = false; detailNewColl = ''; } }}
                    onblur={createCollForDetail} />
                {:else}
                  <button class="coll-add sm" onclick={() => { detailCollCreating = true; }}>＋ Neu</button>
                {/if}
              </div>
            </div>
            <div class="detail-actions">
              <button class="fx-big" onclick={() => openEffects(d)}><Icon name="palette" size={18} /> Effekt</button>
              <button class="del-big" onclick={deleteFromDetail}><Icon name="trash" size={18} /> Löschen</button>
            </div>
            <button class="done-big wide" onclick={closeDetail}><Icon name="check" size={18} /> Fertig</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .picker { position: relative; height: 100%; width: 100%; overflow: hidden; }
  .gallery-scroll { height: 100%; overflow-y: auto; overflow-x: hidden; padding: var(--space-5) var(--space-4); }
  .picker.pinned[data-side='right'] .gallery-scroll { padding-right: 232px; }
  .picker.pinned[data-side='left'] .gallery-scroll { padding-left: 232px; }

  /* ---- Wall ---- */
  .gallery { display: grid; gap: var(--space-3); }
  [data-mode='wall'] .gallery { grid-template-columns: var(--wall-grid, repeat(auto-fill, minmax(var(--tile-size, 130px), 1fr))); }
  [data-mode='wall'] .tile { aspect-ratio: 3 / 4; }

  /* ---- Slices (skewed strips) ---- */
  [data-mode='slices'] .gallery { grid-template-columns: 1fr; gap: 10px; }
  [data-mode='slices'] .tile { aspect-ratio: var(--slices-aspect, 24 / 7); transform: skewX(calc(-1 * var(--slices-skew, 9deg))); border-radius: 4px; }
  [data-mode='slices'] .tile:nth-child(even) { transform: skewX(var(--slices-skew, 9deg)); }
  [data-mode='slices'] .tile.featured { aspect-ratio: 24 / 13; outline: 2px solid var(--color-primary); outline-offset: -2px; }

  /* ---- Depth (perspective column) ---- */
  [data-mode='depth'] .gallery { grid-template-columns: 1fr; gap: var(--space-4); max-width: 420px; margin: 0 auto; perspective: 1000px; }
  [data-mode='depth'] .tile { aspect-ratio: 16 / 10; transform: rotateX(var(--depth-tilt, 8deg)); box-shadow: 0 16px 30px rgba(0,0,0,0.45); }
  [data-mode='depth'] .tile.active { transform: rotateX(0deg) scale(1.02); }

  /* ---- Geometric (honeycomb) ---- */
  .hexscroll { width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
  .hexwrap { position: relative; }
  .tile.hex { position: absolute; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); border-radius: 0; border: none; }
  .tile.hex.active { outline: none; box-shadow: inset 0 0 0 4px var(--color-primary); }

  /* ---- Sandy (featured + circle row) ---- */
  .sandy { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
  .tile.featured { width: min(100%, 440px); aspect-ratio: 16 / 10; }
  .sandy-row { display: flex; gap: var(--space-2); overflow-x: auto; max-width: 100%; padding: var(--space-2); }
  .tile.dot { width: 58px; height: 58px; border-radius: 50%; flex: 0 0 auto; }

  /* ---- Card hand (fan) ---- */
  .hand { display: flex; justify-content: center; align-items: flex-end; min-height: 340px; padding-top: var(--space-6); }
  .tile.fan { width: 130px; aspect-ratio: 2 / 3; margin-left: -46px; transform-origin: bottom center; }
  .tile.fan:first-child { margin-left: 0; }
  .tile.fan:hover, .tile.fan.active { z-index: 999 !important; }

  /* ---- Collection (stack) ---- */
  .collection { position: relative; min-height: 360px; display: grid; place-items: center; }
  .tile.stack { position: absolute; width: 200px; aspect-ratio: 3 / 4; transition: transform var(--transition); }
  .tile.stack.active { outline-width: 4px; }

  /* ---- Tiles base ---- */
  .tile {
    position: relative; border: 1px solid rgba(255,255,255,0.12); border-radius: var(--tile-radius, var(--radius-md));
    background-size: cover; background-position: center; background-color: var(--color-surface-variant);
    cursor: pointer; overflow: hidden; padding: 0;
    transition: transform var(--transition), box-shadow var(--transition);
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation;
  }
  .tile:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
  .tile.active { outline: 3px solid var(--color-primary); outline-offset: -3px; }
  .tile-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
  .tile-vidbadge {
    position: absolute; top: 6px; left: 6px; z-index: 2; width: 22px; height: 22px;
    display: grid; place-items: center; border-radius: 50%; font-size: 0.6rem;
    background: rgba(0,0,0,0.55); color: #fff; padding-left: 2px;
  }
  .badge { position: absolute; top: 6px; left: 6px; background: var(--color-primary); color: #fff; border-radius: 50%; width: 24px; height: 24px; display: grid; place-items: center; }
  .tile-favmark { position: absolute; top: 6px; right: 6px; color: #ff5d8f; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6)); display: grid; place-items: center; }
  [data-mode='slices'] .tile-name { max-width: 60%; }
  .tile-name { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 8px 6px; font-size: 0.72rem; color: #fff; text-align: left; background: linear-gradient(transparent, rgba(0,0,0,0.7)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ---- Empty ---- */
  .empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: var(--space-2); color: var(--text-muted); }
  .empty h2 { color: var(--text); margin: 0; }
  .upload-cta { margin-top: var(--space-3); display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-5); background: var(--color-primary); color: #fff; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; }

  /* ---- Vertical swipe-select rail (SKWD-style, skewed parallelogram) ---- */
  .rail-zone { position: absolute; top: 0; bottom: 0; width: 60px; z-index: 25; touch-action: none; }
  .rail-zone[data-side='right'] { right: 0; }
  .rail-zone[data-side='left'] { left: 0; }
  .rail {
    position: absolute; top: 50%;
    display: flex; flex-direction: column; gap: 5px; padding: 8px 7px;
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
    backdrop-filter: blur(16px);
    transition: transform var(--transition), opacity var(--transition);
    opacity: 0; pointer-events: none;
  }
  .rail-zone[data-side='right'] .rail { right: 3px; transform: translate(100%, -50%) skewY(-12deg); }
  .rail-zone[data-side='left'] .rail { left: 3px; transform: translate(-100%, -50%) skewY(-12deg); }
  .rail.shown { opacity: 1; pointer-events: auto; }
  .rail-zone[data-side='right'] .rail.shown { transform: translate(0, -50%) skewY(-12deg); }
  .rail-zone[data-side='left'] .rail.shown { transform: translate(0, -50%) skewY(-12deg); }
  .rail-item {
    width: 48px; height: 40px; border-radius: 2px; position: relative;
    display: grid; place-items: center; color: var(--text-muted);
    transition: background var(--transition), transform var(--transition), color var(--transition);
  }
  /* counter-skew the glyph so icons stay upright inside the slanted bar */
  .rail-item > :global(svg) { transform: skewY(12deg); }
  .rail-item.on { background: color-mix(in srgb, var(--color-primary) 35%, transparent); color: var(--text); }
  .rail-item.open { background: color-mix(in srgb, var(--color-primary) 20%, transparent); }
  .rail-item.hi { background: var(--color-primary); color: #fff; transform: scale(1.18); z-index: 2; }
  .rail-flag {
    position: absolute; top: 50%; transform: translateY(-50%) skewY(12deg);
    white-space: nowrap; background: var(--color-primary); color: #fff;
    padding: 5px 12px; border-radius: 2px; font-size: 0.9rem; font-weight: 700; box-shadow: var(--shadow);
  }
  .rail-zone[data-side='right'] .rail-flag { right: 58px; }
  .rail-zone[data-side='left'] .rail-flag { left: 58px; }

  .sub-backdrop { position: absolute; inset: 0; z-index: 24; }

  /* ---- Sub-rail flyout (color = rainbow, sort = labels), also a parallelogram ---- */
  .subrail {
    position: absolute; top: 50%; z-index: 27;
    display: flex; flex-direction: column; gap: 4px; padding: 10px 7px;
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(16px); box-shadow: var(--shadow);
  }
  .subrail[data-side='right'] { right: 64px; transform: translateY(-50%) skewY(-12deg); }
  .subrail[data-side='left'] { left: 64px; transform: translateY(-50%) skewY(-12deg); }
  /* colour flyout: no bar background — the colour slices float freely */
  .subrail.color { gap: 3px; padding: 0; background: transparent; backdrop-filter: none; box-shadow: none; }
  .subrail.color .sub-item { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35); }
  .sub-item {
    display: flex; align-items: center; justify-content: center; min-width: 130px;
    padding: 8px 12px; border-radius: 2px; color: var(--text-muted);
  }
  .sub-item > :global(*) { transform: skewY(12deg); }
  .sub-label { font-size: 0.85rem; white-space: nowrap; }
  /* colour items: full-colour parallelogram slices, no label — a rainbow strip */
  .sub-item.color { min-width: 52px; width: 52px; height: 24px; padding: 0; border-radius: 0; background: var(--sw); }
  .sub-item.color.on { box-shadow: inset 0 0 0 3px #fff, inset 0 0 0 5px rgba(0, 0, 0, 0.4); }
  .sub-item:not(.color).on { background: color-mix(in srgb, var(--color-primary) 24%, transparent); color: var(--text); }
  .sub-item.hi { transform: scale(1.14); z-index: 3; }
  .sub-item.color.hi { box-shadow: inset 0 0 0 3px #fff; }

  /* ---- Sub-panels (search / color / sort / modes) ---- */
  .panel-backdrop { position: absolute; inset: 0; z-index: 28; background: rgba(0, 0, 0, 0.25); }
  .side-panel {
    position: absolute; z-index: 29; top: 50%; transform: translateY(-50%);
    width: min(260px, 72vw); max-height: 80%; overflow-y: auto;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);
  }
  .side-panel[data-side='right'] { right: 68px; }
  .side-panel[data-side='left'] { left: 68px; }
  .sp-head { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); }
  .sp-input { padding: var(--space-3); background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.95rem; outline: none; }
  .sp-taglabel { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); }
  .sp-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .sp-tag {
    padding: 4px 10px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 999px; color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;
  }
  .sp-tag.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .sp-clear { padding: var(--space-2); background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.82rem; }

  /* ---- Collections bar ---- */
  .coll-bar {
    position: sticky; top: 0; z-index: 10; display: flex; gap: 6px; flex-wrap: wrap;
    padding: 4px 2px 10px; margin-bottom: 4px;
    background: linear-gradient(var(--view-bg, var(--bg-elevated)) 70%, transparent);
  }
  .coll-chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 999px;
    color: var(--text-muted); font-size: 0.82rem; white-space: nowrap;
  }
  .coll-chip.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .coll-chip.sm { padding: 4px 10px; font-size: 0.78rem; }
  .coll-count { font-size: 0.7rem; opacity: 0.7; }
  .coll-add {
    width: 30px; height: 30px; border-radius: 50%; border: 1px dashed var(--border);
    background: transparent; color: var(--text-muted); font-size: 1rem; line-height: 1;
  }
  .coll-add.sm { width: auto; height: auto; border-radius: 999px; padding: 4px 10px; font-size: 0.78rem; }
  .coll-new {
    padding: 4px 10px; background: var(--bg); border: 1px solid var(--color-primary);
    border-radius: 999px; color: var(--text); font-size: 0.8rem; outline: none; width: 120px;
  }
  .coll-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }

  /* ---- Fullscreen settings window ---- */
  .settings-full { position: absolute; inset: 0; z-index: 46; background: var(--bg); display: flex; flex-direction: column; }
  .settings-head { display: flex; align-items: center; justify-content: space-between; padding: max(var(--space-4), env(safe-area-inset-top)) var(--space-4) var(--space-4); border-bottom: 1px solid var(--border); font-weight: 700; font-size: 1.05rem; }
  .settings-body { flex: 1; overflow-y: auto; padding: var(--space-4); max-width: 640px; margin: 0 auto; width: 100%; }

  /* ---- Add overlay (upload + Wallhaven) ---- */
  .add-tabs { display: flex; gap: var(--space-2); padding: var(--space-3) var(--space-4) 0; max-width: 640px; margin: 0 auto; width: 100%; }
  .add-tabs button {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.9rem;
  }
  .add-tabs button.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .add-upload {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3);
    min-height: 180px; border: 2px dashed var(--border); border-radius: var(--radius-lg);
    color: var(--text-muted); cursor: pointer;
  }
  .wh-search { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
  .wh-search input {
    flex: 1; padding: var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text); font-size: 0.95rem; outline: none;
  }
  .wh-search button { padding: 0 var(--space-4); background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-md); }
  .wh-filter-btn { background: var(--bg-elevated) !important; border: 1px solid var(--border) !important; color: var(--text-muted) !important; }
  .wh-filter-btn.on { background: var(--color-primary) !important; color: #fff !important; border-color: transparent !important; }
  .wh-error { color: #e5484d; font-size: 0.85rem; }
  .wh-info { color: var(--text-faint); font-size: 0.9rem; text-align: center; padding: var(--space-4); }
  .wh-head { max-width: 640px; margin: 0 auto; width: 100%; padding: var(--space-3) var(--space-4) var(--space-2); display: flex; flex-direction: column; gap: var(--space-2); }
  .wh-filters { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .wh-chip {
    padding: 5px 12px; background: var(--bg-elevated); border: 1px solid var(--border);
    color: var(--text-muted); font-size: 0.8rem; border-radius: 2px; transform: skewX(-11deg);
  }
  .wh-chip > :global(*) { display: inline-block; transform: skewX(11deg); }
  .wh-chip.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .wh-sep { width: 1px; align-self: stretch; background: var(--border); margin: 0 4px; }
  .wh-scroll { flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-4) var(--space-5); max-width: 640px; margin: 0 auto; width: 100%; }
  .wh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--space-2); }
  .wh-tile {
    aspect-ratio: 16 / 10; border-radius: var(--radius-md); border: 1px solid var(--border);
    background-size: cover; background-position: center; position: relative; cursor: pointer; padding: 0;
  }
  .wh-res { position: absolute; right: 5px; bottom: 5px; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; }

  /* Wallhaven fullscreen preview */
  .wh-preview { position: absolute; inset: 0; z-index: 70; background: #000; display: flex; flex-direction: column; }
  .wh-preview-img { flex: 1; background-size: contain; background-position: center; background-repeat: no-repeat; }
  .wh-preview-meta { color: #fff; font-size: 0.85rem; opacity: 0.8; }
  .icon-btn { background: transparent; border: none; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); }
  .icon-btn:hover { background: var(--bg-hover); color: var(--text); }

  /* ---- Fullscreen system-wallpaper preview ---- */
  .syswp {
    position: absolute;
    inset: 0;
    z-index: 50;
    background-color: #000;
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .syswp-top {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: max(var(--space-4), env(safe-area-inset-top)) var(--space-4) var(--space-4);
    background: linear-gradient(rgba(0, 0, 0, 0.5), transparent);
  }
  .syswp-x {
    background: rgba(0, 0, 0, 0.4); border: none; color: #fff;
    width: 40px; height: 40px; border-radius: 50%;
    display: grid; place-items: center; flex-shrink: 0; backdrop-filter: blur(6px);
  }
  .syswp-bottom {
    display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    padding: var(--space-5) var(--space-4) max(var(--space-5), env(safe-area-inset-bottom));
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  }
  .syswp-checks { display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center; }
  .syswp-chip {
    display: flex; align-items: center; gap: 8px;
    padding: var(--space-2) var(--space-4);
    background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3);
    color: #fff; font-size: 0.9rem; border-radius: 999px; backdrop-filter: blur(6px);
  }
  .syswp-chip.on { background: var(--color-primary); border-color: transparent; font-weight: 600; }
  .syswp-msg { color: #fff; font-size: 0.9rem; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6); }
  .syswp-set {
    width: min(100%, 360px); padding: var(--space-4);
    background: var(--color-primary); color: #fff; border: none;
    border-radius: var(--radius-lg); font-size: 1.05rem; font-weight: 700;
  }
  .syswp-set:disabled { opacity: 0.6; }

  /* ---- Long-press flip-card detail ---- */
  .detail-overlay {
    position: absolute; inset: 0; z-index: 60;
    background: rgba(0, 0, 0, 0.72); backdrop-filter: blur(4px);
    display: grid; place-items: center; padding: var(--space-5);
    animation: detail-in 160ms ease;
  }
  @keyframes detail-in { from { opacity: 0; } to { opacity: 1; } }
  .flip-card { width: min(340px, 82%); aspect-ratio: 3 / 4; perspective: 1400px; }
  .flip-inner {
    position: relative; width: 100%; height: 100%;
    transform-style: preserve-3d; transition: transform 520ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .flip-card.flipped .flip-inner { transform: rotateY(180deg); }
  .flip-front, .flip-back {
    position: absolute; inset: 0; border-radius: var(--radius-lg);
    backface-visibility: hidden; -webkit-backface-visibility: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .flip-front { background-size: cover; background-position: center; background-color: var(--color-surface-variant); }
  .flip-back {
    transform: rotateY(180deg);
    background: var(--bg-elevated); border: 1px solid var(--border);
    padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4);
    justify-content: center;
  }
  .fav-big {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: var(--space-4); background: var(--bg-hover); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.85rem;
  }
  .fav-big.on { background: color-mix(in srgb, #ff5d8f 20%, transparent); color: #ff5d8f; border-color: #ff5d8f66; }
  .tag-field { display: flex; flex-direction: column; gap: 6px; }
  .tf-label { font-size: 0.8rem; color: var(--text-muted); }
  .tag-list { display: flex; flex-wrap: wrap; gap: 5px; min-height: 8px; }
  .tag-chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: color-mix(in srgb, var(--color-primary) 22%, transparent); color: var(--text);
    border-radius: 999px; padding: 3px 6px 3px 10px; font-size: 0.8rem;
  }
  .tag-chip button { background: transparent; border: none; color: inherit; font-size: 1.1em; line-height: 1; padding: 0 2px; cursor: pointer; }
  .tag-empty { font-size: 0.8rem; color: var(--text-faint); }
  .tag-input {
    padding: var(--space-3); background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text); font-size: 0.95rem;
  }
  .detail-actions { display: flex; gap: var(--space-2); }
  .detail-actions button {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: var(--space-3); border-radius: var(--radius-md); font-size: 0.9rem; font-weight: 600; border: none;
  }
  .del-big { background: color-mix(in srgb, #e5484d 18%, transparent); color: #e5484d; }
  .done-big { background: var(--color-primary); color: #fff; }
  .fx-big { background: var(--bg-hover); color: var(--text); }
  .done-big.wide { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: var(--space-3); border-radius: var(--radius-md); font-weight: 600; border: none; }
  .fx-chips { display: flex; gap: 6px; overflow-x: auto; max-width: 100%; padding-bottom: 2px; }
  .fx-chip {
    flex: 0 0 auto; padding: var(--space-2) var(--space-4);
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
    color: #fff; font-size: 0.85rem; border-radius: 999px; backdrop-filter: blur(6px);
  }
  .fx-chip.on { background: var(--color-primary); border-color: transparent; font-weight: 600; }

  @media (max-width: 640px) {
    .picker.pinned[data-side='right'] .gallery-scroll { padding-right: var(--space-4); }
    .picker.pinned[data-side='left'] .gallery-scroll { padding-left: var(--space-4); }
    [data-mode='wall'] .gallery { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  }
</style>
