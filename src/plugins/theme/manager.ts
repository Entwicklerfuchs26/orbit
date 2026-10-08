import type { App } from '@core/index';
import { Store } from '@core/index';
import type { ThemeSet, ThemeState } from './types';
import { clonePresets } from './presets';
import { applySet } from './apply';

const PLUGIN_ID = 'theme';

/**
 * Owns the list of theme sets + the active one. Persists to plugin config,
 * applies the active set, and re-applies whenever the resolved light/dark
 * mode flips (so auto/OS switching keeps the generated palette correct).
 */
export class ThemeManager {
  readonly state: Store<ThemeState>;
  private unsubResolved?: () => void;
  /** When set, takes precedence over the saved active set (live editing). */
  private previewSet: ThemeSet | null = null;

  constructor(private app: App) {
    const saved = app.config.get<ThemeState>(PLUGIN_ID, 'state');
    const initial: ThemeState = saved?.sets?.length
      ? saved
      : { sets: clonePresets(), activeSetId: 'sternenhof' };
    this.state = new Store(initial);
  }

  start(): void {
    this.applyActive();
    // Regenerate the palette when light/dark actually changes.
    this.unsubResolved = this.app.theme.resolved.subscribe(() => this.applyActive());
  }

  stop(): void {
    this.unsubResolved?.();
  }

  private persist(): void {
    this.app.config.set(PLUGIN_ID, 'state', this.state.get());
  }

  getActive(): ThemeSet | undefined {
    const s = this.state.get();
    return s.sets.find((x) => x.id === s.activeSetId) ?? s.sets[0];
  }

  applyActive(): void {
    const active = this.previewSet ?? this.getActive();
    if (active) applySet(this.app, active, this.app.theme.resolvedMode());
  }

  selectSet(id: string): void {
    this.previewSet = null;
    this.state.update((s) => ({ ...s, activeSetId: id }));
    this.persist();
    this.applyActive();
  }

  /** Live-apply an in-progress edit without persisting. */
  preview(set: ThemeSet): void {
    this.previewSet = set;
    applySet(this.app, set, this.app.theme.resolvedMode());
  }

  clearPreview(): void {
    this.previewSet = null;
  }

  upsertSet(set: ThemeSet): void {
    this.previewSet = null;
    this.state.update((s) => {
      const idx = s.sets.findIndex((x) => x.id === set.id);
      const sets = [...s.sets];
      if (idx >= 0) sets[idx] = set;
      else sets.push(set);
      return { ...s, sets, activeSetId: set.id };
    });
    this.persist();
    this.applyActive();
  }

  duplicateSet(id: string): ThemeSet | undefined {
    const src = this.state.get().sets.find((x) => x.id === id);
    if (!src) return undefined;
    const copy: ThemeSet = {
      ...src,
      id: `set-${id}-${this.state.get().sets.length}`,
      name: `${src.name} (Kopie)`,
      builtin: false,
    };
    this.upsertSet(copy);
    return copy;
  }

  deleteSet(id: string): void {
    this.previewSet = null;
    this.state.update((s) => {
      const target = s.sets.find((x) => x.id === id);
      if (!target || target.builtin) return s;
      const sets = s.sets.filter((x) => x.id !== id);
      const activeSetId = s.activeSetId === id ? (sets[0]?.id ?? null) : s.activeSetId;
      return { ...s, sets, activeSetId };
    });
    this.persist();
    this.applyActive();
  }

  newSet(): ThemeSet {
    const n = this.state.get().sets.length;
    return {
      id: `set-custom-${n}`,
      name: 'Neues Set',
      accent: '#ff6b35',
      mode: 'dark',
      font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      radius: 10,
      density: 'comfortable',
      animations: 'on',
      wallpaperDim: 0.35,
      builtin: false,
    };
  }
}
