import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import ResetPasswordPage from '../../pages/ResetPasswordPage';

const VALID_PASSWORD = 'Abc123!';
const TEST_TOKEN = 'test-access-token-abc';

function setHash(hash: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hash },
    writable: true,
    configurable: true,
  });
}

function renderReset() {
  return render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  setHash(`#access_token=${TEST_TOKEN}&type=recovery`);
});

afterEach(() => {
  setHash('');
});

describe('ResetPasswordPage — no token', () => {
  it('shows "Invalid reset link" when there is no token in the hash', async () => {
    setHash('');
    renderReset();
    await waitFor(() => {
      expect(screen.getByText('Invalid reset link')).toBeInTheDocument();
    });
  });

  it('shows a Back to Login button on the invalid-link state', async () => {
    setHash('');
    renderReset();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });
});

describe('ResetPasswordPage — form with valid token', () => {
  it('shows "Set new password" heading when a token is present', async () => {
    renderReset();
    await waitFor(() => {
      expect(screen.getByText('Set new password')).toBeInTheDocument();
    });
  });

  it('shows the Reset Password submit button', async () => {
    renderReset();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  it('shows password criteria checklist when the user starts typing', async () => {
    renderReset();
    await waitFor(() => expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument());

    const [newPwInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwInput, 'a');

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
      expect(screen.getByText(/one special character/i)).toBeInTheDocument();
    });
  });
});

describe('ResetPasswordPage — validation', () => {
  it('shows error when password is too short', async () => {
    renderReset();
    await waitFor(() => expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument());

    const [newPwInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwInput, 'Ab1!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderReset();
    await waitFor(() => expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument());

    const [newPwInput, confirmPwInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwInput, VALID_PASSWORD);
    await userEvent.type(confirmPwInput, 'DifferentPass1!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});

describe('ResetPasswordPage — API responses', () => {
  it('shows "Password reset successful" on success', async () => {
    renderReset();
    await waitFor(() => expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument());

    const [newPwInput, confirmPwInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwInput, VALID_PASSWORD);
    await userEvent.type(confirmPwInput, VALID_PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password reset successful')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows "Reset link is invalid or expired" on 500 error', async () => {
    server.use(
      http.post('/api/auth/reset-password', () =>
        HttpResponse.json({ message: 'Invalid token' }, { status: 500 })
      )
    );
    renderReset();
    await waitFor(() => expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument());

    const [newPwInput, confirmPwInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwInput, VALID_PASSWORD);
    await userEvent.type(confirmPwInput, VALID_PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/reset link is invalid or expired/i)).toBeInTheDocument();
    });
  });

  it('shows a generic error message on other API failures', async () => {
    server.use(
      http.post('/api/auth/reset-password', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 503 })
      )
    );
    renderReset();
    await waitFor(() => expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument());

    const [newPwInput, confirmPwInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwInput, VALID_PASSWORD);
    await userEvent.type(confirmPwInput, VALID_PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
