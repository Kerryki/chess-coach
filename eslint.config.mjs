import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  // Flat config doesn't read .gitignore automatically - without this,
  // ESLint tries to parse generated/vendored files (e.g. the ~1.5MB
  // minified Stockfish bundle in public/), which is both pointless and
  // can exhaust the heap.
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      'public/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Plain CommonJS files (Jest/Node config, not bundled through webpack),
    // so require() is the correct, intentional module system here.
    files: ['jest.config.js', 'jest.setup.js', 'scripts/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Test mocks/fixtures routinely need to shape loosely-typed data
    // (mock API responses, invalid-input fixtures, etc.) - requiring
    // precise types there has little payoff compared to application code.
    files: ['__tests__/**/*.ts', '__tests__/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
