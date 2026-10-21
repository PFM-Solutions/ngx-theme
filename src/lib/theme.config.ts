import { InjectionToken } from '@angular/core';
import type { ThemeTransition } from './theme.types';

export interface ResolvedThemeConfig {
  storageKey: string;
  transition: Required<ThemeTransition> | false;
}

export const DEFAULT_STORAGE_KEY = 'theme';

export const DEFAULT_TRANSITION: Required<ThemeTransition> = {
  type: 'circle',
  duration: 600,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
};

export const THEME_CONFIG = new InjectionToken<ResolvedThemeConfig>('THEME_CONFIG');
