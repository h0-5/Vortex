import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GeneralSection } from './settings-sections.js';

describe('GeneralSection', () => {
  function renderSection() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onSave = vi.fn();
    const value = {
      appName: 'Vortex',
      appDescription: 'A modular Discord management platform.',
      supportUrl: null,
      websiteUrl: null,
      defaultLanguage: 'en',
    };
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <GeneralSection value={value} onSave={onSave} isSaving={false} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    return { onSave };
  }

  it('saves when the form is valid', async () => {
    const user = userEvent.setup();
    const { onSave } = renderSection();

    const input = screen.getByLabelText('App name');
    await user.clear(input);
    await user.type(input, 'Code Nexus');

    await user.click(screen.getByRole('button', { name: /save general/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ appName: 'Code Nexus' }),
        expect.anything(),
      );
    });
  });

  it('shows validation error when app name is empty', async () => {
    const user = userEvent.setup();
    renderSection();

    const input = screen.getByLabelText('App name');
    await user.clear(input);

    await user.click(screen.getByRole('button', { name: /save general/i }));

    expect(await screen.findByText(/too small: expected string to have >=1 characters/i)).toBeInTheDocument();
  });
});
