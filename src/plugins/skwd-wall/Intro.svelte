<script lang="ts">
  import type { App } from '@core/index';
  import type { WallpaperManager } from './manager';
  import type { ViewMode, TransitionType } from './types';
  import { VIEW_MODES, TRANSITIONS } from './types';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Props {
    app: App;
    manager: WallpaperManager;
    onDone: () => void;
  }
  let { app, manager, onDone }: Props = $props();

  type Step = { kind: 'info' | 'view' | 'transition' | 'mobile' | 'done'; kicker: string; title: string; body: string };

  const steps: Step[] = [
    {
      kind: 'info',
      kicker: 'Willkommen',
      title: 'SKWD Wall',
      body: 'Sammle, gestalte und erlebe deine Hintergründe neu. SKWD Wall macht aus deinem Startbildschirm eine Bühne – kuratiert von dir, abgestimmt bis auf die Farbe.',
    },
    {
      kind: 'info',
      kicker: 'Steuerung',
      title: 'Alles in einer Wischgeste',
      body: 'Zieh vom Bildschirmrand nach innen – die Leiste gleitet herein. Hinzufügen, Sortieren, Favoriten, Farbe und Hell/Dunkel sind immer einen Wisch entfernt und verschwinden von selbst wieder.',
    },
    {
      kind: 'info',
      kicker: 'Deine Motive',
      title: 'Alle Quellen, eine Galerie',
      body: 'Eigene Fotos und Videos, Millionen Motive aus Wallhaven oder ein ganzer Ordner deines Geräts – alles an einem Ort. Ordner werden verknüpft, nicht kopiert.',
    },
    {
      kind: 'view',
      kicker: 'Ansicht',
      title: 'Wähle deinen Look',
      body: 'Wie soll deine Galerie aussehen? Vom klassischen Raster über Wabenmuster bis zum Kartenfächer – jederzeit änderbar.',
    },
    {
      kind: 'transition',
      kicker: 'Animation',
      title: 'Übergänge beim Wechsel',
      body: 'Wie soll der Wechsel zwischen Wallpapern aussehen? Lass den Zufall entscheiden oder wähle einen festen Effekt.',
    },
    {
      kind: 'mobile',
      kicker: 'Einrichten',
      title: 'Dein Handy mit einbeziehen',
      body: 'SKWD Wall kann dein gewähltes Motiv direkt auf den Startbildschirm bringen. Das ist standardmäßig aus – aktiviere nur, was du möchtest. Später jederzeit änderbar unter Einstellungen → Geräte.',
    },
    {
      kind: 'done',
      kicker: 'Fertig',
      title: 'Startklar',
      body: 'Alles bereit. Füge dein erstes Wallpaper über die Leiste hinzu – und mach deinen Startbildschirm zu deinem.',
    },
  ];

  let i = $state(0);
  let step = $derived(steps[i]);
  let last = $derived(i === steps.length - 1);
  const pad = (n: number) => String(n + 1).padStart(2, '0');

  // Interactive setup state, applied immediately to the plugin.
  let mobileOn = $state(manager.state.get().deviceMobile);
  let liveOn = $state(manager.state.get().liveWallpaper);
  let viewMode = $state(manager.state.get().viewMode);
  let randomShader = $state(manager.state.get().randomShader);
  let transitionType = $state(manager.state.get().transitionType);

  function setView(m: ViewMode) {
    viewMode = m;
    manager.setViewMode(m);
  }
  function setRandomShader(on: boolean) {
    randomShader = on;
    manager.setField('randomShader', on);
  }
  function setTransition(t: TransitionType) {
    transitionType = t;
    manager.setTransitionType(t);
  }

  function setMobile(on: boolean) {
    mobileOn = on;
    manager.setDeviceMobile(on);
    if (!on && liveOn) {
      liveOn = false;
      manager.setLiveWallpaper(false);
    }
  }
  function setLive(on: boolean) {
    liveOn = on;
    manager.setLiveWallpaper(on);
  }

  // Pointy-top hexagon points for the "geometric" preview.
  function hex(cx: number, cy: number, r: number): string {
    const w = r * 0.866;
    return `${cx},${cy - r} ${cx + w},${cy - r / 2} ${cx + w},${cy + r / 2} ${cx},${cy + r} ${cx - w},${cy + r / 2} ${cx - w},${cy - r / 2}`;
  }

  function next() {
    if (last) {
      // If the user enabled live wallpaper in the setup, activate it right away
      // (open Android's live-wallpaper chooser) instead of making them hunt in
      // settings. No-op where unsupported (web/desktop).
      if (liveOn) manager.openLivePicker();
      onDone();
    } else {
      i += 1;
    }
  }
  function back() {
    if (i > 0) i -= 1;
  }
</script>

<svg class="defs" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="skwdGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" class="g0" />
      <stop offset="1" class="g1" />
    </linearGradient>
    <linearGradient id="skwdGradSoft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="gs0" />
      <stop offset="1" class="gs1" />
    </linearGradient>
  </defs>
</svg>

<div class="intro">
  <div class="aurora a1"></div>
  <div class="aurora a2"></div>

  {#if !last}<button class="skip" onclick={onDone}>Überspringen</button>{/if}

  <div class="stage">
    {#key i}
      <div class="art" in:fade={{ duration: 420 }}>
        {#if i === 0}
          <svg viewBox="0 0 260 210" class="il">
            <g class="spin" style="transform-origin:130px 105px">
              <ellipse cx="130" cy="105" rx="96" ry="60" class="ring" />
              <circle cx="226" cy="105" r="5" class="dot accent" />
              <circle cx="34" cy="105" r="3.5" class="dot" />
            </g>
            <g class="float">
              <rect x="97" y="40" width="66" height="130" rx="16" class="phone" />
              <rect x="104" y="47" width="52" height="116" rx="10" fill="url(#skwdGrad)" />
              <circle cx="130" cy="92" r="17" class="gloss" />
              <rect x="116" y="150" width="28" height="5" rx="2.5" class="bar" />
            </g>
          </svg>
        {:else if i === 1}
          <svg viewBox="0 0 260 210" class="il">
            <rect x="60" y="30" width="140" height="150" rx="18" class="phone" />
            <rect x="68" y="38" width="124" height="134" rx="12" fill="url(#skwdGradSoft)" />
            <g class="slidein">
              <path d="M150 60 L182 66 L182 150 L150 156 Z" class="rail" />
              <circle cx="166" cy="84" r="5" class="dot accent" />
              <circle cx="166" cy="105" r="5" class="dot light" />
              <circle cx="166" cy="126" r="5" class="dot light" />
            </g>
            <circle cx="150" cy="105" r="12" class="touch" />
            <circle cx="150" cy="105" r="12" class="touch ping" />
          </svg>
        {:else if i === 2}
          <svg viewBox="0 0 260 210" class="il">
            <g class="float">
              <rect x="150" y="70" width="80" height="80" rx="12" class="phone" />
              {#each [0, 1, 2, 3] as k}
                <rect x={158 + (k % 2) * 34} y={78 + Math.floor(k / 2) * 34} width="28" height="28" rx="6" fill="url(#skwdGrad)" class="tile" style="animation-delay:{k * 120}ms" />
              {/each}
            </g>
            <g class="chips">
              <g class="chip" style="animation-delay:0ms"><circle cx="46" cy="58" r="18" class="src" /><path d="M46 51 L46 65 M40 57 L46 51 L52 57" class="ico" /></g>
              <g class="chip" style="animation-delay:200ms"><circle cx="46" cy="105" r="18" class="src" /><path d="M39 107 a7 7 0 0 1 14 0 h2 a5 5 0 0 1 0 10 h-18 a5 5 0 0 1 0 -10 z" class="ico fill" /></g>
              <g class="chip" style="animation-delay:400ms"><circle cx="46" cy="152" r="18" class="src" /><path d="M38 148 h6 l2 -3 h8 v14 h-16 z" class="ico fill" /></g>
            </g>
            <path d="M64 58 C110 58 120 105 150 100" class="flow" />
            <path d="M64 105 C110 105 120 105 150 110" class="flow" style="animation-delay:600ms" />
            <path d="M64 152 C110 152 120 110 150 120" class="flow" style="animation-delay:1200ms" />
          </svg>
        {:else if step.kind === 'view'}
          <!-- Live preview of the selected layout inside a phone frame -->
          <svg viewBox="0 0 260 210" class="il">
            <g class="float">
              <rect x="90" y="20" width="80" height="170" rx="16" class="phone" />
              <clipPath id="vClip"><rect x="96" y="26" width="68" height="158" rx="10" /></clipPath>
              <g clip-path="url(#vClip)">
                <rect x="96" y="26" width="68" height="158" fill="url(#skwdGradSoft)" />
                {#key viewMode}
                  <g in:fade={{ duration: 260 }}>
                    {#if viewMode === 'wall'}
                      {#each [0, 1, 2] as c}{#each [0, 1, 2, 3, 4] as r}
                        <rect x={100 + c * 21} y={31 + r * 30} width="17" height="25" rx="3" fill="url(#skwdGrad)" />
                      {/each}{/each}
                    {:else if viewMode === 'geometric'}
                      {#each [[116, 44], [144, 44], [130, 68], [116, 92], [144, 92], [130, 116], [116, 140], [144, 140], [130, 164]] as [cx, cy]}
                        <polygon points={hex(cx, cy, 13)} fill="url(#skwdGrad)" stroke="color-mix(in srgb, var(--bg) 60%, transparent)" stroke-width="1.5" />
                      {/each}
                    {:else if viewMode === 'slices'}
                      <rect x="100" y="38" width="60" height="12" rx="3" fill="url(#skwdGrad)" opacity="0.55" />
                      <rect x="100" y="54" width="60" height="16" rx="3" fill="url(#skwdGrad)" opacity="0.75" />
                      <rect x="100" y="76" width="60" height="58" rx="6" fill="url(#skwdGrad)" />
                      <rect x="100" y="140" width="60" height="16" rx="3" fill="url(#skwdGrad)" opacity="0.75" />
                      <rect x="100" y="160" width="60" height="12" rx="3" fill="url(#skwdGrad)" opacity="0.55" />
                    {:else if viewMode === 'depth'}
                      <rect x="118" y="34" width="24" height="18" rx="3" fill="url(#skwdGrad)" opacity="0.4" />
                      <rect x="112" y="56" width="36" height="26" rx="4" fill="url(#skwdGrad)" opacity="0.65" />
                      <rect x="102" y="86" width="56" height="44" rx="6" fill="url(#skwdGrad)" />
                      <rect x="112" y="134" width="36" height="26" rx="4" fill="url(#skwdGrad)" opacity="0.65" />
                      <rect x="118" y="164" width="24" height="16" rx="3" fill="url(#skwdGrad)" opacity="0.4" />
                    {:else if viewMode === 'sandy'}
                      <rect x="100" y="40" width="42" height="130" rx="6" fill="url(#skwdGrad)" />
                      {#each [0, 1, 2, 3] as r}
                        <rect x="146" y={40 + r * 34} width="14" height="28" rx="3" fill="url(#skwdGrad)" opacity="0.7" />
                      {/each}
                    {:else if viewMode === 'hand'}
                      {#each [-28, -14, 0, 14, 28] as a, k}
                        <rect x="120" y="70" width="20" height="60" rx="5" fill="url(#skwdGrad)" opacity={k === 2 ? 1 : 0.6} transform={`rotate(${a} 130 130)`} />
                      {/each}
                    {:else}
                      {#each [10, 5, 0] as a, k}
                        <rect x="108" y={60 + k * 6} width="44" height="78" rx="6" fill="url(#skwdGrad)" opacity={0.55 + k * 0.22} transform={`rotate(${a} 130 100)`} />
                      {/each}
                    {/if}
                  </g>
                {/key}
              </g>
            </g>
          </svg>
        {:else if step.kind === 'transition'}
          <!-- Two frames cross-blending -->
          <svg viewBox="0 0 260 210" class="il">
            <rect x="48" y="55" width="100" height="100" rx="14" fill="url(#skwdGradSoft)" class="xf a" />
            <rect x="112" y="55" width="100" height="100" rx="14" fill="url(#skwdGrad)" class="xf b" />
            <g class="float">
              <path d="M126 105 h18 m-6 -6 l6 6 l-6 6" class="arrow" />
            </g>
          </svg>
        {:else if step.kind === 'mobile'}
          <!-- Clean phone on a home screen (wider aspect) -->
          <svg viewBox="0 0 260 210" class="il">
            <g class="spin" style="transform-origin:130px 105px">
              <ellipse cx="130" cy="105" rx="82" ry="72" class="ring" />
            </g>
            <g class="float">
              <rect x="92" y="26" width="76" height="158" rx="17" class="phone" />
              <clipPath id="mClip"><rect x="98" y="32" width="64" height="146" rx="12" /></clipPath>
              <g clip-path="url(#mClip)">
                <rect x="98" y="32" width="64" height="146" fill="url(#skwdGradSoft)" />
                <path class="wave" d="M94 120 q16 -15 32 0 t32 0 t32 0 V178 H94 Z" fill="url(#skwdGrad)" opacity="0.92" />
                <path class="wave w2" d="M94 134 q16 -13 32 0 t32 0 t32 0 V178 H94 Z" fill="url(#skwdGrad)" opacity="0.5" />
              </g>
              <!-- notch + home indicator -->
              <rect x="121" y="36" width="18" height="4" rx="2" class="notch" />
              <rect x="119" y="170" width="22" height="3" rx="1.5" class="notch" />
              <!-- app dots -->
              {#each [0, 1, 2, 3, 4, 5] as k}
                <rect x={110 + (k % 3) * 15} y={50 + Math.floor(k / 3) * 14} width="10" height="10" rx="2.5" class="appdot" />
              {/each}
            </g>
          </svg>
        {:else}
          <!-- Done: checkmark inside an orbit -->
          <svg viewBox="0 0 260 210" class="il">
            <g class="spin" style="transform-origin:130px 105px">
              <ellipse cx="130" cy="105" rx="80" ry="80" class="ring" />
            </g>
            <circle cx="130" cy="105" r="46" fill="url(#skwdGrad)" class="float" />
            <path d="M110 106 l14 14 l26 -30" class="check" />
          </svg>
        {/if}
      </div>
    {/key}
  </div>

  <div class="copy">
    {#key i}
      <div in:fly={{ y: 16, duration: 420, easing: cubicOut }}>
        <span class="kicker">{pad(i)} · {step.kicker}</span>
        <h1>{step.title}</h1>
        <p>{step.body}</p>

        {#if step.kind === 'view'}
          <div class="chips-grid">
            {#each VIEW_MODES as v (v.value)}
              <button class="chip-opt" class:sel={viewMode === v.value} onclick={() => setView(v.value)}>{v.label}</button>
            {/each}
          </div>
        {/if}

        {#if step.kind === 'transition'}
          <div class="toggles">
            <button class="toggle" class:on={randomShader} onclick={() => setRandomShader(!randomShader)}>
              <span class="t-text">
                <span class="t-title">Zufällige Übergänge</span>
                <span class="t-desc">Bei jedem Wechsel ein anderer Effekt – immer für Abwechslung.</span>
              </span>
              <span class="sw" aria-hidden="true"><span class="knob"></span></span>
            </button>
            {#if !randomShader}
              <div class="trans-grid">
                {#each TRANSITIONS as t (t.value)}
                  <button class="chip-opt sm" class:sel={transitionType === t.value} onclick={() => setTransition(t.value)}>
                    {t.label}{#if t.gpu}<span class="gpu">✦</span>{/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        {#if step.kind === 'mobile'}
          <div class="toggles">
            <button class="toggle" class:on={mobileOn} onclick={() => setMobile(!mobileOn)}>
              <span class="t-text">
                <span class="t-title">Hintergrund aufs Handy setzen</span>
                <span class="t-desc">Dein Motiv als System-Hintergrund (Start- & Sperrbildschirm).</span>
              </span>
              <span class="sw" aria-hidden="true"><span class="knob"></span></span>
            </button>

            <button class="toggle" class:on={liveOn} class:disabled={!mobileOn} disabled={!mobileOn} onclick={() => setLive(!liveOn)}>
              <span class="t-text">
                <span class="t-title">Live-Wallpaper (animiert)</span>
                <span class="t-desc">Sanfte Übergänge & automatischer Wechsel direkt am Homescreen.</span>
              </span>
              <span class="sw" aria-hidden="true"><span class="knob"></span></span>
            </button>
          </div>
        {/if}
      </div>
    {/key}
  </div>

  <div class="footer">
    <div class="dots">
      {#each steps as _, n}
        <button class="dot-btn" class:on={n === i} aria-label={`Schritt ${n + 1}`} onclick={() => (i = n)}></button>
      {/each}
    </div>
    <div class="actions">
      {#if i > 0}
        <button class="ghost" onclick={back}>Zurück</button>
      {/if}
      <button class="go" onclick={next}>{last ? 'Loslegen' : 'Weiter'}</button>
    </div>
  </div>
</div>

<style>
  .defs { position: absolute; width: 0; height: 0; }
  .g0 { stop-color: var(--accent, #6aa0ff); }
  .g1 { stop-color: color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0); }
  .gs0 { stop-color: color-mix(in srgb, var(--accent, #6aa0ff) 45%, transparent); }
  .gs1 { stop-color: color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent); }

  .intro {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text, #fff);
    background:
      radial-gradient(130% 80% at 50% -10%, color-mix(in srgb, var(--accent, #6aa0ff) 22%, transparent), transparent 60%),
      var(--bg, #0e0f13);
    padding: calc(env(safe-area-inset-top) + 20px) 24px calc(env(safe-area-inset-bottom) + 24px);
  }

  .aurora { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; pointer-events: none; }
  .a1 { width: 320px; height: 320px; top: -80px; right: -120px; background: radial-gradient(circle, color-mix(in srgb, var(--accent, #6aa0ff) 60%, transparent), transparent 70%); animation: drift1 14s ease-in-out infinite; }
  .a2 { width: 300px; height: 300px; bottom: -100px; left: -120px; background: radial-gradient(circle, color-mix(in srgb, #b06cf0 55%, transparent), transparent 70%); animation: drift2 18s ease-in-out infinite; }
  @keyframes drift1 { 50% { transform: translate(-30px, 40px) scale(1.1); } }
  @keyframes drift2 { 50% { transform: translate(40px, -30px) scale(1.08); } }

  .skip {
    position: absolute; top: calc(env(safe-area-inset-top) + 16px); right: 20px; z-index: 2;
    background: color-mix(in srgb, var(--text, #fff) 8%, transparent); border: none;
    color: var(--text-muted, #c7c9d1); font-size: 0.82rem; padding: 7px 14px;
    border-radius: 999px; backdrop-filter: blur(6px); cursor: pointer;
  }
  .skip:active { transform: scale(0.96); }

  .stage { flex: 1; display: grid; place-items: center; position: relative; min-height: 0; }
  .art { grid-area: 1 / 1; }
  .il { width: min(66vw, 260px); height: auto; overflow: visible; }

  .copy { position: relative; text-align: center; padding: 4px 4px 10px; }
  .kicker { display: inline-block; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent, #6aa0ff); font-weight: 700; margin-bottom: 10px; }
  h1 { margin: 0 0 12px; font-size: clamp(1.4rem, 6.5vw, 1.9rem); line-height: 1.12; letter-spacing: -0.02em; font-weight: 800; }
  p { margin: 0 auto; max-width: 30rem; color: var(--text-muted, #c7c9d1); line-height: 1.55; font-size: 0.95rem; }

  .chips-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 18px auto 0; max-width: 30rem; }
  .chip-opt {
    background: color-mix(in srgb, var(--text, #fff) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent);
    color: var(--text, #fff); border-radius: 999px; padding: 9px 16px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
    transition: background 0.18s, border-color 0.18s, transform 0.1s;
  }
  .chip-opt:active { transform: scale(0.96); }
  .chip-opt.sel { background: var(--accent, #6aa0ff); color: #fff; border-color: transparent; }
  .chip-opt.sm { padding: 7px 12px; font-size: 0.82rem; }
  .gpu { margin-left: 4px; opacity: 0.8; font-size: 0.75em; }
  .trans-grid {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 7px;
    max-width: 30rem; max-height: 136px; overflow-y: auto; padding: 2px;
    -webkit-overflow-scrolling: touch;
  }
  .sel-input {
    width: 100%; margin-top: 2px; background: color-mix(in srgb, var(--text, #fff) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--text, #fff) 14%, transparent); color: var(--text, #fff);
    border-radius: 14px; padding: 13px 14px; font-size: 0.95rem;
  }
  .toggles { display: flex; flex-direction: column; gap: 10px; margin: 18px auto 0; max-width: 30rem; text-align: left; }
  .toggle {
    display: flex; align-items: center; gap: 14px;
    background: color-mix(in srgb, var(--text, #fff) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent);
    border-radius: 16px; padding: 14px 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s;
  }
  .toggle.on { border-color: color-mix(in srgb, var(--accent, #6aa0ff) 60%, transparent); background: color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent); }
  .toggle.disabled { opacity: 0.45; cursor: default; }
  .t-text { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .t-title { font-weight: 700; font-size: 0.95rem; }
  .t-desc { font-size: 0.8rem; color: var(--text-muted, #c7c9d1); line-height: 1.4; }
  .sw { flex-shrink: 0; width: 46px; height: 28px; border-radius: 999px; background: color-mix(in srgb, var(--text, #fff) 20%, transparent); position: relative; transition: background 0.2s; }
  .toggle.on .sw { background: var(--accent, #6aa0ff); }
  .knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform 0.22s cubic-bezier(.2,.8,.2,1); }
  .toggle.on .knob { transform: translateX(18px); }

  .footer { position: relative; z-index: 2; }
  .dots { display: flex; justify-content: center; gap: 8px; margin: 18px 0 20px; }
  .dot-btn { width: 7px; height: 7px; padding: 0; border: none; border-radius: 999px; background: color-mix(in srgb, var(--text, #fff) 22%, transparent); transition: width 0.3s cubic-bezier(.2,.8,.2,1), background 0.3s; cursor: pointer; }
  .dot-btn.on { width: 24px; background: var(--accent, #6aa0ff); }

  .actions { display: flex; gap: 10px; }
  .ghost, .go { height: 52px; border-radius: 15px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.12s, filter 0.2s; }
  .ghost { flex: 0 0 auto; padding: 0 22px; background: color-mix(in srgb, var(--text, #fff) 9%, transparent); border: 1px solid color-mix(in srgb, var(--text, #fff) 14%, transparent); color: var(--text, #fff); }
  .go { flex: 1; border: none; color: #fff; background: linear-gradient(135deg, var(--accent, #6aa0ff), color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0)); box-shadow: 0 10px 30px color-mix(in srgb, var(--accent, #6aa0ff) 40%, transparent); }
  .go:active, .ghost:active { transform: scale(0.98); }

  .phone { fill: color-mix(in srgb, var(--text, #fff) 7%, transparent); stroke: color-mix(in srgb, var(--text, #fff) 20%, transparent); stroke-width: 2; }
  .ring { fill: none; stroke: color-mix(in srgb, var(--text, #fff) 16%, transparent); stroke-width: 1.5; stroke-dasharray: 2 7; stroke-linecap: round; }
  .dot { fill: color-mix(in srgb, var(--text, #fff) 40%, transparent); }
  .dot.accent { fill: var(--accent, #6aa0ff); }
  .dot.light { fill: color-mix(in srgb, var(--text, #fff) 55%, transparent); }
  .gloss { fill: color-mix(in srgb, #fff 30%, transparent); }
  .bar { fill: color-mix(in srgb, #fff 55%, transparent); }
  .rail { fill: color-mix(in srgb, var(--accent, #6aa0ff) 85%, #000); }
  .touch { fill: none; stroke: #fff; stroke-width: 2; opacity: 0.9; }
  .src { fill: color-mix(in srgb, var(--text, #fff) 10%, transparent); stroke: color-mix(in srgb, var(--text, #fff) 22%, transparent); stroke-width: 1.5; }
  .ico { fill: none; stroke: var(--accent, #6aa0ff); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .ico.fill { fill: var(--accent, #6aa0ff); stroke: none; }
  .tile { opacity: 0; animation: pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards; }
  .flow { fill: none; stroke: var(--accent, #6aa0ff); stroke-width: 2; stroke-dasharray: 5 9; stroke-linecap: round; opacity: 0.8; animation: dashmove 1.1s linear infinite; }
  .card { stroke: color-mix(in srgb, var(--text, #fff) 16%, transparent); stroke-width: 1.5; }
  .c1 { transform: rotate(-9deg); transform-origin: 130px 106px; }
  .c2 { transform: rotate(3deg); transform-origin: 130px 106px; opacity: 0.85; }
  .c3 { transform: rotate(13deg); transform-origin: 130px 106px; opacity: 0.6; }
  .swatches .s0 { fill: var(--accent, #6aa0ff); }
  .swatches .s1 { fill: color-mix(in srgb, var(--accent, #6aa0ff) 60%, #b06cf0); }
  .swatches .s2 { fill: #e9a23b; }
  .swatches .s3 { fill: #4bb58b; }
  .swatches .s4 { fill: color-mix(in srgb, var(--text, #fff) 70%, transparent); }
  .swatches circle { stroke: color-mix(in srgb, var(--text, #fff) 14%, transparent); stroke-width: 1; opacity: 0; animation: pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards; }
  .appdot { fill: color-mix(in srgb, #fff 45%, transparent); }
  .notch { fill: color-mix(in srgb, var(--text, #fff) 30%, transparent); }
  .switch-knob { fill: color-mix(in srgb, var(--text, #fff) 35%, transparent); transition: fill 0.25s; }
  .switch-knob.on { fill: var(--accent, #6aa0ff); animation: livepulse 1.8s ease-in-out infinite; }
  .check { fill: none; stroke: #fff; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 70; stroke-dashoffset: 70; animation: draw 0.6s 0.2s cubic-bezier(.2,.8,.2,1) forwards; }
  .xf { stroke: color-mix(in srgb, var(--text, #fff) 16%, transparent); stroke-width: 1.5; }
  .xf.a { animation: xfa 3s ease-in-out infinite; }
  .xf.b { animation: xfb 3s ease-in-out infinite; }
  .arrow { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  @keyframes xfa { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
  @keyframes xfb { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }

  .float { animation: floaty 5s ease-in-out infinite; transform-origin: center; }
  .spin { animation: spin 22s linear infinite; }
  .chip { opacity: 0; animation: pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards; }
  .slidein { animation: slidein 0.7s cubic-bezier(.2,.8,.2,1) both; }
  .ping { animation: ping 1.8s ease-out infinite; transform-origin: 150px 105px; }
  .wave { animation: waveshift 3.5s ease-in-out infinite; }

  @keyframes floaty { 50% { transform: translateY(-8px); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
  @keyframes dashmove { to { stroke-dashoffset: -28; } }
  @keyframes slidein { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes ping { 0% { transform: scale(1); opacity: 0.7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes waveshift { 50% { transform: translateX(-12px) translateY(-3px); } }
  @keyframes draw { to { stroke-dashoffset: 0; } }

  @media (prefers-reduced-motion: reduce) {
    .float, .spin, .chip, .slidein, .ping, .wave, .tile, .flow, .switch-knob, .aurora, .swatches circle, .check, .xf { animation: none !important; }
    .xf.b { opacity: 1; }
    .tile, .chip, .swatches circle { opacity: 1; }
    .check { stroke-dashoffset: 0; }
  }
</style>
