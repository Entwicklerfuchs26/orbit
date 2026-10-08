import type { MapStore } from '@core/store';

/** Minimal readable store shape (core Store and ThemeApi stores both satisfy it). */
interface Readable<T> {
  get(): T;
  subscribe(fn: (v: T) => void): () => void;
}

/**
 * Bridges a readable store into a Svelte 5 rune. Returns an object with a
 * reactive `.value` getter that components can read in templates.
 */
export function useStore<T>(store: Readable<T>): { readonly value: T } {
  let state = $state(store.get());
  $effect(() => {
    const unsub = store.subscribe((v) => {
      state = v;
    });
    return unsub;
  });
  return {
    get value() {
      return state;
    },
  };
}

export function useMapStore<K, V>(store: MapStore<K, V>): { readonly values: V[] } {
  let state = $state<V[]>(store.values());
  $effect(() => {
    const unsub = store.subscribe((m) => {
      state = [...m.values()];
    });
    return unsub;
  });
  return {
    get values() {
      return state;
    },
  };
}
