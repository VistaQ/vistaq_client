import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import Events from '../../pages/Events';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <DataProvider>{ui}</DataProvider>
    </AuthProvider>
  );
}

describe('Events', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<Events />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for trainer', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderWithProviders(<Events />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderWithProviders(<Events />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('agent cannot see the Create Event button', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Events />);

    // Wait for the page to finish rendering
    await waitFor(() => {
      expect(screen.getByText('Events & Meetings')).toBeTruthy();
    });

    // Agent role has canManage = false, so no create button
    expect(screen.queryByText('Create Event')).toBeNull();
  });

  it('trainer CAN see the Create Event button', async () => {
    loginAs('mdrt_stars_trainer');
    renderWithProviders(<Events />);

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
  });

  it('admin CAN see the Create Event button', async () => {
    loginAs('admin');
    renderWithProviders(<Events />);

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
  });

  it('does not crash on mount when fetching /groups, /users, /events', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<Events />);

    // Give it time to resolve the fetches triggered on mount
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // The page should render the heading
    expect(screen.getByText('Events & Meetings')).toBeTruthy();
  });
});
