# Backend Task — Persist per-agent sales targets (FYCt & FYC)

**Project:** VistaQ API (`stg-api.vistaq.co`)
**Owner:** Backend
**Audience:** Written to be handed directly to an AI coding assistant (e.g. Claude) or a developer.

---

## 1. Goal

Let each agent's **FYCt target** and **FYC target** be:
1. Saved to the server (not just the user's browser), and
2. Returned per agent on the Sales Report endpoints,

so that a **Group Leader / Trainer / Master Trainer / Admin** viewing the **Group Sales Report** can see every agent's personal targets and progress against them.

---

## 2. Why this is needed (the problem today)

Right now, when an agent sets their targets on the **Profile** page, the frontend stores them **only in that agent's own browser `localStorage`**:

```
localStorage["salesTarget_<userId>"]  // FYCt target
localStorage["fycTarget_<userId>"]    // FYC target
```

Because this data lives in the agent's browser, **nobody else can read it** — a manager opening the Group Sales Report on their own device has no way to know what target each agent set. The values must live on the server instead.

---

## 3. What to build

### 3.1 Storage

Add two nullable numeric columns to the users table (or a dedicated `user_targets` table keyed by `user_id` + `year` if you prefer per-year targets):

| Column        | Type            | Notes                                  |
|---------------|-----------------|----------------------------------------|
| `fyct_target` | numeric / int   | FYCt annual target. Nullable.          |
| `fyc_target`  | numeric / int   | FYC annual target. Nullable.           |

> Per-year targets are a nice-to-have. If you keep it simple (one target per user), that's fine — the frontend does not currently pass a year when saving. If you do go per-year, default reads to the current year.

### 3.2 Save endpoint (used by the Profile page)

Allow a user to set **their own** targets. Reuse the existing user-update path if you have one, or add:

```
PUT /users/me/targets
Authorization: Bearer <token>
Content-Type: application/json

{
  "fyct_target": 300000,     // required, > 0
  "fyc_target": 250000       // optional; null/omitted clears it
}
```

Response: `200` with the saved values.

**Rules:**
- Any authenticated user may set **their own** targets.
- `fyct_target` must be a positive number.
- `fyc_target` is optional; accept `null` to clear it.
- (Managers setting other agents' targets is **out of scope** — not required.)

> If you'd rather fold this into the existing `PUT /users/{userId}` (self only), that's acceptable — just accept `fyct_target` / `fyc_target` in the body. Tell the frontend team which shape you chose.

### 3.3 Return the targets on the Sales Report endpoints

This is the key part the UI reads.

**a) `GET /sales-reports?year=YYYY`** — add the two fields to **each agent object** in the array:

| Field         | Type   | Meaning                                    |
|---------------|--------|--------------------------------------------|
| `fyct_target` | number \| null | That agent's FYCt target (null if unset) |
| `fyc_target`  | number \| null | That agent's FYC target (null if unset)  |

These must be returned for **every agent in the response**, respecting the existing role scoping of this endpoint (admin/master trainer = all; trainer = managed groups; group leader = own group).

**b) `GET /sales-reports/me?year=YYYY`** — add the same two fields for the calling user, so the individual Sales Report and Dashboard can read the agent's own target from the server.

---

## 4. Example responses

```jsonc
// GET /sales-reports?year=2026  (one array item shown)
{
  "id": "…", "agent_id": "…", "agent_code": "T75040K", "agent_name": "Melissa Adlina",
  "year": 2026,
  "ace_ytd": 620000, "noc_ytd": 18, "fyct_ytd": 295000, "fyc_ytd": 122000,
  "month_fyct": [ ... ], "month_fyc": [ ... ], "month_ace": [ ... ], "month_noc": [ ... ],
  "fyct_target": 300000,   // NEW
  "fyc_target": 250000     // NEW
}
```

```jsonc
// PUT /users/me/targets  request
{ "fyct_target": 300000, "fyc_target": 250000 }

// response
{ "success": true, "data": { "fyct_target": 300000, "fyc_target": 250000 } }
```

---

## 5. OpenAPI spec changes

Add to the `SalesReport` schema (used by both `/sales-reports` and `/sales-reports/me`):

```yaml
SalesReport:
  type: object
  properties:
    # ... existing fields ...
    fyct_target:
      type: number
      nullable: true
      description: The agent's FYCt annual target (set on their Profile). Null if unset.
      example: 300000
    fyc_target:
      type: number
      nullable: true
      description: The agent's FYC annual target (set on their Profile). Null if unset.
      example: 250000
```

And document the save endpoint (`PUT /users/me/targets` or the equivalent you chose) with the request body from section 3.2.

---

## 6. Acceptance criteria (verify on staging)

1. `PUT /users/me/targets` saves both values; fetching afterward returns them.
2. `fyct_target` rejects values `<= 0`; `fyc_target` accepts `null` to clear.
3. `GET /sales-reports?year=2026` returns `fyct_target` / `fyc_target` on **every** agent object, respecting existing role scoping.
4. `GET /sales-reports/me` returns the caller's own `fyct_target` / `fyc_target`.
5. Agents who never set a target return `null` for both (frontend then falls back to its default).
6. No regression to existing Sales Report fields.

---

## 7. Frontend status — already prepared (no coordinated release needed)

The frontend already reads `fyct_target` / `fyc_target` per agent on the Group Sales Report and falls back to a default (RM 400,000) when they're absent. So:

- **Ship the backend whenever it's ready** — the Group Sales Report will start showing real per-agent targets automatically once the fields appear.
- Until then, the UI shows the RM 400,000 default target for everyone.

**Two follow-ups the frontend team will do once this is live** (mentioning so you know the full picture — no action needed from backend):
1. Point the **Profile** page's "Save targets" at the new save endpoint instead of `localStorage`.
2. Read the individual Sales Report / Dashboard targets from `/sales-reports/me` instead of `localStorage`, and regenerate types (`npm run gen:types`) from the updated `openapi.yaml`.

When it's live on staging, let the frontend team know.

---

## 8. Out of scope

- Managers editing other users' targets (self-service only for now).
- Historical/per-month targets (annual target only).
