# Decision Log

## D-001 — Clone rather than modify the reusable template

**Status:** Accepted, 2026-09-14

ControlWash lives in `/Users/admin/Personal/controlwash`. The reusable source
template remains separate. The clone keeps a read-only `template` fetch remote
and disables its push URL; a product-owned remote will be added later.

## D-002 — Closed B2B provisioning

**Status:** Accepted

Keep the inherited operator-provisioned company model. Public self-registration,
self-service onboarding, and subscription billing are outside MVP.

## D-003 — Organization and Branch isolation

**Status:** Accepted

Every business record carries Organization ownership. Operational records also
carry their Branch when applicable. Server authorization remains authoritative.

## D-004 — Configurable payment methods

**Status:** Accepted

Each Organization starts with Cash and can add, order, or deactivate simple
named methods such as Nequi or Bancolombia. These are tracking labels, not bank
integrations. Referenced methods are deactivated, not deleted.

## D-005 — Immutable operational ledgers

**Status:** Accepted

Posted financial and stock movements are append-only. Corrections use linked
reversals or compensating adjustments with reason and actor.

## D-006 — Lightweight inventory in MVP

**Status:** Accepted

One catalog handles wash supplies and retail products. MVP supports opening
stock, purchases, sales, manual consumption, waste, adjustments, transfers, and
low-stock alerts. Lots, expiry, purchase orders, and automatic service recipes
are deferred.

## D-007 — Quick sales with or without a wash ticket

**Status:** Accepted

Retail items can be added to a wash ticket or sold in a standalone quick sale.
Posting a sale creates linked payment and stock movements.

## D-008 — Operational reporting, not formal accounting

**Status:** Accepted

Reports use terms such as recorded income, expenses, net cash flow, and estimated
stock cost. They do not claim bank reconciliation, tax compliance, profit, or
formal inventory valuation.

## D-009 — Mobile-first visual system

**Status:** Accepted

Use the inherited Tailwind CSS 4, shadcn/ui on Base UI, Lucide, and Geist stack.
Operational flows favor large touch targets, clear states, one primary action,
progressive disclosure, and cards on narrow screens.

## D-010 — ControlWash selected as the product name

**Status:** Accepted

ControlWash is the selected product name and technical identifiers use
`controlwash`. Trademark, domain, and social-handle clearance remain required
launch checks; they do not make the current naming decision provisional.
