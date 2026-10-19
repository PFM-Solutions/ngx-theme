import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    entry: ['src/index.ts'],
    dts: {
      generator: 'tsgo',
    },
    exports: {
      customExports(exports) {
        exports['.'] = {
          types: './dist/index.d.ts',
          default: './dist/index.js',
        };
        exports['./theme-init.js'] = './dist/theme-init.js';
        exports['./theme.css'] = './dist/theme.css';
        return exports;
      },
    },
    format: ['esm'],
    platform: 'browser',
    // Emission target: pins the syntax level of the shipped artifact instead of deriving it from `engines.node`,
    // which describes the tooling, not the browsers running the library.
    target: 'es2022',
    copy: ['src/theme-init.js', 'src/theme.css'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/index.ts', 'src/**/*.types.ts'],
      thresholds: {
        statements: 80,
      },
    },
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
    ignorePatterns: ['dist/**', 'coverage/**'],
  },
  fmt: {
    singleQuote: true,
    printWidth: 120,
    semi: true,
    trailingComma: 'all',
    ignorePatterns: ['dist/**', 'coverage/**'],
  },
});
