'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { IconButton } from './button';

/**
 * Dialog and Drawer, built on the native <dialog> element.
 *
 * Why native rather than a library: `showModal()` gives focus trapping, focus
 * restoration on close, Escape-to-dismiss, and inert background content — all
 * from the platform, correctly, with no dependency and no hand-written focus
 * trap to get subtly wrong. shadcn/ui would pull in Radix for the same result;
 * this project has no need for it yet, and package.json stays unchanged.
 *
 * Both are controlled: `open` and `onClose` come from the caller, so the parent
 * owns the state and nothing surprising happens on re-render.
 */

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Becomes the accessible name of the dialog. */
  title: string;
  /** Hide the title visually while keeping it announced. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Shared behaviour: open/close the native element and honour backdrop clicks. */
function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* Fires for Escape as well as el.close(), so the parent's state always
       follows the element rather than drifting out of sync. */
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  /* The native backdrop is part of the dialog element, so a click landing on
     the element itself — rather than the panel inside it — is a backdrop click. */
  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) ref.current?.close();
  };

  return { ref, onBackdropClick };
}

function OverlayShell({
  open,
  onClose,
  title,
  hideTitle,
  description,
  children,
  footer,
  className,
  dialogClassName,
  panelStyle,
}: OverlayProps & { dialogClassName: string; panelStyle: React.CSSProperties }) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);
  const base = useId();
  const titleId = `${base}-title`;
  const descriptionId = description ? `${base}-description` : undefined;

  return (
    <dialog
      ref={ref}
      className={cn('wws-dialog', dialogClassName)}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={onBackdropClick}
    >
      <div
        className={cn('wws-dialog__panel flex flex-col', className)}
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          boxShadow: 'var(--shadow-xl)',
          gap: 'var(--space-4)',
          padding: 'var(--space-6)',
          ...panelStyle,
        }}
      >
        <div className="flex items-start justify-between" style={{ gap: 'var(--space-4)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
            <h2
              id={titleId}
              className={cn('text-text-primary', hideTitle && 'sr-only')}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--weight-subheading)',
                lineHeight: 'var(--leading-snug)',
              }}
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="text-text-secondary"
                style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)' }}
              >
                {description}
              </p>
            ) : null}
          </div>

          <IconButton label="Close" size="sm" onClick={onClose} className="shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end" style={{ gap: 'var(--space-3)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

/** Centred modal. Sized to content, capped so it always fits the viewport. */
export function Dialog(props: OverlayProps) {
  return (
    <OverlayShell
      {...props}
      dialogClassName="m-auto w-full"
      panelStyle={{
        borderRadius: 'var(--radius-panel)',
        width: 'min(560px, calc(100vw - var(--space-8)))',
        maxHeight: 'calc(100vh - var(--space-16))',
      }}
    />
  );
}

export interface DrawerProps extends OverlayProps {
  side?: 'right' | 'left';
}

/**
 * Edge-anchored panel. Full height, full width on phones — where a drawer that
 * leaves a sliver of background visible just looks broken.
 */
export function Drawer({ side = 'right', ...props }: DrawerProps) {
  return (
    <OverlayShell
      {...props}
      dialogClassName={cn(
        'wws-drawer h-full max-h-none',
        side === 'right' ? 'ml-auto mr-0' : 'mr-auto ml-0',
        side === 'left' && 'wws-drawer--left',
      )}
      panelStyle={{
        width: 'min(420px, 100vw)',
        height: '100vh',
        borderRadius: 0,
      }}
    />
  );
}
