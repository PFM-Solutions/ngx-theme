import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { DEFAULT_STORAGE_KEY, DEFAULT_TRANSITION, type ResolvedThemeConfig, THEME_CONFIG } from './theme.config';
import { ThemeService } from './theme.service';
import type { ThemeConfig } from './theme.types';

/** Registers `ThemeService` and starts it at bootstrap, so OS and cross-tab changes apply even before it is injected. */
export function provideTheme(config: ThemeConfig = {}): EnvironmentProviders {
  // Defaults also replace fields explicitly set to `undefined`, which a spread would keep.
  const {
    type = DEFAULT_TRANSITION.type,
    duration = DEFAULT_TRANSITION.duration,
    easing = DEFAULT_TRANSITION.easing,
  } = config.transition || {};
  const resolved: ResolvedThemeConfig = {
    storageKey: config.storageKey ?? DEFAULT_STORAGE_KEY,
    transition: config.transition === false ? false : { type, duration, easing },
  };
  return makeEnvironmentProviders([
    { provide: THEME_CONFIG, useValue: resolved },
    { provide: ThemeService, useFactory: () => new ThemeService() },
    provideEnvironmentInitializer(() => inject(ThemeService)),
  ]);
}
