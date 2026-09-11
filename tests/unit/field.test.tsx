import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="Full name">
        <Input />
      </Field>,
    );
    // getByLabelText only passes if label and control are genuinely wired up.
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('announces the description alongside the control', () => {
    render(
      <Field label="Phone" description="We only use this for trip updates.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription(
      'We only use this for trip updates.',
    );
  });

  describe('error state', () => {
    it('marks the control invalid and announces the message', () => {
      render(
        <Field label="Email" error="Enter a valid email address.">
          <Input />
        </Field>,
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription(/Enter a valid email address\./);
      // role="alert" so it is announced when it appears, without stealing focus.
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    });

    it('does not rely on colour alone — a symbol accompanies the message', () => {
      render(
        <Field label="Email" error="Required.">
          <Input />
        </Field>,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('✕');
    });

    it('is not invalid when no error is given', () => {
      render(
        <Field label="Email">
          <Input />
        </Field>,
      );
      expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('conveys required state to assistive technology, not just with an asterisk', () => {
    render(
      <Field label="Passport number" required>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText(/Passport number/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('(required)')).toBeInTheDocument();
  });

  it('disables the control through the field', () => {
    render(
      <Field label="Locked" disabled>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Locked')).toBeDisabled();
  });

  it('wires description and error together on the same control', () => {
    render(
      <Field label="Email" description="Used for your booking confirmation." error="Required.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription(/Used for your booking confirmation/);
    expect(input).toHaveAccessibleDescription(/Required\./);
  });

  it.each([
    ['Textarea', <Textarea key="t" />],
    ['Select', <Select key="s" />],
  ])('wires %s the same way', (_name, control) => {
    render(<Field label="Notes">{control}</Field>);
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('accepts typed input', async () => {
    render(
      <Field label="City">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('City');
    await userEvent.type(input, 'Hanoi');
    expect(input).toHaveValue('Hanoi');
  });
});

describe('Checkbox', () => {
  it('is labelled and toggleable by clicking its label text', async () => {
    render(<Checkbox label="I have a valid passport" />);
    const box = screen.getByRole('checkbox', { name: 'I have a valid passport' });
    expect(box).not.toBeChecked();

    await userEvent.click(screen.getByText('I have a valid passport'));
    expect(box).toBeChecked();
  });

  it('announces its description', () => {
    render(<Checkbox label="Travel insurance" description="Strongly recommended." />);
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription('Strongly recommended.');
  });
});
