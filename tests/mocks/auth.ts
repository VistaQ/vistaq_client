import td from '../fixtures/testData.json';

type UserKey = keyof typeof td.users;

/**
 * Sets up localStorage and the global user so MSW handlers return
 * role-scoped data for the given user.
 *
 * Call this at the top of a test or in beforeEach.
 */
export function loginAs(userKey: UserKey) {
  const raw = td.users[userKey] as any;
  const user = {
    id: raw.id,
    name: raw.name ?? raw.email.split('@')[0],
    email: raw.email,
    role: raw.role,
    agent_code: raw.agentCode ?? null,
    group_id: raw.groupId ?? null,
    managed_group_ids: [],
  };

  localStorage.setItem('authToken', 'test-token');
  localStorage.setItem('authUser', JSON.stringify(user));
  (globalThis as any).__testCurrentUser = user;

  return user;
}

export function logoutTestUser() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  (globalThis as any).__testCurrentUser = null;
}
