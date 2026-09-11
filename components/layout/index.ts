/**
 * Application shell.
 *
 * Structural pieces every production layout composes. Route groups pick their
 * own header and footer, so the public shell, and the future dashboard, admin
 * and creator areas, share structure without sharing chrome.
 */

export { AppShell, Page, SkipLink } from './app-shell';
export type { AppShellProps, PageProps } from './app-shell';

export { SiteHeader } from './site-header';
export type { SiteHeaderProps } from './site-header';

export { SiteFooter } from './site-footer';
export type { SiteFooterProps } from './site-footer';
