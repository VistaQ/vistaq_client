import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@lottiefiles/react-lottie-player', () => ({
  Player: () => null,
}));
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { loginAs } from '../mocks/auth';
import PointsHistory from '../../pages/PointsHistory';
import { AuthProvider } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DataProvider>{ui}</DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const BASE = '/api';

const agentPointsFixture = {
  success: true,
  data: {
    total: 1,
    categories: { prospect: 1, sales: 0, coaching: 0 },
    breakdown: [
      {
        id: 'entry-001',
        date: '2026-04-01T10:00:00.000Z',
        category: 'prospect',
        action: 'Prospect Added',
        subject: 'Alice Tan',
        points: 3,
      },
      {
        id: 'entry-002',
        date: '2026-04-10T12:00:00.000Z',
        category: 'prospect',
        action: 'Prospect Deleted',
        subject: null,
        points: -3,
      },
    ],
    pagination: { page: 1, limit: 100, total_count: 2, total_pages: 1 },
  },
};

describe('PointsHistory', () => {
  it('renders without crashing for an agent', async () => {
    loginAs('mdrt_stars_agent');
    server.use(
      http.get(`${BASE}/agent-points`, () => HttpResponse.json(agentPointsFixture))
    );

    const { container } = renderWithProviders(<PointsHistory />);
    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it('shows positive-points rows with a "+" prefix in a green badge', async () => {
    loginAs('mdrt_stars_agent');
    server.use(
      http.get(`${BASE}/agent-points`, () => HttpResponse.json(agentPointsFixture))
    );

    renderWithProviders(<PointsHistory />);

    // Open the Prospect Management history modal (first of three "See Points History →" buttons)
    await waitFor(() =>
      expect(screen.getAllByText('See Points History →')[0]).toBeInTheDocument()
    );
    await userEvent.click(screen.getAllByText('See Points History →')[0]);

    // Regular row: shows prospect name and "+3 pts" in green
    await waitFor(() => expect(screen.getByText('Alice Tan')).toBeInTheDocument());
    const positiveBadge = screen.getByText('+3 pts');
    expect(positiveBadge).toBeInTheDocument();
    expect(positiveBadge.className).toMatch(/green/);
  });

  it('shows prospect_deleted rows with "(deleted prospect)" and a negative red badge', async () => {
    loginAs('mdrt_stars_agent');
    server.use(
      http.get(`${BASE}/agent-points`, () => HttpResponse.json(agentPointsFixture))
    );

    renderWithProviders(<PointsHistory />);

    await waitFor(() =>
      expect(screen.getAllByText('See Points History →')[0]).toBeInTheDocument()
    );
    await userEvent.click(screen.getAllByText('See Points History →')[0]);

    // Deletion row: shows "(deleted prospect)" fallback
    await waitFor(() =>
      expect(screen.getByText('(deleted prospect)')).toBeInTheDocument()
    );

    // Points badge shows the negative number with no "+" prefix
    const negativeBadge = screen.getByText('-3 pts');
    expect(negativeBadge).toBeInTheDocument();
    expect(negativeBadge.className).toMatch(/rose/);
    // Must NOT show "+-3 pts"
    expect(screen.queryByText('+-3 pts')).not.toBeInTheDocument();
  });
});
