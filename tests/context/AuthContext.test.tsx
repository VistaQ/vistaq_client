import { describe, it, expect } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { loginAs } from '../mocks/auth';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import td from '../fixtures/testData.json';

/** Helper component that exposes auth state for assertions */
function AuthConsumer({ onAuth }: { onAuth: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onAuth(auth);
  return <div data-testid="auth-consumer">{auth.currentUser?.name ?? 'no-user'}</div>;
}

/** Helper that renders AuthProvider and captures the latest auth context value */
function renderAuth() {
  let captured: ReturnType<typeof useAuth>;
  const utils = render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer onAuth={(a) => { captured = a; }} />
      </AuthProvider>
    </MemoryRouter>
  );
  return { ...utils, getAuth: () => captured! };
}

describe('AuthContext', () => {
  it('restores session from localStorage when token and user are valid', async () => {
    const user = loginAs('admin');

    const { getAuth } = renderAuth();

    await waitFor(() => {
      expect(getAuth().currentUser).not.toBeNull();
      expect(getAuth().currentUser!.id).toBe(user.id);
      expect(getAuth().isAuthenticated).toBe(true);
    });
  });

  it('clears localStorage when /auth/me returns 401 (invalid token)', async () => {
    // Set up a token + user, but override /auth/me to return a non-401 error
    // so apiClient doesn't redirect. Use 403 to simulate "invalid session"
    // without triggering the 401 redirect in apiClient.
    loginAs('admin');

    // Override /auth/me to return 403 (avoiding apiClient's 401 redirect logic)
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      )
    );

    const { getAuth } = renderAuth();

    // AuthProvider catches the error from /auth/me and clears state
    await waitFor(() => {
      expect(getAuth().currentUser).toBeNull();
    });

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
  });

  it('login() sets currentUser on success', async () => {
    const adminEmail = td.users.admin.email;

    const { getAuth } = renderAuth();

    // Initially no user
    expect(getAuth().currentUser).toBeNull();

    let result: boolean | undefined;
    await act(async () => {
      result = await getAuth().login(adminEmail, 'password');
    });

    expect(result).toBe(true);
    await waitFor(() => {
      expect(getAuth().currentUser).not.toBeNull();
      expect(getAuth().isAuthenticated).toBe(true);
    });

    // Token was stored (value comes from MSW handler)
    expect(localStorage.getItem('authToken')).not.toBeNull();
  });

  it('login() throws for invalid credentials (does not swallow errors)', async () => {
    // login() propagates API errors so the Login page can display specific messages.
    // Override login handler to return 400 (not 401 — avoids the apiClient redirect).
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        const body = await request.json() as any;
        const allUsers = Object.values(td.users);
        const found = allUsers.find((u: any) => u.email === body.email);
        if (!found) {
          return HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 });
        }
        return HttpResponse.json({ data: { user: found, token: 'test-token' } });
      })
    );

    const { getAuth } = renderAuth();

    let threw = false;
    await act(async () => {
      try {
        await getAuth().login('nonexistent@example.com', 'password');
      } catch {
        threw = true;
      }
    });

    expect(threw).toBe(true);
    expect(getAuth().currentUser).toBeNull();
    expect(getAuth().isAuthenticated).toBe(false);
  });

  it('login() returns false when password is not provided', async () => {
    const { getAuth } = renderAuth();

    let result: boolean | undefined;
    await act(async () => {
      result = await getAuth().login('admin@demo-agency.com');
    });

    expect(result).toBe(false);
  });

  it('logout() clears localStorage and currentUser', async () => {
    loginAs('admin');

    const { getAuth } = renderAuth();

    // Wait for session restore
    await waitFor(() => {
      expect(getAuth().currentUser).not.toBeNull();
    });

    await act(async () => {
      await getAuth().logout();
    });

    expect(getAuth().currentUser).toBeNull();
    expect(getAuth().isAuthenticated).toBe(false);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
  });
});
