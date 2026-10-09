<script lang="ts">
  import type { SojusApp } from '@core/app';
  import type { Bundle } from '@core/index';
  import { HomeView } from './home';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
    bundles: Bundle[];
    onDone: () => void;
  }
  let { app, bundles, onDone }: Props = $props();

  // Wizard: the welcome/choice screen branches into a quick "SKWD Wall" setup
  // or the fuller "Orbit entdecken" track.
  type Screen = 'welcome' | 'choose' | 'skwd' | 'explore';
  let screen = $state<Screen>('welcome');
  let exploreStep = $state(0);
  let busy = $state(false);

  // SKWD quick path
  let skwdDefault = $state(true);

  // Explore path — plugin picker
  const CUSTOM = '__custom__';
  const NONE = '__none__';
  const pickable = app.plugins.getRegistered().filter((m) => app.plugins.supportsPlatform(m.id));
  let selected = $state<string>(bundles.find((b) => b.recommended)?.id ?? bundles[0]?.id ?? CUSTOM);
  let custom = $state<Record<string, boolean>>(Object.fromEntries(pickable.map((m) => [m.id, m.id === 'skwd-wall'])));
  let chosenIds = $derived(
    selected === NONE
      ? []
      : selected === CUSTOM
        ? pickable.filter((m) => custom[m.id]).map((m) => m.id)
        : (bundles.find((b) => b.id === selected)?.plugins ?? []),
  );
  let canFinishExplore = $derived(selected === NONE || chosenIds.length > 0);

  const exploreSlides = [
    {
      title: 'Eine Oberfläche für alles',
      body: 'Die Idee hinter Orbit: Programme, Apps, Web-Dienste – alles bekommt dieselbe, durchdachte und wirklich schöne Oberfläche. Ein einheitliches, erstklassiges Bedienerlebnis, egal was du gerade tust, statt für jedes Tool ein anderes Design zu lernen.',
    },
    {
      title: 'Alles ist ein Plugin',
      body: 'Der Kern ist bewusst schlank. Chat, Notizen, Wallpaper, Nextcloud, Design – alles kommt als Plugin dazu und fügt sich nahtlos in dasselbe Design ein. Du baust dir genau das, was du brauchst.',
    },
    {
      title: 'Ein Store ohne Server',
      body: 'Neue Plugins holst du dir im Bereich „Plugins" direkt von GitHub – mit Beschreibung, Neuigkeiten und Versionen zum Zurückrollen. Updates bekommst du als Hinweis, installierst sie aber selbst.',
    },
    {
      title: 'Überall dein Orbit',
      body: 'Dasselbe Zuhause auf Handy, Desktop und Web – mit einem Theme, das sich anpasst. Später wird Orbit sogar dein Android-Startbildschirm.',
    },
  ];

  async function finishSkwd() {
    if (busy) return;
    busy = true;
    await app.completeOnboarding(['skwd-wall']);
    // Default = SKWD Wall stays the start page (it flags itself). Otherwise land
    // on the Orbit home.
    if (!skwdDefault) app.setStartPagePref(HomeView.ID);
    onDone();
  }

  async function finishExplore() {
    if (busy || !canFinishExplore) return;
    busy = true;
    await app.completeOnboarding(chosenIds);
    if (chosenIds.length === 0) app.setStartPagePref(HomeView.ID);
    onDone();
  }
</script>

<svg class="defs" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="orbGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" class="g0" />
      <stop offset="1" class="g1" />
    </linearGradient>
  </defs>
</svg>

<div class="onb">
  <div class="aurora a1"></div>
  <div class="aurora a2"></div>

  {#if screen === 'welcome'}
    <div class="stage" in:fade={{ duration: 400 }}>
      <svg viewBox="0 0 220 220" class="logo">
        <g class="spin" style="transform-origin:110px 110px">
          <ellipse cx="110" cy="110" rx="86" ry="52" class="ring" />
          <circle cx="196" cy="110" r="7" class="odot" />
        </g>
        <g class="spin rev" style="transform-origin:110px 110px">
          <ellipse cx="110" cy="110" rx="52" ry="86" class="ring" />
          <circle cx="110" cy="24" r="5" class="odot soft" />
        </g>
        <circle cx="110" cy="110" r="30" fill="url(#orbGrad)" class="core" />
      </svg>
      <div class="copy" in:fly={{ y: 16, duration: 450, easing: cubicOut }}>
        <h1>Willkommen bei <span class="accent">Orbit</span></h1>
        <p>Dein anpassbares Zuhause für alles. Lass uns in 30 Sekunden einrichten, womit du starten willst.</p>
      </div>
      <div class="footer single">
        <button class="go" onclick={() => (screen = 'choose')}>Los geht's</button>
      </div>
    </div>

  {:else if screen === 'choose'}
    <div class="stage top" in:fade={{ duration: 350 }}>
      <div class="copy">
        <span class="kicker">Einrichten</span>
        <h1>Womit möchtest du starten?</h1>
      </div>
      <div class="choices">
        <button class="choice feat" onclick={() => (screen = 'skwd')}>
          <span class="c-ico">
            <svg viewBox="0 0 48 48"><rect x="15" y="6" width="18" height="36" rx="5" class="mini-phone" /><rect x="18" y="9" width="12" height="27" rx="2" fill="url(#orbGrad)" /><circle cx="24" cy="21" r="4" class="mini-gloss" /></svg>
          </span>
          <span class="c-text">
            <span class="c-head">SKWD Wall <span class="rec">Empfohlen</span></span>
            <span class="c-desc">Dein Wallpaper aufs Handy – eigene Bilder & Wallhaven, Ansichtsmodi, Live-Wallpaper. Für die meisten der schnellste Start.</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>

        <button class="choice" onclick={() => { screen = 'explore'; exploreStep = 0; }}>
          <span class="c-ico alt">
            <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" class="mini-ring" /><circle cx="24" cy="24" r="6" fill="url(#orbGrad)" /><circle cx="40" cy="24" r="3" class="odot" /></svg>
          </span>
          <span class="c-text">
            <span class="c-head">Orbit entdecken</span>
            <span class="c-desc">Was Orbit alles kann – und selbst zusammenstellen, welche Plugins du möchtest.</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <div class="footer single">
        <button class="ghost" onclick={() => (screen = 'welcome')}>Zurück</button>
      </div>
    </div>

  {:else if screen === 'skwd'}
    <div class="stage" in:fly={{ x: 24, duration: 360, easing: cubicOut }}>
      <svg viewBox="0 0 220 210" class="logo">
        <g class="float">
          <rect x="82" y="26" width="76" height="158" rx="17" class="mini-phone big" />
          <clipPath id="sClip"><rect x="88" y="32" width="64" height="146" rx="12" /></clipPath>
          <g clip-path="url(#sClip)">
            <rect x="88" y="32" width="64" height="146" fill="url(#orbGrad)" opacity="0.25" />
            <path d="M84 118 q16 -15 32 0 t32 0 t32 0 V178 H84 Z" fill="url(#orbGrad)" class="wave" />
          </g>
        </g>
      </svg>
      <div class="copy">
        <span class="kicker">SKWD Wall</span>
        <h1>Wallpaper, lebendig</h1>
        <p>Wird jetzt installiert und geöffnet. Füge danach dein erstes Bild über die Leiste hinzu.</p>
        <button class="toggle" class:on={skwdDefault} onclick={() => (skwdDefault = !skwdDefault)}>
          <span class="t-text">
            <span class="t-title">Als Startseite festlegen</span>
            <span class="t-desc">Orbit öffnet direkt mit SKWD Wall.</span>
          </span>
          <span class="sw" aria-hidden="true"><span class="knob"></span></span>
        </button>
      </div>
      <div class="footer">
        <button class="ghost" onclick={() => (screen = 'choose')}>Zurück</button>
        <button class="go" onclick={finishSkwd} disabled={busy}>{busy ? 'Richte ein…' : 'Einrichten & loslegen'}</button>
      </div>
    </div>

  {:else}
    <!-- explore -->
    <div class="stage top" in:fade={{ duration: 300 }}>
      {#if exploreStep < exploreSlides.length}
        <svg viewBox="0 0 220 180" class="logo sm">
          <g class="spin" style="transform-origin:110px 90px">
            <ellipse cx="110" cy="90" rx="74" ry="46" class="ring" />
            <circle cx="184" cy="90" r="6" class="odot" />
          </g>
          <circle cx="110" cy="90" r="26" fill="url(#orbGrad)" class="core" />
          <text x="110" y="97" text-anchor="middle" class="orb-num">{exploreStep + 1}</text>
        </svg>
        <div class="copy" in:fly={{ y: 14, duration: 360, easing: cubicOut }}>
          <span class="kicker">Orbit · {exploreStep + 1}/{exploreSlides.length}</span>
          <h1>{exploreSlides[exploreStep].title}</h1>
          <p>{exploreSlides[exploreStep].body}</p>
        </div>
        <div class="footer">
          <button class="ghost" onclick={() => (exploreStep > 0 ? (exploreStep -= 1) : (screen = 'choose'))}>Zurück</button>
          <button class="go" onclick={() => (exploreStep += 1)}>Weiter</button>
        </div>
      {:else}
        <div class="copy">
          <span class="kicker">Plugins</span>
          <h1>Was soll rein?</h1>
          <p>Jederzeit im Plugins-Bereich änderbar.</p>
        </div>
        <div class="options">
          {#each bundles as b (b.id)}
            <button class="opt" class:sel={selected === b.id} onclick={() => (selected = b.id)}>
              <div class="opt-head"><span class="opt-name">{b.name}</span>{#if b.recommended}<span class="rec">Empfohlen</span>{/if}</div>
              <span class="opt-desc">{b.description}</span>
            </button>
          {/each}
          <button class="opt" class:sel={selected === CUSTOM} onclick={() => (selected = CUSTOM)}>
            <div class="opt-head"><span class="opt-name">Eigenes</span></div>
            <span class="opt-desc">Plugins einzeln auswählen.</span>
          </button>
          {#if selected === CUSTOM}
            <div class="custom-list">
              {#each pickable as m (m.id)}
                <label class="custom-row">
                  <input type="checkbox" bind:checked={custom[m.id]} />
                  <span class="cr-name">{m.name}</span>
                  <span class="cr-desc">{m.description}</span>
                </label>
              {/each}
            </div>
          {/if}
          <button class="opt" class:sel={selected === NONE} onclick={() => (selected = NONE)}>
            <div class="opt-head"><span class="opt-name">Leer starten</span></div>
            <span class="opt-desc">Nichts installieren – später selbst hinzufügen.</span>
          </button>
        </div>
        <div class="footer">
          <button class="ghost" onclick={() => (exploreStep -= 1)}>Zurück</button>
          <button class="go" onclick={finishExplore} disabled={busy || !canFinishExplore}>{busy ? 'Richte ein…' : "Los geht's"}</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .defs { position: absolute; width: 0; height: 0; }
  .g0 { stop-color: var(--accent, #6aa0ff); }
  .g1 { stop-color: color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0); }

  .onb {
    position: fixed; inset: 0; z-index: 950; overflow: hidden; color: var(--text, #fff);
    background: radial-gradient(130% 80% at 50% -10%, color-mix(in srgb, var(--accent, #6aa0ff) 22%, transparent), transparent 60%), var(--bg, #0e0f13);
    display: flex;
  }
  .aurora { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; pointer-events: none; }
  .a1 { width: 320px; height: 320px; top: -80px; right: -120px; background: radial-gradient(circle, color-mix(in srgb, var(--accent, #6aa0ff) 60%, transparent), transparent 70%); animation: drift1 14s ease-in-out infinite; }
  .a2 { width: 300px; height: 300px; bottom: -100px; left: -120px; background: radial-gradient(circle, color-mix(in srgb, #b06cf0 55%, transparent), transparent 70%); animation: drift2 18s ease-in-out infinite; }
  @keyframes drift1 { 50% { transform: translate(-30px, 40px) scale(1.1); } }
  @keyframes drift2 { 50% { transform: translate(40px, -30px) scale(1.08); } }

  .stage {
    position: relative; z-index: 1; margin: auto; width: min(560px, 100%);
    padding: calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100%; text-align: center; gap: 8px;
  }
  .stage.top { justify-content: flex-start; padding-top: calc(env(safe-area-inset-top) + 40px); }
  .logo { width: min(60vw, 240px); height: auto; overflow: visible; }
  .logo.sm { width: min(46vw, 200px); }

  .copy { max-width: 34rem; }
  .kicker { display: inline-block; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent, #6aa0ff); font-weight: 700; margin-bottom: 8px; }
  .accent { color: var(--accent, #6aa0ff); }
  h1 { margin: 0 0 12px; font-size: clamp(1.5rem, 7vw, 2.1rem); line-height: 1.12; letter-spacing: -0.02em; font-weight: 800; }
  p { margin: 0 auto; max-width: 32rem; color: var(--text-muted, #c7c9d1); line-height: 1.6; font-size: 0.97rem; }

  .choices { display: flex; flex-direction: column; gap: 12px; width: 100%; margin: 22px 0; }
  .choice {
    display: flex; align-items: center; gap: 14px; text-align: left; cursor: pointer;
    background: color-mix(in srgb, var(--text, #fff) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent);
    border-radius: 18px; padding: 16px; transition: border-color 0.18s, background 0.18s, transform 0.1s;
    color: var(--text, #fff);
  }
  .choice:hover { background: color-mix(in srgb, var(--text, #fff) 9%, transparent); }
  .choice:active { transform: scale(0.99); }
  .choice.feat { border-color: color-mix(in srgb, var(--accent, #6aa0ff) 55%, transparent); background: color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent); }
  .c-ico { flex-shrink: 0; width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent, #6aa0ff) 18%, transparent); }
  .c-ico svg { width: 40px; height: 40px; }
  .c-text { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .c-head { font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .c-desc { font-size: 0.85rem; color: var(--text-muted, #c7c9d1); line-height: 1.45; }
  .rec { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--accent, #6aa0ff); background: color-mix(in srgb, var(--accent, #6aa0ff) 20%, transparent); padding: 1px 7px; border-radius: 999px; }

  .mini-phone { fill: color-mix(in srgb, var(--text, #fff) 10%, transparent); stroke: color-mix(in srgb, var(--text, #fff) 28%, transparent); stroke-width: 1.5; }
  .mini-phone.big { fill: color-mix(in srgb, var(--text, #fff) 7%, transparent); stroke: color-mix(in srgb, var(--text, #fff) 20%, transparent); stroke-width: 2; }
  .mini-gloss { fill: color-mix(in srgb, #fff 35%, transparent); }
  .mini-ring { fill: none; stroke: color-mix(in srgb, var(--text, #fff) 26%, transparent); stroke-width: 2; }

  .toggle { display: flex; align-items: center; gap: 14px; width: 100%; max-width: 30rem; margin: 20px auto 0; text-align: left;
    background: color-mix(in srgb, var(--text, #fff) 6%, transparent); border: 1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent);
    border-radius: 16px; padding: 14px 16px; cursor: pointer; transition: border-color 0.18s, background 0.18s; }
  .toggle.on { border-color: color-mix(in srgb, var(--accent, #6aa0ff) 55%, transparent); background: color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent); }
  .t-text { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .t-title { font-weight: 700; font-size: 0.95rem; }
  .t-desc { font-size: 0.8rem; color: var(--text-muted, #c7c9d1); }
  .sw { flex-shrink: 0; width: 46px; height: 28px; border-radius: 999px; background: color-mix(in srgb, var(--text, #fff) 20%, transparent); position: relative; transition: background 0.2s; }
  .toggle.on .sw { background: var(--accent, #6aa0ff); }
  .knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform 0.22s cubic-bezier(.2,.8,.2,1); }
  .toggle.on .knob { transform: translateX(18px); }

  .options { display: flex; flex-direction: column; gap: 8px; width: 100%; margin: 18px 0; text-align: left; }
  .opt { text-align: left; background: color-mix(in srgb, var(--text, #fff) 6%, transparent); border: 1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent); border-radius: 14px; padding: 13px 16px; display: flex; flex-direction: column; gap: 3px; cursor: pointer; color: var(--text, #fff); }
  .opt.sel { border-color: var(--accent, #6aa0ff); background: color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent); }
  .opt-head { display: flex; align-items: center; gap: 8px; }
  .opt-name { font-weight: 700; }
  .opt-desc { color: var(--text-muted, #c7c9d1); font-size: 0.85rem; line-height: 1.4; }
  .custom-list { display: flex; flex-direction: column; gap: 2px; padding: 8px; border: 1px dashed color-mix(in srgb, var(--text, #fff) 16%, transparent); border-radius: 12px; }
  .custom-row { display: grid; grid-template-columns: auto 1fr; align-items: baseline; gap: 2px 10px; padding: 8px; border-radius: 8px; cursor: pointer; }
  .custom-row input { grid-row: 1 / 3; align-self: center; }
  .cr-name { font-weight: 600; }
  .cr-desc { grid-column: 2; font-size: 0.8rem; color: var(--text-muted, #c7c9d1); }

  .footer { display: flex; gap: 10px; width: 100%; max-width: 34rem; margin-top: 18px; }
  .footer.single { justify-content: center; }
  .ghost, .go { height: 52px; border-radius: 15px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.12s, filter 0.2s; }
  .ghost { flex: 0 0 auto; padding: 0 22px; background: color-mix(in srgb, var(--text, #fff) 9%, transparent); border: 1px solid color-mix(in srgb, var(--text, #fff) 14%, transparent); color: var(--text, #fff); }
  .go { flex: 1; border: none; color: #fff; background: linear-gradient(135deg, var(--accent, #6aa0ff), color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0)); box-shadow: 0 10px 30px color-mix(in srgb, var(--accent, #6aa0ff) 40%, transparent); }
  .footer.single .go { flex: 0 0 auto; padding: 0 40px; }
  .go:disabled { opacity: 0.5; }
  .go:active, .ghost:active { transform: scale(0.98); }

  .ring { fill: none; stroke: color-mix(in srgb, var(--text, #fff) 20%, transparent); stroke-width: 1.5; stroke-dasharray: 2 7; stroke-linecap: round; }
  .odot { fill: var(--accent, #6aa0ff); }
  .odot.soft { fill: color-mix(in srgb, var(--text, #fff) 55%, transparent); }
  .core { filter: drop-shadow(0 6px 20px color-mix(in srgb, var(--accent, #6aa0ff) 45%, transparent)); }
  .orb-num { fill: #fff; font-size: 22px; font-weight: 800; }
  .wave { animation: waveshift 3.5s ease-in-out infinite; }
  .spin { animation: spin 20s linear infinite; }
  .spin.rev { animation-direction: reverse; animation-duration: 26s; }
  .float { animation: floaty 5s ease-in-out infinite; transform-origin: center; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes floaty { 50% { transform: translateY(-8px); } }
  @keyframes waveshift { 50% { transform: translateX(-12px) translateY(-3px); } }

  @media (prefers-reduced-motion: reduce) {
    .aurora, .spin, .float, .wave { animation: none !important; }
  }
</style>
