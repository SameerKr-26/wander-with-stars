import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration.
 *
 * Deliberately minimal. Vitest reuses the Vite pipeline the project already
 * relies on, so this adds a test runner rather than a second build system.
 * jsdom provides the DOM these component tests assert against.
 *
 * Scope: component behaviour and accessibility semantics only. End-to-end
 * coverage of the critical booking and payment flows needs a real browser and
 * belongs with those milestones (docs/ARCHITECTURE.md §12).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
