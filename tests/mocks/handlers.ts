import { http, HttpResponse } from 'msw';
import td from '../fixtures/testData.json';

const BASE = '/api';

// Flatten users into an array with snake_case field names matching the API contract
const allUsers = Object.values(td.users).map((u: any) => ({
  id: u.id,
  name: u.name ?? u.email.split('@')[0],
  email: u.email,
  role: u.role,
  agent_code: u.agentCode ?? null,
  group_id: u.groupId ?? null,
  managed_group_ids: [],
}));

const allGroups = Object.values(td.groups).map((g: any) => ({
  id: g.id,
  name: g.name,
  leader_id: null,
  memberIds: [],
}));

// Attach trainer managed_group_ids based on the test data structure
const trainerGroupMap: Record<string, string[]> = {
  [td.users.mdrt_stars_trainer.id]: [td.groups.mdrt_stars.id],
  [td.users.kpi_busters_trainer.id]: [td.groups.kpi_busters.id],
  [td.users.power_rangers_trainer.id]: [td.groups.power_rangers.id],
};
allUsers.forEach(u => {
  if (trainerGroupMap[u.id]) u.managed_group_ids = trainerGroupMap[u.id];
});

/**
 * Returns only what the given role is allowed to see — simulating backend RLS.
 */
function scopedUsers(role: string, userId: string) {
  if (role === 'admin' || role === 'master_trainer') return allUsers;
  if (role === 'trainer') {
    const managedGroupIds = trainerGroupMap[userId] ?? [];
    return allUsers.filter(u => u.group_id && managedGroupIds.includes(u.group_id));
  }
  if (role === 'group_leader') {
    const leader = allUsers.find(u => u.id === userId);
    return allUsers.filter(u => u.group_id === leader?.group_id);
  }
  return allUsers.filter(u => u.id === userId);
}

function scopedGroups(role: string, userId: string) {
  if (role === 'admin' || role === 'master_trainer') return allGroups;
  if (role === 'trainer') {
    const managedGroupIds = trainerGroupMap[userId] ?? [];
    return allGroups.filter(g => managedGroupIds.includes(g.id));
  }
  if (role === 'group_leader') {
    const leader = allUsers.find(u => u.id === userId);
    return allGroups.filter(g => g.id === leader?.group_id);
  }
  return [];
}

// Helper to extract current user from Authorization header (set in tests via localStorage mock)
function getCurrentUser(request: Request) {
  // In tests we store the user object in a global so handlers can read it
  return (globalThis as any).__testCurrentUser ?? null;
}

export const handlers = [
  // Auth
  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ data: user });
  }),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    const user = allUsers.find(u => u.email === body.email);
    if (!user) return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    return HttpResponse.json({ data: { user, token: 'test-token' } });
  }),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({})),

  // Users
  http.get(`${BASE}/users`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ data: scopedUsers(user.role, user.id) });
  }),

  // Groups
  http.get(`${BASE}/groups`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ data: scopedGroups(user.role, user.id) });
  }),

  // Group stats (management dashboard)
  http.get(`${BASE}/groups/stats`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const groups = scopedGroups(user.role, user.id);
    return HttpResponse.json({
      data: groups.map(g => ({
        group_id: g.id,
        group_name: g.name,
        ytd_prospects: 0,
        ytd_appointments_set: 0,
        ytd_sales_meetings: 0,
        ytd_sales_noc: 0,
        ytd_sales_ace: 0,
        ytd_agents_count: 0,
      })),
    });
  }),

  // Group detail stats
  http.get(`${BASE}/groups/:groupId/stats`, ({ params }) => {
    const group = allGroups.find(g => g.id === params.groupId);
    if (!group) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({
      data: {
        group_id: group.id,
        group_name: group.name,
        ytd: { prospects: 0, appointments_set: 0, sales_meetings: 0, sales_noc: 0, sales_ace: 0, agents_count: 0 },
        agents: [],
      },
    });
  }),

  // Dashboard stats
  http.get(`${BASE}/dashboard/stats`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ data: {} });
  }),

  // Events
  http.get(`${BASE}/events`, () => HttpResponse.json({ data: [] })),
  http.post(`${BASE}/events`, () => HttpResponse.json({ data: {} })),

  // Coaching sessions
  http.get(`${BASE}/coaching-sessions`, () => HttpResponse.json({ data: [] })),

  // Prospects
  http.get(`${BASE}/prospects`, () => HttpResponse.json({ data: [] })),

  // Points config
  http.get(`${BASE}/config/points`, () => HttpResponse.json({ data: {} })),
  http.get(`${BASE}/config/badges`, () => HttpResponse.json({ data: [] })),
];
