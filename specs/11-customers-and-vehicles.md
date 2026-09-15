# 11 — Customers and Vehicles

## Purpose

Customer and vehicle records accelerate repeat visits but never block a walk-in
wash. Data is Organization-owned; vehicles are not globally shared identities.

## Customer model

MVP fields:

- stable ID, Organization ID;
- display name;
- normalized phone and optional email;
- optional notes;
- active state;
- created/updated timestamps and actor metadata.

Only display name is required when intentionally creating a customer. A wash
ticket may have no customer. Phone normalization supports search and duplicate
warnings but does not prove ownership or marketing consent.

## Vehicle model

MVP fields:

- stable ID, Organization ID;
- optional customer ID within the same Organization;
- required active vehicle-type ID;
- optional plate, make, model, color, year, and notes;
- normalized plate search value;
- active state and actor timestamps.

Plate is optional to accommodate motorcycles, temporary plates, or intake speed.
If provided, normalized plate uniqueness is enforced per Organization unless the
pilot demonstrates a legitimate duplicate case. Display preserves the entered
format while search ignores spaces, hyphens, and case.

## Search and duplicate handling

- Search supports normalized plate, customer name, and phone.
- Use bounded prefix/contains strategies suitable for D1; return a small page.
- Results are Organization-scoped before matching, never filtered afterward.
- Similar records produce a warning and reuse option, not automatic merging.
- MVP has no destructive merge. A later merge must preserve ticket references.

## History

Authorized users can see a vehicle timeline of wash tickets with date, Branch,
service summary, status, total, and payment status. Financial details require the
corresponding finance permission. Deactivated customers/vehicles remain labelled
on history and cannot be selected for new work.

## Privacy and presentation

- Queue cards display vehicle identity but minimize customer contact details.
- Notes are plain text, length-limited, and never rendered as HTML.
- No contact data is used for WhatsApp or marketing without a future consent and
  preference contract.
- Exports obey the same permissions and mitigate spreadsheet formula injection.

## Permissions

| Action | Owner | Admin | Member |
| --- | --- | --- | --- |
| Search/select within accessible Branch workflows | Yes | Yes, in scope | Yes, in scope |
| Create/update basic customer or vehicle | Yes | Yes, in scope | Yes, in scope if operational permission enabled |
| Deactivate | Yes | Yes, in scope | No |
| View financial history | Yes | With finance permission/in scope | No by default |

Creating reference data is Organization-wide, but access must be reached through
an authorized Branch workflow. A limited actor cannot use the directory to infer
activity at another Branch.

## Acceptance checks

- Walk-in ticket creation succeeds without customer or plate.
- Foreign-tenant customer/vehicle IDs are rejected without revealing existence.
- Plate normalization finds the intended vehicle and prevents accidental duplicate
  creation within the Organization.
- Updating a vehicle does not alter snapshots on existing tickets.
- Deactivated records appear in history and cannot be selected for new tickets.
- Member responses redact finance and unnecessary contact information.
