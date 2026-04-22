import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';
import { logoutTestUser } from './mocks/auth';

// Increase the default waitFor / findBy* timeout from 1000ms to 5000ms.
// Auth context + MSW response chain can exceed 1s in the jsdom environment.
configure({ asyncUtilTimeout: 5000 });

// jsdom 29 + Vitest 4 can produce a read-only localStorage stub when
// --localstorage-file is not configured. Polyfill with a real in-memory
// implementation so setItem / removeItem / clear all work as expected.
const createLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string)            => store[key] ?? null,
    setItem:    (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string)            => { delete store[key]; },
    clear:      ()                       => { store = {}; },
    get length()                         { return Object.keys(store).length; },
    key:        (i: number)              => Object.keys(store)[i] ?? null,
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorage(),
  configurable: true,
  writable: true,
});

// Start MSW before all tests, reset handlers after each, stop after all
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  logoutTestUser();
  localStorage.clear();
});
afterAll(() => server.close());
