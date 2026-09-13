import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Badge, Avatar } from '@/components/ui/badge';
import { CardAction } from '@/components/ui/card-action';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/ui/feedback';
import { GlassPanel } from '@/components/ui/glass-panel';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Contents</Card>);
    expect(screen.getByText('Contents')).toBeInTheDocument();
  });

  it('only opts into hover behaviour when interactive', () => {
    const { rerender, container } = render(<Card>Static</Card>);
    expect(container.firstChild).not.toHaveClass('wws-card--interactive');

    rerender(<Card interactive>Interactive</Card>);
    expect(container.firstChild).toHaveClass('wws-card--interactive');
  });

  it('marks selection with aria-current, not colour alone', () => {
    const { container } = render(<Card selected>Chosen</Card>);
    expect(container.firstChild).toHaveAttribute('aria-current', 'true');
  });

  it('drops interactive affordance when disabled', () => {
    const { container } = render(
      <Card interactive disabled>
        Unavailable
      </Card>,
    );
    expect(container.firstChild).toHaveClass('wws-card--disabled');
    expect(container.firstChild).not.toHaveClass('wws-card--interactive');
  });

  describe('CardAction', () => {
    it('gives an interactive card exactly one focus stop, as a real control', async () => {
      const onClick = vi.fn();
      render(
        <Card interactive>
          <CardAction label="Open Vietnam trip" onClick={onClick} />
          <h3>Vietnam</h3>
        </Card>,
      );

      const action = screen.getByRole('button', { name: 'Open Vietnam trip' });
      await userEvent.tab();
      expect(action).toHaveFocus();

      await userEvent.click(action);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('renders a link when given href, so it behaves like a link', () => {
      render(
        <Card interactive>
          <CardAction label="Open Vietnam trip" href="/trips/vietnam" />
        </Card>,
      );
      expect(screen.getByRole('link', { name: 'Open Vietnam trip' })).toHaveAttribute(
        'href',
        '/trips/vietnam',
      );
    });

    it('falls back to a disabled button rather than a dead link', () => {
      render(
        <Card interactive>
          <CardAction label="Unavailable" href="/trips/x" disabled />
        </Card>,
      );
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
    });
  });
});

describe('GlassPanel', () => {
  it('renders its children', () => {
    render(<GlassPanel>Floating content</GlassPanel>);
    expect(screen.getByText('Floating content')).toBeInTheDocument();
  });

  it('applies the approved glass tokens rather than literal values', () => {
    const { container } = render(<GlassPanel>Panel</GlassPanel>);
    const style = (container.firstChild as HTMLElement).getAttribute('style') ?? '';

    expect(style).toContain('var(--glass-surface)');
    expect(style).toContain('var(--glass-filter)');
    expect(style).toContain('var(--glass-border)');
    expect(style).toContain('var(--shadow-glass)');
    // No hardcoded colour, blur or opacity may leak into a component.
    expect(style).not.toMatch(/#[0-9a-f]{6}/i);
    expect(style).not.toMatch(/blur\(\d/);
  });

  it.each([
    ['default', '--glass-surface'],
    ['tinted', '--glass-surface-teal'],
    ['strong', '--glass-surface-strong'],
  ] as const)('variant %s uses the %s token', (variant, token) => {
    const { container } = render(<GlassPanel variant={variant}>Panel</GlassPanel>);
    expect((container.firstChild as HTMLElement).getAttribute('style')).toContain(`var(${token})`);
  });

  it('uses the stronger blur only when asked', () => {
    const { container } = render(<GlassPanel intense>Panel</GlassPanel>);
    expect((container.firstChild as HTMLElement).getAttribute('style')).toContain(
      'var(--glass-filter-strong)',
    );
  });
});

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge tone="accent">8 spots left</Badge>);
    expect(screen.getByText('8 spots left')).toBeInTheDocument();
  });

  it('is not a button — clickable things are Buttons', () => {
    render(<Badge>Status</Badge>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('falls back to initials while keeping the full name available', () => {
    render(<Avatar name="Priya Sharma" />);
    expect(screen.getByText('PS')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
  });

  it('uses the image when one is supplied, named by the person', () => {
    render(<Avatar name="Priya Sharma" src="https://example.test/p.jpg" />);
    expect(screen.getByRole('img', { name: 'Priya Sharma' })).toBeInTheDocument();
  });
});

describe('feedback primitives', () => {
  it('Spinner is announced only when it carries a label', () => {
    const { rerender } = render(<Spinner label="Loading trips" />);
    expect(screen.getByRole('status', { name: 'Loading trips' })).toBeInTheDocument();

    rerender(<Spinner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('Skeleton is hidden from assistive technology', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('EmptyState offers a way forward', () => {
    render(
      <EmptyState
        title="No saved trips yet"
        description="Start exploring destinations that match your travel style."
        action={<button type="button">Explore Trips</button>}
      />,
    );
    expect(screen.getByText('No saved trips yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Trips' })).toBeInTheDocument();
  });

  it('ErrorState is announced as an alert', () => {
    render(<ErrorState title="Payment confirmation is taking longer than usual" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Payment confirmation is taking longer than usual',
    );
  });
});
