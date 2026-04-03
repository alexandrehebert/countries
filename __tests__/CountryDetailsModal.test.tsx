import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CountryDetailsModal from '~/components/CountryDetailsModal';

const back = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back,
  }),
}));

describe('CountryDetailsModal', () => {
  beforeEach(() => {
    back.mockReset();
  });

  it('closes when clicking outside the dialog', () => {
    render(
      <CountryDetailsModal title="France" closeLabel="Close details">
        <div>Country content</div>
      </CountryDetailsModal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'France' });

    fireEvent.click(dialog.parentElement as HTMLElement);

    expect(back).toHaveBeenCalledTimes(1);
  });
});
