# 19 — Domain Permissions, Isolation, and Audit

**Status:** Partially implemented. Product setup enforces tenant context and
Owner/unrestricted-admin writes, with automated cross-tenant and role coverage.
Branch-scoped transactional capabilities and the full audit trail remain target
MVP work.

## Purpose

This module applies the inherited Organization/Branch security model to every
ControlWash resource and defines product capabilities and audit expectations.
It extends, and never weakens, modules 04, 07, and 08.

## Authorization model

Effective authorization is the intersection of:

1. authenticated active user;
2. active membership in the validated Organization;
3. inherited role and permitted Branch set;
4. explicit product capability;
5. resource state and source-document rules.

Possessing a capability never grants a new Branch. Client navigation/controls are
UX only. Every route resolves resources through Organization-scoped queries and
then validates Branch scope before returning data or existence-sensitive errors.

## Capability groups

| Group | Capabilities |
| --- | --- |
| Operation | `wash.view`, `wash.create`, `wash.transition`, `wash.cancel`, `wash.delivery_override` |
| Customer | `customer.view`, `customer.manage`, `customer.deactivate` |
| Catalog | `catalog.view`, `catalog.configure`, `price.override`, `discount.apply` |
| Finance | Capabilities defined in module 14 |
| Inventory/retail | Capabilities defined in module 16 |
| Commission | `commission.view`, `commission.configure`, `commission.view_self` |
| Reporting | `report.operation`, `report.finance`, `report.inventory_cost`, `report.commission`, `report.export` |

Store capabilities through a reviewed membership extension or normalized role
policy; do not accept arbitrary capability strings from the browser. Owner has
all capabilities. Product defaults for admin/member must be explicit, seeded,
and testable. Only owner or suitably delegated admin may change product access,
and never beyond their own Branch/capability authority.

## Resource scope rules

- Customer/vehicle catalogs are Organization-owned, but responses through a
  limited workflow reveal only permitted operational history.
- Tickets, payments, movements, expenses, purchases, sales, stock, cash sessions,
  assignments, commissions, and reports are Branch-scoped.
- A cross-Branch transfer requires access and capability at both endpoints.
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

- owner, unrestricted admin, limited admin, member with/without capability,
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
