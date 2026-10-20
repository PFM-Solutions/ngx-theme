import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { THEME_CONFIG } from './theme.config';
import type { ResolvedTheme, Theme } from './theme.types';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
/** Set on `<html>` for the whole switch: the stylesheet cuts CSS transitions under it, so components do not fade one by one. */
const SWITCHING_ATTRIBUTE = 'data-theme-switching';
/** Set on `<html>` during an animated switch: selects the `::view-transition-*` rules of the variant. */
const TRANSITION_ATTRIBUTE = 'data-theme-transition';

interface Point {
  x: number;
  y: number;
}

function parseTheme(value: string | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Light / dark / system theme state, persisted in `localStorage` and applied to `<html>`. Provided by `provideTheme()`. */
export class ThemeService {
  readonly #config = inject(THEME_CONFIG);
  readonly #storageKey = this.#config.storageKey;
  readonly #document = inject(DOCUMENT);
  readonly #root = this.#document.documentElement;
  readonly #window = this.#document.defaultView;
  readonly #darkQuery = this.#window?.matchMedia(DARK_QUERY);
  readonly #systemDark = signal(this.#darkQuery?.matches ?? false);
  readonly #theme = signal<Theme>(this.#read());
  #viewTransition: ViewTransition | null = null;

  /** Theme chosen by the user. */
  readonly theme = this.#theme.asReadonly();

  /** Theme applied to the page, `system` resolved against the OS preference. */
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const theme = this.#theme();
    if (theme !== 'system') {
      return theme;
    }
    return this.#systemDark() ? 'dark' : 'light';
  });

  constructor() {
    effect(() => {
      const resolved = this.resolvedTheme();
      // Already applied by the init script or by an animated switch.
      if (this.#root.style.colorScheme === resolved) {
        return;
      }
      this.#root.setAttribute(SWITCHING_ATTRIBUTE, '');
      this.#apply(resolved);
      // Forces a style recalculation while transitions are cut, so none starts once the attribute is gone.
      void this.#root.offsetWidth;
      this.#root.removeAttribute(SWITCHING_ATTRIBUTE);
    });

    const onStorage = (event: StorageEvent): void => {
      // A `null` key means the whole storage was cleared.
      if (event.key === this.#storageKey || event.key === null) {
        this.#theme.set(parseTheme(event.newValue));
      }
    };
    const onSystemChange = (event: MediaQueryListEvent): void => this.#systemDark.set(event.matches);
    this.#window?.addEventListener('storage', onStorage);
    this.#darkQuery?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => {
      this.#window?.removeEventListener('storage', onStorage);
      this.#darkQuery?.removeEventListener('change', onSystemChange);
    });
  }

  /**
   * Applies and persists `theme`. With an `origin` (the triggering event or viewport coordinates), the switch is
   * animated by the configured transition; it is instant when the browser lacks View Transitions or the user prefers
   * reduced motion.
   */
  setTheme(theme: Theme, origin?: MouseEvent | KeyboardEvent | Point): void {
    try {
      this.#window?.localStorage.setItem(this.#storageKey, theme);
    } catch {
      // Storage is unavailable (e.g. blocked cookies): the choice only lasts for this page.
    }

    const transition = this.#config.transition;
    const point = origin && this.#toPoint(origin);
    if (
      !transition ||
      !point ||
      !this.#window ||
      !('startViewTransition' in this.#document) ||
      this.#window.matchMedia(REDUCED_MOTION_QUERY).matches
    ) {
      this.#theme.set(theme);
      return;
    }

    const radius = Math.hypot(
      Math.max(point.x, this.#window.innerWidth - point.x),
      Math.max(point.y, this.#window.innerHeight - point.y),
    );
    const style = this.#root.style;
    style.setProperty('--theme-vt-x', `${point.x}px`);
    style.setProperty('--theme-vt-y', `${point.y}px`);
    style.setProperty('--theme-vt-r', `${radius}px`);
    style.setProperty('--theme-vt-duration', `${transition.duration}ms`);
    style.setProperty('--theme-vt-easing', transition.easing);
    this.#root.setAttribute(TRANSITION_ATTRIBUTE, transition.type);
    this.#root.setAttribute(SWITCHING_ATTRIBUTE, '');

    // The "after" snapshot is taken when the callback returns, so the DOM must already show the new theme.
    const viewTransition = this.#document.startViewTransition(() => {
      this.#theme.set(theme);
      this.#apply(this.resolvedTheme());
    });
    this.#viewTransition = viewTransition;
    void viewTransition.finished.finally(() => {
      // Starting a switch skips the one still playing: its end must not strip the attributes the new one relies on.
      if (this.#viewTransition !== viewTransition) {
        return;
      }
      this.#viewTransition = null;
      this.#root.removeAttribute(TRANSITION_ATTRIBUTE);
      this.#root.removeAttribute(SWITCHING_ATTRIBUTE);
    });
  }

  #apply(resolved: ResolvedTheme): void {
    this.#root.classList.toggle('dark', resolved === 'dark');
    this.#root.style.colorScheme = resolved;
  }

  /** Pointer position, or the center of the activated element for a keyboard activation (`detail === 0`). */
  #toPoint(origin: MouseEvent | KeyboardEvent | Point): Point | null {
    if (!(origin instanceof Event)) {
      return origin;
    }
    if (origin.detail !== 0 && origin instanceof MouseEvent) {
      return { x: origin.clientX, y: origin.clientY };
    }
    const element = origin.currentTarget ?? origin.target;
    if (!(element instanceof Element)) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  #read(): Theme {
    try {
      return parseTheme(this.#window?.localStorage.getItem(this.#storageKey) ?? null);
    } catch {
      return 'system';
    }
  }
}
