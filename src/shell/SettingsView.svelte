<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SettingsSchema, SettingDef } from '@core/settings';

  interface Props {
    schema: SettingsSchema;
    /** Optional bespoke rows: map a def.customId to a snippet. */
    custom?: Record<string, Snippet>;
  }
  let { schema, custom }: Props = $props();

  function visible(show?: () => boolean): boolean {
    return show ? !!show() : true;
  }

  // Distinct categories (in order) among visible sections → tab bar.
  let cats = $derived.by(() => {
    const seen: string[] = [];
    for (const s of schema.sections) {
      if (s.category && visible(s.show) && !seen.includes(s.category)) seen.push(s.category);
    }
    return seen;
  });
  let activeCat = $state('');
  $effect(() => {
    if (cats.length && !cats.includes(activeCat)) activeCat = cats[0];
  });
  function sectionVisible(sec: { show?: () => boolean; category?: string }): boolean {
    if (!visible(sec.show)) return false;
    return cats.length === 0 || sec.category === activeCat;
  }
  function str(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  // Settle guard: ignore control activation for a moment after the panel opens,
  // so the tap that OPENED settings can't also flip the control beneath it.
  let armed = $state(false);
  $effect(() => {
    const t = setTimeout(() => (armed = true), 320);
    return () => clearTimeout(t);
  });

  // Custom slider: only a horizontal drag (or a deliberate tap) changes the
  // value. Vertical drags fall through to the list scroll (touch-action: pan-y),
  // so you can't nudge a slider while scrolling the settings.
  let sliding: string | null = null;
  function sliderValue(def: SettingDef): number {
    return (schema.get(def.key!) as number) ?? (def.min ?? 0);
  }
  function sliderPct(def: SettingDef): number {
    const min = def.min ?? 0;
    const max = def.max ?? 100;
    return max === min ? 0 : Math.max(0, Math.min(100, ((sliderValue(def) - min) / (max - min)) * 100));
  }
  function applySlider(def: SettingDef, clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const t = rect.width ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
    const min = def.min ?? 0;
    const max = def.max ?? 100;
    const step = def.step ?? 1;
    let v = min + t * (max - min);
    v = Math.round(v / step) * step;
    v = Math.max(min, Math.min(max, v));
    schema.set(def.key!, v);
  }
  function sliderDown(e: PointerEvent, def: SettingDef) {
    if (!armed) return;
    sliding = def.key!;
    // Do NOT change on down — wait to see if it's a horizontal drag or a tap.
  }
  function sliderMove(e: PointerEvent, def: SettingDef) {
    if (sliding !== def.key) return; // pan-y only delivers horizontal moves here
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    applySlider(def, e.clientX, el);
  }
  function sliderUp(e: PointerEvent, def: SettingDef) {
    if (sliding !== def.key) return;
    sliding = null;
    applySlider(def, e.clientX, e.currentTarget as HTMLElement); // deliberate tap commits
  }
  function sliderCancel(def: SettingDef) {
    if (sliding === def.key) sliding = null; // vertical scroll took over
  }
</script>

<div class="settings">
  {#if cats.length > 1}
    <div class="cat-tabs">
      {#each cats as c (c)}
        <button class="cat-tab" class:on={activeCat === c} onclick={() => (activeCat = c)}>{c}</button>
      {/each}
    </div>
  {/if}
  {#each schema.sections as section (section.title ?? section.defs)}
    {#if sectionVisible(section)}
      {#if section.title}<h3>{section.title}</h3>{/if}
      {#each section.defs as def (def.key ?? def.label ?? def.customId)}
        {#if visible(def.show)}
          {@render row(def)}
        {/if}
      {/each}
    {/if}
  {/each}
</div>

{#snippet row(def: SettingDef)}
  {#if def.type === 'heading'}
    <div class="subhead">{def.label}</div>
  {:else if def.type === 'custom'}
    {#if def.customId && custom?.[def.customId]}{@render custom[def.customId]()}{/if}
  {:else if def.type === 'toggle'}
    <div class="field row">
      <div class="meta"><span class="label">{def.label}</span>{#if def.desc}<span class="desc">{def.desc}</span>{/if}</div>
      <button type="button" class="toggle" class:on={!!schema.get(def.key!)} role="switch"
        aria-checked={!!schema.get(def.key!)} aria-label={def.label}
        onclick={() => armed && schema.set(def.key!, !schema.get(def.key!))}><span class="knob"></span></button>
    </div>
  {:else if def.type === 'slider'}
    <div class="field">
      <span class="label">{def.label}{#if def.desc} · <span class="inline-desc">{def.desc}</span>{/if}
        <span class="val">{schema.get(def.key!)}{def.unit ?? ''}</span></span>
      <div class="slider" role="slider" tabindex="0"
        aria-valuemin={def.min ?? 0} aria-valuemax={def.max ?? 100} aria-valuenow={sliderValue(def)} aria-label={def.label}
        onpointerdown={(e) => sliderDown(e, def)} onpointermove={(e) => sliderMove(e, def)}
        onpointerup={(e) => sliderUp(e, def)} onpointercancel={() => sliderCancel(def)}>
        <div class="slider-track"><div class="slider-fill" style="width:{sliderPct(def)}%"></div></div>
        <div class="slider-thumb" style="left:{sliderPct(def)}%"></div>
      </div>
    </div>
  {:else if def.type === 'segment'}
    <div class="field">
      <span class="label">{def.label}</span>
      <div class="seg wrap">
        {#each def.options ?? [] as o (o.value)}
          <button class:on={schema.get(def.key!) === o.value} onclick={() => armed && schema.set(def.key!, o.value)}>{o.label}</button>
        {/each}
      </div>
    </div>
  {:else if def.type === 'select'}
    <div class="field row">
      <div class="meta"><span class="label">{def.label}</span>{#if def.desc}<span class="desc">{def.desc}</span>{/if}</div>
      <select value={schema.get(def.key!) as string} onchange={(e) => armed && schema.set(def.key!, str(e))}>
        {#each def.options ?? [] as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
      </select>
    </div>
  {:else if def.type === 'text'}
    <div class="field">
      <span class="label">{def.label}</span>
      {#if def.desc}<span class="desc">{def.desc}</span>{/if}
      <input class="text" type="text" placeholder={def.placeholder ?? ''} spellcheck="false"
        value={(schema.get(def.key!) as string) ?? ''} oninput={(e) => schema.set(def.key!, str(e))} />
    </div>
  {:else if def.type === 'color'}
    <div class="field row">
      <span class="label">{def.label}</span>
      <input type="color" value={(schema.get(def.key!) as string) ?? '#000000'}
        oninput={(e) => schema.set(def.key!, str(e))} />
    </div>
  {:else if def.type === 'button'}
    <div class="field row">
      <div class="meta"><span class="label">{def.label}</span>{#if def.desc}<span class="desc">{def.desc}</span>{/if}</div>
      <button class="action" onclick={() => armed && def.onClick?.()}>{def.buttonLabel ?? 'OK'}</button>
    </div>
  {/if}
{/snippet}

<style>
  .settings { display: flex; flex-direction: column; gap: var(--space-4); }
  .cat-tabs {
    position: sticky; top: 0; z-index: 5; display: flex; gap: 6px; flex-wrap: wrap;
    padding-bottom: var(--space-2); margin: calc(-1 * var(--space-2)) 0 0;
    background: linear-gradient(var(--bg-elevated, var(--bg)) 80%, transparent);
  }
  .cat-tab {
    padding: 6px 14px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 999px; color: var(--text-muted); font-size: 0.85rem; white-space: nowrap;
  }
  .cat-tab.on { background: var(--color-primary); color: #fff; border-color: transparent; font-weight: 600; }
  h3 { margin: var(--space-2) 0 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); }
  h3:first-child { margin-top: 0; }
  .subhead { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); margin-top: var(--space-1); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field.row { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .label { font-size: 0.9rem; color: var(--text-muted); }
  .desc, .inline-desc { font-size: 0.78rem; color: var(--text-faint); line-height: 1.4; }
  .val { color: var(--text-faint); font-variant-numeric: tabular-nums; }
  /* Custom slider: pan-y → vertical drags scroll the list; only horizontal
     drags / deliberate taps move the value. Prevents accidental nudges. */
  .slider { position: relative; width: 100%; height: 34px; display: flex; align-items: center; touch-action: pan-y; cursor: pointer; }
  .slider-track { width: 100%; height: 6px; border-radius: 999px; background: var(--bg-elevated); box-shadow: inset 0 0 0 1px var(--border); overflow: hidden; }
  .slider-fill { height: 100%; background: var(--color-primary); border-radius: 999px; }
  .slider-thumb { position: absolute; top: 50%; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); transform: translate(-50%, -50%); pointer-events: none; }
  .seg { display: flex; gap: 4px; flex-wrap: wrap; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 3px; }
  .seg button { flex: 1; padding: var(--space-2) var(--space-3); background: transparent; border: none; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.82rem; white-space: nowrap; }
  .seg button.on { background: var(--color-primary); color: #fff; }
  select, .text { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; }
  select { max-width: 55%; }
  input[type='color'] { width: 44px; height: 34px; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); }
  .action { padding: var(--space-2) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; white-space: nowrap; }
  .toggle { flex: 0 0 auto; width: 46px; height: 28px; padding: 0; border: none; border-radius: 999px; background: var(--bg-elevated); box-shadow: inset 0 0 0 1px var(--border); transition: background 0.18s ease; }
  .toggle.on { background: var(--color-primary); box-shadow: inset 0 0 0 1px transparent; }
  .knob { display: block; width: 22px; height: 22px; margin: 3px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.35); transform: translateX(0); transition: transform 0.18s cubic-bezier(0.4,0,0.2,1); }
  .toggle.on .knob { transform: translateX(18px); }
</style>
