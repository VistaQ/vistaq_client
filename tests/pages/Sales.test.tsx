import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import Sales from '../../pages/Sales';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <DataProvider>{ui}</DataProvider>
    </AuthProvider>
  );
}

describe('Sales', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<Sales />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderWithProviders(<Sales />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('shows Total NOC and Total ACE stat cards', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Sales />);

    await waitFor(() => {
      expect(screen.getByText('Total NOC')).toBeInTheDocument();
    });
    expect(screen.getByText('Total ACE')).toBeInTheDocument();
  });

  it('displays correct ACE for mdrt_stars_agent with 1 successful sale of 25000', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Sales />);

    // mdrt_stars_agent has prospect p001 with sales_outcome=successful and amount=25000
    await waitFor(() => {
      expect(screen.getByText('RM 25,000')).toBeInTheDocument();
    });

    // NOC should be 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows empty state when user has no successful sales', async () => {
    loginAs('power_rangers_agent');
    renderWithProviders(<Sales />);

    // power_rangers_agent has prospect p005 with no sales_outcome (stage=prospect)
    await waitFor(() => {
      expect(screen.getByText('No Sales Outcome Yet')).toBeInTheDocument();
    });
  });
});
