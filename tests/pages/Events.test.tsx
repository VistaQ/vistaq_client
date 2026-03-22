import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
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

describe('Events — archived events visibility', () => {
  const archivedEvent = {
    id: 'evt-archived',
    event_title: 'Secret Archived Event',
    start_date: '2026-04-01T09:00:00Z',
    end_date: '2026-04-01T10:00:00Z',
    status: 'completed',
    archived: true,
    venue: 'HQ',
    created_by: 'some-admin-id',
    target_groups: [],
    target_users: [],
  };

  it('archived events are hidden from agents', async () => {
    server.use(
      http.get('/api/events', () => HttpResponse.json({ data: [archivedEvent] }))
    );
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Events />);
    await waitFor(() => {
      expect(screen.getByText('Events & Meetings')).toBeInTheDocument();
    });
    expect(screen.queryByText('Secret Archived Event')).toBeNull();
  });

  it('archived events are hidden from trainers', async () => {
    server.use(
      http.get('/api/events', () => HttpResponse.json({ data: [archivedEvent] }))
    );
    loginAs('mdrt_stars_trainer');
    renderWithProviders(<Events />);
    await waitFor(() => {
      expect(screen.getByText('Events & Meetings')).toBeInTheDocument();
    });
    expect(screen.queryByText('Secret Archived Event')).toBeNull();
  });
});
