# 10 — ControlWash Product Domain

**Status:** Implemented for the local MVP. Settings, catalogs, transactional
domains, guarded APIs, bilingual UI, generated migrations and integration
coverage are present. Remote pilot and production release remain separate.

## Purpose

This module defines the shared business vocabulary, scope, lifecycle principles,
and cross-module invariants for ControlWash. Modules 00–09 remain authoritative
for inherited architecture, identity, Organization, Branch, localization, HTTP,
testing, and release behavior.

## Domain boundary

ControlWash manages:

- customer and vehicle reference data;
- service catalogs and Branch-aware pricing;
- wash tickets and their operational queue;
- payments and an operational financial ledger;
- wash workers and simple commission estimates;
- stock items, purchases, stock movements, and quick retail sales;
- operational dashboards, reports, and exports.

It does not claim to be a bank, payment processor, accounting ledger, fiscal
invoice provider, payroll engine, or advanced warehouse-management system.

## Canonical terms

| Term | Meaning |
| --- | --- |
| Organization | One customer business and tenant boundary. |
| Branch | One physical operating location and authorization boundary. |
| Customer | Optional person or business associated with vehicles/tickets. |
| Vehicle | A reusable vehicle record owned by one Organization. |
| Vehicle type | Configurable pricing category such as motorcycle, car, SUV, or truck. |
| Wash ticket | The operational record from intake through delivery/cancellation. |
| Sale | A posted retail transaction, optionally linked to a wash ticket. |
| Payment method | Organization-defined tracking label such as Cash or Nequi. |
| Financial movement | Immutable signed change to the recorded balance of one method. |
| Item | Supply, retail product, or both, measured in one base unit. |
| Stock movement | Immutable signed quantity change for an item at a Branch. |
| Posting | The atomic transition that creates authoritative ledger effects. |
| Reversal | A linked opposite entry that corrects a posted record without erasing it. |

User-facing Spanish may use `lavado`, `sede`, `trabajador`, `caja`, `insumo`, and
`venta`, but code and documentation identifiers remain English.

## Cross-module invariants

1. Every domain row has an `organizationId`; every location-specific row also
   has a `branchId` belonging to that Organization.
2. The server derives active Organization, permitted Branches, and actor identity
   from the authenticated context. A client-supplied ID never grants access.
3. Money is stored as integer minor units with an ISO currency snapshot. Floating
   point is never used for authoritative money calculations.
4. Stock quantities use exact decimal representation at a documented precision,
   never JavaScript floating-point accumulation.
5. Posted document totals and display labels are snapshots; later catalog edits
   do not rewrite historical meaning.
6. Consequential posting requests accept an idempotency key scoped to actor,
   Organization, operation, and request payload.
7. Financial and stock movements are append-only. Reversal links must not form
   cycles and a movement cannot be reversed twice.
8. Server time records creation/posting. User-entered effective time is stored
   separately, validated, and shown with Organization timezone context.
9. Deactivation preserves referenced records and history.
10. Reports derive from authoritative posted sources; drafts and cancelled or
    reversed effects are excluded according to each metric definition.

## Lifecycle vocabulary

- Configuration records: active or inactive.
- Transaction documents: draft, posted, reversed, or cancelled where applicable.
- Wash tickets: waiting, in progress, ready, delivered, or cancelled.
- Users: inherited active/inactive company access plus assignment eligibility.

Do not overload one generic `status` interpretation across unrelated entities.

## Default seed behavior

On first product initialization for an Organization:

- create one active payment method named Cash with stable system key `cash`;
- create default vehicle types Motorcycle, Car, SUV, and Truck/Pickup, editable
  and deactivatable after setup;
- create suggested expense categories for wash supplies, retail products,
  utilities, maintenance, rent, transport, commissions, payroll, food, and Other;
- do not create example financial or stock transactions.

Initialization is idempotent and safe under concurrent retries.

## Data retention

MVP supports deactivation and reversal, not destructive deletion of referenced
business records. Customer data may later require a privacy/anonymization flow;
that must preserve financial and operational evidence while removing unnecessary
personal data. No hard-delete endpoint is implied by a database foreign key.

## Acceptance checks

- All domain APIs deny foreign Organization IDs and unauthorized Branch IDs.
- Historical totals remain stable after catalog renames or price changes.
- Duplicate posting requests do not create duplicate movements.
- Reversed effects net to zero while both original and reversal remain visible.
- Currency and quantity arithmetic is exact at the defined storage precision.
- Deactivated configuration cannot be selected for new transactions but remains
  readable on authorized historical records.
