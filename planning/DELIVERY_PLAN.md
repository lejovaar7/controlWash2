# ControlWash Delivery Plan

The increments below are ordered to reduce rework. Each increment must preserve
all inherited security and release checks.

## Increment 0 — Product foundation

**Status:** In progress. Organization operating settings, idempotent defaults,
payment-method configuration, guarded APIs, navigation and automated isolation
tests are implemented. Editable vehicle/expense catalogs, final design-token
review and pilot-country confirmation remain before the exit is claimed.

- Confirm pilot country, currency, timezone, stock policy, and working brand.
- Add Organization settings and seed Cash as the default payment method.
- Add domain IDs, timestamps, actor metadata, indexes, and authorization helpers.
- Establish design tokens and navigation without implementing empty decorative
  dashboards.

**Exit:** settings and seeded defaults are deterministic; tenant isolation tests
exist for the first domain tables.

## Increment 1 — Catalogs and vehicle intake

- Vehicle types, customers, vehicles, services, add-ons, and Branch price rules.
- Fast search by plate or phone; optional customer for walk-in intake.
- Create draft/open wash ticket with snapshotted descriptions and prices.

**Exit:** an operator creates a correctly priced ticket in under 30 seconds in a
usability smoke test.

## Increment 2 — Operational board

- Queue board and transitions: waiting, in progress, ready, delivered, cancelled.
- Worker assignment, timestamps, optimistic-action protection, and activity log.
- Polling-based refresh; no WebSockets initially.

**Exit:** concurrent stale transitions cannot corrupt state and Branch boundaries
are covered by API tests.

## Increment 3 — Payments and cash control

- Configurable payment methods, opening balances, payment splits, cash sessions,
  expenses, adjustments, transfers, and reversals.
- Payment/delivery rules and per-method balance reconstruction.

**Exit:** ledger invariant tests cover all movement types and every displayed
balance matches its movement sum.

## Increment 4 — Inventory and retail

- Item catalog, Branch stock, purchases, manual consumption, waste, adjustments,
  transfers, reversals, and low-stock alerts.
- Products on wash tickets and standalone quick sales.
- Atomic posting contract across source documents, financial movements, and
  stock movements.

**Exit:** purchase and sale integration tests prove linked money/stock effects,
retry idempotency, and reversal behavior.

## Increment 5 — Commissions and reporting

- Simple fixed/percentage commission rules and worker attribution.
- Operational dashboard, filters, exports, and drill-down reports.
- Guided empty states and pilot onboarding.

**Exit:** totals reconcile to source records; report access follows Branch scope;
pilot scenarios pass on phone, tablet, and desktop viewports.

## Increment 6 — Pilot hardening

- Accessibility, performance, error recovery, audit review, backups/export,
  dependency audit, and threat-focused authorization testing.
- Real dev environment resources and email verification only under separate
  deployment authority.

**Exit:** the local quality gate is green and a separately approved dev release
passes the pilot checklist. Production remains an explicit later decision.

## Definition of done for every increment

- Canonical specs and decision log reflect final behavior.
- Schema changes use generated Drizzle migrations and are inspected.
- API input, permissions, tenant/Branch scope, idempotency, and error behavior are
  tested.
- English and Spanish catalogs remain complete and type-safe.
- Keyboard, focus, touch target, loading, empty, error, and narrow-screen states
  are verified.
- `npm run check`, both npm audits, and Drizzle checks pass or have a documented
  accepted limitation.
- No remote migration, deployment, push, or cloud resource creation occurs
  without explicit authorization.
