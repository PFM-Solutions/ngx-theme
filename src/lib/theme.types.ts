/** Theme chosen by the user. `system` follows the OS `prefers-color-scheme`. */
export type Theme = 'light' | 'dark' | 'system';

/** Theme actually applied to the page. */
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeTransition {
  type: 'circle' | 'fade' | 'wipe';
  /** Duration in milliseconds. */
  duration?: number;
  /** CSS easing function. */
  easing?: string;
}

export interface ThemeConfig {
  /** `localStorage` key holding the chosen theme. Defaults to `theme`. */
  storageKey?: string;
  /** Animation played when the user picks a theme, or `false` to switch instantly. */
  transition?: ThemeTransition | false;
}
