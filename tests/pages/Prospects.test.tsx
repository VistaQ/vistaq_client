import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import Prospects from '../../pages/Prospects';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <DataProvider>{ui}</DataProvider>
    </AuthProvider>
  );
}

describe('Prospects', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('shows Add Prospect button for agent', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);

    await waitFor(() => {
      expect(screen.getByText('Add Prospect')).toBeInTheDocument();
    });
  });

  it('does NOT show Add Prospect button for admin (isViewOnly)', async () => {
    loginAs('admin');
    renderWithProviders(<Prospects />);

    // Wait for the page to render fully
    await waitFor(() => {
      expect(screen.getByText('Prospect Management')).toBeInTheDocument();
    });

    expect(screen.queryByText('Add Prospect')).not.toBeInTheDocument();
  });
});
