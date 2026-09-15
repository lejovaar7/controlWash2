# 18 — Product Frontend and Design System

**Status:** Partially implemented. `/app/wash-setup` reuses the inherited design
system for a responsive bilingual settings and payment-method experience. The
operational queue, financial, inventory, retail and reporting surfaces remain
target MVP work.

## Experience goal

ControlWash should feel calm during a busy wash: quick, obvious, and forgiving of
limited screen space. Visual quality comes from hierarchy, spacing, typography,
feedback, and coherent states rather than decoration.

## Technology and reuse

- Keep Tailwind CSS 4, shadcn/ui using Base UI, Lucide, Geist, React Router, and
  the typed English/Spanish catalog.
- Reuse generated UI primitives through wrappers; do not edit generated shadcn
  internals unless the template contract explicitly changes.
- Reuse `PageContainer`, `PageHeader`, authentication shells, tenant/Branch
  switchers, and server-authoritative route context.
- No new global state or data-fetching library without measured need.

## Visual direction

- Neutral warm/cool surfaces with one restrained brand accent to be selected
  after naming validation.
- Strong dark text, accessible secondary text, subtle borders, and limited shadow.
- Semantic colors are reserved: blue/informational, amber/waiting, violet/in
  progress, green/ready/paid/success, red/cancelled/error/critical stock.
- Status never relies on color alone; pair icon, label, and shape.
- Border radius and elevation stay consistent; avoid a dashboard of unrelated
  floating cards.
- Motion is short and functional and respects reduced-motion preferences.

## Interaction principles

1. One visible primary action per task area.
2. Common tasks appear first; advanced fields remain collapsed until requested.
3. Default from context: active Branch, current time, common vehicle type, and
   last safe operator choice where appropriate.
4. Never default a destructive, financial-adjustment, or reversal reason.
5. Confirm consequential actions with amount/quantity, method/item, Branch, and
   result—not generic “Are you sure?” copy.
6. Preserve typed input after recoverable errors and explain how to fix it.
7. Disable duplicate submissions and show pending state without hiding context.

## Responsive layout

- Mobile first from 360 px; core operation must not require horizontal scrolling.
- Touch targets are at least 44 × 44 CSS pixels.
- Desktop may use tables for comparison; mobile uses information-preserving cards
  with explicit row actions.
- Queue columns may become tabs/segmented states on phones, not squeezed boards.
- Dialogs become sheets/full-screen task flows when narrow.
- Critical action/footer areas remain reachable above mobile browser controls.

## Information architecture

Primary product navigation:

- Today (dashboard and exceptions)
- Washes (queue and history)
- Quick sale
- Cash & balances
- Inventory
- Customers & vehicles
- Reports
- Team, Branches, and Settings according to permission

Navigation hides unauthorized destinations for clarity, but the Worker remains
the security boundary. Avoid empty top-level sections for deferred features.

## Key flows

### New wash

Use a focused sheet/page:

1. vehicle type and optional plate/customer lookup;
2. service/package selection with visible price;
3. optional add-ons/worker and concise notes;
4. total and primary “Add to queue” action.

Target median completion is at most 30 seconds. Do not require contact data.

### Queue

Cards expose the next valid state action. Secondary details open without losing
the board filter/scroll position. Elapsed-time urgency is legible but not noisy.
Manual refresh is available alongside safe polling.

### Checkout

Show source lines, total, already paid, remaining, method parts, and exact result.
Adding a second method is deliberate. Never visually equate a recorded digital
method with confirmed bank settlement.

### Expense/purchase

“Expense” is fast for non-stock outflows. “Purchase stock” is the guided connected
flow that adds item lines and shows both outcomes: stock increases and selected
method balance decreases. Avoid making users record the same purchase twice.

### Quick sale

Product grid/search, compact cart, visible stock warning, total, payment, and one
post action. Operator can optionally attach it to the active wash ticket.

## Content design

- Use operational language: Waiting, Start wash, Ready, Deliver, Record expense,
  Purchase stock, Quick sale, Reverse.
- Use “recorded balance,” “net recorded cash flow,” “estimated stock cost,” and
  “commission estimate” to preserve product boundaries.
- Error messages do not expose raw server/library errors or existence of foreign
  tenant data.
- English source keys and complete Spanish values remain required.

## Accessibility

- Meet WCAG 2.2 AA for product-critical flows.
- Visible focus, logical tab order, programmatic labels/descriptions/errors, and
  announced async results.
- Keyboard equivalents for board actions; drag-and-drop is never the only route.
- Minimum contrast applies to text, icons, borders communicating state, and focus.
- Charts, if later used, include textual values and are not the sole explanation.

## Required states

Every screen specifies loading, empty, filtered-empty, error/retry, offline or
network-loss feedback, permission-denied behavior, stale/conflict recovery, and
success confirmation. Skeletons preserve layout and never display fake totals.

## Acceptance checks

- Representative pilot users complete the six primary flows on phone/tablet.
- Ticket creation meets the 30-second median target in a usability smoke test.
- No core mobile flow scrolls horizontally at 360 px.
- Keyboard-only and screen-reader smoke tests cover intake, transitions, payment,
  expense, purchase, and sale.
- State is communicated without color alone and reduced motion is respected.
- Destructive/ledger actions state their precise effect before confirmation.
- Spanish and English layouts handle long labels without clipping.
