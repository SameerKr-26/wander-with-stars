import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Loading, empty and error primitives.
 *
 * docs/UX_INTERACTION_GUIDE.md §13–14: skeletons for content, compact
 * indicators for actions, and a useful empty state on every important list.
 * §12: an error must say what went wrong, what to do, and whether to retry.
 */

/* --------------------------------------------------------------- spinner */

export interface SpinnerProps extends ComponentPropsWithoutRef<'span'> {
  size?: 'sm' | 'md';
  /** Announced to assistive technology. Omit only when a parent already says it. */
  label?: string;
}

export function Spinner({ size = 'md', label, className, style, ...props }: SpinnerProps) {
  const px = size === 'sm' ? '1em' : '1.5em';
  return (
    <span
      className={cn('wws-spinner inline-block shrink-0 rounded-full border-2', className)}
      style={{
        width: px,
        height: px,
        borderColor: 'currentColor',
        /* One transparent edge is what makes the rotation visible. */
        borderTopColor: 'transparent',
        ...style,
      }}
      {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
    />
  );
}

/* -------------------------------------------------------------- skeleton */

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /** Any CSS length. Defaults to full width. */
  width?: string;
  height?: string;
  radius?: 'control' | 'card' | 'panel' | 'pill';
}

/**
 * Content placeholder.
 *
 * Hidden from assistive technology: a screen reader should hear the loading
 * status once, from the region that owns it, not a stream of empty boxes.
 */
export function Skeleton({
  width = '100%',
  height = '1em',
  radius = 'control',
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('wws-skeleton', className)}
      style={{ width, height, borderRadius: `var(--radius-${radius})`, ...style }}
      {...props}
    />
  );
}

/* ----------------------------------------------------------- empty/error */

interface StatusProps {
  title: string;
  description?: string;
  /** A way forward — usually a Button. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

function StatusBlock({
  title,
  description,
  action,
  icon,
  className,
  role,
}: StatusProps & { role?: 'status' | 'alert' }) {
  return (
    <div
      role={role}
      className={cn('flex flex-col items-center text-center', className)}
      style={{
        gap: 'var(--space-3)',
        paddingBlock: 'var(--space-12)',
        paddingInline: 'var(--space-5)',
      }}
    >
      {icon ? (
        <span aria-hidden="true" className="text-text-muted">
          {icon}
        </span>
      ) : null}
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--weight-subheading)',
        }}
      >
        {title}
      </p>
      {description ? (
        <p
          className="text-text-secondary"
          style={{
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)',
            maxWidth: '48ch',
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 'var(--space-2)' }}>{action}</div> : null}
    </div>
  );
}

/**
 * Empty state. Says what is missing and offers the next step, rather than
 * leaving a blank region.
 */
export function EmptyState(props: StatusProps) {
  return <StatusBlock {...props} />;
}

/**
 * Error state. `role="alert"` so assistive technology announces it when it
 * appears — an error nobody hears is an error nobody can act on.
 */
export function ErrorState(props: StatusProps) {
  return <StatusBlock {...props} role="alert" />;
}
