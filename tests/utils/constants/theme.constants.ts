import type { ResolvedTheme, Theme, ThemeConfig, ThemeTransition } from '../../../src';
import type { HtmlTransitionState } from '../theme-testing.helpers';

export interface ThemeContractCase {
  name: string;
  stored: string | null;
  systemDark: boolean;
  expectedTheme: Theme;
  expectedResolved: ResolvedTheme;
}

export interface InstantSwitchCase {
  name: string;
  config: ThemeConfig;
  withOrigin: boolean;
  viewTransitions: boolean;
  reducedMotion: boolean;
}

export interface TransitionConfigCase {
  name: string;
  transition: ThemeTransition;
  expected: Pick<HtmlTransitionState, 'variant' | 'duration' | 'easing'>;
}

export class TestThemeConstants {
  static readonly DEFAULT_STORAGE_KEY = 'theme';
  static readonly CUSTOM_STORAGE_KEY = 'app-theme';
  static readonly UNRELATED_STORAGE_KEY = 'locale';

  /** Cases of the contract shared by `ThemeService` and the init script: stored value + OS preference → `<html>` state. */
  static readonly CONTRACT_CASES: readonly ThemeContractCase[] = [
    {
      name: 'stored light on a dark OS',
      stored: 'light',
      systemDark: true,
      expectedTheme: 'light',
      expectedResolved: 'light',
    },
    {
      name: 'stored dark on a light OS',
      stored: 'dark',
      systemDark: false,
      expectedTheme: 'dark',
      expectedResolved: 'dark',
    },
    {
      name: 'stored system on a light OS',
      stored: 'system',
      systemDark: false,
      expectedTheme: 'system',
      expectedResolved: 'light',
    },
    {
      name: 'stored system on a dark OS',
      stored: 'system',
      systemDark: true,
      expectedTheme: 'system',
      expectedResolved: 'dark',
    },
    {
      name: 'absent on a light OS',
      stored: null,
      systemDark: false,
      expectedTheme: 'system',
      expectedResolved: 'light',
    },
    { name: 'absent on a dark OS', stored: null, systemDark: true, expectedTheme: 'system', expectedResolved: 'dark' },
    {
      name: 'invalid on a light OS',
      stored: 'blue',
      systemDark: false,
      expectedTheme: 'system',
      expectedResolved: 'light',
    },
    {
      name: 'invalid on a dark OS',
      stored: 'blue',
      systemDark: true,
      expectedTheme: 'system',
      expectedResolved: 'dark',
    },
  ];

  /** Viewport of jsdom. */
  static readonly VIEWPORT = { width: 1024, height: 768 };

  static readonly POINTER = { x: 100, y: 200 };

  static readonly BUTTON_RECT = { x: 300, y: 400, width: 40, height: 20 };

  /** Center of `BUTTON_RECT`, whose farthest viewport corner is the top-right one. */
  static readonly BUTTON_CENTER_STATE: Pick<HtmlTransitionState, 'x' | 'y' | 'radius'> = {
    x: '320px',
    y: '410px',
    radius: `${Math.hypot(TestThemeConstants.VIEWPORT.width - 320, 410)}px`,
  };

  static readonly DEFAULT_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /** `<html>` transition state of a default-config switch from `POINTER`, while it plays. */
  static readonly POINTER_TRANSITION_STATE: HtmlTransitionState = {
    switching: true,
    variant: 'circle',
    x: '100px',
    y: '200px',
    radius: `${Math.hypot(TestThemeConstants.VIEWPORT.width - 100, TestThemeConstants.VIEWPORT.height - 200)}px`,
    duration: '600ms',
    easing: TestThemeConstants.DEFAULT_EASING,
  };

  static readonly INSTANT_SWITCH_CASES: readonly InstantSwitchCase[] = [
    { name: 'without origin', config: {}, withOrigin: false, viewTransitions: true, reducedMotion: false },
    {
      name: 'without View Transitions',
      config: {},
      withOrigin: true,
      viewTransitions: false,
      reducedMotion: false,
    },
    { name: 'with reduced motion', config: {}, withOrigin: true, viewTransitions: true, reducedMotion: true },
    {
      name: 'with transition disabled',
      config: { transition: false },
      withOrigin: true,
      viewTransitions: true,
      reducedMotion: false,
    },
  ];

  static readonly TRANSITION_CONFIG_CASES: readonly TransitionConfigCase[] = [
    {
      name: 'a fully configured wipe',
      transition: { type: 'wipe', duration: 300, easing: 'linear' },
      expected: { variant: 'wipe', duration: '300ms', easing: 'linear' },
    },
    {
      name: 'a fade with default timing',
      transition: { type: 'fade' },
      expected: { variant: 'fade', duration: '600ms', easing: TestThemeConstants.DEFAULT_EASING },
    },
    {
      name: 'a wipe with timing explicitly undefined',
      transition: { type: 'wipe', duration: undefined, easing: undefined },
      expected: { variant: 'wipe', duration: '600ms', easing: TestThemeConstants.DEFAULT_EASING },
    },
  ];
}
