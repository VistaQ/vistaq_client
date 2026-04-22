import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import { AuthProvider } from '../../context/AuthContext';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';

function renderForgotPassword() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ForgotPasswordPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage — renders', () => {
  it('renders the email input and Send Reset Link button', async () => {
    renderForgotPassword();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('has a Back to Login link', async () => {
    renderForgotPassword();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });
});

describe('ForgotPasswordPage — submit', () => {
  it('shows "Check your inbox" success state after submitting a valid email', async () => {
    renderForgotPassword();
    await waitFor(() => expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      // Use heading role to avoid ambiguity with the paragraph that also mentions inbox
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows an error message when the API fails', async () => {
    server.use(
      http.post('/api/auth/forgot-password', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    );
    renderForgotPassword();
    await waitFor(() => expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
