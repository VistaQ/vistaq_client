import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import AdminUsers from '../../pages/AdminUsers';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <DataProvider>{ui}</DataProvider>
    </AuthProvider>
  );
}

describe('AdminUsers', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<AdminUsers />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('populates the users table with user names from test data', async () => {
    loginAs('admin');
    renderWithProviders(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('Mylene Predovic')).toBeInTheDocument();
    });
    expect(screen.getByText('Marty Schultz')).toBeInTheDocument();
  });

  it('filters users when searching by name', async () => {
    loginAs('admin');
    renderWithProviders(<AdminUsers />);

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('Marty Schultz')).toBeInTheDocument();
    });

    // Type "Marty" into the search input
    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'Marty' } });

    // Marty Schultz should still be visible
    expect(screen.getByText('Marty Schultz')).toBeInTheDocument();

    // Other users should be filtered out
    expect(screen.queryByText('Mylene Predovic')).not.toBeInTheDocument();
    expect(screen.queryByText('Byron Douglas')).not.toBeInTheDocument();
  });

  it('shows the Add User button', async () => {
    loginAs('admin');
    renderWithProviders(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });
  });
});
