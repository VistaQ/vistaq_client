import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs, logoutTestUser } from '../mocks/auth';
import { AuthProvider } from '../../context/AuthContext';
import Support from '../../pages/Support';

function renderSupport() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Support />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Support — renders for authenticated user', () => {
  it('renders the Support Centre heading for an agent', async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    await waitFor(() => {
      expect(screen.getByText('Support Centre')).toBeInTheDocument();
    });
  });

  it('renders the Support Centre heading when unauthenticated', async () => {
    logoutTestUser();
    renderSupport();
    await waitFor(() => {
      expect(screen.getByText('Support Centre')).toBeInTheDocument();
    });
  });

  it('shows Back to Login link when user is not logged in', async () => {
    logoutTestUser();
    renderSupport();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  it('does NOT show Back to Login link when user is logged in', async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    // Wait for auth to settle (AuthContext reads from localStorage asynchronously)
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /back to login/i })).toBeNull();
    }, { timeout: 5000 });
  });
});

describe('Support — form fields', () => {
  it('shows Full Name, Phone Number, and Email Address fields', async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('+60 12-345 6789')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
  });

  it('shows a message textarea', async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/describe your issue/i)
      ).toBeInTheDocument();
    });
  });

  it('shows the Type of Problem dropdown', async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('shows the Submit Enquiry button', async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit enquiry/i })).toBeInTheDocument();
    });
  });
});

describe('Support — pre-fills from currentUser', () => {
  it("pre-fills the name field with the logged-in user's name", async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    // AuthContext restores currentUser from localStorage via useEffect; Support syncs via its own useEffect
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Your full name') as HTMLInputElement;
      expect(nameInput.value).toBe('Alex Agent');
    }, { timeout: 5000 });
  });

  it("pre-fills the email field with the logged-in user's email", async () => {
    loginAs('mdrt_stars_agent');
    renderSupport();
    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
      expect(emailInput.value).toBe('agent.mdrt@demo-agency.com');
    }, { timeout: 5000 });
  });
});
