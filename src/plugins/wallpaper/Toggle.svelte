<script lang="ts">
  interface Props {
    checked: boolean;
    onchange: (v: boolean) => void;
    label?: string;
  }
  let { checked, onchange, label }: Props = $props();
</script>

<button
  type="button"
  class="toggle"
  class:on={checked}
  role="switch"
  aria-checked={checked}
  aria-label={label}
  onclick={() => onchange(!checked)}
>
  <span class="knob"></span>
</button>

<style>
  .toggle {
    flex: 0 0 auto;
    width: 46px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--bg-elevated);
    box-shadow: inset 0 0 0 1px var(--border);
    cursor: pointer;
    transition: background 0.18s ease, box-shadow 0.18s ease;
  }
  .toggle.on {
    background: var(--color-primary);
    box-shadow: inset 0 0 0 1px transparent;
  }
  .knob {
    display: block;
    width: 22px;
    height: 22px;
    margin: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    transform: translateX(0);
    transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .toggle.on .knob { transform: translateX(18px); }
</style>
