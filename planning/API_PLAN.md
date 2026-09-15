# ControlWash API Plan

All paths are planned under `/api/`, inherit the repository HTTP policy, validate
the active Organization/Branch on the server, and return typed JSON. Exact payload
schemas belong beside implementation and tests. This list establishes route
ownership and avoids overlapping endpoints.

## Product setup and catalogs

| Method | Path | Purpose |
| --- | --- | --- |
| GET/PATCH | `/api/product/settings` | Read/update currency, timezone, delivery, and stock policy. |
| GET/POST | `/api/vehicle-types` | List/create vehicle types. |
| PATCH | `/api/vehicle-types/:id` | Edit, order, activate/deactivate. |
| GET/POST | `/api/services` | List/create services, packages, and add-ons. |
| PATCH | `/api/services/:id` | Edit, order, activate/deactivate. |
| GET/PUT | `/api/services/:id/prices` | Read/replace authorized vehicle/Branch price rules. |
| GET/POST | `/api/payment-methods` | List/create methods; initialization guarantees Cash. |
| PATCH | `/api/payment-methods/:id` | Rename, order, or deactivate. |
| GET/POST | `/api/expense-categories` | List/create categories. |
| PATCH | `/api/expense-categories/:id` | Rename, order, or deactivate. |

## Customers and vehicles

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/api/customers` | Search/page or create customers. |
| GET/PATCH | `/api/customers/:id` | Authorized detail/update/deactivation. |
| GET/POST | `/api/vehicles` | Search/page or create vehicles. |
| GET/PATCH | `/api/vehicles/:id` | Detail/update/deactivation and safe history link. |
| GET | `/api/vehicles/:id/tickets` | Branch-filtered authorized wash history. |

## Wash tickets

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/api/wash-tickets` | Filter/page or create and add to queue. |
| GET | `/api/wash-tickets/:id` | Authorized operational detail with redaction. |
| PATCH | `/api/wash-tickets/:id` | Allowed pre-post service/vehicle/note updates with version. |
| POST | `/api/wash-tickets/:id/transitions` | Idempotent expected-state transition. |
| PUT | `/api/wash-tickets/:id/assignments` | Replace exact eligible worker allocation with version. |
| POST | `/api/wash-tickets/:id/cancel` | Reasoned cancellation after ledger checks. |

## Finance

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/wash-tickets/:id/payments` | Post one/split ticket payment. |
| POST | `/api/payments/:id/reverse` | Reverse through source-aware workflow. |
| GET/POST | `/api/expenses` | Filter/page or create/post expense. |
| GET | `/api/expenses/:id` | Expense and linked movement detail. |
| POST | `/api/expenses/:id/reverse` | Reasoned exact reversal. |
| POST | `/api/financial-adjustments` | Authorized signed adjustment. |
| POST | `/api/financial-transfers` | Atomic paired method/Branch transfer. |
| POST | `/api/financial-transfers/:id/reverse` | Reverse both sides. |
| GET | `/api/financial-movements` | Authorized paginated ledger. |
| GET | `/api/financial-balances` | Balances by accessible Branch/method/cutoff. |
| GET/POST | `/api/cash-sessions` | Current/history or open session. |
| POST | `/api/cash-sessions/:id/close` | Store expected/count/difference. |

## Inventory and retail

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/api/inventory/items` | Search/page or create item. |
| GET/PATCH | `/api/inventory/items/:id` | Detail/update/deactivate and Branch settings. |
| GET | `/api/inventory/stock` | Branch/item balances and low-stock filters. |
| POST | `/api/inventory/opening-stock` | Authorized opening movement. |
| POST | `/api/inventory/usage` | Manual consumption or waste. |
| POST | `/api/inventory/adjustments` | Reasoned count correction. |
| GET/POST | `/api/purchases` | Filter/page or create/post purchase. |
| GET | `/api/purchases/:id` | Purchase, lines, and linked movement detail. |
| POST | `/api/purchases/:id/reverse` | Atomic finance/stock reversal. |
| GET/POST | `/api/stock-transfers` | Filter/page or atomic Branch transfer. |
| POST | `/api/stock-transfers/:id/reverse` | Reverse all linked stock movements. |
| GET/POST | `/api/retail-sales` | Filter/page or post standalone/ticket-linked sale. |
| GET | `/api/retail-sales/:id` | Sale, lines, payments, and stock effects. |
| POST | `/api/retail-sales/:id/reverse` | Atomic finance/stock reversal. |

## Commissions and reports

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/api/commission-rules` | Authorized list/create rules. |
| PATCH | `/api/commission-rules/:id` | Update/deactivate future-effective rule. |
| GET | `/api/reports/dashboard` | Daily operational aggregates and exceptions. |
| GET | `/api/reports/washes` | Wash report. |
| GET | `/api/reports/finance` | Income, expenses, balances, and movements. |
| GET | `/api/reports/inventory` | Stock, movement, and low-stock report. |
| GET | `/api/reports/retail-sales` | Retail report. |
| GET | `/api/reports/commissions` | Commission estimate report. |
| GET | `/api/reports/:report/export` | Permission-identical bounded CSV export. |

## Contract conventions

- Lists use bounded pagination and stable ordering; filters cannot widen scope.
- Money is serialized as integer minor units plus currency; quantities use an
  exact string/scaled representation, never ambiguous JSON floating point.
- Mutations return the authoritative saved resource and relevant summaries.
- Validation errors use safe field codes; raw library/database errors never leak.
- Concurrency-sensitive updates require an expected version.
- Posting endpoints require an `Idempotency-Key` header and reject reuse with a
  different request hash.
- Reversal endpoints take only reason and expected source version; amount/effects
  are derived on the server.
- No bulk endpoint is added until mixed-scope atomicity is specified and tested.
