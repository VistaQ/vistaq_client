import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { loginAs } from '../mocks/auth';
import Profile from '../../pages/Profile';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import td from '../fixtures/testData.json';

function renderProfile() {
  return render(
    <AuthProvider>
      <DataProvider>
        <Profile />
      </DataProvider>
    </AuthProvider>
  );
}

describe('Profile', () => {
  it('renders without crashing for agent role', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderProfile();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for group_leader role', async () => {
    loginAs('mdrt_stars_leader');
    const { container } = renderProfile();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for trainer role', async () => {
    loginAs('mdrt_stars_trainer');
    const { container } = renderProfile();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('displays current user name in the form', async () => {
    loginAs('mdrt_stars_agent');
    renderProfile();
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue(td.users.mdrt_stars_agent.name!);
      expect(nameInput).toBeInTheDocument();
    });
  });

  it('displays group name correctly for a group leader', async () => {
    // Use group_leader role because the MSW handler returns the agent's group
    // for group_leader but returns [] for plain agents (matching RLS scoping)
    loginAs('mdrt_stars_leader');
    renderProfile();
    await waitFor(() => {
      const groupInput = screen.getByDisplayValue(td.groups.mdrt_stars.name);
      expect(groupInput).toBeInTheDocument();
    }, { timeout: 3000 });
    // Ensure it is not showing "undefined" or empty
    expect(screen.queryByDisplayValue('undefined')).not.toBeInTheDocument();
  });

  it('has agent code field as read-only', async () => {
    loginAs('mdrt_stars_agent');
    renderProfile();
    await waitFor(() => {
      const agentCodeInput = screen.getByDisplayValue(td.users.mdrt_stars_agent.agentCode!);
      expect(agentCodeInput).toBeInTheDocument();
      expect(agentCodeInput).toHaveAttribute('readOnly');
    });
  });
});
