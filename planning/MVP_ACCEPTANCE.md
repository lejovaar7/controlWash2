# ControlWash MVP Acceptance Scenarios

These scenarios form the final pilot gate. They complement unit/integration tests
and must be executed with representative owner, admin, and operator accounts.

## Scenario 1 — First company setup

1. Platform admin provisions a company and Owner.
2. Owner completes secure account setup and enters Main Branch.
3. Cash exists exactly once; default vehicle types/categories are present.
4. Owner sets currency/timezone, creates Nequi, services, prices, workers, and
   initial items.

Expected: no public signup, no duplicated seed records, and no foreign-company
data appears.

## Scenario 2 — Fast vehicle intake and queue

1. Operator creates a motorcycle wash with no customer or plate.
2. Operator creates a repeat-car wash by plate and reuses its customer/vehicle.
3. Assign worker, start, mark ready, and deliver.
4. Attempt an invalid/stale transition from a second session.

Expected: each intake is correctly priced; common intake median is at most 30
seconds; timing and history are correct; stale action has no partial effect.

## Scenario 3 — Split payment and balances

1. Record an opening Cash balance of 100,000 minor units in test currency.
2. Collect a 30,000 ticket using 20,000 Cash and 10,000 Nequi.
3. View method balances and ticket payment status.
4. Retry the payment request with the same key and then a conflicting payload.

Expected: one posting only; Cash is 120,000 plus any other controlled fixtures,
Nequi is 10,000; conflicting key reuse is rejected.

## Scenario 4 — Ordinary expense and correction

1. Operator with expense permission records a 15,000 maintenance expense in Cash.
2. Unauthorized operator attempts an adjustment.
3. Owner reverses the expense with reason and records the corrected value.

Expected: balances reconstruct exactly; original/reversal/correction remain
visible; unauthorized request changes nothing.

## Scenario 5 — Purchase links money and stock

1. Purchase 20 retail waters and 5 liters of shampoo using Bancolombia.
2. Retry the request after simulated response loss.
3. Review purchase, stock, financial movement, and reports.
4. Reverse the purchase with an authorized reason.

Expected: one purchase effect only; stock and expense post atomically; reversal
nets both effects to zero without deleting evidence.

## Scenario 6 — Quick sale with and without a wash

1. Sell two waters as a standalone Cash quick sale.
2. Add one air freshener to a wash and collect a split combined checkout.
3. Verify retail revenue is counted once.
4. Reverse the standalone sale.

Expected: each sale reduces exact stock and increases correct method balances;
linked ticket presentation does not duplicate revenue; reversal restores stock.

## Scenario 7 — Supplies and stock control

1. Record manual shampoo consumption and a waste movement.
2. Count stock and record a reasoned adjustment.
3. Transfer retail units between two Branches.
4. Attempt to oversell according to the configured negative-stock policy.

Expected: Branch stock sums match movements; transfer nets Organization quantity;
low-stock alert updates; server enforces policy under concurrent attempts.

## Scenario 8 — Workers and commissions

1. Configure percentage commission for one service and a Branch override.
2. Deliver a ticket with two workers and explicit allocations.
3. Change the future commission rule and deactivate one worker.
4. Reverse/correct the source ticket.

Expected: historical estimate remains stable; worker history remains; reversal
offsets exact snapshots; no payroll expense is created automatically.

## Scenario 9 — Multi-tenant and Branch security

For every domain API, exercise owner, unrestricted admin, limited admin, member
with/without capability, inactive membership, and unauthenticated access using:

- same Branch resource;
- another authorized Branch;
- unauthorized Branch;
- foreign Organization resource;
- mixed-tenant child IDs in one payload.

Expected: only the documented intersection succeeds; failures do not disclose
foreign existence; no partial batch effects; responses redact restricted fields.

## Scenario 10 — UX, accessibility, and recovery

Run intake, queue transition, payment, expense, purchase, and quick sale at 360 px,
tablet, and desktop widths using touch, keyboard, and a screen-reader smoke pass.
Interrupt network during each mutation and provoke stale data.

Expected: no core horizontal scroll; 44 px targets; visible focus; labelled
errors; preserved input; duplicate submission prevention; understandable conflict
recovery; status never relies on color alone; English/Spanish do not clip.

## Scenario 11 — Reports and export

Build a deterministic fixture containing income, expense, adjustments, transfer,
reversal, cancelled ticket, linked retail sale, low stock, and commissions. Compare
dashboard/report/export values to an independent calculation.

Expected: definitions reconcile exactly; transfers/adjustments are classified
correctly; ticket-linked revenue appears once; CSV respects filters, scope, exact
values, and formula-injection protection.

## Release conclusion

MVP acceptance requires all scenarios, canonical acceptance checks, the repository
quality gate, both npm audits, migration verification, and a separately authorized
dev-environment pilot. Passing local checks alone does not authorize production.
