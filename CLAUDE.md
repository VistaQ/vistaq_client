# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build (Vite)
npm run test         # Run all tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint
npx tsc --noEmit     # Type-check without emitting files
npm run gen:types    # Regenerate types.generated.ts from openapi.yaml
```

Run a single test file:
```bash
npm run test -- tests/pages/Prospects.test.tsx
```

---

## Architecture

**Stack:** React 19 SPA, Vite 6, TypeScript, Tailwind CSS (loaded via CDN in `index.html` — not npm). No SSR, no server components.

**Deployment:** Vercel (Singapore). Branch workflow: `feat/*` → `staging` → `main` (production). Always create a feature branch; never commit directly to `staging`.

**External API:** `stg-api.vistaq.co` — all calls go through `services/apiClient.ts`. The `apiCall()` wrapper handles JWT auth (`Authorization: Bearer <token>` from localStorage), multi-tenancy (`X-Tenant-Slug` header derived from subdomain or `VITE_TENANT_SLUG` env var), 401 redirect, and error normalisation.

---

## State Management

Two global React Contexts, both defined at the root in `App.tsx`:

- **`AuthContext`** (`context/AuthContext.tsx`) — current user, login/logout/register, user/group CRUD, global notification toast. Uses `useNavigate` internally, so every component tree wrapping `AuthProvider` must also be inside a Router.
- **`DataContext`** (`context/DataContext.tsx`) — prospects, events, coaching sessions, dashboard stats, group stats, badge tiers, point config. Fetches on mount; the `getProspectsByScope(user)` helper enforces role-based data isolation on the frontend (mirrors backend RLS).

Both contexts read/write `localStorage` for the auth token and cached user object. Session is restored on mount via `GET /auth/me`.

---

## Role System

Roles are defined in `types.ts` as `UserRole` enum: `ADMIN`, `MASTER_TRAINER`, `TRAINER`, `GROUP_LEADER`, `AGENT`.

Key permission rules applied consistently across the codebase:

| Capability | ADMIN | MASTER_TRAINER | TRAINER | GROUP_LEADER | AGENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Prospect add/edit/delete | ❌ (view only) | ❌ | ❌ | ✅ (own group) | ✅ (own) |
| Export Excel | ✅ | ❌ | ❌ | ✅ | ✅ |
| View prospects | ✅ all | ✅ all | ✅ managed groups | ✅ own group | ✅ own |
| Admin pages (`/users`, `/admin-groups`, `/admin-rewards`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| My Sales / My Points | ❌ | ❌ | ❌ | ✅ | ✅ |

`isViewOnly` in `ProspectCard.tsx` currently marks Admin as view-only for prospects (line 130). This is intentional — admin oversight happens through other pages, not the prospect card.

Route guards: `ProtectedRoute` (requires auth) and `AdminRoute` (requires `ADMIN` role) in `components/`.

---

## Types

`types.ts` is the single source of truth for all application types. Domain types (`User`, `Prospect`, `Event`, etc.) wrap generated types from `types.generated.ts` (produced by `openapi-typescript` from `openapi.yaml`).

Use `ProspectCreateBody` / `ProspectUpdateBody` (re-exported from `types.ts`) as the payload shapes for API calls — these are compiler-enforced from the OpenAPI spec.

---

## Testing

**Stack:** Vitest 4 + Testing Library + MSW 2 (mock service worker) + jsdom 29.

Key setup facts:
- `tests/setup.ts` — global config: localStorage polyfill (jsdom 29 regression workaround), `asyncUtilTimeout: 5000`, MSW server lifecycle.
- `tests/mocks/handlers.ts` — all MSW route handlers, driven by `tests/fixtures/testData.json`.
- `tests/mocks/auth.ts` — `loginAs(userKey)` helper: sets `localStorage` + `globalThis.__testCurrentUser` so MSW handlers return the right scoped data.
- `vite.config.ts` sets `VITE_API_URL: ""` for the test environment so `apiClient` uses relative `/api` paths that MSW can intercept (staging URL would bypass MSW entirely).
- Every test that renders `AuthProvider` must also wrap with `MemoryRouter` — `AuthContext` calls `useNavigate` internally.

Pattern for page tests:
```tsx
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DataProvider>{ui}</DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}
```

---

## Key Files

| File | Purpose |
|---|---|
| `services/apiClient.ts` | All HTTP calls — JWT auth, tenant slug, error normalisation |
| `context/AuthContext.tsx` | Auth state + user/group mutations |
| `context/DataContext.tsx` | All app data (prospects, events, coaching, stats) |
| `types.ts` | All domain types — wraps `types.generated.ts` |
| `types.generated.ts` | Auto-generated from `openapi.yaml` — do not edit manually |
| `constants/tokens.ts` | Design tokens and default badge tiers |
| `components/ProspectCard.tsx` | Full prospect add/edit/view modal — owns all stage logic |
| `components/Layout.tsx` | Sidebar nav with role-based item visibility |
| `utils/roleUtils.ts` | Role helper functions |

---

## Environment Variables

`.env` (gitignored) — required for local dev:
```
VITE_API_URL=https://stg-api.vistaq.co/api
VITE_TENANT_SLUG=stg-app
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_EMAILJS_TEMPLATE_SUPPORT_ADMIN_ID=...
VITE_EMAILJS_TEMPLATE_SUPPORT_REPLY_ID=...
```

`.env.test` (committed) — overrides `VITE_API_URL=""` for test runs so MSW intercepts all requests.
