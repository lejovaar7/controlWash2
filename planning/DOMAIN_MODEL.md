# ControlWash Domain Model

This is an implementation map, not a substitute for canonical module rules. Table
and column names may be refined during Increment 0, but the ownership, snapshots,
ledger effects, and transaction boundaries must remain.

## Inherited identities

| Inherited entity | Product use |
| --- | --- |
| `user` | Login identity and immutable actor reference. |
| `organization` | Tenant/company owner of every domain record. |
| `member` | Company role, active state, and product capability subject. |
| `team` | Branch identity. |
| `team_member` | Branch assignment for scoped admins/members. |

Use existing names until an explicit migration changes them. UI may say Branch or
Sede while persistence keeps the inherited Team mapping.

## Configuration entities

| Entity | Ownership | Important constraints |
| --- | --- | --- |
| `organization_setting` | Organization | One row; ISO currency, IANA timezone, delivery/stock policies. |
| role policy | Membership | Fixed MVP action groups; never widens Branch scope. |
| `vehicle_type` | Organization | Normalized unique active name; display order. |
| `service` | Organization | Normalized name, kind, expected duration, active/order. |
| `service_price` | Organization + optional Branch | Unique service/vehicle-type/Branch rule; exact money. |
| `payment_method` | Organization | Normalized unique name; seeded Cash; active/order. |
| `expense_category` | Organization | Normalized unique name; active/order. |
| `inventory_item` | Organization | Unique optional SKU; classification; immutable base unit after movement. |
| `commission_rule` | Organization + optional Branch/member/service | Non-overlapping precedence/effective range. |

## Reference entities

| Entity | Ownership | Main relations |
| --- | --- | --- |
| `customer` | Organization | Optional parent for vehicles, tickets, and sales. |
| `vehicle` | Organization | Optional customer; required vehicle type; many tickets. |
| `wash_worker` | Organization + optional Branch | Operational profile; login access remains separate. |

## Operational entities

| Entity | Relations and purpose |
| --- | --- |
| `wash_ticket` | Organization/Branch, optional customer/vehicle, status/payment summaries, vehicle and currency snapshots, optimistic version. |
| `wash_ticket_line` | Ticket plus service/package/add-on source; immutable description and price snapshots. |
| `wash_ticket_assignment` | Ticket/member with assignment lifecycle metadata. |
| `audit_event` | Append-only state/assignment/override evidence. |
| `wash_assignment` | Ticket/worker, explicit allocation and delivered commission estimate snapshot. |

## Finance entities

| Entity | Relations and purpose |
| --- | --- |
| `payment` | Source ticket or sale, one method, exact amount, posted/reversed state and idempotency. |
| `expense` | Branch/method/category source document; optional supplier/reference. |
| transfer movement pair | One Branch, source/destination methods and linked source ID. |
| `cash_session` | Physical Cash open/close/count at one Branch. |
| `financial_movement` | Append-only signed amount, source, transfer/reversal links, actor/time. |

## Inventory and retail entities

| Entity | Relations and purpose |
| --- | --- |
| `purchase` | Branch/method/category source document and posting lifecycle. |
| `purchase_line` | Item quantity/unit cost snapshots. |
| `retail_sale` | Branch, optional ticket/customer, totals/payment lifecycle. |
| `retail_sale_line` | Item quantity/price snapshots. |
| stock transfer movement pair | Source/destination Branch, item and linked source ID. |
| `stock_movement` | Append-only signed quantity, source, transfer/reversal links, actor/time. |

## Platform evidence entities

| Entity | Purpose |
| --- | --- |
| `idempotency_record` | Scoped operation key, request hash, state, and stored result reference. |
| `audit_event` | Safe append-only actor/action/resource/reason evidence. |

## Key relationships

```text
Organization
├── Branch
│   ├── Wash ticket ── lines / assignments / events / payments
│   ├── Expense ───────────────────────────────┐
│   ├── Purchase ── lines ──┐                  │
│   ├── Retail sale ── lines├── Financial movement
│   ├── Cash session         │                  │
│   └── Stock movement <─────┘                  │
├── Customer ── Vehicle ── Wash ticket          │
├── Service / Vehicle type / Price              │
├── Payment method / Expense category <─────────┘
├── Inventory item ── Branch item setting / Stock movement
└── Worker profile ── Assignment / delivered commission estimate
```

## Atomic posting boundaries

1. Ticket payment: payment + one financial movement + ticket payment status.
2. Ticket delivery: state event + timestamps + commission snapshots.
3. Expense: expense state + one negative financial movement.
4. Purchase: posted purchase + positive stock movements + negative financial
   movement.
5. Retail sale: posted sale + negative stock movements + one positive financial
   movement + optional ticket retail summary.
6. Finance transfer: document + paired negative/positive movements.
7. Stock transfer: document + paired outbound/inbound movements per line.
8. Reversal: source state + exact opposite movements + audit event.

D1 transaction capabilities must be verified during implementation. If a runtime
API cannot guarantee a listed boundary, redesign the write using supported batch/
transaction semantics before exposing it; never accept partial posting.

## Storage rules

- IDs are opaque, server-generated, and collision-resistant.
- Money uses integer minor units and currency snapshots.
- Quantity uses scaled integer or exact decimal storage with one project-wide
  precision and conversion helpers.
- Timestamps store UTC milliseconds; effective time and server time are distinct.
- Normalized search/unique fields are stored and indexed explicitly.
- Source-type/source-ID pairs are constrained by application services and tests;
  polymorphic references never replace Organization validation.
- Snapshot fields are intentional duplication and not “cleaned up” into mutable
  catalog joins.

## Index plan

At minimum measure and consider composite indexes beginning with Organization:

- Organization + Branch + ticket status + created/effective time;
- Organization + normalized plate/phone/name;
- Organization + Branch + financial method + effective time;
- Organization + Branch + financial movement type + effective time;
- Organization + Branch + item + stock time;
- Organization + Branch + sale/purchase time/state;
- source type + source ID for both ledgers;
- reversal-of uniqueness and idempotency-scope uniqueness.

Indexes are added from real query plans during each increment, not blindly all at
once. Every schema change uses Drizzle generation and inspected SQL.
