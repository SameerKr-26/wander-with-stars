import '@testing-library/jest-dom/vitest';
import './setup/dialog-polyfill';
import './setup/dom-polyfills';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount between tests so queries cannot match a previous test's DOM.
afterEach(() => {
  cleanup();
});
