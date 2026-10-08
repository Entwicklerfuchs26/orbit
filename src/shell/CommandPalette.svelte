<script lang="ts">
  import type { SojusApp } from '@core/app';
  import type { Command } from '@core/types';

  interface Props {
    app: SojusApp;
    open: boolean;
    onClose: () => void;
  }
  let { app, open, onClose }: Props = $props();

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state<HTMLInputElement>();

  let results = $derived(app.commands.search(query).slice(0, 50));

  $effect(() => {
    if (open) {
      query = '';
      selected = 0;
      queueMicrotask(() => inputEl?.focus());
    }
  });

  $effect(() => {
    // keep selection in bounds as results change
    if (selected >= results.length) selected = Math.max(0, results.length - 1);
  });

  function run(cmd: Command) {
    onClose();
    cmd.callback();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(selected + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selected]) run(results[selected]);
    }
  }
</script>

{#if open}
  <div
    class="overlay"
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="presentation"
  >
    <div class="palette" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={onKeydown}
        placeholder="Befehl suchen…"
        spellcheck="false"
      />
      <div class="results">
        {#each results as cmd, i (cmd.id)}
          <button
            class="result"
            class:selected={i === selected}
            onclick={() => run(cmd)}
            onmouseenter={() => (selected = i)}
          >
            <span class="name">{cmd.name}</span>
            {#if cmd.shortcut}<kbd>{cmd.shortcut}</kbd>{/if}
          </button>
        {:else}
          <p class="empty">Keine Befehle gefunden.</p>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    z-index: 1000;
  }
  .palette {
    width: min(560px, 92vw);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  input {
    width: 100%;
    padding: var(--space-4) var(--space-5);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: 1.05rem;
    outline: none;
  }
  .results {
    max-height: 50vh;
    overflow-y: auto;
    padding: var(--space-2);
  }
  .result {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-3) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 0.95rem;
    text-align: left;
  }
  .result.selected {
    background: var(--accent);
    color: var(--accent-text);
  }
  .result .name {
    flex: 1;
  }
  .result kbd {
    font-size: 0.75rem;
    background: var(--bg-active);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
  }
  .result.selected kbd {
    background: rgba(255, 255, 255, 0.2);
    color: var(--accent-text);
  }
  .empty {
    padding: var(--space-4);
    color: var(--text-faint);
    text-align: center;
  }
</style>
