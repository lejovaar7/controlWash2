# 17 — Dashboard, Reports, and Exports

## Purpose

Reports turn operational records into decisions while preserving exact scope and
definitions. Every metric must be reproducible from authorized source records and
must not imply accounting certainty that ControlWash does not provide.

## Global report controls

- Organization is always the validated active tenant.
- Branch filter includes only accessible Branches and defaults to active Branch.
- Date presets: today, yesterday, this week, this month, and custom bounded range.
- Period boundaries use the Organization timezone, with stored UTC instants.
- Currency is the Organization's single operating currency in MVP.
- Every report displays active filters and generated-at time.

## Daily dashboard

The default dashboard answers:

- How many vehicles are waiting, in progress, ready, delivered, and cancelled?
- What are today's service income, retail income, recorded expenses, and net
  recorded cash flow?
- What is the recorded balance by payment method?
- Which tickets are unpaid/partial or delayed?
- What is average intake-to-ready cycle time for delivered/ready work?
- Which items are low stock?

Use a small number of decision cards, one queue preview, and actionable exception
lists. Avoid ornamental charts when a number or ranked list communicates better.

## Canonical metric definitions

- Service income: active `service_income` movements in range.
- Retail income: active `retail_income` movements in range.
- Expenses: absolute value of active `expense` movements in range.
- Net recorded cash flow: service + retail + other income − expenses; adjustments
  and transfers shown separately.
- Recorded balance: all signed movements through range end, including opening,
  adjustments, transfers, and reversals.
- Vehicle count: distinct non-replacement wash tickets by relevant status and
  status timestamp definition.
- Average cycle: average of first intake to first ready for eligible tickets;
  cancelled tickets excluded.
- Estimated commissions: active commission snapshots for delivered tickets.
- Available stock: movement sum as of range end; low stock evaluated against the
  current Branch threshold and clearly marked as current, not historical.

## Reports

MVP includes:

1. Washes: ticket, date, vehicle, services, status, cycle time, total, paid status.
2. Income and expenses: movement/source drill-down by method/category/Branch.
3. Payment-method balances: opening-to-closing movement view.
4. Retail sales: sale/product quantities, revenue, and payment state.
5. Inventory movements: item/Branch/type/source, quantity, and current balance.
6. Low stock: item, available quantity, threshold, latest cost estimate.
7. Commissions: worker, ticket count, eligible service revenue, estimate, offsets.

## Drill-down and redaction

Metric cards link to a report with equivalent filters. Report rows link to an
authorized source detail. A user without finance permission may see operational
payment state on a ticket but not method balances, expense totals, costs, or
commission rates. API response shapes must enforce redaction.

## Exports

CSV exports use the same query/filter/authorization service as screen reports.
They include a stable ID, human-readable labels, timezone-aware timestamps, and
currency/unit columns. Values beginning with spreadsheet formula characters are
escaped. Large exports need a documented bound in MVP; asynchronous export is
deferred until demonstrated necessary.

## Performance and freshness

- Index by Organization, Branch, effective/posting time, status/type, and common
  source keys according to measured queries.
- Start with server aggregates and paginated details, not a client-side download
  of all records.
- Display freshness and refetch after relevant mutations/focus.
- Do not introduce cached cross-tenant aggregates without an explicit invalidation
  and isolation design.

## Acceptance checks

- Independent fixture calculations match each metric definition exactly.
- Date boundaries behave correctly in the configured timezone and DST cases.
- Report and export queries cannot widen Branch scope via filters.
- Reversals remove net effects while remaining visible in drill-down.
- Transfers affect method balances inside one Branch but not Branch totals,
  income or expense totals.
- Ticket-linked retail revenue is counted once.
- Finance/cost/commission fields are server-redacted for unauthorized roles.
- CSV output neutralizes spreadsheet formulas and preserves exact values.
