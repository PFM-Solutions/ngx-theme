import { vi } from 'vite-plus/test';
import type { ResolvedTheme } from '../../src';

export interface HtmlThemeState {
  dark: boolean;
  colorScheme: string;
  hasDataTheme: boolean;
}

export interface HtmlTransitionState {
  switching: boolean;
  variant: string | null;
  x: string;
  y: string;
  radius: string;
  duration: string;
  easing: string;
}

type MediaListener = (event: { matches: boolean; media: string }) => void;

/** `matchMedia` double answering `(prefers-color-scheme: dark)`, whose OS preference can be flipped, and `(prefers-reduced-motion: reduce)`. */
export class SystemThemeStub {
  #dark: boolean;
  readonly #reducedMotion: boolean;
  readonly #listeners = new Set<MediaListener>();

  constructor(dark: boolean, reducedMotion = false) {
    this.#dark = dark;
    this.#reducedMotion = reducedMotion;
    vi.stubGlobal('matchMedia', (media: string) => this.#mediaQueryList(media));
  }

  get listenerCount(): number {
    return this.#listeners.size;
  }

  setDark(dark: boolean): void {
    this.#dark = dark;
    this.#listeners.forEach((listener) => listener({ matches: dark, media: '(prefers-color-scheme: dark)' }));
  }

  #mediaQueryList(media: string): MediaQueryList {
    const isDark = (): boolean => this.#dark;
    const reducedMotion = this.#reducedMotion;
    return {
      media,
      get matches() {
        return (
          (media === '(prefers-color-scheme: dark)' && isDark()) ||
          (media === '(prefers-reduced-motion: reduce)' && reducedMotion)
        );
      },
      addListener: (listener: MediaListener) => this.#listeners.add(listener),
      removeListener: (listener: MediaListener) => this.#listeners.delete(listener),
      addEventListener: (_type: string, listener: MediaListener) => this.#listeners.add(listener),
      removeEventListener: (_type: string, listener: MediaListener) => this.#listeners.delete(listener),
    } as unknown as MediaQueryList;
  }
}

/** `document.startViewTransition` double: runs the callback at once and finishes each transition on demand. */
export class ViewTransitionStub {
  /** `<html>` state when `startViewTransition` is called, then once its callback has run. */
  readonly snapshots: { before: HtmlThemeState; after: HtmlThemeState }[] = [];
  readonly #finishers: (() => void)[] = [];

  constructor() {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => void) => {
        const before = TestingThemeHelpers.htmlState();
        update();
        this.snapshots.push({ before, after: TestingThemeHelpers.htmlState() });
        return { finished: new Promise<void>((resolve) => this.#finishers.push(resolve)) };
      },
    });
  }

  /** Finishes the transition started at `index`, the first one by default. */
  async finish(index = 0): Promise<void> {
    this.#finishers[index]?.();
    await Promise.resolve();
  }
}

export class TestingThemeHelpers {
  static htmlState(): HtmlThemeState {
    const root = document.documentElement;
    return {
      dark: root.classList.contains('dark'),
      colorScheme: root.style.colorScheme,
      hasDataTheme: root.hasAttribute('data-theme'),
    };
  }

  static transitionState(): HtmlTransitionState {
    const root = document.documentElement;
    return {
      switching: root.hasAttribute('data-theme-switching'),
      variant: root.getAttribute('data-theme-transition'),
      x: root.style.getPropertyValue('--theme-vt-x'),
      y: root.style.getPropertyValue('--theme-vt-y'),
      radius: root.style.getPropertyValue('--theme-vt-r'),
      duration: root.style.getPropertyValue('--theme-vt-duration'),
      easing: root.style.getPropertyValue('--theme-vt-easing'),
    };
  }

  /** A button laid out at `rect`, so the center of a keyboard activation is known. */
  static button(rect: { x: number; y: number; width: number; height: number }): HTMLButtonElement {
    const button = document.createElement('button');
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect(rect));
    document.body.append(button);
    return button;
  }

  static expectedHtmlState(resolved: ResolvedTheme): HtmlThemeState {
    return { dark: resolved === 'dark', colorScheme: resolved, hasDataTheme: false };
  }

  static storeTheme(key: string, value: string | null): void {
    if (value !== null) {
      localStorage.setItem(key, value);
    }
  }

  /** Makes every `localStorage` access throw, as browsers do when cookies are blocked. */
  static blockStorage(): void {
    const denied = (): never => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
  }

  static reset(): void {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('class');
    root.removeAttribute('style');
    root.removeAttribute('data-theme-switching');
    root.removeAttribute('data-theme-transition');
    Reflect.deleteProperty(document, 'startViewTransition');
    document.body.replaceChildren();
  }
}
