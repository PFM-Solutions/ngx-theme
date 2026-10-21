import { afterEach, describe, expect, it } from 'vite-plus/test';
import themeInitSource from '../src/theme-init.js?raw';
import { TestThemeConstants } from './utils/constants/theme.constants';
import { SystemThemeStub, TestingThemeHelpers } from './utils/theme-testing.helpers';

const { DEFAULT_STORAGE_KEY, CUSTOM_STORAGE_KEY } = TestThemeConstants;

/** Runs the init script as a browser would, `document.currentScript` pointing at its `<script>` tag. */
function runInitScript(storageKey?: string): void {
  const script = document.createElement('script');
  if (storageKey) {
    script.setAttribute('data-storage-key', storageKey);
  }
  Object.defineProperty(document, 'currentScript', { configurable: true, get: () => script });
  try {
    // oxlint-disable-next-line typescript/no-implied-eval -- runs the shipped script source, as a <script> tag would
    new Function(themeInitSource)();
  } finally {
    delete (document as { currentScript?: unknown }).currentScript;
  }
}

describe('theme-init.js', () => {
  afterEach(() => {
    TestingThemeHelpers.reset();
  });

  it.each(TestThemeConstants.CONTRACT_CASES)('should apply the contract when $name', (contractCase) => {
    // Arrange
    new SystemThemeStub(contractCase.systemDark);
    TestingThemeHelpers.storeTheme(DEFAULT_STORAGE_KEY, contractCase.stored);

    // Act
    runInitScript();

    // Assert
    expect(TestingThemeHelpers.htmlState()).toStrictEqual(
      TestingThemeHelpers.expectedHtmlState(contractCase.expectedResolved),
    );
  });

  it('should read the key given by data-storage-key', () => {
    // Arrange
    new SystemThemeStub(false);
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'light');
    localStorage.setItem(CUSTOM_STORAGE_KEY, 'dark');

    // Act
    runInitScript(CUSTOM_STORAGE_KEY);

    // Assert
    expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
  });

  it('should fall back to the system theme when storage throws', () => {
    // Arrange
    new SystemThemeStub(true);
    TestingThemeHelpers.blockStorage();

    // Act
    runInitScript();

    // Assert
    expect(TestingThemeHelpers.htmlState()).toStrictEqual(TestingThemeHelpers.expectedHtmlState('dark'));
  });
});
