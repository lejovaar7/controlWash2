# ControlWash User Stories

Priorities use Must, Should, and Later. Must stories define the MVP. Story IDs
are stable references for delivery and tests; they are not database identifiers.

## Epic A — Company setup

### US-A01 — Configure operational defaults (Must)

As an owner, I want to set the company timezone, currency, and basic wash
settings so that records are interpreted consistently.

Acceptance criteria:

- Currency is a supported ISO 4217 code and timezone is an IANA identifier.
- Changes affect future presentation and records, not stored historical amounts.
- Only an owner or authorized admin may update settings.
- Cash is created once as the first active payment method.

### US-A02 — Manage Branch access (Must)

As an owner, I want each employee limited to the Branches they work in so that
they cannot see or change other locations.

Acceptance criteria:

- Inherited owner/admin/member access rules remain authoritative.
- Every domain list, detail, mutation, report, and export applies server-side
  Organization and Branch scope.

## Epic B — Customers, vehicles, and pricing

### US-B01 — Receive a walk-in vehicle quickly (Must)

As an operator, I want to open a ticket using only vehicle type and service so
that missing customer data never blocks the queue.

Acceptance criteria:

- Customer, plate, make, model, color, and notes are optional at intake.
- The operator can add or find a customer/vehicle without leaving the flow.
- The calculated total is visible before saving.
- The initial ticket state is `waiting` and records Branch, actor, and timestamp.

### US-B02 — Reuse customer and vehicle history (Must)

As an operator, I want to search by plate, customer name, or phone so that repeat
customers can be served faster.

Acceptance criteria:

- Search never returns another Organization's data.
- Results show only data necessary to select the correct customer or vehicle.
- The vehicle history links delivered/cancelled tickets without allowing old
  records to be rewritten.

### US-B03 — Configure services and prices (Must)

As an owner or admin, I want prices by vehicle type and Branch so that the ticket
uses the correct local price.

Acceptance criteria:

- Services and add-ons can be ordered, activated, or deactivated.
- A Branch override takes precedence over the company default.
- Ticket lines snapshot names, quantities, unit prices, discounts, and taxes if
  later introduced; catalog edits do not change old tickets.

## Epic C — Wash operation

### US-C01 — Work from a visual queue (Must)

As a worker, I want to see waiting, in-progress, and ready vehicles so that I
always know what to do next.

Acceptance criteria:

- The board is scoped to the active Branch and business day.
- Cards show vehicle, service summary, elapsed time, payment signal, and assigned
  workers without exposing sensitive customer details unnecessarily.
- Mobile supports the same core actions as desktop.

### US-C02 — Move a ticket through valid states (Must)

As a worker, I want clear state actions so that operational time is trustworthy.

Acceptance criteria:

- Valid path is waiting → in progress → ready → delivered.
- Cancellation is allowed before delivery with a required reason.
- Delivered/cancelled tickets are terminal; correction uses an authorized
  reopen/reversal workflow specified later, never direct status editing.
- Stale or duplicate requests are rejected or made idempotent.

### US-C03 — Assign washers (Must)

As an operator, I want one or more workers attached to a ticket so that work and
commissions are attributable.

Acceptance criteria:

- Only active members authorized for the Branch may be assigned.
- Assignment changes are audited.
- Historical assignment is retained after a member loses access.

## Epic D — Payments and financial control

### US-D01 — Configure payment methods (Must)

As an owner, I want simple payment-method names such as Cash, Nequi, and
Bancolombia so that the system matches how the business collects money.

Acceptance criteria:

- Name is unique per Organization after trimming and case normalization.
- Cash is seeded and cannot be silently duplicated.
- Referenced methods are deactivated instead of deleted.
- Methods can be reordered and optionally receive an opening balance once per
  Branch setup through a movement.

### US-D02 — Collect a split payment (Must)

As an operator, I want to divide a ticket across payment methods so that mixed
payments are represented accurately.

Acceptance criteria:

- Positive payment parts sum exactly to the collected amount.
- Posting is idempotent and creates one financial movement per payment part.
- Overpayment and change are not inferred; the operator must record the intended
  collected amount according to company policy.
- Delivery warns or blocks when an amount remains unpaid according to settings.

### US-D03 — Record an expense (Must)

As an authorized user, I want to record supplies, utilities, maintenance, or
other expenses so that balances and daily cash flow are explainable.

Acceptance criteria:

- Amount, date/time, Branch, payment method, category, description, and actor are
  stored; supplier and external reference are optional.
- Posting creates an immutable negative movement.
- Correction reverses the original with a required reason and creates a new
  expense if necessary.

### US-D04 — Adjust and transfer balances (Must)

As an owner or authorized admin, I want reasoned adjustments and transfers so
that real operational corrections remain transparent.

Acceptance criteria:

- Adjustment requires signed amount, method, Branch, reason, actor, and time.
- A transfer creates linked debit and credit movements atomically.
- Transfer changes method balances but not total company income or expense.
- Reversal points to the original movement and cannot itself be silently deleted.

### US-D05 — Open and close a cash session (Should)

As an owner, I want expected versus counted amounts for physical Cash so that
daily discrepancies are visible.

Acceptance criteria:

- One user cannot have overlapping open sessions for the same Branch/method.
- Closing stores expected, counted, difference, notes, actor, and timestamp.
- A difference is informational until an authorized explicit adjustment posts.

## Epic E — Inventory, purchases, and counter sales

### US-E01 — Manage items (Must)

As an owner or admin, I want one catalog for supplies and retail products so that
the setup remains simple.

Acceptance criteria:

- An item is classified as supply, retail, or both.
- It has name, SKU optional, base unit, stock-tracking flag, active state,
  reorder level, latest purchase cost, and optional sale price.
- Referenced items are deactivated rather than deleted.

### US-E02 — Establish opening stock (Must)

As an authorized user, I want to enter initial quantities by Branch so that
ControlWash starts from a known baseline.

Acceptance criteria:

- Opening stock is a movement, not an editable balance field.
- Quantity is expressed in the item's immutable base unit.
- A correction requires reversal or adjustment with a reason.

### US-E03 — Record a stock purchase (Must)

As an authorized user, I want one purchase action to add stock and record the
outflow so that inventory and cash remain connected.

Acceptance criteria:

- Purchase stores Branch, date/time, supplier optional, reference optional,
  payment method, expense category, item lines, quantities, unit costs, and actor.
- Posting atomically creates positive stock movements and one linked expense
  movement for the total.
- Retrying the same request cannot duplicate stock or expense.
- Reversal produces opposite linked movements and a required reason.

### US-E04 — Record consumption and waste (Must)

As an authorized user, I want to record supplies consumed or lost so that
available stock stays useful.

Acceptance criteria:

- Movement distinguishes manual consumption, waste, and adjustment.
- Quantity, Branch, item, reason, actor, and time are stored.
- Automatic per-service recipes are not part of MVP.

### US-E05 — Make a quick retail sale (Must)

As an operator, I want to sell drinks or accessories with or without a wash so
that all counter income is captured.

Acceptance criteria:

- Sale lines snapshot product name, quantity, and unit price.
- A sale may link to a wash ticket or stand alone.
- Posting atomically creates negative stock movements and payment movements.
- Split payment is supported and reversal restores stock and reverses income.

### US-E06 — Transfer stock (Should)

As an authorized admin, I want to move items between Branches so that each
location's availability is accurate.

Acceptance criteria:

- Source and destination differ and belong to the same Organization.
- Linked outbound/inbound movements post atomically.
- Transfer is neither a purchase, sale, income, nor expense.

### US-E07 — See low-stock items (Must)

As a manager, I want alerts when available quantity is at or below the configured
level so that I can replenish before running out.

Acceptance criteria:

- Alert is computed per Branch in the item's base unit.
- Zero reorder level disables the alert.
- Report names stock cost as an estimate, not formal valuation.

## Epic F — Workers and commissions

### US-F01 — Configure simple commission rules (Must)

As an owner, I want a fixed amount or percentage rule so that wash earnings can
be estimated consistently.

Acceptance criteria:

- Rule can apply to a service and optionally Branch, worker, and effective dates.
- A delivered ticket snapshots the applied commission result.
- Multiple workers use an explicit allocation; no implicit equal split.
- Commission records do not create payroll expense automatically in MVP.

### US-F02 — Review commission totals (Must)

As an owner or authorized admin, I want totals by worker and period so that I can
prepare settlement outside the system.

Acceptance criteria:

- Totals drill down to delivered tickets and reversals.
- Access is restricted by Branch scope.
- Report is labelled operational commission estimate, not payroll.

## Epic G — Dashboard and trust

### US-G01 — Review the day (Must)

As an owner, I want a concise daily dashboard so that I can understand operations
without reading every ticket.

Acceptance criteria:

- Shows vehicles by status, service/retail income, expenses, net recorded cash
  flow, method balances, average cycle time, and low-stock count.
- Every metric has a defined time/Branch scope and drill-down source.
- Unpaid and cancelled tickets are visible separately.

### US-G02 — Export operational data (Should)

As an owner, I want CSV exports so that I retain portable records.

Acceptance criteria:

- Export uses the same filters and permissions as the visible report.
- Human-readable values and stable IDs are included where appropriate.
- Formula-injection-prone spreadsheet cells are neutralized.

### US-G03 — Understand every correction (Must)

As an owner, I want to know who changed consequential records and why so that the
system is trustworthy.

Acceptance criteria:

- Status transitions, assignment changes, posting, reversals, adjustments,
  transfers, and configuration deactivation record actor and timestamp.
- Audit records are append-only and tenant/Branch scoped.
