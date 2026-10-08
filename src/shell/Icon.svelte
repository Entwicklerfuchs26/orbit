<script lang="ts">
  // Minimal inline icon set (stroke-based, 24px grid). Plugins reference
  // icons by name; unknown names fall back to a neutral dot.
  interface Props {
    name: string;
    size?: number;
  }
  let { name, size = 20 }: Props = $props();

  const paths: Record<string, string> = {
    folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    notes: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
    palette:
      'M12 3a9 9 0 1 0 0 18 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-8z M7.5 10.5h.01M12 7.5h.01M16.5 10.5h.01',
    settings:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    plugin: 'M10 3v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3 M4 10h4a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H4 M6 6l12 12',
    close: 'M18 6 6 18M6 6l12 12',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
    menu: 'M4 6h16M4 12h16M4 18h16',
    home: 'M3 11l9-8 9 8M5 10v10h14V10',
    calendar: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4',
    image: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
    sync: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M18 4v5h-5M6 20v-5h5',
    upload: 'M12 16V4M7 9l5-5 5 5 M5 20h14',
    trash: 'M4 7h16M10 11v6M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    hexagon: 'M12 3l7 4v10l-7 4-7-4V7z',
    rows: 'M4 6h16M4 12h16M4 18h16',
    'chevron-left': 'M15 6l-6 6 6 6',
    'chevron-right': 'M9 6l6 6-6 6',
    check: 'M20 6L9 17l-5-5',
    plus: 'M12 5v14M5 12h14',
    lock: 'M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3',
    heart: 'M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3 1 4 2.5C11 6 12 5 14 5c3.5 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20z',
    star: 'M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 21l1.2-6.5L2.5 9.9 9.1 9z',
    filter: 'M3 5h18l-7 8v6l-4-2v-4z',
    sort: 'M4 6h10M4 12h7M4 18h4M17 5v14M17 19l3-3M17 19l-3-3',
    sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6L4.5 4.5M19.5 4.5L18 6M6 18l-1.5 1.5M18 18l1.5 1.5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
    'theme-auto': 'M12 3a9 9 0 0 0 0 18zM12 3a9 9 0 0 1 0 18',
    film: 'M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16',
  };

  let d = $derived(paths[name] ?? 'M12 12h.01');
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each d.split(' M').map((p, i) => (i === 0 ? p : 'M' + p)) as segment}
    <path d={segment} />
  {/each}
</svg>
