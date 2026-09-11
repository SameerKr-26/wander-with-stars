import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

/**
 * Flat config (ESLint 9+).
 *
 * `eslint-config-next` v16 ships flat config arrays directly, so they are
 * spread here — no FlatCompat shim.
 */
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'lib/supabase/database.types.ts',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // Unused variables are errors, but an underscore prefix marks a
      // deliberate omission (e.g. unused route handler params).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // docs/SECURITY.md §2 — do not silently swallow errors.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  // Defence in depth for docs/SECURITY.md — the service-role client must never
  // be reachable from UI component code. `server-only` enforces this at build
  // time; this rule surfaces the mistake earlier, in the editor.
  {
    files: ['components/**/*.{ts,tsx}', 'app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase/admin',
              message:
                'The service-role client is server-only. Use @/lib/supabase/server in a Server Component, or a Route Handler / Server Action for privileged work. See docs/SECURITY.md.',
            },
          ],
        },
      ],
    },
  },

  // Must stay last so formatting rules never conflict with Prettier.
  prettier,
];

export default eslintConfig;
