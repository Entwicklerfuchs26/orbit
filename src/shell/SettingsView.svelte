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
  function num(e: Event): number {
    return Number((e.target as HTMLInputElement).value);
  }
  function str(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
</script>

<div class="settings">
  {#each schema.sections as section (section.title ?? section.defs)}
    {#if visible(section.show)}
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
        onclick={() => schema.set(def.key!, !schema.get(def.key!))}><span class="knob"></span></button>
    </div>
  {:else if def.type === 'slider'}
    <div class="field">
      <span class="label">{def.label}{#if def.desc} · <span class="inline-desc">{def.desc}</span>{/if}
        <span class="val">{schema.get(def.key!)}{def.unit ?? ''}</span></span>
      <input type="range" min={def.min ?? 0} max={def.max ?? 100} step={def.step ?? 1}
        value={schema.get(def.key!) as number} oninput={(e) => schema.set(def.key!, num(e))} />
    </div>
  {:else if def.type === 'segment'}
    <div class="field">
      <span class="label">{def.label}</span>
      <div class="seg wrap">
        {#each def.options ?? [] as o (o.value)}
          <button class:on={schema.get(def.key!) === o.value} onclick={() => schema.set(def.key!, o.value)}>{o.label}</button>
        {/each}
      </div>
    </div>
  {:else if def.type === 'select'}
    <div class="field row">
      <div class="meta"><span class="label">{def.label}</span>{#if def.desc}<span class="desc">{def.desc}</span>{/if}</div>
      <select value={schema.get(def.key!) as string} onchange={(e) => schema.set(def.key!, str(e))}>
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
      <button class="action" onclick={def.onClick}>{def.buttonLabel ?? 'OK'}</button>
    </div>
  {/if}
{/snippet}

<style>
  .settings { display: flex; flex-direction: column; gap: var(--space-4); }
  h3 { margin: var(--space-2) 0 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); }
  h3:first-child { margin-top: 0; }
  .subhead { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); margin-top: var(--space-1); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field.row { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .label { font-size: 0.9rem; color: var(--text-muted); }
  .desc, .inline-desc { font-size: 0.78rem; color: var(--text-faint); line-height: 1.4; }
  .val { color: var(--text-faint); font-variant-numeric: tabular-nums; }
  input[type='range'] { width: 100%; accent-color: var(--color-primary); }
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
