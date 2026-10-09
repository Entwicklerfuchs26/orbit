<script lang="ts">
  import type { App } from '@core/index';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Props {
    app: App;
    onDone: () => void;
  }
  let { app, onDone }: Props = $props();

  const steps = [
    {
      kicker: 'Willkommen',
      title: 'SKWD Wall',
      body: 'Sammle, gestalte und erlebe deine Hintergründe neu. SKWD Wall macht aus deinem Startbildschirm eine Bühne – kuratiert von dir, abgestimmt bis auf die Farbe.',
    },
    {
      kicker: 'Steuerung',
      title: 'Alles in einer Wischgeste',
      body: 'Zieh vom Bildschirmrand nach innen – die Leiste gleitet herein. Hinzufügen, Sortieren, Favoriten, Farbe und Hell/Dunkel sind immer einen Wisch entfernt und verschwinden von selbst wieder.',
    },
    {
      kicker: 'Deine Motive',
      title: 'Alle Quellen, eine Galerie',
      body: 'Eigene Fotos und Videos, Millionen Motive aus Wallhaven oder ein ganzer Ordner deines Geräts – alles an einem Ort. Ordner werden verknüpft, nicht kopiert.',
    },
    {
      kicker: 'Ansicht & Farbe',
      title: 'Sieben Ansichten, ein Gespür für Farbe',
      body: 'Blättere durch wandfüllende Raster, Waben und Fächer. Das aktive Bild färbt die ganze App automatisch – ein Design, das sich mit deinem Hintergrund wandelt.',
    },
    {
      kicker: 'Startbildschirm',
      title: 'Direkt aufs Handy',
      body: 'Setz dein Motiv als System-Hintergrund oder als animiertes Live-Wallpaper – mit sanften Übergängen und automatischem Wechsel, auch wenn die App geschlossen ist.',
    },
  ];

  let i = $state(0);
  let last = $derived(i === steps.length - 1);
  const pad = (n: number) => String(n + 1).padStart(2, '0');

  function next() {
    if (last) onDone();
    else i += 1;
  }
  function back() {
    if (i > 0) i -= 1;
  }
</script>

<!-- Shared gradient + soft shadow used by every illustration. -->
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

  <button class="skip" onclick={onDone}>Überspringen</button>

  <div class="stage">
    {#key i}
      <div class="art" in:fade={{ duration: 420 }}>
        {#if i === 0}
          <!-- Brand: phone with wallpaper + orbiting dots -->
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
          <!-- Swipe rail sliding in from the edge -->
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
          <!-- Sources converging into a gallery grid -->
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
        {:else if i === 3}
          <!-- Fanned cards + extracted colour palette -->
          <svg viewBox="0 0 260 210" class="il">
            <g class="float">
              <rect x="92" y="54" width="76" height="104" rx="12" class="card c3" fill="url(#skwdGradSoft)" />
              <rect x="92" y="54" width="76" height="104" rx="12" class="card c2" fill="url(#skwdGrad)" />
              <rect x="92" y="54" width="76" height="104" rx="12" class="card c1 phone" />
              <rect x="100" y="62" width="60" height="70" rx="8" fill="url(#skwdGrad)" />
            </g>
            <g class="swatches">
              {#each [0, 1, 2, 3, 4] as k}
                <circle cx={96 + k * 17} cy="176" r="7" class="sw s{k}" style="animation-delay:{k * 120}ms" />
              {/each}
            </g>
          </svg>
        {:else}
          <!-- Home screen with live wallpaper waves -->
          <svg viewBox="0 0 260 210" class="il">
            <g class="float">
              <rect x="97" y="26" width="66" height="158" rx="16" class="phone" />
              <clipPath id="screenClip"><rect x="104" y="33" width="52" height="144" rx="10" /></clipPath>
              <g clip-path="url(#screenClip)">
                <rect x="104" y="33" width="52" height="144" fill="url(#skwdGradSoft)" />
                <path class="wave" d="M90 120 q16 -16 32 0 t32 0 t32 0 t32 0 V180 H90 Z" fill="url(#skwdGrad)" opacity="0.9" />
                <path class="wave w2" d="M90 136 q16 -14 32 0 t32 0 t32 0 t32 0 V180 H90 Z" fill="url(#skwdGrad)" opacity="0.55" />
              </g>
              {#each [0, 1, 2, 3, 4, 5, 6, 7] as k}
                <rect x={110 + (k % 4) * 12} y={44 + Math.floor(k / 4) * 12} width="8" height="8" rx="2.5" class="appdot" />
              {/each}
            </g>
            <circle cx="130" cy="150" r="6" class="live" />
          </svg>
        {/if}
      </div>
    {/key}
  </div>

  <div class="copy">
    {#key i}
      <div in:fly={{ y: 16, duration: 420, easing: cubicOut }}>
        <span class="kicker">{pad(i)} · {steps[i].kicker}</span>
        <h1>{steps[i].title}</h1>
        <p>{steps[i].body}</p>
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

  .aurora {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
    pointer-events: none;
  }
  .a1 {
    width: 320px; height: 320px; top: -80px; right: -120px;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent, #6aa0ff) 60%, transparent), transparent 70%);
    animation: drift1 14s ease-in-out infinite;
  }
  .a2 {
    width: 300px; height: 300px; bottom: -100px; left: -120px;
    background: radial-gradient(circle, color-mix(in srgb, #b06cf0 55%, transparent), transparent 70%);
    animation: drift2 18s ease-in-out infinite;
  }
  @keyframes drift1 { 50% { transform: translate(-30px, 40px) scale(1.1); } }
  @keyframes drift2 { 50% { transform: translate(40px, -30px) scale(1.08); } }

  .skip {
    position: absolute;
    top: calc(env(safe-area-inset-top) + 16px);
    right: 20px;
    z-index: 2;
    background: color-mix(in srgb, var(--text, #fff) 8%, transparent);
    border: none;
    color: var(--text-muted, #c7c9d1);
    font-size: 0.82rem;
    padding: 7px 14px;
    border-radius: 999px;
    backdrop-filter: blur(6px);
    cursor: pointer;
  }
  .skip:active { transform: scale(0.96); }

  .stage {
    flex: 1;
    display: grid;
    place-items: center;
    position: relative;
    min-height: 0;
  }
  .art { grid-area: 1 / 1; }
  .il { width: min(78vw, 300px); height: auto; overflow: visible; }

  .copy { position: relative; text-align: center; padding: 4px 4px 10px; }
  .copy > div { position: absolute; inset: 0; }
  .copy > div:last-child { position: relative; }
  .kicker {
    display: inline-block;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent, #6aa0ff);
    font-weight: 700;
    margin-bottom: 10px;
  }
  h1 {
    margin: 0 0 12px;
    font-size: clamp(1.5rem, 7vw, 2rem);
    line-height: 1.12;
    letter-spacing: -0.02em;
    font-weight: 800;
  }
  p {
    margin: 0 auto;
    max-width: 30rem;
    color: var(--text-muted, #c7c9d1);
    line-height: 1.6;
    font-size: 0.98rem;
  }

  .footer { position: relative; z-index: 2; }
  .dots { display: flex; justify-content: center; gap: 8px; margin: 18px 0 20px; }
  .dot-btn {
    width: 7px; height: 7px; padding: 0; border: none; border-radius: 999px;
    background: color-mix(in srgb, var(--text, #fff) 22%, transparent);
    transition: width 0.3s cubic-bezier(.2,.8,.2,1), background 0.3s;
    cursor: pointer;
  }
  .dot-btn.on { width: 24px; background: var(--accent, #6aa0ff); }

  .actions { display: flex; gap: 10px; }
  .ghost, .go {
    height: 52px;
    border-radius: 15px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.12s, filter 0.2s;
  }
  .ghost {
    flex: 0 0 auto; padding: 0 22px;
    background: color-mix(in srgb, var(--text, #fff) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--text, #fff) 14%, transparent);
    color: var(--text, #fff);
  }
  .go {
    flex: 1;
    border: none;
    color: #fff;
    background: linear-gradient(135deg, var(--accent, #6aa0ff), color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0));
    box-shadow: 0 10px 30px color-mix(in srgb, var(--accent, #6aa0ff) 40%, transparent);
  }
  .go:active, .ghost:active { transform: scale(0.98); }

  /* ---- illustration primitives ---- */
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
  .sw { stroke: color-mix(in srgb, var(--text, #fff) 14%, transparent); stroke-width: 1; opacity: 0; animation: pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards; }
  .s0 { fill: var(--accent, #6aa0ff); }
  .s1 { fill: color-mix(in srgb, var(--accent, #6aa0ff) 60%, #b06cf0); }
  .s2 { fill: #e9a23b; }
  .s3 { fill: #4bb58b; }
  .s4 { fill: color-mix(in srgb, var(--text, #fff) 70%, transparent); }
  .appdot { fill: color-mix(in srgb, #fff 45%, transparent); }
  .live { fill: var(--accent, #6aa0ff); animation: livepulse 1.8s ease-in-out infinite; }

  .float { animation: floaty 5s ease-in-out infinite; transform-origin: center; }
  .spin { animation: spin 22s linear infinite; }
  .chip { opacity: 0; animation: pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards; }
  .slidein { animation: slidein 0.7s cubic-bezier(.2,.8,.2,1) both; }
  .ping { animation: ping 1.8s ease-out infinite; transform-origin: 150px 105px; }
  .wave { animation: waveshift 3.5s ease-in-out infinite; }
  .wave.w2 { animation-duration: 4.5s; }

  @keyframes floaty { 50% { transform: translateY(-8px); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
  @keyframes dashmove { to { stroke-dashoffset: -28; } }
  @keyframes slidein { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes ping { 0% { transform: scale(1); opacity: 0.7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  @keyframes waveshift { 50% { transform: translateX(-14px) translateY(-3px); } }

  @media (prefers-reduced-motion: reduce) {
    .float, .spin, .chip, .slidein, .ping, .wave, .tile, .flow, .sw, .live, .aurora { animation: none !important; }
    .tile, .sw, .chip { opacity: 1; }
  }
</style>
