import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import Dashboard from '../../pages/Dashboard';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderDashboard() {
  return render(
    <AuthProvider>
      <DataProvider>
        <Dashboard />
      </DataProvider>
    </AuthProvider>
  );
}

describe('Dashboard — correct view per role', () => {
  it('agent sees "Personal Dashboard", not management view', async () => {
    loginAs('mdrt_stars_agent');
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Personal Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Trainer Overview')).toBeNull();
    expect(screen.queryByText('System Admin Dashboard')).toBeNull();
  });

  it('group_leader sees "Personal Dashboard", not management view', async () => {
    loginAs('mdrt_stars_leader');
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Personal Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Trainer Overview')).toBeNull();
  });

  it('trainer sees "Trainer Overview" management view, not personal', async () => {
    loginAs('mdrt_stars_trainer');
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Trainer Overview')).toBeInTheDocument();
    });
    expect(screen.queryByText('Personal Dashboard')).toBeNull();
  });

  it('admin sees "System Admin Dashboard" management view, not personal', async () => {
    loginAs('admin');
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('System Admin Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Personal Dashboard')).toBeNull();
  });
});

describe('Dashboard — render safety', () => {
  it('renders without crashing for master_trainer role', async () => {
    loginAs('masterTrainer1');
    const { container } = renderDashboard();
    // Previously crashed with "relevantGroups is not defined"
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for admin role', async () => {
    loginAs('admin');
    const { container } = renderDashboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for trainer role', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderDashboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent role', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderDashboard();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });
});

