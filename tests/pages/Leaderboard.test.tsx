import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs } from '../mocks/auth';
import Leaderboard from '../../pages/Leaderboard';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import td from '../fixtures/testData.json';

function renderLeaderboard() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DataProvider>
          <Leaderboard />
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Leaderboard', () => {
  it('renders without crashing for admin role', async () => {
    loginAs('admin');
    const { container } = renderLeaderboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for trainer role', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderLeaderboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent role', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderLeaderboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for group_leader role', async () => {
    loginAs('mdrt_stars_leader');
    const { container } = renderLeaderboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('populates the group tab with all group names', async () => {
    loginAs('admin');
    renderLeaderboard();

    // Wait for data to load then switch to Group tab where all groups are always listed
    await waitFor(() => expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /group/i }));

    await waitFor(() => {
      expect(screen.getAllByText(td.groups.mdrt_stars.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.kpi_busters.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.power_rangers.name).length).toBeGreaterThan(0);
    });
  });

  it('shows the current user (agent) in the leaderboard table', async () => {
    loginAs('mdrt_stars_agent');
    renderLeaderboard();
    await waitFor(() => {
      // The current user's name should appear in the rankings
      expect(screen.getAllByText(td.users.mdrt_stars_agent.name!).length).toBeGreaterThan(0);
    });
    // The "(you)" marker is shown next to the current user
    expect(screen.getByText('(you)')).toBeInTheDocument();
  });
});
