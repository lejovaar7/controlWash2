# ControlWash Project Overview

ControlWash is a closed B2B SaaS for car and motorcycle wash businesses. It
combines a fast operational queue with recorded payments, expenses, worker
commissions, lightweight inventory, purchases, and retail sales.

The repository was cloned from the reusable SaaS template on 2026-09-14. The
inherited foundation is implemented; the ControlWash domain is specified for
incremental development. Its operating-settings, default-catalog and configurable
payment-method foundation is implemented and verified; transaction modules are
not yet claimed as implemented.

## Documentation structure

[specs/README.md](specs/README.md) is the canonical module index.
[PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) defines the audience, promise, MVP, and
exclusions. [planning/README.md](planning/README.md) organizes decisions, stories,
and delivery without overriding specifications.

## Product at a glance

- The platform operator provisions a wash company, first Owner, and Main Branch.
- Owners/admins configure vehicle types, services, prices, payment methods,
  expense categories, items, and worker commission rules.
- Operators receive a vehicle without requiring customer details, move it through
  Waiting → In progress → Ready → Delivered, and collect split payments.
- Payment methods are simple Organization-defined labels. Cash exists by default;
  Nequi, Bancolombia, or others can be added without bank integration.
- Opening balances, income, expenses, adjustments, transfers, and reversals form
  an immutable operational financial ledger.
- Purchases connect one financial outflow to stock increases. Retail sales connect
  payment income to stock decreases and may be standalone or ticket-linked.
- Supplies support opening stock, manual consumption, waste, adjustments,
  transfers, and low-stock warnings. Automatic service recipes are deferred.
- Reports show recorded operational values, not bank reconciliation, accounting
  profit, fiscal invoices, formal inventory valuation, or payroll.
- Every request remains Organization-isolated and Branch-authorized by the server.

The inherited boundaries remain in modules 00–09. The ControlWash domain starts
at [module 10](specs/10-controlwash-product.md); domain permissions and isolation
are defined in [module 19](specs/19-domain-permissions-and-audit.md).

## Architecture

- React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui on Base UI, and Geist.
- Hono API on Cloudflare Workers with Static Assets for the SPA.
- Cloudflare D1 through Drizzle ORM and generated migrations.
- Better Auth for authentication, Organizations, Teams/Branches, and membership.
- Typed extensible English/Spanish localization and Cloudflare Email abstraction.

Frontend and Worker remain separate TypeScript projects. All API routes live under
`/api/`; server guards are authoritative. Local, dev, and production resources
remain isolated and remote release actions require separate authorization.

## Current state

- Implemented: inherited authentication, provisioning, company/Branch/member
  access, language, environment safety and base application shell; plus product
  settings, deterministic seed catalogs and payment-method configuration.
- Partially implemented: modules 10 and 14. The other ControlWash domain modules
  remain specifications rather than implementation claims.
- No product Git remote, cloud resources, remote migration, deployment, or push
  has been created as part of product initialization.
- `ControlWash` is the selected name; trademark/domain/social clearance remains a
  separate launch task.
