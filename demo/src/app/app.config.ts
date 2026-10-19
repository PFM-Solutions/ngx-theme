import type { ApplicationConfig } from '@angular/core';
import { provideTheme } from '@pfm-solutions/ngx-theme';
import { readSettings, toThemeTransition } from './demo-settings';

export const appConfig: ApplicationConfig = {
  providers: [provideTheme({ transition: toThemeTransition(readSettings()) })],
};
