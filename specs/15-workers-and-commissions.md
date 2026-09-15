# 15 — Workers and Simple Commissions

## Purpose

This module attributes wash work to existing company members and calculates
operational commission estimates. It does not implement payroll, labor law,
withholding, advances, attendance, or bank disbursement.

## Worker identity

A worker is an inherited Organization member eligible for assignment in a
Branch. Do not create a second password/user system. Domain profile fields may
store an optional public display label and commission eligibility, keyed to the
membership.

Deactivating company access prevents future assignment but preserves historical
name snapshots and commission records. Assignment authority never grants account
management authority.

## Assignment

A wash ticket may have multiple assigned workers. An assignment records member,
Branch, added/removed actor, and time. The assignee must have active access to
that Branch at assignment time. Historical assignment remains even if scope later
changes.

## Commission rules

MVP rule methods:

- fixed minor-unit amount per delivered ticket/service;
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

On delivery, the server writes immutable commission entries containing ticket,
worker membership and name snapshot, rule snapshot, eligible amount, allocation,
calculation, and final estimate. Later rule/member changes do not recalculate old
entries.

Ticket reversal/correction writes offsetting commission entries. MVP may mark
entries reviewed or externally settled for reporting, but settlement does not
automatically create an expense or payroll transaction.

## Permissions and reports

- Owner sees and configures all within Organization.
- Authorized admin configures/reviews only within Branch scope.
- A worker may see their own estimates if the Organization enables it; they do
  not see peer totals by default.
- Ordinary operators can assign eligible workers but cannot view rates unless
  separately authorized.

## Acceptance checks

- Inactive/out-of-Branch members cannot be newly assigned.
- Rule precedence is deterministic and overlapping ambiguity is rejected.
- Allocation totals exactly 100% where percentage allocation is used.
- Delivery retries do not duplicate commission entries.
- Historical totals remain stable after rule/member changes.
- Reversal offsets the correct worker and original calculation.
- Reports say commission estimate and do not claim payroll settlement.
