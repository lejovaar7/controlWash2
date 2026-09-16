# 20 — Future Integrations and Explicitly Deferred Scope

## Purpose

This module records likely extensions so MVP schemas preserve sensible source
links and consent boundaries. It authorizes no implementation by itself.

## WhatsApp and customer notifications

Potential events include ticket received, ready for pickup, delivered receipt,
and later booking/membership/payment reminders. Before implementation define:

- verified customer phone ownership and explicit purpose-based consent;
- template approval, locale resolution, quiet hours, opt-out/suppression, and
  retention;
- provider abstraction, credentials, webhook signature verification, retries,
  idempotency, delivery state, rate limits, and cost controls;
- authorized manual resend and redacted audit evidence;
- country-specific privacy and messaging requirements.

Do not treat an entered phone number as consent. Do not send automated delinquency
messages until a future receivables/membership model defines what “late” means.

## Reservations and public booking

Would require service availability, capacity, duration, blackout rules, public
tenant resolution, abuse controls, confirmation/cancellation policy, and mapping
to a wash ticket. The MVP source channel leaves room for this but has no public
booking endpoint.

## Memberships and recurring plans

Would require plan entitlements, vehicle/customer ownership, renewal/payment
state, usage rules, pause/cancel/refund behavior, and dunning. Do not model a plan
as a recurring ordinary ticket or infer delinquency from an unpaid wash.

## Photos and vehicle condition

Would require R2/object storage, signed upload/read paths, MIME/size validation,
malware/content policy, retention, deletion/privacy workflow, and evidence access.
Never store large images directly in D1.

## Advanced inventory

Deferred capabilities include suppliers, purchase orders, partial receipts and
returns, unit conversions, automatic service recipes, lots, expiry, barcodes,
stock counts with approval, cost valuation, and accounts payable. Introduce them
through additive, backward-compatible migrations and reconcile existing movements.

## Payment and fiscal integrations

A real payment provider requires confirmed external status, webhook verification,
fees, refunds, settlement/reconciliation, and secret isolation. Electronic/fiscal
invoicing depends on target-country rules and must remain distinct from the
operational ticket and payment method labels.

Split payments and cross-Branch financial transfers are also deferred. They
require explicit allocation and authorization contracts before being added; the
MVP records each payment with one method and permits a balance transfer only
between two methods in the same Branch.

## Hardware and machine integration

License-plate recognition, POS peripherals, printers, gates, and tunnel equipment
need device identity, offline behavior, safe command boundaries, and observability.
No MVP API should pretend these devices are trusted users.

## Extension checks

Before starting a deferred module:

- update the product brief, decision log, canonical spec, permission matrix, data
  retention policy, and threat model;
- prove the pilot problem and smallest coherent outcome;
- define migration, rollback/recovery, idempotency, observability, and cost limits;
- obtain explicit authority for new providers, credentials, cloud resources,
  remote writes, and deployments.
