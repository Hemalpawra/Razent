# AGENT.md
# Razent — Agent Rules for All Work

This file is the first thing any agent must read before making changes.

If this file, the README, and the blueprint disagree, follow this file first, then the blueprint, then the README.

If a task is unclear, stop and ask a short question before changing code.

---

## 1) What this app is

Razent is an agentic commerce and instant retail platform.

It has:
- a customer storefront
- a customer AI assistant
- a merchant dashboard
- order, audit, analytics, and settings screens
- protocol discovery files for agent-to-agent commerce
- a Supabase-first data layer
- regulatory wrappers for India payment rules and safety

This is a live commerce product, not a mock demo.
Mock data is allowed only as a fallback or seed for local dev.

---

## 2) What the agent must do first

Before editing any file:

1. Read `README.md`
2. Read `AI_BLUEPRINT.md`
3. Read the target files for the task
4. Check the data model and routes that already exist
5. Check whether the change belongs in:
   - UI
   - shared state
   - API seam
   - Supabase schema
   - protocol layer
   - mock fallback
   - tests
6. If the task touches money, auth, roles, or data flow, trace the full path first

Do not start by editing UI if the data path is missing.

---

## 3) Source of truth rule

There must be one source of truth for each domain:

- products
- orders
- conversations
- audit trail
- settings
- analytics
- roles
- auth
- payment state
- shipping state

If a screen shows data, that data must come from a real source:
- Supabase table
- Supabase function
- shared client API
- computed value from real data
- seed data only for local demo or fallback

Do not invent values in the UI.

Do not keep hardcoded business data in the UI if it should come from storage.

Do not duplicate the same value in two places unless one is a clear derived view.

---

## 4) Data rules

### Allowed
- Supabase tables
- Supabase Edge Functions
- shared API seam in `src/lib/api/client.ts`
- shared types in `src/lib/types/*`
- shared state in `src/state/*`
- seed data in `src/lib/mock/*` only when used as fallback or local demo

### Not allowed
- random values in the UI
- fake totals
- fake order state
- fake audit events
- fake AI stats
- fake tracking steps
- fake reviews or product details
- hardcoded merchant data in components

### If data is missing
If a screen needs a field that does not exist:
1. ask me
2. or add the field to the schema and types first
3. then wire the UI

Do not make up a field and pretend it is real.

---

## 5) Protocol and agent rules

This app supports agentic commerce.

Use these layers correctly:

- A2A: agent-to-agent discovery and messaging
- ACP: commerce discovery, catalog, cart, and checkout intent
- AP2: mandate and approval layer
- UCP: universal commerce discovery layer
- NPCI / RBI wrapper: payment safety and mandate rules
- MCP: tool bridge between the model and the app

### Protocol rules
- Protocol logic must live in backend or shared protocol modules
- The model can suggest actions, but the backend must enforce them
- Do not let the model approve money actions on its own
- Do not let the model skip checks for stock, limits, or mandates
- Do not let the model write payment or approval state directly

### Money gate rule
Every money action must be:
- explainable
- bounded
- gated

Explainable:
- show why the product was picked
- show why the total changed
- show why payment is requested

Bounded:
- check stock
- check approval threshold
- check max discount
- check delivery requirements
- check mandate status

Gated:
- do not create or complete payment until the customer reviews and approves it

### Audit rule
Every important step must be logged:
- customer request
- AI search
- product recommendation
- upsell / cross-sell
- shipping details
- order review
- approval
- order creation
- payment success or failure
- invoice
- tracking

---

## 6) Auth and roles

The app must support two merchant roles:

### View-only merchant
- can see all merchant data
- can view products, orders, AI list, audit trail, analytics, and settings
- cannot edit, delete, import, export, refund, or change settings
- cannot open restricted conversation details
- if clicked, show a clear blocked message

### Admin merchant
- can do everything
- can add, edit, delete, import, export, refund, and change settings

### Login rules
- the public sign-in page must show only the view-only demo login
- admin login must stay protected
- do not expose admin credentials on public UI
- load permissions from role state after login
- hide or disable buttons the role cannot use

### Role state rules
- the app must always know the current role
- do not let UI actions bypass role checks
- do not trust the UI alone
- enforce role checks in state and backend

---

## 7) Merchant UI rules

Merchant screens:
- Dashboard
- Products
- Orders
- AI Agent
- Audit Trail
- Analytics
- Settings

### General merchant UI rules
- use one clean toolbar per screen
- do not duplicate filters
- do not duplicate export buttons
- do not duplicate close buttons
- keep full-width layouts clean
- keep tables readable
- keep drawers clear and narrow enough to scan

### Product screens
Keep product details simple and real.

In product details, keep only:
- product name
- product image
- product subtitle
- product description
- product category
- price
- stock
- features text
- specifications text

Remove these from product details unless they are real and wired:
- reviews
- warranty
- shipping
- returns
- prompt examples
- AI performance cards
- activity tab
- hardcoded helper text

### Product drawer rules
- keep only one close icon
- overview description must come from DB or seed data
- inventory controls must work if shown
- remove variants and fulfillment notes unless they are wired
- AI visibility and related products should stay only if they save and are used by AI search and recommendations

### Product import rules
- do not keep Product Import in the sidebar if it is already handled inside Products
- access import from the Products area or a product action
- CSV, Excel, and manual add must save to the product store
- do not leave import as local state only

### AI Agent rules
- remove decorative protocol cards that do not do anything
- remove any decorative attention cards if they are not wired
- keep only one filter set per screen
- live conversation data must be real
- status values must be real and current
- do not keep closed conversations marked as active
- show order amount only if an order exists
- if a view-only merchant clicks conversation details, show a blocked state

### Orders rules
- keep one clean toolbar only
- remove duplicate filters
- remove duplicate export buttons
- show live orders from DB
- include paid, pending, and failed orders
- new orders must appear after create, fail, or pay
- drawer actions must work:
  - View Invoice
  - View Conversation
  - View Tracking
  - Refund Order

### Audit Trail rules
- group audit by session
- drawer must use tabs
- all content must come from DB
- remove reset button if unused
- refresh must work
- linked items must work:
  - View Conversation
  - View Order
  - View Product
  - View Invoice
- View Full Trail must work or be removed
- timeline must come from real audit data

### Analytics rules
- use live data
- no fake charts
- no hardcoded KPI numbers
- no hardcoded AI stats
- no fake conversion values
- compute metrics from real orders, conversations, and audit records

### Settings rules
- keep settings focused and small
- only include settings that affect:
  - store profile
  - AI defaults
  - business rules
  - dummy shipping
  - notifications
- if a setting is shown, it must change app behavior

---

## 8) Customer store rules

Customer screens:
- Store Home
- Product Listing
- Product Detail
- Cart
- Checkout
- Payment Success
- Payment Failed
- Track Order

### Customer rules
- no login required
- no account needed
- no empty order history page
- track order must use order ID + mobile + email
- payment must hand off to Razorpay
- success must show invoice and tracking
- failure must show retry and help

### Desktop AI layout
On desktop:
- left side: store
- right side: AI assistant

Use a split layout:
- store takes about 80%
- AI assistant takes about 20%

The AI panel must:
- stay visible on the right
- look like a normal AI assistant workspace
- use Shadcn-style message components
- keep the input fixed at the bottom
- keep chat history above it
- show product cards inside messages
- show quick reply chips

Do not use a small drawer on desktop for AI.

### Mobile and tablet
Use a different layout.
Do not keep the desktop split layout on small screens.

---

## 9) Drawer rules

If a right-side drawer is used:
- use a non-modal drawer on desktop
- keep it light and side-based
- do not block the main page
- keep width around 25vw on desktop when possible
- keep min and max width safe for readability

Use drawers for:
- product details
- order details
- audit details
- conversation details

Do not stack multiple drawers at once if one can do the job.

---

## 10) UI state rules

Every screen must support:
- empty
- loading
- error
- success
- blocked
- pending

### State rules
- do not hide failures
- do not fake success
- do not skip error states
- do not leave a blank screen when data is missing
- if a state is not supported, ask before adding it

### Failure handling
If payment fails:
- show failed reason
- show order amount
- retry payment
- change payment method
- go back to cart
- ask AI for help

---

## 11) Security and safety rules

- never store or show secrets in the UI
- never pass CVV, OTP, card PIN, or full card number into AI
- never let AI bypass limits or approval steps
- never complete payment without approval if the rule requires approval
- never trust the client alone for permission checks
- never allow hidden admin actions through the view-only role
- never leak protected admin login on public pages

If a step is not safe, stop and ask.

---

## 12) Implementation rules

### Before coding
- read the blueprint
- inspect the relevant screen file
- inspect the related type file
- inspect `client.ts`
- inspect the state file
- inspect the protocol file if needed
- map data flow before making UI changes

### When coding
- keep changes narrow
- do not rewrite unrelated parts
- prefer shared helpers over repeated code
- keep types strict
- keep naming simple
- keep functions small
- use real data paths

### After coding
- run type checks
- run build checks
- test the changed flow
- test role restrictions
- test loading and error states
- test mobile and desktop if layout changed

---

## 13) Testing rules

Every change must be tested for:

- correct data source
- correct role access
- correct UI state
- correct event logging
- correct money gating
- correct split layout on desktop
- correct mobile layout
- correct drawer action
- correct export / refresh / filter behavior
- correct success and failure flow

If a button does nothing, it is not done.

If a screen still uses fake data where real data should exist, it is not done.

---

## 14) File rules

Only touch the files needed for the task.

### Common files to touch
- `src/lib/api/client.ts`
- `src/lib/types/*`
- `src/lib/protocol/*`
- `src/state/*`
- `src/components/customer/*`
- `src/components/merchant/*`
- `supabase/migrations/*`
- `supabase/functions/*`
- `public/.well-known/*`
- `src/AppRouter.tsx`
- `src/components/shared/AppShell.tsx`
- `src/components/auth/SignInScreen.tsx`

### Before changing a file
Ask:
- is this the right file?
- does this file own the data or the UI?
- will this change break a shared flow?

Do not change files just to move fast.

---

## 15) Output rules for the agent

When you finish a task, report:
- what changed
- which files changed
- what data path changed
- what was tested
- what still needs confirmation

If something is unclear, say so.
Do not hide gaps.
Do not guess.

---

## 16) Final rule

If a request conflicts with this file, stop and ask a question.

If a request needs data or logic that does not exist, do not fake it.
Ask first.