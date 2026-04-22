import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs } from '../mocks/auth';
import Coaching from '../../pages/Coaching';
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

describe('Coaching', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<Coaching />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for trainer', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderWithProviders(<Coaching />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderWithProviders(<Coaching />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('trainer can see the Create Session button', async () => {
    loginAs('mdrt_stars_trainer');
    renderWithProviders(<Coaching />);

    await waitFor(() => {
      expect(screen.getByText('Create Session')).toBeTruthy();
    });
  });

  it('admin can see the Create Session button', async () => {
    loginAs('admin');
    renderWithProviders(<Coaching />);

    await waitFor(() => {
      expect(screen.getByText('Create Session')).toBeTruthy();
    });
  });

  it('agent does NOT see the Create Session button', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Coaching />);

    // Wait for page to render the heading
    await waitFor(() => {
      expect(screen.getAllByText(/Coaching/i).length).toBeGreaterThan(0);
    });

    // Agent role is not management, so no create button
    expect(screen.queryByText('Create Session')).toBeNull();
  });

  it('agent sees the "No Coaching Sessions" empty state', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Coaching />);

    await waitFor(() => {
      expect(screen.getByText('No Coaching Sessions')).toBeTruthy();
    });
  });

  it('group leader can see the Create Session button', async () => {
    loginAs('mdrt_stars_leader');
    renderWithProviders(<Coaching />);

    await waitFor(() => {
      expect(screen.getByText('Create Session')).toBeTruthy();
    });
  });
});
