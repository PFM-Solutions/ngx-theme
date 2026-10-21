import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { provideTheme, type ThemeConfig, ThemeService } from '../src';
import { TestThemeConstants } from './utils/constants/theme.constants';
import { SystemThemeStub, TestingThemeHelpers, ViewTransitionStub } from './utils/theme-testing.helpers';

const { DEFAULT_STORAGE_KEY, CUSTOM_STORAGE_KEY, UNRELATED_STORAGE_KEY, POINTER } = TestThemeConstants;

function setUp(config?: ThemeConfig): ThemeService {
  TestBed.configureTestingModule({ providers: [provideTheme(config)] });
  const service = TestBed.inject(ThemeService);
  TestBed.tick();
  return service;
}

function dispatchStorageEvent(key: string | null, newValue: string | null): void {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  TestBed.tick();
}

describe('ThemeService', () => {
  afterEach(() => {
    TestingThemeHelpers.reset();
  });

  describe('initial read', () => {
    it.each(TestThemeConstants.CONTRACT_CASES)('should apply the contract when $name', (contractCase) => {
      // Arrange
      new SystemThemeStub(contractCase.systemDark);
      TestingThemeHelpers.storeTheme(DEFAULT_STORAGE_KEY, contractCase.stored);

      // Act
      const service = setUp();

      // Assert
      expect(service.theme()).toBe(contractCase.expectedTheme);
      expect(service.resolvedTheme()).toBe(contractCase.expectedResolved);
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(
        TestingThemeHelpers.expectedHtmlState(contractCase.expectedResolved),
      );
    });

    it('should read the custom storage key', () => {
      // Arrange
      new SystemThemeStub(false);
      localStorage.setItem(DEFAULT_STORAGE_KEY, 'light');
      localStorage.setItem(CUSTOM_STORAGE_KEY, 'dark');

      // Act
      const service = setUp({ storageKey: CUSTOM_STORAGE_KEY });

      // Assert
      expect(service.theme()).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });

    it('should fall back to the system theme when storage throws', () => {
      // Arrange
      new SystemThemeStub(true);
      TestingThemeHelpers.blockStorage();

      // Act
      const service = setUp();

      // Assert
      expect(service.theme()).toBe('system');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });

    it('should apply the theme at bootstrap without the service being injected', () => {
      // Arrange
      new SystemThemeStub(false);
      localStorage.setItem(DEFAULT_STORAGE_KEY, 'dark');
      TestBed.configureTestingModule({ providers: [provideTheme()] });

      // Act
      TestBed.tick();

      // Assert
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });
  });

  describe('setTheme', () => {
    it('should persist the theme and apply it to <html>', () => {
      // Arrange
      new SystemThemeStub(false);
      const service = setUp();

      // Act
      service.setTheme('dark');
      TestBed.tick();

      // Assert
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('dark');
      expect(service.theme()).toBe('dark');
      expect(service.resolvedTheme()).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });

    it('should persist system and resolve it against the OS', () => {
      // Arrange
      new SystemThemeStub(true);
      localStorage.setItem(DEFAULT_STORAGE_KEY, 'light');
      const service = setUp();

      // Act
      service.setTheme('system');
      TestBed.tick();

      // Assert
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });

    it('should write under the custom storage key', () => {
      // Arrange
      new SystemThemeStub(false);
      const service = setUp({ storageKey: CUSTOM_STORAGE_KEY });

      // Act
      service.setTheme('dark');

      // Assert
      expect(localStorage.getItem(CUSTOM_STORAGE_KEY)).toBe('dark');
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
    });

    it('should still apply the theme when storage throws', () => {
      // Arrange
      new SystemThemeStub(false);
      TestingThemeHelpers.blockStorage();
      const service = setUp();

      // Act
      service.setTheme('dark');
      TestBed.tick();

      // Assert
      expect(service.theme()).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });
  });

  describe('system mode', () => {
    it('should follow an OS preference change', () => {
      // Arrange
      const system = new SystemThemeStub(false);
      const service = setUp();

      // Act
      system.setDark(true);
      TestBed.tick();

      // Assert
      expect(service.resolvedTheme()).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });

    it('should ignore an OS preference change when a theme is chosen', () => {
      // Arrange
      const system = new SystemThemeStub(false);
      localStorage.setItem(DEFAULT_STORAGE_KEY, 'light');
      const service = setUp();

      // Act
      system.setDark(true);
      TestBed.tick();

      // Assert
      expect(service.resolvedTheme()).toBe('light');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('light'));
    });

    it('should stop listening to the OS preference once destroyed', () => {
      // Arrange
      const system = new SystemThemeStub(false);
      setUp();

      // Act
      TestBed.resetTestingModule();

      // Assert
      expect(system.listenerCount).toBe(0);
    });
  });

  describe('cross-tab sync', () => {
    it('should apply a theme changed in another tab without writing it back', () => {
      // Arrange
      new SystemThemeStub(false);
      const service = setUp();

      // Act
      dispatchStorageEvent(DEFAULT_STORAGE_KEY, 'dark');

      // Assert
      expect(service.theme()).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
    });

    it('should listen to the custom storage key', () => {
      // Arrange
      new SystemThemeStub(false);
      const service = setUp({ storageKey: CUSTOM_STORAGE_KEY });

      // Act
      dispatchStorageEvent(CUSTOM_STORAGE_KEY, 'dark');

      // Assert
      expect(service.theme()).toBe('dark');
    });

    it('should ignore another key', () => {
      // Arrange
      new SystemThemeStub(false);
      localStorage.setItem(DEFAULT_STORAGE_KEY, 'light');
      const service = setUp();

      // Act
      dispatchStorageEvent(UNRELATED_STORAGE_KEY, 'dark');

      // Assert
      expect(service.theme()).toBe('light');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('light'));
    });

    it('should fall back to system when another tab clears the storage', () => {
      // Arrange
      new SystemThemeStub(true);
      localStorage.setItem(DEFAULT_STORAGE_KEY, 'light');
      const service = setUp();

      // Act
      dispatchStorageEvent(null, null);

      // Assert
      expect(service.theme()).toBe('system');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });
  });

  describe('transitions', () => {
    it.each(TestThemeConstants.INSTANT_SWITCH_CASES)('should switch instantly $name', (switchCase) => {
      // Arrange
      new SystemThemeStub(false, switchCase.reducedMotion);
      const viewTransition = switchCase.viewTransitions ? new ViewTransitionStub() : null;
      const service = setUp(switchCase.config);

      // Act
      service.setTheme('dark', switchCase.withOrigin ? POINTER : undefined);
      TestBed.tick();

      // Assert
      expect(viewTransition?.snapshots ?? []).toHaveLength(0);
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('dark');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
      expect(TestingThemeHelpers.transitionState()).toMatchObject({ switching: false, variant: null });
    });

    it('should cut CSS transitions while switching instantly', () => {
      // Arrange
      new SystemThemeStub(false);
      const service = setUp();
      const observer = new MutationObserver(() => {});
      observer.observe(document.documentElement, { attributes: true, attributeOldValue: true });

      // Act
      service.setTheme('dark');
      TestBed.tick();

      // Assert
      const changes = observer.takeRecords().map((record) => record.attributeName);
      observer.disconnect();
      expect(changes).toStrictEqual(['data-theme-switching', 'class', 'style', 'data-theme-switching']);
      expect(TestingThemeHelpers.transitionState().switching).toBe(false);
    });

    it('should switch inside a view transition, with the DOM updated by its callback', async () => {
      // Arrange
      new SystemThemeStub(false);
      const viewTransition = new ViewTransitionStub();
      const service = setUp();

      // Act
      service.setTheme('dark', POINTER);
      await viewTransition.runCallbacks();

      // Assert
      expect(viewTransition.snapshots).toStrictEqual([
        {
          before: TestingThemeHelpers.expectedHtmlState('light'),
          after: TestingThemeHelpers.expectedHtmlState('dark'),
        },
      ]);
      expect(service.theme()).toBe('dark');
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('dark');
      expect(TestingThemeHelpers.transitionState()).toStrictEqual(TestThemeConstants.POINTER_TRANSITION_STATE);
    });

    it('should remove the transition attributes once the view transition finishes', async () => {
      // Arrange
      new SystemThemeStub(false);
      const viewTransition = new ViewTransitionStub();
      const service = setUp();
      service.setTheme('dark', POINTER);
      TestBed.tick();

      // Act
      await viewTransition.finish();

      // Assert
      expect(TestingThemeHelpers.transitionState()).toMatchObject({ switching: false, variant: null });
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
    });

    it('should keep the attributes of a switch started while another was playing', async () => {
      // Arrange
      new SystemThemeStub(false);
      const viewTransition = new ViewTransitionStub();
      const service = setUp();
      service.setTheme('dark', POINTER);
      service.setTheme('light', POINTER);

      // Act
      await viewTransition.finish(0);

      // Assert
      expect(TestingThemeHelpers.transitionState()).toStrictEqual(TestThemeConstants.POINTER_TRANSITION_STATE);
    });

    it('should not let a pending animated switch override a later instant one', async () => {
      // Arrange
      new SystemThemeStub(false);
      const viewTransition = new ViewTransitionStub();
      const service = setUp();
      service.setTheme('dark', POINTER);

      // Act
      service.setTheme('light');
      TestBed.tick();
      await viewTransition.runCallbacks();
      TestBed.tick();

      // Assert
      expect(service.theme()).toBe('light');
      expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('light');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('light'));
      expect(TestingThemeHelpers.transitionState()).toMatchObject({ switching: false, variant: null });
    });

    it('should not let a pending animated switch override a change from another tab', async () => {
      // Arrange
      new SystemThemeStub(false);
      const viewTransition = new ViewTransitionStub();
      const service = setUp();
      service.setTheme('dark', POINTER);

      // Act
      dispatchStorageEvent(DEFAULT_STORAGE_KEY, 'light');
      await viewTransition.runCallbacks();
      TestBed.tick();

      // Assert
      expect(service.theme()).toBe('light');
      expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('light'));
      expect(TestingThemeHelpers.transitionState()).toMatchObject({ switching: false, variant: null });
    });

    it('should start from the pointer of a click', () => {
      // Arrange
      new SystemThemeStub(false);
      new ViewTransitionStub();
      const service = setUp();
      const click = new MouseEvent('click', { detail: 1, clientX: POINTER.x, clientY: POINTER.y });

      // Act
      service.setTheme('dark', click);

      // Assert
      expect(TestingThemeHelpers.transitionState()).toStrictEqual(TestThemeConstants.POINTER_TRANSITION_STATE);
    });

    it.each([
      { name: 'a keyboard click', event: new MouseEvent('click', { detail: 0 }) },
      { name: 'a key press', event: new KeyboardEvent('keydown', { key: 'Enter' }) },
    ])('should start from the center of the element for $name', ({ event }) => {
      // Arrange
      new SystemThemeStub(false);
      new ViewTransitionStub();
      const service = setUp();
      const button = TestingThemeHelpers.button(TestThemeConstants.BUTTON_RECT);
      button.addEventListener(event.type, (activation) => service.setTheme('dark', activation as MouseEvent));

      // Act
      button.dispatchEvent(event);

      // Assert
      expect(TestingThemeHelpers.transitionState()).toMatchObject(TestThemeConstants.BUTTON_CENTER_STATE);
    });

    it.each(TestThemeConstants.TRANSITION_CONFIG_CASES)('should play $name', (configCase) => {
      // Arrange
      new SystemThemeStub(false);
      new ViewTransitionStub();
      const service = setUp({ transition: configCase.transition });

      // Act
      service.setTheme('dark', POINTER);

      // Assert
      expect(TestingThemeHelpers.transitionState()).toMatchObject(configCase.expected);
    });
  });
});
