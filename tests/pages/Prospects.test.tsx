import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { loginAs } from '../mocks/auth';
import Prospects from '../../pages/Prospects';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import td from '../fixtures/testData.json';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <DataProvider>{ui}</DataProvider>
    </AuthProvider>
  );
}

describe('Prospects', () => {
  it('renders without crashing for admin', async () => {
    loginAs('admin');
    const { container } = renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('renders without crashing for agent', async () => {
    loginAs('mdrt_stars_agent');
    const { container } = renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('shows Add Prospect button for agent', async () => {
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);

    await waitFor(() => {
      expect(screen.getByText('Add Prospect')).toBeInTheDocument();
    });
  });

  it('does NOT show Add Prospect button for admin (isViewOnly)', async () => {
    loginAs('admin');
    renderWithProviders(<Prospects />);

    // Wait for the page to render fully
    await waitFor(() => {
      expect(screen.getByText('Prospect Management')).toBeInTheDocument();
    });

    expect(screen.queryByText('Add Prospect')).not.toBeInTheDocument();
  });
});

// Helper: a prospect with specific fields to test getStageBadge priority
function makeProspect(overrides: Record<string, any>) {
  return {
    id: 'px1',
    agent_id: td.users.mdrt_stars_agent.id,
    group_id: td.groups.mdrt_stars.id,
    prospect_name: 'Test Person',
    prospect_phone: '+601234',
    current_stage: 'prospect',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('Prospects — getStageBadge priority', () => {
  it('sales_outcome=successful overrides appointment_status=declined → Successful badge', async () => {
    server.use(
      http.get('/api/prospects', () =>
        HttpResponse.json({ data: [makeProspect({ current_stage: 'sales', sales_outcome: 'successful', appointment_status: 'declined' })] })
      )
    );
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(screen.getByText('Successful')).toBeInTheDocument();
    });
    expect(screen.queryByText('Declined')).toBeNull();
  });

  it('sales_outcome=unsuccessful → Non-Successful badge', async () => {
    server.use(
      http.get('/api/prospects', () =>
        HttpResponse.json({ data: [makeProspect({ current_stage: 'sales', sales_outcome: 'unsuccessful' })] })
      )
    );
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(screen.getByText('Non-Successful')).toBeInTheDocument();
    });
  });

  it('appointment_status=scheduled (no sales_outcome) → Scheduled badge', async () => {
    server.use(
      http.get('/api/prospects', () =>
        HttpResponse.json({ data: [makeProspect({ current_stage: 'appointment', appointment_status: 'scheduled', sales_outcome: null })] })
      )
    );
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });
  });

  it('appointment_status=done (no sales_outcome) → Appointment Completed badge', async () => {
    server.use(
      http.get('/api/prospects', () =>
        HttpResponse.json({ data: [makeProspect({ current_stage: 'appointment', appointment_status: 'done', sales_outcome: null })] })
      )
    );
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(screen.getByText('Appointment Completed')).toBeInTheDocument();
    });
  });

  it('no appointment or sales fields → New Prospect badge', async () => {
    server.use(
      http.get('/api/prospects', () =>
        HttpResponse.json({ data: [makeProspect({ current_stage: 'prospect', appointment_status: null, sales_outcome: null })] })
      )
    );
    loginAs('mdrt_stars_agent');
    renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(screen.getByText('New Prospect')).toBeInTheDocument();
    });
  });
});

describe('Prospects — trainer is view-only', () => {
  it('trainer sees View buttons, not Edit, for prospects in their group', async () => {
    loginAs('mdrt_stars_trainer');
    renderWithProviders(<Prospects />);
    // Trainer gets p001 (Alice Tan) and p002 (Bob Lim) from mdrt_stars group via RLS
    await waitFor(() => {
      expect(screen.getByText('Alice Tan')).toBeInTheDocument();
    });
    // All action buttons should be "View" since trainer doesn't own any prospect
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    // "Edit" should not appear anywhere
    expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
  });
});

describe('Prospects — search filter', () => {
  it('filters by name in real time', async () => {
    loginAs('admin');
    renderWithProviders(<Prospects />);
    await waitFor(() => {
      expect(screen.getByText('Alice Tan')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'Bob');
    await waitFor(() => {
      expect(screen.queryByText('Alice Tan')).toBeNull();
      expect(screen.getByText('Bob Lim')).toBeInTheDocument();
    });
  });
});
