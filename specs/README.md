# ControlWash Specifications

This is the single specification structure for the project: one document per
module, combining behavior, rules, source references and acceptance checks.
Numbers are a reading order, not delivery phases or a list of unfinished tasks.

Inherited modules 00–09 and local MVP modules 10–19 are implemented. Module 20
defines deliberately deferred integrations. The
[verification record](VERIFICATION.md) contains dated execution evidence and
release limitations; production deployment remains a separate operation.

## Modules

| Module | What it explains | Main source area |
| --- | --- | --- |
| [00 — Product and Architecture](00-product-and-architecture.md) | Product model, stack, application boundaries and what belongs to a cloned SaaS. | `package.json`, `wrangler.json`, `vite.config.ts`, `tsconfig*.json` |
| [01 — Database and Migrations](01-database-and-migrations.md) | Shared D1, Drizzle schemas, generated migrations and membership uniqueness. | `src/worker/db/`, `drizzle/`, `drizzle.config.ts` |
| [02 — Authentication and Email](02-authentication-and-email.md) | Sign-in, verification, password recovery, first-account setup and email delivery. | `src/worker/auth/`, `src/worker/email/`, auth pages |
| [03 — Platform Provisioning](03-platform-provisioning.md) | Operator bootstrap and creation of a company, Owner and localized initial Branch. | `src/worker/platform/`, platform and setup routes/pages |
| [04 — Tenant and Branch Security](04-tenant-and-branch-security.md) | Company membership, active context, Branch access and isolation rules. | `src/worker/tenant/index.ts`, `src/worker/tenant/branch.ts` |
| [05 — Frontend Application](05-frontend-application.md) | Routes, layouts, switching, language settings, extensible catalogs and accessibility. | `src/react-app/`, `src/shared/i18n/` |
| [06 — Branch Management](06-branch-management.md) | Branch visibility, creation, renaming, selection and no-access states. | Branch pages/switcher, `use-branches.ts`, `test/branches.test.ts` |
| [07 — Users and Permissions](07-member-management.md) | Directory, identity reuse, setup, Owner delegation, all/selected Branches and company-only deactivation/reactivation. | `src/worker/tenant/members.ts`, user-access UI, `test/members.test.ts`, `test/access-controls.test.ts` |
| [08 — HTTP and Release Boundaries](08-http-and-release-boundaries.md) | Request validation, disabled bypass routes, safe errors and template protections. | `src/worker/http.ts`, `src/worker/auth/http-policy.ts`, `test/hardening.test.ts` |
| [09 — Testing and Operations](09-testing-and-operations.md) | Local/dev/production, guarded commands, test coverage, dependency maintenance and releases. | `wrangler.json`, `scripts/`, `vitest.config.ts`, `test/`, package scripts, generated binding types |
| [10 — ControlWash Product Domain](10-controlwash-product.md) | Shared vocabulary, scope, seed defaults, lifecycles, and cross-module invariants. | `src/worker/product/setup.ts`, product domain modules |
| [11 — Customers and Vehicles](11-customers-and-vehicles.md) | Optional customer data, vehicle identity, search, history, privacy, and permissions. | `product/catalogs.ts`, customer/vehicle UI |
| [12 — Services and Pricing](12-services-packages-and-pricing.md) | Vehicle types, services, packages, add-ons, Branch prices, snapshots, and overrides. | `product/catalogs.ts`, services UI |
| [13 — Wash Tickets and Queue](13-wash-tickets-and-queue.md) | Ticket model, state machine, operational board, timing, assignment, and concurrency. | `product/tickets.ts`, queue UI |
| [14 — Payments, Cash, and Expenses](14-payments-cash-and-expenses.md) | One-method payments, ledger, expenses, balances, cash sessions, same-Branch method transfers, and reversals. | `product/finance.ts`, cash UI |
| [15 — Workers and Commissions](15-workers-and-commissions.md) | Worker assignment, percentage rules, snapshots, and operational estimates. | worker/commission API and UI |
| [16 — Inventory and Retail Sales](16-inventory-and-retail-sales.md) | Items, stock movements, purchases, consumption, transfers, low stock, and quick sales. | `product/inventory.ts`, inventory/sales UI |
| [17 — Dashboard and Reports](17-dashboard-and-reports.md) | Metric definitions, filters, drill-down, redaction, performance, and CSV exports. | `product/reporting.ts`, dashboard/reports UI |
| [18 — Product Frontend and Design](18-product-frontend-and-design.md) | Visual direction, information architecture, responsive flows, content, and accessibility. | `src/react-app/` product UI |
| [19 — Domain Permissions and Audit](19-domain-permissions-and-audit.md) | Role policy, isolation, audit events, HTTP behavior, and security test matrix. | Worker guards, audit rows and tests |
| [20 — Future Integrations](20-future-integrations.md) | WhatsApp, booking, memberships, photos, advanced inventory, payments, and hardware boundaries. | Deferred |

## How to review the product

Start with the [product brief](../PRODUCT_BRIEF.md), module 10, and the domain
modules 11–18. Review modules 04, 07, and 19 together for authority and isolation.
Review module 09 before migrations, dependencies, or releases.

Inside each module, acceptance checks describe what must remain true after a
change. They are not claims that every possible test was performed: actual
observations, counts and limitations belong to [VERIFICATION.md](VERIFICATION.md).

## Scope boundaries

ControlWash remains closed B2B, with inherited `owner`, `admin`, and `member`
roles plus explicit product capabilities. Public signup, self-service onboarding,
billing, accounting, payroll, fiscal invoicing, automated messaging, and the
advanced features in module 20 are outside MVP.

## Documentation responsibilities

- This index and the numbered modules are the canonical feature contracts.
- [Project overview](../PROJECT_SPEC.md) is a short introduction pointing here.
- [Operator guide](../README.md) owns setup and day-to-day commands.
- [Agent guidance](../CLAUDE.md) owns coding and repository conventions.
- [Verification record](VERIFICATION.md) owns dated execution evidence.

When behavior changes, update the responsible module and its acceptance checks,
then the operator guide or verification record when affected. Extend this
structure for a genuinely new module; do not create a second set of specs for
the same functionality. Keep source keys and documentation in English; localized
catalog values are the explicit exception. Language behavior belongs to module
05, email resolution to 02, persistence to 01 and provisioning to 03.

## Next work

Use the explicit release sequence in module 09: provision isolated dev resources,
apply the dev migration, deploy, and run the representative-user pilot. None of
those remote actions are implied by the locally complete MVP.
