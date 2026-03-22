import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import Reports from '../../pages/Reports';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import td from '../fixtures/testData.json';

function renderReports() {
  return render(
    <AuthProvider>
      <DataProvider>
        <Reports />
      </DataProvider>
    </AuthProvider>
  );
}

describe('Reports', () => {
  it('renders without crashing for admin role', async () => {
    loginAs('admin');
    const { container } = renderReports();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for trainer role', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderReports();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent role', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderReports();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('shows group filter dropdown for trainer', async () => {
    loginAs('mdrt_stars_trainer');
    renderReports();
    // Wait for groups to load from the async API call
    await waitFor(() => {
      // The trainer sees group filter with "All Managed Groups" option
      expect(screen.getByText('All Managed Groups')).toBeInTheDocument();
      // The trainer's managed group should appear in the dropdown
      expect(screen.getAllByText(td.groups.mdrt_stars.name).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('shows group filter dropdown for admin', async () => {
    loginAs('admin');
    renderReports();
    // Wait for groups to load from the async API call
    await waitFor(() => {
      expect(screen.getByText('All Managed Groups')).toBeInTheDocument();
      // Admin sees all groups
      expect(screen.getAllByText(td.groups.mdrt_stars.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.kpi_busters.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.power_rangers.name).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
