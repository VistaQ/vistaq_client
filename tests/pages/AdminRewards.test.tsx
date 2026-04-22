import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs } from '../mocks/auth';
import { AuthProvider } from '../../context/AuthContext';
import AdminRewards from '../../pages/AdminRewards';

function renderAdminRewards() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AdminRewards />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AdminRewards — role guard', () => {
  it('renders nothing for a non-admin user (agent)', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderAdminRewards();
    // Component returns null for non-admin — container should be empty
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing for a trainer', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderAdminRewards();
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});

describe('AdminRewards — renders for admin', () => {
  it('shows the "Rewards System Configuration" heading', async () => {
    loginAs('admin');
    renderAdminRewards();
    await waitFor(() => {
      expect(screen.getByText('Rewards System Configuration')).toBeInTheDocument();
    });
  });

  it('shows the "Point Values per Action" section', async () => {
    loginAs('admin');
    renderAdminRewards();
    await waitFor(() => {
      expect(screen.getByText('Point Values per Action')).toBeInTheDocument();
    });
  });

  it('shows Prospect Management, Sales Completion, and Personal Development sub-sections', async () => {
    loginAs('admin');
    renderAdminRewards();
    await waitFor(() => {
      expect(screen.getByText('Prospect Management')).toBeInTheDocument();
      expect(screen.getByText('Sales Completion')).toBeInTheDocument();
      expect(screen.getByText('Personal Development')).toBeInTheDocument();
    });
  });

  it('loads point config values from the API (prospect_created = 10)', async () => {
    loginAs('admin');
    renderAdminRewards();
    // Wait for loading to finish and inputs to appear
    await waitFor(() => {
      // The MSW handler returns prospect_created: 10 which maps to prospectBasicInfo
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const values = inputs.map(i => Number(i.value));
      expect(values).toContain(10);
    });
  });

  it('has Save Points button disabled before any changes are made', async () => {
    loginAs('admin');
    renderAdminRewards();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save points/i })).toBeDisabled();
    });
  });
});

describe('AdminRewards — removed sections', () => {
  it('does NOT render the "Badge Tiers (Milestones)" section', async () => {
    loginAs('admin');
    renderAdminRewards();
    await waitFor(() => {
      expect(screen.getByText('Rewards System Configuration')).toBeInTheDocument();
    });
    expect(screen.queryByText(/badge tiers/i)).toBeNull();
    expect(screen.queryByText(/milestones/i)).toBeNull();
  });
});
