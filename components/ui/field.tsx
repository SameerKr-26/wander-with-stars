'use client';

import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

/**
 * Form primitives.
 *
 * The hard part of an accessible field is not the border — it is wiring the
 * label, description and error message to the control so a screen reader
 * announces all three. `Field` owns that wiring through context, so every
 * input gets it automatically and no caller has to remember an `aria-describedby`.
 *
 * On error styling: the locked palette has no error colour. Errors are
 * therefore signalled by a heavier border, a "✕" glyph and explicit wording —
 * never by colour, which docs/DESIGN_SYSTEM.md §19 requires anyway. A semantic
 * error colour should be approved and added to the token layer; until then this
 * is accessible but visually quieter than a red field would be.
 *
 * No booking or product forms here — these are the primitives those will use.
 */

interface FieldContextValue {
  inputId: string;
  descriptionId: string | undefined;
  errorId: string | undefined;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useFieldContext() {
  return useContext(FieldContext);
}

/** Wires a control to its label, description and error. */
function useControlProps() {
  const ctx = useFieldContext();
  if (!ctx) return {};
  const describedBy = [ctx.descriptionId, ctx.errorId].filter(Boolean).join(' ') || undefined;
  return {
    id: ctx.inputId,
    'aria-describedby': describedBy,
    'aria-invalid': ctx.invalid || undefined,
    'aria-required': ctx.required || undefined,
    disabled: ctx.disabled || undefined,
  };
}

export interface FieldProps {
  label: string;
  /** Helper text. Announced with the control, so keep it short and useful. */
  description?: string;
  /** Presence marks the field invalid and announces the message. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  description,
  error,
  required = false,
  disabled = false,
  children,
  className,
}: FieldProps) {
  const base = useId();
  const invalid = Boolean(error);

  const value: FieldContextValue = {
    inputId: `${base}-input`,
    descriptionId: description ? `${base}-description` : undefined,
    errorId: error ? `${base}-error` : undefined,
    invalid,
    required,
    disabled,
  };

  return (
    <FieldContext.Provider value={value}>
      <div className={cn('flex flex-col', className)} style={{ gap: 'var(--space-2)' }}>
        <label
          htmlFor={value.inputId}
          className="text-text-primary"
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-label)',
            opacity: disabled ? 0.55 : undefined,
          }}
        >
          {label}
          {required ? (
            <>
              {' '}
              <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          ) : null}
        </label>

        {description ? (
          <p
            id={value.descriptionId}
            className="text-text-muted"
            style={{ fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-normal)' }}
          >
            {description}
          </p>
        ) : null}

        {children}

        {error ? (
          <p
            id={value.errorId}
            /* Announced as soon as it appears, without stealing focus. */
            role="alert"
            className="text-text-primary flex items-start"
            style={{
              gap: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-emphasis)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            <span aria-hidden="true">✕</span>
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/* ------------------------------------------------------------- controls */

const controlStyle = {
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-control)',
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 'var(--text-base)',
  fontFamily: 'var(--font-body)',
  lineHeight: 'var(--leading-snug)',
  width: '100%',
} as const;

export type InputProps = ComponentPropsWithoutRef<'input'>;

export function Input({ className, style, ...props }: InputProps) {
  const field = useControlProps();
  return (
    <input
      className={cn('wws-input', className)}
      style={{ ...controlStyle, ...style }}
      {...field}
      {...props}
    />
  );
}

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>;

export function Textarea({ className, style, rows = 4, ...props }: TextareaProps) {
  const field = useControlProps();
  return (
    <textarea
      rows={rows}
      className={cn('wws-input resize-y', className)}
      style={{ ...controlStyle, ...style }}
      {...field}
      {...props}
    />
  );
}

export type SelectProps = ComponentPropsWithoutRef<'select'>;

export function Select({ className, style, children, ...props }: SelectProps) {
  const field = useControlProps();
  return (
    <select
      className={cn('wws-input', className)}
      style={{ ...controlStyle, ...style }}
      {...field}
      {...props}
    >
      {children}
    </select>
  );
}

/* --------------------------------------------------------------- choice */

interface ChoiceProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  label: string;
  description?: string;
}

function Choice({
  type,
  label,
  description,
  className,
  id,
  ...props
}: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const generated = useId();
  const controlId = id ?? generated;
  const descriptionId = description ? `${controlId}-description` : undefined;

  return (
    <div className={cn('flex items-start', className)} style={{ gap: 'var(--space-3)' }}>
      <input
        type={type}
        id={controlId}
        aria-describedby={descriptionId}
        className="mt-1 shrink-0 cursor-pointer disabled:cursor-not-allowed"
        style={{
          width: 'var(--space-5)',
          height: 'var(--space-5)',
          accentColor: 'var(--color-accent)',
        }}
        {...props}
      />
      <span className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <label
          htmlFor={controlId}
          className="text-text-primary cursor-pointer"
          style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)' }}
        >
          {label}
        </label>
        {description ? (
          <span
            id={descriptionId}
            className="text-text-muted"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <Choice type="checkbox" {...props} />;
}

export function Radio(props: ChoiceProps) {
  return <Choice type="radio" {...props} />;
}
