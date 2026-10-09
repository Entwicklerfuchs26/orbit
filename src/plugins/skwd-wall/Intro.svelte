<script lang="ts">
  import type { App } from '@core/index';

  interface Props {
    app: App;
    onDone: () => void;
  }
  let { app, onDone }: Props = $props();

  const steps = [
    {
      icon: '🖼️',
      title: 'Willkommen bei SKWD Wall',
      body: 'Dein Wallpaper-Studio: eigene Bilder und Videos sammeln, aus Wallhaven laden, in schönen Ansichten durchstöbern — und die ganze App färbt sich automatisch nach dem aktiven Bild.',
    },
    {
      icon: '👆',
      title: 'Das Menü: die Swipe-Leiste',
      body: 'Wisch mit dem Finger vom Rand herein (oder tippe den Rand an) — die schräge Leiste fährt aus. Darüber erreichst du Hinzufügen (＋), Sortieren, Favoriten, Zufall, Suche, Farbe und Hell/Dunkel. Sie fährt von selbst wieder ein.',
    },
    {
      icon: '➕',
      title: 'Wallpaper hinzufügen',
      body: 'Über ＋ in der Leiste: eigene Bilder/Videos hochladen, bei Wallhaven suchen, oder einen ganzen Ordner einbinden (am PC & Handy). Nichts wird kopiert — Ordnerbilder bleiben, wo sie sind.',
    },
    {
      icon: '🎨',
      title: 'Ansichten & Farben',
      body: 'Sieben Ansichtsmodi (Wall, Waben, Slices, Depth, Sandy, Fächer, Collection) — umschaltbar in den Einstellungen → Ansicht. Tippe ein Bild an, um es zu aktivieren; die App-Farben passen sich an (Material You).',
    },
    {
      icon: '📱',
      title: 'Aufs Handy bringen',
      body: 'Unter Einstellungen → Geräte aktivierst du den System-Hintergrund und das Live-Wallpaper — dein gewähltes Bild (oder eine rotierende Auswahl) landet direkt auf dem Homescreen.',
    },
  ];

  let i = $state(0);
  let last = $derived(i === steps.length - 1);

  function next() {
    if (last) onDone();
    else i += 1;
  }
  function back() {
    if (i > 0) i -= 1;
  }
</script>

<div class="intro-overlay">
  <div class="intro-card" role="dialog" aria-modal="true" aria-label="Einführung SKWD Wall">
    <button class="skip" onclick={onDone}>Überspringen</button>

    <div class="emoji">{steps[i].icon}</div>
    <h2>{steps[i].title}</h2>
    <p>{steps[i].body}</p>

    <div class="dots">
      {#each steps as _, n}
        <span class="dot" class:on={n === i}></span>
      {/each}
    </div>

    <div class="nav">
      <button class="ghost" onclick={back} disabled={i === 0}>Zurück</button>
      <button class="go" onclick={next}>{last ? "Los geht's" : 'Weiter'}</button>
    </div>
  </div>
</div>

<style>
  .intro-overlay {
    position: absolute;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4, 16px);
    background: color-mix(in srgb, var(--bg, #111) 72%, transparent);
    backdrop-filter: blur(6px);
  }
  .intro-card {
    position: relative;
    width: min(440px, 100%);
    background: var(--bg-elevated, #1b1b1b);
    border: 1px solid var(--border, #333);
    border-radius: var(--radius-lg, 16px);
    box-shadow: var(--shadow, 0 20px 60px rgba(0, 0, 0, 0.5));
    padding: var(--space-5, 28px);
    text-align: center;
  }
  .skip {
    position: absolute;
    top: var(--space-3, 12px);
    right: var(--space-3, 12px);
    background: transparent;
    border: none;
    color: var(--text-faint, #888);
    font-size: 0.8rem;
    cursor: pointer;
  }
  .skip:hover { color: var(--text, #fff); }
  .emoji { font-size: 2.6rem; line-height: 1; margin: var(--space-2, 8px) 0 var(--space-3, 12px); }
  h2 { margin: 0 0 var(--space-3, 12px); font-size: 1.3rem; color: var(--text, #fff); }
  p { margin: 0; color: var(--text-muted, #bbb); line-height: 1.6; min-height: 5.5em; }
  .dots { display: flex; justify-content: center; gap: 7px; margin: var(--space-4, 20px) 0; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--bg-active, #444); transition: background 0.2s, width 0.2s; }
  .dot.on { background: var(--accent, #6aa0ff); width: 20px; border-radius: 4px; }
  .nav { display: flex; gap: var(--space-2, 8px); justify-content: space-between; }
  .ghost, .go {
    flex: 1;
    padding: var(--space-3, 12px) var(--space-4, 16px);
    border-radius: var(--radius-md, 10px);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
  }
  .ghost { background: transparent; border: 1px solid var(--border, #333); color: var(--text-muted, #bbb); }
  .ghost:disabled { opacity: 0.35; cursor: default; }
  .go { background: var(--accent, #6aa0ff); color: var(--accent-text, #fff); border: none; }
</style>
