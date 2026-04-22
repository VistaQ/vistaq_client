import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs } from '../mocks/auth';
import Group from '../../pages/Group';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import td from '../fixtures/testData.json';

function renderGroup() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DataProvider>
          <Group />
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Group Performance Dashboard', () => {
  it('shows all groups for admin', async () => {
    loginAs('admin');
    renderGroup();
    await waitFor(() => {
      expect(screen.getByText(td.groups.mdrt_stars.name)).toBeInTheDocument();
      expect(screen.getByText(td.groups.kpi_busters.name)).toBeInTheDocument();
      expect(screen.getByText(td.groups.power_rangers.name)).toBeInTheDocument();
    });
  });

  it('shows all groups for master_trainer', async () => {
    loginAs('masterTrainer1');
    renderGroup();
    await waitFor(() => {
      expect(screen.getByText(td.groups.mdrt_stars.name)).toBeInTheDocument();
      expect(screen.getByText(td.groups.kpi_busters.name)).toBeInTheDocument();
      expect(screen.getByText(td.groups.power_rangers.name)).toBeInTheDocument();
    });
  });

  it('shows only managed group for trainer — not blank', async () => {
    // Previously broken: managedGroupIds filter returned empty array
    loginAs('mdrt_stars_trainer');
    renderGroup();
    await waitFor(() => {
      expect(screen.getByText(td.groups.mdrt_stars.name)).toBeInTheDocument();
      // Should NOT show groups the trainer doesn't manage
      expect(screen.queryByText(td.groups.kpi_busters.name)).not.toBeInTheDocument();
      expect(screen.queryByText(td.groups.power_rangers.name)).not.toBeInTheDocument();
    });
  });
});
