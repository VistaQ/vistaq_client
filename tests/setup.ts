import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';
import { logoutTestUser } from './mocks/auth';

// Start MSW before all tests, reset handlers after each, stop after all
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  logoutTestUser();
  localStorage.clear();
});
afterAll(() => server.close());
