# Backend Task — Enrich `GET /leaderboard/stats` with sales metrics

**Project:** VistaQ API (`stg-api.vistaq.co`)
**Owner:** Backend
**Status:** Frontend already prepared & deployed to staging — backend is the only remaining piece.
**Audience:** This document is written to be handed directly to an AI coding assistant (e.g. Claude) or a developer.

---

## 1. Goal

Make the Leaderboard's four sales metrics — **ACE, FYCt, FYC, and ACS** — populate correctly for **every role**: admin, master trainer, trainer, group leader, **and agent**.

---

## 2. Why this is needed (the problem today)

The Leaderboard ranks **all** individuals and groups in the tenant. Today the four sales metrics are sourced on the frontend from `GET /sales-reports`, which is **role-scoped**:

- `agent` → receives `403` (no access at all)
- `trainer` → only agents in their managed groups
- `group_leader` → only their own group
- `admin` / `master_trainer` → full tenant

Because of this, on the leaderboard most agents rank as **0** for ACE/FYCt/FYC/ACS, and agents see all zeros. The correct fix is to serve these numbers **on the leaderboard endpoint itself**, which is already tenant-wide and role-agnostic.

---

## 3. What to change

Enrich the existing endpoint:

```
GET /leaderboard/stats?period={mtd|ytd}
```

Add **period-aware** sales fields to each object in the response.

> **"Period-aware"** means the value is already sliced to the requested `period` — exactly how the existing `prospects_added` and `sales_successful` fields already behave on this endpoint.
> - `period=mtd` → value for the current month only
> - `period=ytd` → value for January through the current month
>
> The frontend does **no** month-array math; it reads these values directly.

### 3.1 Add to each item in `data.individual[]`

| Field  | Type   | Meaning                                              |
|--------|--------|-----------------------------------------------------|
| `ace`  | number | ACE for the requested period                        |
| `fyct` | number | FYCt for the requested period                       |
| `fyc`  | number | FYC for the requested period                        |

> **ACS is NOT needed** — the frontend derives it as `ace / sales_successful`.

### 3.2 Add to each item in `data.groups[]` (group aggregate)

| Field  | Type   | Meaning                                  |
|--------|--------|------------------------------------------|
| `ace`  | number | Sum of member ACE for the period         |
| `fyct` | number | Sum of member FYCt for the period        |
| `fyc`  | number | Sum of member FYC for the period         |

> Group fields are a **nice-to-have**: if omitted, the frontend will sum the members' individual values instead. Supplying them is cleaner and is required if `data.individual[]` does not already contain every group member.

### 3.3 ⚠️ Critical scoping requirement

These new fields must be returned **for every individual and group in the response, regardless of the caller's role — including when the caller is an `agent`.**

The leaderboard is a **tenant-wide, read-only ranking**. An agent must receive everyone's `ace`/`fyct`/`fyc` (ranking data only), even though agents remain `403` on `/sales-reports`. **This is the whole point of the change** — do not apply the `/sales-reports` role scoping to these fields.

---

## 4. Data source

Use the same sources the bulk `/sales-reports` endpoint already reads:

- **YTD** values → `sales_report_ytd`
- **MTD** values → `sales_report_mtd` (for ACE / NOC) and the `sales_report_mtd_fyc` view (for FYC / FYCt, which derives MTD from YTD via `LAG()`)

Return the value matching the requested `period`. Join per agent on the existing leaderboard rows; aggregate per group for the group rows.

---

## 5. Example response

```jsonc
// GET /leaderboard/stats?period=ytd
{
  "success": true,
  "data": {
    "period": "ytd",
    "generated_at": "2026-06-26T08:00:00.000Z",
    "individual": [
      {
        "user_id": "9b1deb4d-...",
        "name": "Alex Agent",
        "group_id": "7c9e6679-...",
        "total_points": 142,
        "prospects_added": 30,
        "sales_successful": 7,
        "ace": 620000,     // NEW — period-aware
        "fyct": 295000,    // NEW
        "fyc": 122000      // NEW
      }
    ],
    "groups": [
      {
        "group_id": "7c9e6679-...",
        "group_name": "MDRT Stars",
        "total_points": 980,
        "prospects_added": 210,
        "sales_successful": 44,
        "ace": 3100000,    // NEW — sum of members for the period
        "fyct": 1450000,   // NEW
        "fyc": 610000      // NEW
      }
    ]
  }
}
```

---

## 6. OpenAPI spec changes

Add the three fields to both schemas (names may differ slightly in your spec — match the existing ones used by `/leaderboard/stats`).

```yaml
LeaderboardStatsIndividualObject:
  type: object
  properties:
    # ... existing fields (user_id, name, group_id, total_points,
    #     prospects_added, sales_successful) ...
    ace:
      type: number
      description: >
        ACE for the requested period (period-aware: MTD = current month,
        YTD = Jan→current month). Returned for every user regardless of caller role.
      example: 620000
    fyct:
      type: number
      description: FYCt for the requested period (period-aware).
      example: 295000
    fyc:
      type: number
      description: FYC for the requested period (period-aware).
      example: 122000

LeaderboardStatsGroupObject:
  type: object
  properties:
    # ... existing fields (group_id, group_name, total_points,
    #     prospects_added, sales_successful) ...
    ace:
      type: number
      description: Sum of member ACE for the requested period (period-aware).
      example: 3100000
    fyct:
      type: number
      description: Sum of member FYCt for the requested period (period-aware).
      example: 1450000
    fyc:
      type: number
      description: Sum of member FYC for the requested period (period-aware).
      example: 610000
```

---

## 7. Acceptance criteria (verify on staging)

1. `GET /leaderboard/stats?period=ytd` and `?period=mtd` each return `ace`, `fyct`, `fyc` on **every** `individual[]` and `groups[]` item.
2. Values match what `/sales-reports` reports for the same agent/period — spot-check 2–3 agents.
3. Logged in **as an `agent`**, the response still includes these fields for **all other** agents (not just the caller).
4. `mtd` vs `ytd` return correctly different values.
5. No regression to existing fields (`total_points`, `prospects_added`, `sales_successful`).

---

## 8. Frontend status — already done (no coordinated release needed)

The frontend already reads `entry.ace` / `entry.fyct` / `entry.fyc` (and the group equivalents) **if present**, and falls back to the old `/sales-reports` behavior if they are absent.

This means:
- **Ship the backend whenever it's ready** — no frontend deploy needs to be timed with it. The leaderboard starts populating automatically once the fields appear in the response.
- Today (fields absent): admin/master trainer still work via the fallback; agents stay at `0`.
- After backend ships: all roles populate, agents included.

Once it's live on staging, tell the frontend team so they can:
1. Regenerate types from the updated `openapi.yaml` (`npm run gen:types`).
2. Optionally remove the now-redundant `/sales-reports` fallback in the Leaderboard.

---

## 9. Out of scope

- No change to `/sales-reports` — its role scoping stays as-is (it is still used by the Sales Report and Group Sales Report pages).
- No frontend changes required from the backend developer.
