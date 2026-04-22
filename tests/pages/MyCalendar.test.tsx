import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { loginAs } from '../mocks/auth';
import MyCalendar from '../../pages/MyCalendar';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import td from '../fixtures/testData.json';

function renderCalendar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DataProvider>
          <MyCalendar />
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function openCreateEventModal() {
  const createBtn = await screen.findByRole('button', { name: /new event|create event/i });
  await userEvent.click(createBtn);
}

describe('MyCalendar — Create Event Audience section', () => {
  it('shows groups in Audience section for trainer', async () => {
    // Previously broken: User/UserIcon import clash + managedGroupIds filter
    loginAs('mdrt_stars_trainer');
    renderCalendar();
    await openCreateEventModal();
    await waitFor(() => {
      expect(screen.getAllByText(td.groups.mdrt_stars.name).length).toBeGreaterThan(0);
    });
    // Should NOT show groups outside their scope
    expect(screen.queryAllByText(td.groups.kpi_busters.name)).toHaveLength(0);
  });

  it('shows all groups in Audience section for admin', async () => {
    loginAs('admin');
    renderCalendar();
    await openCreateEventModal();
    await waitFor(() => {
      expect(screen.getAllByText(td.groups.mdrt_stars.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.kpi_busters.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.power_rangers.name).length).toBeGreaterThan(0);
    });
  });

  it('shows all groups in Audience section for master_trainer', async () => {
    loginAs('masterTrainer1');
    renderCalendar();
    await openCreateEventModal();
    await waitFor(() => {
      expect(screen.getAllByText(td.groups.mdrt_stars.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(td.groups.kpi_busters.name).length).toBeGreaterThan(0);
    });
  });

  it('shows individual agents in Audience section for trainer', async () => {
    loginAs('mdrt_stars_trainer');
    renderCalendar();
    await openCreateEventModal();
    // Switch to Individual Agents tab if needed
    const individualTab = screen.queryByRole('button', { name: /individual/i });
    if (individualTab) await userEvent.click(individualTab);
    await waitFor(() => {
      // Agents in the trainer's managed group should appear
      expect(screen.getByText(td.users.mdrt_stars_agent.name)).toBeInTheDocument();
    });
  });
});
