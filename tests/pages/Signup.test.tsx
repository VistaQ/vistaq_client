import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import Signup from '../../pages/Signup';
import { AuthProvider } from '../../context/AuthContext';

function renderSignup() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Signup />
      </AuthProvider>
    </MemoryRouter>
  );
}

async function agreeToTerms() {
  const checkbox = screen.getByRole('checkbox');
  await userEvent.click(checkbox);
}

describe('Signup — form renders', () => {
  it('renders the registration form', async () => {
    renderSignup();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /register account/i })).toBeInTheDocument();
  });

  it('submit button is disabled until PDPA checkbox is checked', async () => {
    renderSignup();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register account/i })).toBeInTheDocument();
    });
    const submitBtn = screen.getByRole('button', { name: /register account/i });
    expect(submitBtn).toBeDisabled();

    await agreeToTerms();
    expect(submitBtn).not.toBeDisabled();
  });
});

describe('Signup — field validation', () => {
  it('shows all required field errors when submitting empty form', async () => {
    renderSignup();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register account/i })).toBeInTheDocument();
    });
    await agreeToTerms();
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));

    await waitFor(() => {
      expect(screen.getByText(/full name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/agent code is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a group/i)).toBeInTheDocument();
      expect(screen.getByText(/location is required/i)).toBeInTheDocument();
    });
  });

  it('name with 1 character triggers name error', async () => {
    renderSignup();
    await waitFor(() => expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument());
    await agreeToTerms();
    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'A');
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));
    await waitFor(() => {
      expect(screen.getByText(/full name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('blank email triggers email validation error', async () => {
    // Leave email blank — empty string fails EMAIL_REGEX without triggering
    // browser HTML5 form validation (which blocks submit for invalid-format strings)
    renderSignup();
    await waitFor(() => expect(screen.getByRole('button', { name: /register account/i })).toBeInTheDocument());
    await agreeToTerms();
    // Only fill name & agent code so other errors are present but email error still appears
    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'Jo');
    await userEvent.type(screen.getByPlaceholderText('e.g. AGT-12345'), 'AG001');
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('password shorter than 6 chars triggers password error', async () => {
    renderSignup();
    await waitFor(() => expect(screen.getByPlaceholderText(/min. 6 characters/i)).toBeInTheDocument());
    await agreeToTerms();
    await userEvent.type(screen.getByPlaceholderText(/min. 6 characters/i), 'abc');
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('valid form with no group selected triggers group error', async () => {
    renderSignup();
    await waitFor(() => expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument());
    await agreeToTerms();
    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'John Smith');
    await userEvent.type(screen.getByPlaceholderText('e.g. AGT-12345'), 'AG001');
    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'john@test.com');
    await userEvent.type(screen.getByPlaceholderText(/min. 6 characters/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText(/kuala lumpur/i), 'KL');
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));
    await waitFor(() => {
      expect(screen.getByText(/please select a group/i)).toBeInTheDocument();
    });
  });
});

describe('Signup — API error mapping', () => {
  it('409 (duplicate email) shows error on email field', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json({ message: 'Email already in use' }, { status: 409 })
      )
    );
    // Override groups to allow group selection
    server.use(
      http.get('/api/public/groups', () =>
        HttpResponse.json({ data: [{ id: 'g1', name: 'Test Group' }] })
      )
    );
    renderSignup();
    await waitFor(() => expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument());
    await agreeToTerms();
    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'John Smith');
    await userEvent.type(screen.getByPlaceholderText('e.g. AGT-12345'), 'AG001');
    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'john@test.com');
    await userEvent.type(screen.getByPlaceholderText(/min. 6 characters/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText(/kuala lumpur/i), 'KL');
    // Select group from dropdown once it loads
    await waitFor(() => expect(screen.getByRole('option', { name: 'Test Group' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByRole('combobox'), 'g1');
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));
    await waitFor(() => {
      // Signup.tsx maps 409 → "An account with this email already exists."
      expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('429 (rate limit) shows general error', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json({ message: 'Too many requests. Try again later.' }, { status: 429 })
      ),
      http.get('/api/public/groups', () =>
        HttpResponse.json({ data: [{ id: 'g1', name: 'Test Group' }] })
      )
    );
    renderSignup();
    await waitFor(() => expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument());
    await agreeToTerms();
    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'John Smith');
    await userEvent.type(screen.getByPlaceholderText('e.g. AGT-12345'), 'AG001');
    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'john@test.com');
    await userEvent.type(screen.getByPlaceholderText(/min. 6 characters/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText(/kuala lumpur/i), 'KL');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Test Group' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByRole('combobox'), 'g1');
    await userEvent.click(screen.getByRole('button', { name: /register account/i }));
    await waitFor(() => {
      // Signup.tsx maps 429 → "Too many registration attempts. Please wait a moment and try again."
      expect(screen.getByText(/too many registration attempts/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
