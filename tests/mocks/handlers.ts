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
  managed_group_ids: [] as string[],
}));

const allGroups = Object.values(td.groups).map((g: any) => ({
  id: g.id,
  name: g.name,
  leader_id: null as string | null,
  memberIds: [] as string[],
}));

const allProspects = (td as any).prospects ?? [];

// Attach trainer managed_group_ids based on the test data structure
const trainerGroupMap: Record<string, string[]> = {
  [td.users.mdrt_stars_trainer.id]: [td.groups.mdrt_stars.id],
  [td.users.kpi_busters_trainer.id]: [td.groups.kpi_busters.id],
  [td.users.power_rangers_trainer.id]: [td.groups.power_rangers.id],
};
allUsers.forEach(u => {
  if (trainerGroupMap[u.id]) u.managed_group_ids = trainerGroupMap[u.id];
});

// Assign group leaders
allGroups.forEach(g => {
  const leader = allUsers.find(u => u.group_id === g.id && u.role === 'group_leader');
  if (leader) g.leader_id = leader.id;
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

function scopedProspects(role: string, userId: string) {
  if (role === 'admin' || role === 'master_trainer') return allProspects;
  if (role === 'trainer') {
    const managedGroupIds = trainerGroupMap[userId] ?? [];
    return allProspects.filter((p: any) => p.group_id && managedGroupIds.includes(p.group_id));
  }
  if (role === 'group_leader' || role === 'agent') {
    return allProspects.filter((p: any) => p.agent_id === userId);
  }
  return [];
}

function getCurrentUser(_request: Request) {
  return (globalThis as any).__testCurrentUser ?? null;
}

export const handlers = [
  // ─── Auth ───
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

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as any;
    const user = { id: 'new-user-id', name: body.fullName, email: body.email, role: 'agent', agent_code: body.agentCode, group_id: body.groupId, managed_group_ids: [] };
    return HttpResponse.json({ data: { user, token: 'test-token' } });
  }),

  http.post(`${BASE}/auth/forgot-password`, () => HttpResponse.json({ success: true })),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({})),

  // ─── Users ───
  http.get(`${BASE}/users`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ data: scopedUsers(user.role, user.id) });
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: { id: 'new-user-id', ...body } });
  }),

  http.put(`${BASE}/users/:id`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: body });
  }),

  http.delete(`${BASE}/users/:id`, () => new HttpResponse(null, { status: 204 })),

  http.patch(`${BASE}/users/me/password`, () => HttpResponse.json({ success: true })),

  // ─── Groups ───
  http.get(`${BASE}/groups`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ data: scopedGroups(user.role, user.id) });
  }),

  http.post(`${BASE}/groups`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: { id: 'new-group-id', ...body } });
  }),

  http.put(`${BASE}/groups/:groupId`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: body });
  }),

  http.delete(`${BASE}/groups/:groupId`, () => new HttpResponse(null, { status: 204 })),

  // ─── Group stats ───
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

  // ─── Dashboard stats ───
  http.get(`${BASE}/dashboard/stats`, () => HttpResponse.json({ data: {} })),

  // ─── Events ───
  http.get(`${BASE}/events`, () => HttpResponse.json({ data: [] })),
  http.post(`${BASE}/events`, () => HttpResponse.json({ data: { id: 'new-event-id' } })),
  http.put(`${BASE}/events/:id`, () => HttpResponse.json({ data: {} })),
  http.delete(`${BASE}/events/:id`, () => new HttpResponse(null, { status: 204 })),

  // ─── Coaching sessions ───
  http.get(`${BASE}/coaching-sessions`, () => HttpResponse.json({ data: [] })),

  // ─── Prospects ───
  http.get(`${BASE}/prospects`, ({ request }) => {
    const user = getCurrentUser(request);
    if (!user) return HttpResponse.json({ data: [] });
    return HttpResponse.json({ data: scopedProspects(user.role, user.id) });
  }),

  http.get(`${BASE}/prospects/:id`, ({ params }) => {
    const prospect = allProspects.find((p: any) => p.id === params.id);
    if (!prospect) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({ data: prospect });
  }),

  http.post(`${BASE}/prospects`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: { id: 'new-prospect-id', ...body } });
  }),

  http.put(`${BASE}/prospects/:id`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: body });
  }),

  http.delete(`${BASE}/prospects/:id`, () => new HttpResponse(null, { status: 204 })),

  // ─── Config ───
  http.get(`${BASE}/config/points`, () => HttpResponse.json({ data: {} })),
  http.get(`${BASE}/config/badges`, () => HttpResponse.json({ data: [] })),
  http.put(`${BASE}/config/points`, () => HttpResponse.json({ data: {} })),
];
