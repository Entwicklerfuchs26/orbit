// Declarative settings model — Orbit's standard for ALL plugin settings.
// Inspired by Obsidian's Setting API + VS Code's schema: a plugin describes its
// settings as data; the shared <SettingsView> renders them uniformly (name +
// description on the left, control on the right) and handles persistence.
//
// The 80% case (toggle/slider/select/segment/text/color) is fully declarative.
// For bespoke UI (e.g. a schedule-rule editor) use type 'custom' and render a
// Svelte snippet.

export type SettingType =
  | 'heading'
  | 'toggle'
  | 'slider'
  | 'select'
  | 'segment'
  | 'text'
  | 'color'
  | 'button'
  | 'custom';

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDef {
  /** State key this control reads/writes (not needed for heading/button/custom). */
  key?: string;
  type: SettingType;
  label?: string;
  desc?: string;
  // slider
  min?: number;
  max?: number;
  step?: number;
  /** Suffix shown next to a slider value, e.g. "%", "px", "s". */
  unit?: string;
  // select / segment
  options?: SettingOption[];
  // text
  placeholder?: string;
  // button
  onClick?: () => void;
  buttonLabel?: string;
  // custom: a key the renderer maps to a caller-provided snippet
  customId?: string;
  /** Only show this row when this returns true (reactive — call in render). */
  show?: () => boolean;
}

export interface SettingSection {
  title?: string;
  defs: SettingDef[];
  /** Optional category — sections with the same category share a tab. When any
   *  section has a category, <SettingsView> renders a tab bar and shows one
   *  category at a time (keeps long settings from being one endless scroll). */
  category?: string;
  /** Only show this whole section when true. */
  show?: () => boolean;
}

/** What a plugin hands to <SettingsView>. */
export interface SettingsSchema {
  sections: SettingSection[];
  /** Read a value by key. */
  get: (key: string) => unknown;
  /** Write a value by key. */
  set: (key: string, value: unknown) => void;
}
