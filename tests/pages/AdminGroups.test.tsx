import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs } from '../mocks/auth';
import AdminGroups from '../../pages/AdminGroups';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DataProvider>{ui}</DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AdminGroups', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<AdminGroups />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('populates the groups list with group names from test data', async () => {
    loginAs('admin');
    renderWithProviders(<AdminGroups />);

    await waitFor(() => {
      expect(screen.getByText('MDRT Stars')).toBeInTheDocument();
    });
    expect(screen.getByText('KPI Busters')).toBeInTheDocument();
    expect(screen.getByText('Power Rangers')).toBeInTheDocument();
  });

  it('filters groups when searching by name', async () => {
    loginAs('admin');
    renderWithProviders(<AdminGroups />);

    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByText('MDRT Stars')).toBeInTheDocument();
    });

    // Type "KPI" into the search input
    const searchInput = screen.getByPlaceholderText('Search groups...');
    fireEvent.change(searchInput, { target: { value: 'KPI' } });

    // KPI Busters should still be visible
    expect(screen.getByText('KPI Busters')).toBeInTheDocument();

    // Other groups should be filtered out
    expect(screen.queryByText('MDRT Stars')).not.toBeInTheDocument();
    expect(screen.queryByText('Power Rangers')).not.toBeInTheDocument();
  });

  it('shows the Create Group button', async () => {
    loginAs('admin');
    renderWithProviders(<AdminGroups />);

    await waitFor(() => {
      expect(screen.getByText('Create Group')).toBeInTheDocument();
    });
  });
});
