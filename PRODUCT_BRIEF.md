# ControlWash Product Brief

## Status

This document defines the approved product direction as of 2026-09-14.
`ControlWash` is the selected product name. Trademark, domain, and social-handle
availability must still be validated before public launch because an existing
product uses the same name in the industrial-laundry market and a direct
competitor uses the similar name Control Carwash. This pending clearance does not
change the selected internal or product name.

## Product statement

ControlWash is a simple, mobile-first operational control system for car and
motorcycle washes. It helps a business know which vehicles are waiting, being
washed, ready, or delivered; what was charged and how it was paid; which expenses
and cash adjustments occurred; what stock is available; and what retail products
were sold.

The product is operational software, not accounting, tax invoicing, banking, or
payroll software. Amounts and balances are the records entered in ControlWash and
are not automatic bank reconciliations.

## Target customer

- Independent car or motorcycle washes with one or several locations.
- Teams that currently coordinate work with paper, spreadsheets, chat, or a
  generic point of sale.
- Owners who need reliable daily control without hiring an implementation team.
- Operators who need to create a wash ticket in less than 30 seconds from a phone
  or tablet.

## Primary promise

> Run every wash, payment, expense, and stock movement in one place.

## MVP outcomes

1. An operator can receive a vehicle, price the work, and place it in the queue.
2. The team can move the ticket through its operational states without ambiguity.
3. An authorized user can collect one or split payments using company-defined
   methods such as Cash, Nequi, or Bancolombia.
4. The owner can explain the recorded balance of each payment method from an
   immutable movement history.
5. Purchases and other expenses reduce the corresponding recorded balance.
6. Purchases can increase stock and counter sales can decrease it and create
   income without requiring a wash ticket.
7. The owner can review sales, expenses, cash flow, service volume, commissions,
   and low-stock alerts by authorized Branch and period.

## Product principles

- Fast before exhaustive: the common wash flow must require very little typing.
- One source of truth: payments, financial movements, sales, and stock movements
  link to their source transaction.
- Correct rather than editable: posted operational records are reversed or
  compensated, never silently rewritten.
- Flexible names, strict behavior: customers configure payment methods, vehicle
  types, services, expense categories, and products while the ledger rules remain
  consistent.
- Branch-safe by default: every business row is scoped to an Organization and,
  when operational, a Branch.
- Friendly clarity: use plain language, progressive disclosure, large touch
  targets, visible status, and no dense accounting jargon.

## MVP modules

- Customers and vehicles.
- Services, packages, add-ons, and Branch pricing.
- Wash tickets and operational queue.
- Payment methods, cash sessions, expenses, transfers, and adjustments.
- Workers and simple commissions.
- Lightweight inventory and counter sales.
- Operational dashboard and reports.
- Existing Organization, Branch, member, authentication, language, security, and
  environment modules inherited from the template.

## Deferred after MVP

- Online reservations and a public booking page.
- Automated WhatsApp reminders and status messages.
- Loyalty, memberships, subscriptions, and prepaid wash plans.
- Before/after photos and damage evidence.
- Home-service routing.
- Fiscal/electronic invoicing and formal accounting.
- Accounts payable, purchase orders, lots, expiry dates, barcodes, and advanced
  supplier management.
- Automatic service recipes that consume exact quantities of supplies.
- Full payroll, advances, and complex commission settlement.
- License-plate recognition, dedicated hardware, native mobile apps, and machine
  integrations.

## Success measures for the pilot

- Median wash-ticket creation time is at most 30 seconds.
- At least 95% of completed tickets have a recorded payment or an explicit unpaid
  status before delivery.
- Every displayed payment-method balance can be reconstructed from movements.
- Posted purchases and sales create matching financial and stock movements.
- No tested cross-Organization or unauthorized cross-Branch access succeeds.
- Pilot operators complete intake, queue progression, payment, expense, purchase,
  and quick-sale scenarios without training beyond a short guided tour.

## Open product decisions

- Trademark/domain clearance and final visual identity for ControlWash.
- Pilot country, default currency, timezone, and tax expectations.
- Whether negative stock is blocked or allowed only with an authorized override.
- Exact commission settlement workflow for the first pilot.
- Which WhatsApp provider and consent model to evaluate after the MVP.
