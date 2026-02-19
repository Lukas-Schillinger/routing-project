# Improvement Opportunities

Audit performed 2026-02-17. Organized by effort and impact.

---

## Bite-sized (30min - 1hr)

### 1. Replace browser `confirm()` with `ConfirmDeleteDialog`

Three places use native `confirm()` while the rest of the app uses the themed `ConfirmDeleteDialog` component. Native dialogs don't match the theme, can't show context, and aren't testable.

- `src/routes/(app)/maps/[mapId]/+page.svelte` — `removeDriver()` (line ~149)
- `src/routes/(app)/maps/[mapId]/+page.svelte` — `handleDeleteMap()` (line ~169)
- `src/routes/(app)/maps/[mapId]/components/EditStopsDataTable/StopActionsCell.svelte` — stop deletion (line ~27)

### 2. Add missing database indexes

```
stops.driver_id          — queried in getStopsForRoute(), no index
matrices (entire table)  — no indexes at all despite queries on map_id, inputs_hash, org_id
stops (map_id, org_id)   — composite index for the most common access pattern
```

Schema location: `src/lib/server/db/schema.ts` (lines 344-347 for stops, ~478-490 for matrices)

### 3. Parallelize route detail query waterfall

`getRouteWithDetails()` in `src/lib/services/server/route.service.ts:325-364` runs two sequential DB queries — the route join and then stops fetch. These are independent and can be `Promise.all()`'d.

Similarly, `getRoutesForUser()` at line ~259 does an unnecessary extra query for driver users that could be a single join.

---

## Half-day projects

### 4. Fix the Routes list page

`src/routes/(app)/routes/+page.svelte` is a broken placeholder:

- Table caption says "A list of your recent invoices" (copy-paste from shadcn)
- Columns show raw IDs and foreign keys instead of human-readable data
- No filtering, sorting, or search

Needs: proper columns (Route | Driver Name | Map | Duration | Status | Updated), sort/filter, quick actions.

### 5. Add skeleton loading states

Pages currently pop in without loading feedback. Affected areas:

- Maps list (`/maps`) — card grid appears all at once
- Map detail sidebar (StopsTab, DriversTab) — tabs have no loading state
- Route detail — timeline loads without skeleton
- Import geocoding step — no per-row progress

The app already has skeleton components available in the UI library but underuses them.

### 6. Keyboard shortcuts

The app has zero keyboard shortcuts. Priority additions:

- `Escape` to deselect/close panels
- `Cmd+K` command palette for power users
- Arrow keys for stop navigation in route view
- Number keys (1/2/3) for layout presets (Map/Split/List)
- `Cmd+N` for new stop
- `Delete` for selected stop removal

### 7. Optimization progress feedback

Users stare at a spinner for up to 5 minutes during route optimization with no context.

Current: "Optimizing routes..." with a spinner and 2-second polling.

Needs:

- Step/phase indicator (matrix calculation → solving → completing)
- Progress percentage or ETA
- Completion summary (total duration, miles, driver count)
- Visible cancel button
- Consider SSE instead of polling (see #9)

Location: `src/routes/(app)/maps/[mapId]/components/OptimizationFooter.svelte`

### 8. Field-level form validation

Forms only validate on submit. No inline feedback on blur/change. Specific gaps:

- No red border/highlight on invalid inputs (only error text below)
- No "required field" visual indicators beyond text
- Address autocomplete allows submission without confirming geocoded selection
- Phone input has no format guidance or pattern hints
- No duplicate address detection when adding stops

Affected: all form components under `src/lib/components/EditOrCreate*`

---

## Meatier improvements

### 9. Batch `bulkCreateStops()` to fix O(n) query pattern

`src/lib/services/server/stop.service.ts:388-410` — the code itself acknowledges the problem in a comment. Each `createStop()` call triggers ~4 DB queries (location creation, ownership verification, map verification, stop fetch with join). For 100 stops, that's ~400 queries.

Fix: batch insert stops in a single transaction with pre-validated location IDs.

### 10. Replace optimization polling with Server-Sent Events

Client polls `GET /api/maps/[mapId]/optimize` every 2 seconds during optimization. SSE would:

- Push updates from server instead of client asking repeatedly
- Reduce network traffic ~80%
- Feel more real-time
- Use less battery on mobile

Location: `src/routes/api/maps/[mapId]/optimize/+server.ts`

### 11. Add stop completion tracking to the database

`src/routes/(app)/routes/[routeId]/+page.svelte` — delivery completion status is stored in **localStorage only** (CurrentStopPanel, lines ~44-69). This means:

- Data never syncs to server
- No audit trail
- No historical analytics
- Disappears if user clears browser data
- Can't power features like "time per stop" or "actual vs estimated duration"

Schema addition needed: `completed_at` timestamp and `delivery_status` enum on the stops table.

### 12. Reduce over-fetching on maps list page

`src/routes/(app)/maps/+page.server.ts:28-35` loads ALL stops and ALL routes across ALL maps for the list page. For orgs with many maps this will become a bottleneck.

Fix: fetch only map-level aggregate stats (stop count, route count) instead of full records. Add pagination.

### 13. Accessibility gaps in map interface

The maps section has minimal ARIA support despite heavy interactivity:

- DriverPicker popover trigger has no aria-label
- MapView toolbar buttons lack descriptive labels
- Data table has no aria-live regions for dynamic updates
- No screen reader announcements for driver assignment changes

### 14. Optimistic updates for driver assignment

`src/lib/components/map/DriverPicker.svelte` — assigning a driver to a stop waits for the full API round-trip before updating the UI. For bulk assignment across 50+ stops, latency compounds.

Fix: update local state immediately, fire API request in background, revert on failure.

---

## Notes

- Benchmarks exist at `src/lib/benchmarks/` comparing query strategies but findings haven't been adopted in production
- The drag-and-drop stop reordering feature is partially built (uncommitted files in `DraggableStopItem.svelte`, `DriverDropZone.svelte`, `stops/reorder/` API)
- `admin.service.ts` (437 lines, 12 public methods) has zero test coverage
