import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, IconButton } from '@/components/ui/button';

describe('Button', () => {
  it('renders as a real button with an accessible name', () => {
    render(<Button>Find My Trip</Button>);
    expect(screen.getByRole('button', { name: 'Find My Trip' })).toBeInTheDocument();
  });

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Reserve</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Reserve
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  describe('loading state', () => {
    it('announces busy and blocks activation without removing focusability', async () => {
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} loading>
          Reserve
        </Button>,
      );

      const button = screen.getByRole('button', { name: /reserve/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      // Not `disabled`: that would move focus away mid-interaction.
      expect(button).not.toBeDisabled();

      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('exposes the loading status to assistive technology', () => {
      render(<Button loading>Reserve</Button>);
      expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it.each(['primary', 'secondary', 'destructive'] as const)(
      '%s carries raised elevation',
      (variant) => {
        render(<Button variant={variant}>Action</Button>);
        expect(screen.getByRole('button')).toHaveClass('wws-button--raised');
      },
    );

    it('tertiary stays flat — it is a text action, not a surface', () => {
      render(<Button variant="tertiary">View itinerary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('wws-button--flat');
      expect(button).not.toHaveClass('wws-button--raised');
    });
  });

  it('is reachable and activatable by keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Explore</Button>);

    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('consumes design tokens rather than literal colours', () => {
    render(<Button>Tokenised</Button>);
    const style = screen.getByRole('button').getAttribute('style') ?? '';
    expect(style).toContain('var(--color-surface-brand)');
    expect(style).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

describe('IconButton', () => {
  it('takes its accessible name from the required label', () => {
    render(
      <IconButton label="Close">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('hides the icon from assistive technology so the name is not doubled', () => {
    const { container } = render(
      <IconButton label="Close">
        <svg data-testid="icon" />
      </IconButton>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
