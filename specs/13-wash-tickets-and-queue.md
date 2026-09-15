# 13 — Wash Tickets and Operational Queue

## Purpose

The wash ticket is the operational center of ControlWash. It connects a vehicle,
selected services, worker assignment, state timing, retail additions, payment,
and delivery without forcing optional customer data.

## Ticket identity and fields

- ID plus Organization and Branch ownership.
- Human-readable sequential number scoped to Organization or Branch as chosen in
  product settings; allocation must be concurrency-safe and gaps are acceptable.
- Optional customer/vehicle references plus immutable vehicle-display snapshot.
- Vehicle type snapshot.
- Currency, subtotal, explicit discount, retail subtotal, and grand total.
- Operational status, payment status, notes, actor timestamps, and version.
- Source channel fixed to `walk_in` in MVP, leaving room for future booking.

## Status machine

```text
waiting -> in_progress -> ready -> delivered
   |            |           |
   +------------+-----------+-> cancelled
```

Rules:

- Create directly in `waiting`; an internal draft may be used only during the
  request/UI flow and must not appear in the operational queue.
- `in_progress` records first-start time; returning to waiting is not a normal
  MVP action.
- `ready` records first-ready time.
- `delivered` records delivery time and is terminal.
- `cancelled` is terminal, requires a reason, and cannot retain effective posted
  income; any prior payment must be reversed/refunded through the finance module.
- Reopening terminal tickets is deferred. Authorized correction creates explicit
  reversals and, if needed, a replacement ticket linked to the original.

## Payment status

Derived values are `unpaid`, `partial`, `paid`, and `refunded`. They are computed
from non-reversed payment allocations against the authoritative ticket total and
are not freely editable.

The Organization setting chooses whether delivery blocks an unpaid remainder or
permits an authorized override with a required reason. MVP does not implement
customer receivables or credit accounts; an unpaid delivered ticket is an
operational exception, not an accounts-receivable ledger.

## Worker assignment and commission trigger

One or more active, Branch-authorized members may be assigned. Assignment changes
record previous/new sets, actor, and time. Delivery snapshots commission results;
later rule changes do not alter them.

## Queue board

- Default scope: active Branch and current Organization business day.
- Columns: Waiting, In progress, Ready; Delivered and Cancelled are accessible as
  filtered history, not noisy default columns.
- Card essentials: ticket number, vehicle identity/type, service summary, elapsed
  time, assigned worker initials/names, total, and payment signal.
- Primary action reflects the next valid transition and is usable by touch and
  keyboard.
- Poll every 10–20 seconds while visible and refetch after mutations; pause or
  reduce polling when hidden. WebSockets are not required for MVP.

## Concurrency and idempotency

Transitions include expected version/status. The server conditionally updates
and returns conflict when the record changed. Repeated identical transition
requests do not duplicate activity or commission effects. The UI refetches on
conflict and explains the current state.

## Cancellation

Cancellation requires a categorized reason plus optional note. If the ticket has
payments or linked posted sales, the UI must lead an authorized user through the
required reversal before completing cancellation; it must never orphan ledger
effects.

## Permissions

- Owner: all accessible Branch actions and overrides.
- Admin: normal actions in authorized Branches; financial or price overrides need
  explicit product permission.
- Member/operator: create, assign eligible workers, and perform ordinary state
  transitions in assigned Branches; cancellation/delivery override configurable.
- A member may be assignable without having finance details permission.

## Acceptance checks

- Creation computes totals on the server and ignores manipulated client totals.
- Invalid and stale transitions return a safe conflict with no partial effects.
- Queue never includes inaccessible Branch or Organization records.
- Payment status always reconciles to active payment allocations.
- Cancellation cannot leave active income or stock effects attached unnoticed.
- Timing metrics use stored transition timestamps, not client clocks.
- Mobile, keyboard, loading, empty, error, and refresh states are usable.
