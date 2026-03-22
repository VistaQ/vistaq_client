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

describe('Dashboard', () => {
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
