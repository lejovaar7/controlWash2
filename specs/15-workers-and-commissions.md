# 15 — Workers and Simple Commissions

## Purpose

This module attributes wash work to operational worker profiles and calculates
commission estimates. It does not implement payroll, labor law,
withholding, advances, attendance, or bank disbursement.

## Worker identity

A worker is an Organization-owned operational profile with name, optional phone,
optional Branch scope and active state. A worker does not need system access;
when a worker also needs to sign in, the administrator separately creates a user
under Users & permissions. Deactivation prevents future assignment and keeps
historical name and commission snapshots.

## Assignment

A wash ticket may have multiple assigned workers. An assignment records member,
Branch, added/removed actor, and time. The assignee must have active access to
that Branch at assignment time. Historical assignment remains even if scope later
changes.

## Commission rules

MVP rule methods:

- percentage in basis points of eligible service revenue.

Rule resolution may narrow by Organization, Branch, service, worker, and effective
date. Define deterministic precedence from most specific to Organization default;
ambiguous equal-priority overlaps are rejected at configuration time.

Retail products, tips, discounts, and taxes are excluded unless a future rule
explicitly adds them. Percentage uses the eligible net service line amount after
discount, before any future tax, with deterministic minor-unit rounding.

## Multiple workers

The ticket must store an explicit allocation for each worker:

- equal split selected by the operator as a convenience and persisted explicitly;
- custom percentages totaling exactly 100%; or
- individual fixed allocations when rule method permits it.

Never infer an equal split merely because two workers are assigned.

## Snapshot and correction

On delivery, the server writes the final commission estimate into each immutable
ticket assignment from snapshotted service totals, explicit allocation and the
most specific active percentage rule. Later rule/worker changes do not
recalculate delivered assignments. Settlement does not create an expense or
payroll transaction.

## Permissions and reports

- Owner sees and configures all within Organization.
- Authorized admin configures/reviews only within Branch scope.
- Worker profiles without system access cannot view the application.
- Ordinary operators can assign eligible workers but cannot view rates unless
  separately authorized.

## Acceptance checks

- Inactive or Branch-ineligible workers cannot be newly assigned.
- Rule precedence is deterministic and overlapping ambiguity is rejected.
- Allocation totals exactly 100% where percentage allocation is used.
- Delivery retries do not duplicate commission entries.
- Historical totals remain stable after rule/member changes.
- Delivered estimates remain stable after catalog/rule changes.
- Reports say commission estimate and do not claim payroll settlement.
