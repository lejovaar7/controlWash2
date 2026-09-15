# 14 — Payments, Cash, Expenses, and Financial Movements

**Status:** Partially implemented. Configurable payment-method labels and their
Cash default are available through guarded APIs and setup UI. Opening balances,
movements, expenses, adjustments, transfers, reversals and cash sessions remain
target MVP work.

## Purpose and boundary

This module explains the operational movement of money recorded in ControlWash.
It does not process funds, query banks or wallets, perform bank reconciliation,
produce accounting entries, calculate taxes, or establish legal profit.

## Payment methods

Each method belongs to one Organization and has:

- ID, name, normalized unique name, optional kind (`cash`, `wallet`, `bank`,
  `card`, `other`), display order, and active state;
- created/updated actor metadata;
- no account credentials, bank numbers, API keys, or integration secrets.

Cash is seeded idempotently. Organizations may add Nequi, Bancolombia, Daviplata,
or any other plain label. Referenced methods deactivate rather than delete. An
inactive method remains visible in history but cannot receive ordinary new
transactions; authorized reversal of its existing movements remains possible.

## Financial movement ledger

Every movement includes:

- ID, Organization, Branch, payment method;
- exact signed amount in integer minor units and currency;
- type, effective timestamp, server-posted timestamp, actor;
- source type/ID and optional reversal/transfer group ID;
- human description and required reason for adjustments/reversals;
- idempotency identity and immutable creation metadata.

Types:

| Type | Sign/effect | Source |
| --- | --- | --- |
| `opening_balance` | Signed initial recorded position | Setup action |
| `service_income` | Positive | Ticket payment allocation |
| `retail_income` | Positive | Quick sale payment allocation |
| `other_income` | Positive | Explicit authorized non-sale income |
| `expense` | Negative | Expense or posted purchase |
| `adjustment` | Positive or negative | Authorized correction |
| `transfer` | Paired negative/positive | Transfer document |
| `reversal` | Exact opposite | Original movement |

Recorded method balance for a Branch and cutoff is the exact sum of all movements
up to that cutoff. Opening balance is a movement, never a mutable method field.
Organization totals aggregate only authorized Branches.

## Payments

A payment document allocates a positive collected amount to one source document
and one or more methods. Each part must be positive; parts must sum exactly to the
payment total. The server validates outstanding amount and recomputes status.

MVP allows multiple payments over time and split methods. It does not infer tips,
cash change, card fees, or wallet transfer confirmations. Refund/correction is a
linked reversal, not a negative ordinary payment.

## Expenses

Required fields:

- Organization, Branch, effective date/time;
- positive absolute amount and currency;
- payment method and active expense category;
- description and posting actor.

Optional fields are supplier display name and external reference/invoice text.
Posting writes a negative `expense` movement. A purchase-generated expense links
to the purchase and cannot be independently reversed while the purchase remains
posted; use the purchase reversal so money and stock stay coherent.

Default categories are suggestions. Owners/authorized admins may create, order,
and deactivate categories. Referenced categories remain in history.

## Adjustments

An adjustment requires method, Branch, nonzero signed amount, effective time,
reason, and authorized actor. It is never used as a shortcut to edit a payment,
expense, purchase, or sale that has a known source; reverse/correct the source.

## Transfers

A transfer specifies one Organization, source Branch/method, destination
Branch/method, positive amount, effective time, and reason/reference. Source and
destination cannot be identical. Posting atomically creates linked equal and
opposite movements. A transfer changes per-method/per-Branch balances but not
Organization income, expense, or net total.

Cross-Branch transfer requires authority over both Branches. Cross-currency and
cross-Organization transfers are not supported.

## Reversal

- Only posted, unreversed movements can be reversed.
- The reversal amount is generated as the exact opposite; the client does not
  choose it.
- Reason and actor are required.
- Source-document movements are reversed through that document's workflow.
- A reversal and original remain visible and net to zero.
- Failed or retried requests cannot partially or doubly reverse.

## Cash sessions

Cash sessions apply to the Cash method at one Branch:

- opening time/actor and optional declared opening count;
- closing time/actor, expected amount, counted amount, difference, and notes;
- expected amount derives from ledger movements during the session plus the
  session baseline;
- closing difference is informational until a separate authorized adjustment.

Do not force digital methods into physical cash-count semantics. A future generic
method reconciliation flow may be designed separately.

## Permissions

Use explicit capabilities layered on inherited roles:

- `finance.view`: totals and movements in accessible Branches;
- `payment.collect`: ordinary ticket/sale payments;
- `expense.create`: ordinary expenses;
- `finance.adjust`: adjustments and other income;
- `finance.transfer`: control of both endpoints;
- `finance.reverse`: reversals;
- `cash.close`: session close/count;
- `finance.configure`: methods and categories.

Owner has all. Admin capabilities are configurable within Branch scope. A member
defaults only to payment collection; expenses can be enabled. No capability
widens inherited Branch access.

## Reporting definitions

- Recorded income: non-reversed service, retail, and other income.
- Recorded expenses: absolute value of non-reversed expense movements.
- Net recorded cash flow: recorded income minus recorded expenses; adjustments
  are shown separately unless a report explicitly includes them.
- Recorded balance: sum of all signed movements including opening, adjustments,
  transfers, and reversals.

Never label net recorded cash flow as profit. Commission estimates and inventory
consumption do not become expenses unless an actual financial movement exists.

## Acceptance checks

- Cash is seeded once under concurrent initialization.
- Method names are unique per Organization after normalization.
- Split payments create exact parts and cannot exceed policy limits.
- Every displayed balance equals an independently summed movement query.
- Transfers net to zero and post both sides atomically.
- Source reversals cannot leave related stock or financial effects inconsistent.
- Unauthorized finance fields are redacted, not merely hidden in navigation.
- All posting/reversal endpoints are same-origin JSON, size-bounded, audited, and
  idempotent.
