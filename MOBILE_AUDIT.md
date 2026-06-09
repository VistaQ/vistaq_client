# VistaQ Mobile & Tablet Responsiveness Audit
**Date:** 19 May 2026  
**Branch:** feat/mobile-responsive-audit

---

## Executive Summary

The app has solid foundations (card-based layouts, some `sm:` and `md:` breakpoints) but has systematic issues across navigation, tables, and grid density. This audit covers all pages at both **mobile (375–767px)** and **tablet (768–1023px)** breakpoints.

---

## 🔴 Critical Issues (Breaking / Unusable)

### 1. Sidebar visible on iPad (tablet) — Layout.tsx
- **What:** Sidebar uses `hidden md:flex`. This makes it visible from 768px — iPad portrait. The 288px sidebar consumes **37.5%** of the viewport, leaving only ~480px for content.
- **Fix:** Change all sidebar/header breakpoints from `md:` → `lg:` (1024px). Sidebar only appears on proper desktop. Tablet gets the same mobile hamburger menu.

### 2. Mobile navigation is a drawer — Layout.tsx
- **What:** The mobile menu is a left-side drawer (w-72, 288px). It works but feels dated and hides behind the overlay. On small phones some nav items are cut off.
- **Fix:** Replace drawer with a **full-screen grid menu** — like iOS home screen. 3-column app icon grid, full-screen backdrop, swipe-friendly.

### 3. AdminUsers table has no overflow protection — AdminUsers.tsx
- **What:** The users table has 6 columns (Name, Role, Agent Code, Group Assignment, Status, Actions) with no `overflow-x-auto` wrapper and no column hiding on mobile. All 6 columns overflow the viewport on phone and tablet.
- **Fix:** Add `overflow-x-auto`, hide Agent Code + Group Assignment on mobile (`hidden sm:table-cell`).

---

## 🟡 Significant Issues (Degraded Experience)

### 4. Dashboard — Management stats (7-column grid) — Dashboard.tsx
- **What:** `grid-cols-2 md:grid-cols-4 lg:grid-cols-7` — on desktop this shows 7 tight stat cards. At md (768px) it shows 4 columns with 3 on second row. Text ("ACE (YTD) RM 1,234,567") overflows the card.
- **Fix:** Keep 2-col mobile, 4-col tablet, 4-col desktop (7 items → two rows of 4 and 3). The cards are already compact enough.

### 5. Dashboard — Group overview table — Dashboard.tsx
- **What:** Group overview table inside a card has no `overflow-x-auto` wrapper. On narrow viewports the "Total ACE" column (wide RM numbers) can push the table beyond the card boundary.
- **Fix:** Add `overflow-x-auto` to the table wrapper div.

### 6. Prospects — List view: "Last Updated" column crowded on mobile — Prospects.tsx
- **What:** The list view table shows 5 columns. On phones, the "Last Updated" column is not critical and wastes ~80px.
- **Fix:** Add `hidden sm:table-cell` to the Last Updated `<th>` and `<td>`.

### 7. Dashboard — "Add User" header button cramped on small phones — AdminUsers.tsx
- **What:** Header row `flex justify-between items-center` — on very small screens the "Add User" button squishes the title.
- **Fix:** Wrap in `flex-col sm:flex-row` with `gap-3`.

### 8. AdminGroups modal — Trainer/Member multi-select lists — AdminGroups.tsx
- **What:** The group edit modal has scrollable member/trainer selection lists constrained at `max-h-48`. On mobile the modal can overflow the screen with no scroll on the modal itself.
- **Fix:** Make the modal body scrollable (`overflow-y-auto max-h-[80vh]`).

---

## 🟢 Minor Issues (Cosmetic / Polish)

### 9. Leaderboard podium — clips on small phones
- **What:** The top-3 podium uses absolute-positioned bars. On 375px phones the names can overlap.
- **Fix:** Hide podium podium names on very small screens with `text-xs` and `truncate`.

### 10. Coaching — Filter row (list/grid toggle + group selector) wraps awkwardly on mobile
- **What:** The header row with view toggle + group dropdown + status filter has no `flex-wrap`, causing overflow on 375px.
- **Fix:** Add `flex-wrap gap-2` to the filter row.

### 11. Events calendar — day cells too small on mobile
- **What:** The calendar grid (7 columns) uses fixed cell sizes that become very small on 375px. Events text is cut off.
- **Fix:** Reduce cell padding and truncate event text to 1 line on mobile.

### 12. SalesReport / GroupSalesReport — section nav overflows on very small phones
- **What:** The sticky section nav uses `overflow-x-auto` which scrolls, but 4 tabs with "Milestone · Prospect · Products · Trends" at 14px on 375px still needs 2 horizontal scrolls.
- **Fix:** Use shorter labels on mobile with `hidden sm:inline` / `sm:hidden` trick.

### 13. Profile page — form inputs full-width but ok
- **What:** Profile page uses `max-w-4xl mx-auto` and single-column form layout — fine on mobile. No issues.
- **Status:** ✅ No changes needed.

### 14. Leaderboard table — overflow protection
- **What:** The rankings table below the podium has no `overflow-x-auto`. On mobile the Points column can be cut.
- **Fix:** Add `overflow-x-auto` to the table wrapper.

---

## Breakpoint Summary

| Breakpoint | Screen | Sidebar | Nav Style |
|---|---|---|---|
| `< 768px` | Phone | Hidden | Full-screen grid menu (NEW) |
| `768–1023px` | Tablet / iPad | Hidden | Full-screen grid menu (FIXED — was open) |
| `≥ 1024px` | Desktop | Always visible | — |

---

## Files to Modify

| File | Changes |
|---|---|
| `components/Layout.tsx` | Sidebar `md:` → `lg:`, mobile drawer → full-screen grid menu |
| `pages/AdminUsers.tsx` | Table `overflow-x-auto`, hide cols on mobile, header row flex-wrap |
| `pages/Dashboard.tsx` | Group table `overflow-x-auto`, stat grid max cols |
| `pages/Prospects.tsx` | Hide "Last Updated" column on mobile |
| `pages/Coaching.tsx` | Header row flex-wrap |
| `pages/Leaderboard.tsx` | Table `overflow-x-auto`, podium text truncate |
| `pages/Events.tsx` | Calendar cell text truncate |

---

*Report generated before implementation. All fixes implemented on `feat/mobile-responsive-audit`.*
