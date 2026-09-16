# 19 — Domain Permissions, Isolation, and Audit

**Status:** Implemented for the local MVP. Tenant and Branch scope is enforced on
domain routes; role-derived MVP capabilities separate ordinary operation from
manager-only configuration, adjustment and reversal actions; consequential
events and ledgers retain append-only evidence. More granular custom capability
profiles are deferred until pilot evidence requires them.

## Purpose

This module applies the inherited Organization/Branch security model to every
ControlWash resource and defines product capabilities and audit expectations.
It extends, and never weakens, modules 04, 07, and 08.

## Authorization model

Effective authorization is the intersection of:

1. authenticated active user;
2. active membership in the validated Organization;
3. inherited role and permitted Branch set;
4. the fixed MVP role policy for the requested action;
5. resource state and source-document rules.

Possessing a capability never grants a new Branch. Client navigation/controls are
UX only. Every route resolves resources through Organization-scoped queries and
then validates Branch scope before returning data or existence-sensitive errors.

## Role-policy action groups

| Group | Capabilities |
| --- | --- |
| Operation | `wash.view`, `wash.create`, `wash.transition`, `wash.cancel`, `wash.delivery_override` |
| Customer | `customer.view`, `customer.manage`, `customer.deactivate` |
| Catalog | `catalog.view`, `catalog.configure`, `price.override`, `discount.apply` |
| Finance | Capabilities defined in module 14 |
| Inventory/retail | Capabilities defined in module 16 |
| Commission | `commission.view`, `commission.configure`, `commission.view_self` |
| Reporting | `report.operation`, `report.finance`, `report.inventory_cost`, `report.commission`, `report.export` |

The MVP implements these names as a reviewed role policy, not arbitrary strings
sent by the browser. Owner has every action. Admin has management actions only
inside inherited Branch scope. Member has ordinary queue, collection, expense,
purchase, consumption and sale actions; configuration, transfer, adjustment,
reversal and restricted reporting remain manager-only. Per-user product action
profiles are a post-pilot extension and can never widen Branch access.

## Resource scope rules

- Customer/vehicle catalogs are Organization-owned, but responses through a
  limited workflow reveal only permitted operational history.
- Tickets, payments, movements, expenses, purchases, sales, stock, cash sessions,
  assignments, commissions, and reports are Branch-scoped.
- Financial transfers are allowed only between payment methods inside the same
  authorized Branch. Cross-Branch financial transfers are rejected.
- Organization-level configuration requires company-wide authority unless a
  specification defines a Branch override.
- Historical records preserve actors who later become inactive without restoring
  their access.

## Audit event model

Audit events are append-only and contain:

- Organization and optional Branch;
- actor user/membership snapshot;
- action name and resource type/ID;
- server timestamp, request/correlation ID, and safe origin metadata;
- structured before/after for permitted configuration changes;
- required reason for cancellation, override, adjustment, reversal, and transfer;
- no passwords, tokens, credentials, or unnecessary sensitive customer data.

At minimum audit:

- ticket transitions/cancellations and worker assignment changes;
- price/discount/delivery overrides;
- payment, expense, purchase, sale, movement, adjustment, transfer, reversal;
- cash-session open/close;
- item/method/category/service deactivation;
- product permission changes and exports.

Ledger rows remain their own authoritative evidence; an audit row does not
replace domain invariants or atomic posting.

## HTTP and error behavior

- Domain routes remain under `/api/` and use the inherited same-origin JSON,
  body-size, validation, safe-error, and no-cache protections.
- Validate identifiers, enums, money/quantity precision, dates, text lengths, and
  arrays with explicit schemas.
- Foreign or inaccessible resources use consistent non-disclosing responses.
- Mutations accept expected version where concurrency matters.
- Posting endpoints require idempotency and return the original successful result
  for a safe exact retry; conflicting payload reuse is rejected.

## Test matrix

Every module adds tests for:

- owner, unrestricted admin, limited admin, member under the fixed policy,
  inactive membership, and unauthenticated user;
- same Branch, other authorized Branch, unauthorized Branch, and foreign tenant;
- active, inactive, draft, posted, reversed/cancelled resource states;
- manipulated parent/source IDs and mixed-tenant child arrays;
- stale version, duplicate idempotency key, and concurrent balance/stock actions;
- response-field redaction, not only status code.

## Acceptance checks

- No product capability broadens inherited Organization or Branch access.
- Mixed-scope batches fail atomically without partial writes.
- Foreign-resource behavior does not disclose existence.
- Audit events contain actor/action/reason without secrets or raw sensitive input.
- Inactive membership loses access on the next authoritative request.
- Exports and aggregate endpoints enforce the same scope as detail endpoints.
- Posting/reversal tests demonstrate idempotency under retry and concurrency.
