# CR: Add `total_points` to GET /leaderboard/stats Response

## Background

The `GET /leaderboard/stats` endpoint currently returns raw activity counts per agent and per group. The frontend is responsible for multiplying these counts by point config values to derive a score. This means the frontend must fetch and hold `pointConfig` just to render the Leaderboard, and any future change to the point multipliers (e.g. coaching points) would require additional frontend work.

## Requested Change

Add a pre-computed `total_points` field to both `LeaderboardStatsIndividualObject` and `LeaderboardStatsGroupObject` in the response.

### `LeaderboardStatsIndividualObject` — add field

```
total_points: integer
  description: Pre-computed total points for this agent in the period,
               calculated server-side using the tenant's current point config.
  example: 26
```

### `LeaderboardStatsGroupObject` — add field

```
total_points: integer
  description: Aggregated total points for all members of this group in the period,
               calculated server-side using the tenant's current point config.
  example: 52
```

## Rationale

- Point calculation logic lives in one place (backend) instead of being duplicated on the frontend
- Frontend no longer needs to fetch point config just to render the Leaderboard
- Future point categories (e.g. coaching, sales completion) are automatically reflected without frontend changes
- Consistent with how `GET /agent-points` already returns a pre-computed `total`

## Frontend Impact

Once `total_points` is available:
- `computeScore()` uses `entry.total_points` directly when `metric === 'points'`
- `pointConfig` dependency removed from the Leaderboard page
- `prospects` metric continues using `prospects_added` as-is
