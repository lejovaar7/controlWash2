# 16 — Inventory, Purchases, and Retail Sales

## Purpose and boundary

This module gives small washes practical stock control for operational supplies
and counter products. It is intentionally lighter than warehouse, procurement,
or accounting software.

## Item catalog

Each Organization-owned item has:

- name, optional SKU, optional description;
- classification: `supply`, `retail`, or `both`;
- immutable base unit after first movement: unit, milliliter, liter, gram,
  kilogram, or another configured exact unit;
- stock-tracking flag, active state, display order;
- default reorder level, latest purchase cost, and optional sale price;
- actor timestamps.

An item with movements cannot change base unit; create a replacement item and
deactivate the old one. MVP does not model arbitrary unit conversions. A purchase
must be entered in the base unit or converted by the user before posting.

## Stock ledger

Every movement stores Organization, Branch, item, exact signed base-unit quantity,
type, effective/server times, actor, source type/ID, optional linked transfer or
reversal, reason when required, and idempotency identity.

Types:

| Type | Quantity | Typical source |
| --- | --- | --- |
| `opening_stock` | Positive or reasoned signed correction | Setup |
| `purchase` | Positive | Posted purchase |
| `retail_sale` | Negative | Posted sale |
| `manual_consumption` | Negative | Supply-use entry |
| `waste` | Negative | Damage/loss/expiry observation |
| `adjustment` | Signed nonzero | Count correction |
| `transfer` | Paired negative/positive | Branch transfer |
| `reversal` | Exact opposite | Original movement |

Available quantity at a Branch is the exact sum of its movements. There is no
independently editable stock balance.

## Opening stock and counts

Opening stock is posted as a movement with actor and effective time. A physical
count may create a proposed difference; only an authorized confirmed adjustment
changes stock. The reason should identify count, damage, data correction, or
another configured category.

## Purchase document

A purchase has draft, posted, reversed, or cancelled state and includes Branch,
effective time, optional supplier/reference, payment method, expense category,
currency, item lines, total, actor, and version. Lines snapshot item name, exact
quantity, unit cost, and total.

Posting is atomic:

1. validate active items/method/category and Branch access;
2. write positive stock movements per line;
3. write one negative linked expense financial movement for the exact total;
4. mark the purchase posted.

The server computes totals. A zero-cost stock receipt is an authorized adjustment,
not a normal purchase. Reversing a purchase writes opposite stock and finance
movements together. Partial returns are deferred; record a new authorized
adjustment/expense correction according to pilot policy until designed.

## Manual consumption and waste

MVP records manual aggregate usage and waste; it does not automatically deduct a
service recipe. The action requires Branch, item, positive absolute quantity,
effective time, type, and reason/notes. The stored movement is negative.

## Retail sale

A sale may link to one wash ticket or stand alone. It has draft, posted, reversed,
or cancelled state; Branch, optional customer, line snapshots, currency, totals,
payment status/reference, actor, and version.

Posting a fully paid sale atomically:

- writes negative stock movements for tracked products;
- writes one positive `retail_income` movement for the selected payment method;
- marks the sale posted and refreshes the linked ticket total/payment summary if
  the UI presents a combined checkout.

The domain must choose one ownership of retail lines: a linked sale remains a
separate document and the wash ticket stores a reference/summary, avoiding double
counting the same revenue. Standalone and ticket-linked sales use the same posting
service and ledger rules.

MVP should require full payment for standalone quick sales. Tabs, receivables,
returns/exchanges, discounts by promotion, and fiscal receipts are deferred.

## Stock policy

The pilot must decide between:

- strict: posting cannot reduce tracked stock below zero; or
- warn-and-override: default warning, with a specific capability and reason to
  post negative stock when real operations are ahead of data entry.

Until decided, implement the invariant behind an Organization setting and default
to strict for data integrity. A client warning alone is never enforcement.

## Transfers

Transfer requires same Organization, different accessible Branches, active item,
positive quantity, and reason/reference. Posting atomically creates linked
outbound/inbound movements. It has no financial effect and requires authority in
both Branches.

## Low stock and estimated cost

Branch item settings may override the default reorder level. Low stock means
available quantity is less than or equal to a positive level. Latest purchase cost
may estimate stock cost but is not FIFO, weighted-average accounting, or legal
inventory valuation. Label it clearly.

## Permissions

- `inventory.view`, `inventory.configure`, `inventory.purchase`,
  `inventory.consume`, `inventory.adjust`, `inventory.transfer`,
  `inventory.reverse`, and `retail.sell` are separate capabilities.
- Owner has all; admin permissions remain Branch-scoped; operator defaults to
  view and retail sale only if enabled.
- Purchase access implies the corresponding expense-posting path but does not
  grant unrelated finance adjustment access.

## Acceptance checks

- Every displayed stock balance equals independently summed movements.
- Base unit cannot change after the first movement.
- Purchase posts stock and finance atomically and is idempotent.
- Sale posts stock and finance atomically without double-counting linked tickets.
- Reversal restores exact quantity/money and cannot run twice.
- Negative-stock policy is enforced on the server under concurrent sales.
- Transfers net to zero Organization quantity and have no financial effect.
- Low-stock alerts use Branch-specific available quantity and threshold.
- Foreign tenant/item/Branch IDs are rejected without existence disclosure.
