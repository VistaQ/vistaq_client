import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import { AuthProvider } from '../../context/AuthContext';
import Login from '../../pages/Login';

function renderLogin(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  // Clean up hash after each test
  window.location.hash = '';
});

describe('Login — renders', () => {
  it('renders the email input, password input and Sign In button', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows "Version 2.0" label', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText('Version 2.0')).toBeInTheDocument();
    });
  });

  it('has a Forgot Password link', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
    });
  });

  it('has a Register as a new Agent link', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /register as a new agent/i })).toBeInTheDocument();
    });
  });

  it('has a Contact Support link', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
    });
  });
});

describe('Login — failed login error', () => {
  it('shows "Sign In Failed" error banner on bad credentials', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 })
      )
    );
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@email.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Sign In Failed')).toBeInTheDocument();
    });
  });

  it('shows a "Forgot your password?" link inside the error banner', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 })
      )
    );
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@email.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Sign In Failed')).toBeInTheDocument();
    });
    // Inline "Forgot your password?" link appears in the error banner
    expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
  });

  it('shows a network error message on a network failure (no status)', async () => {
    server.use(
      // HttpResponse.error() simulates a network-level failure (no response from server).
      // This is the MSW v2 way — throwing in a handler does not produce a network error.
      http.post('/api/auth/login', () => HttpResponse.error())
    );
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // apiClient wraps network errors as { status: 0, message: 'Unable to connect...' }
    // The Login component shows an error banner (Sign In Failed or Connection Error)
    await waitFor(() => {
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows rate-limit warning on 429', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Too many requests' }, { status: 429 })
      )
    );
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many sign-in attempts/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('clears the error when the user types in the email field', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 })
      )
    );
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@email.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Sign In Failed')).toBeInTheDocument());

    // Typing into the email field should clear the error
    await userEvent.type(screen.getByLabelText(/email address/i), 'x');
    expect(screen.queryByText('Sign In Failed')).toBeNull();
  });
});
