# 12 — Services, Packages, Add-ons, and Pricing

## Purpose

This module controls what a wash sells and how a price is selected for a vehicle
type and Branch. Ticket pricing must be explainable and historically stable.

## Catalog models

### Vehicle type

- Organization-owned name, display order, active state.
- Examples are configurable and not hard-coded business logic.
- Referenced types deactivate rather than delete.

### Service

- Organization-owned name, optional description, expected duration in minutes,
  color/icon token, display order, active state.
- A service is a labor/service line, not an inventory item.
- MVP does not automatically consume supplies from service recipes.

### Package and add-on

A package groups one or more service lines under a sellable name and price. An
add-on is an optional service line such as engine wash or wax. Both use the same
pricing and snapshot rules. Package components describe presentation and future
analysis; the charged ticket line uses the package's sell price.

## Price resolution

The lookup key is Organization + service/package/add-on + vehicle type with an
optional Branch override. Resolution order:

1. active Branch-specific price;
2. active Organization default price;
3. no price available.

No price means the option is unavailable unless an actor with price-override
permission enters a nonnegative price and reason. A zero price is valid and
distinct from missing price.

Money uses integer minor units and the Organization currency. MVP supports one
operating currency per Organization; changing the setting does not convert old
records.

## Ticket-line snapshot

Each selected line stores:

- source catalog ID and kind;
- description snapshot;
- quantity;
- unit price, line discount, and final line total;
- price-source snapshot: Branch rule, company rule, or authorized manual override;
- override actor/reason when applicable.

MVP discounts are explicit line or ticket amounts authorized by permission. No
coupon engine, promotion scheduler, price list per customer, or tax calculation
engine is included.

## Management behavior

- Owners and authorized admins create, edit, order, activate, and deactivate.
- Names are unique within their relevant Organization catalog after normalization.
- A price change is effective for new/draft recalculations only.
- Once a ticket is operationally accepted beyond draft/waiting according to the
  ticket contract, repricing requires an audited correction flow.

## Acceptance checks

- Branch override wins deterministically over the Organization default.
- Missing price is never silently treated as zero.
- Zero-price and overridden lines identify their source in authorized detail.
- Historical tickets remain unchanged after catalog edit/deactivation.
- Limited admins cannot configure prices outside their Branch scope.
- All totals use exact minor-unit arithmetic and server recomputation.
