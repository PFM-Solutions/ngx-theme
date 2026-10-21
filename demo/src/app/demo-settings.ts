import type { ThemeConfig } from '@pfm-solutions/ngx-theme';

export type DemoTransition = 'circle' | 'fade' | 'wipe' | 'none';

export interface DemoSettings {
  transition: DemoTransition;
  duration: number;
}

export const TRANSITIONS: readonly DemoTransition[] = ['circle', 'fade', 'wipe', 'none'];
export const DURATIONS: readonly number[] = [250, 600, 1200];

const STORAGE_KEY = 'demo-settings';
const DEFAULT_SETTINGS: DemoSettings = { transition: 'circle', duration: 600 };

export function readSettings(): DemoSettings {
  try {
    const stored: Partial<DemoSettings> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      transition: TRANSITIONS.find((value) => value === stored.transition) ?? DEFAULT_SETTINGS.transition,
      duration: DURATIONS.find((value) => value === stored.duration) ?? DEFAULT_SETTINGS.duration,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function toThemeTransition({ transition, duration }: DemoSettings): ThemeConfig['transition'] {
  return transition === 'none' ? false : { type: transition, duration };
}

/** The transition is fixed when the app is provided, so a change is saved and applied by reloading the page. */
export function saveSettingsAndReload(settings: DemoSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  location.reload();
}
