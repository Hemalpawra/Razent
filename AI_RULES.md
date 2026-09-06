# AI Rules — Merchant AI Gateway

> Read this before touching any source. These rules are enforced by every AI agent working in this repo.

---

## 1. What we are building

Merchant AI Gateway is a Razorpay-powered merchant store where customers can shop in two ways:

1. Browse the store normally.
2. Talk to an AI assistant, either inside the store or from their own AI tool through an agent-to-agent flow.

The AI handles:
- product discovery
- product comparison
- upsell and cross-sell
- shipping details collection
- Razorpay order creation
- payment handoff to Razorpay Checkout
- invoice display
- dummy shipping and tracking

There is no customer login and no customer order history page.

Customers track orders using:
- order ID
- mobile number
- email address

---

## 2. App surfaces

### Merchant screens
- Dashboard
- Products
- Orders
- AI Agent
- Audit Trail
- Analytics
- Settings

### Customer screens
- Store home
- Product listing
- Product detail
- AI assistant panel
- Cart
- Delivery address and shipping
- Razorpay payment handoff
- Payment success
- Payment failed
- Track order

---

## 3. What is real vs simulated

| Thing | Status |
|---|---|
| Products | Real, from DB or seeded DB data |
| Merchant settings | Real, from DB |
| Orders | Real, from DB |
| Conversations | Real, from DB |
| Audit trail | Real, from DB |
| Analytics | Real, computed from DB |
| Razorpay order creation | Real |
| Razorpay payment handoff | Real |
| Invoice | Real in app |
| Shipping | Simulated |
| Tracking | Simulated |

Do not present simulated values as real operational data.

---

## 4. Core architecture rules

### Single source of truth
Every screen must read from one real source of truth.

Do not let the UI depend on:
- hardcoded values
- random values
- duplicated mock state
- local-only state for business data

Use:
- Supabase tables
- shared API seam
- derived values from real data
- mock fallback only for offline local development

### API seam rule
All data access must go through the shared client layer.

Do not fetch directly from UI components if a shared API already exists.

### Data integrity rule
If a screen shows a field, that field must have:
- a source
- a storage path
- an update path
- a dependent screen path

If any of those are missing, ask before building it.

---

## 5. Role rules

There are two merchant roles.

### View-only merchant
Can:
- view products
- view orders
- view AI agent list
- view audit trail
- view analytics
- view settings

Cannot:
- create
- edit
- delete
- import
- export
- refund
- change settings

If a view-only merchant clicks a restricted action, show a clear blocked message.

### Admin merchant
Can:
- do everything
- add
- edit
- delete
- import
- export
- refund
- change settings

### Sign-in rules
- The public sign-in page must show only the view-only merchant login card.
- Do not show admin credentials publicly.
- Admin login must stay protected.
- The app must always know the active role.
- Hide or disable actions the role cannot use.

---

## 6. UI layout rules

### Desktop storefront
On desktop, use a split layout:
- left: about 80% store content
- right: about 20% AI assistant panel

The AI panel must:
- stay visible
- look like a modern AI assistant
- use message-style components
- keep the composer fixed at the bottom
- keep chat history above it

Do not use a small drawer for the desktop AI panel.

### Mobile and tablet
Use a different layout.
Do not keep the desktop split layout on smaller screens.

### Drawer rules
If a drawer is needed on desktop:
- use a non-modal drawer
- keep it on the side
- keep it narrow enough to scan
- do not block the main page

Suggested drawer width:
- about 25vw
- with safe min/max bounds

### One toolbar rule
Each page should have one clean toolbar.
Do not duplicate:
- filters
- export buttons
- close buttons
- refresh buttons

---

## 7. Screen-specific rules

### Store home
Must show:
- store identity
- categories
- featured products
- AI helper
- trust notes

Must not show:
- merchant admin controls
- customer login
- customer order history

### Product listing
Must show:
- product cards
- filters
- sort
- search
- AI split layout on desktop

Must not show:
- footer in AI split mode
- small AI drawer on desktop

### Product detail
Must show only the fields the product actually has:
- product name
- product image
- subtitle
- description
- category
- price
- stock
- features text
- specifications text

Must remove unless truly wired:
- reviews
- warranty
- shipping
- returns
- prompt examples
- AI performance cards
- activity tab

### Product drawer
- Keep only one close icon.
- Overview description must come from DB.
- Inventory controls must work if shown.
- Remove variants and fulfillment notes unless they are wired.
- AI visibility and related product settings stay only if they save to DB and are used by AI.

### Product import
- Do not keep Product Import in the sidebar if it is already handled inside Products.
- Access import from the Products area or a product action.
- CSV, Excel, and manual add must save to the real product store.
- Import must not stay local-only.

### AI agent
- Keep live conversations real.
- Remove decorative cards that do not change behavior.
- Keep one filter set only.
- Use real statuses.
- Closed conversations must not remain active.
- Show order amount only when an order exists.

### AI conversation details
- View-only merchants cannot see restricted chat detail.
- If blocked, show a clear permission message.

### Orders
- Orders must update from real DB data.
- Show paid, pending, and failed states.
- Keep one toolbar.
- Duplicate filters and duplicate export controls must be removed.
- New orders must appear live.

### Audit trail
- Group by session.
- Drawer must use tabs.
- All drawer data must come from DB.
- Reset button should be removed if unused.
- Refresh must work.
- Linked item buttons must work:
  - View Conversation
  - View Order
  - View Product
  - View Invoice
- Timeline must come from real audit data.

### Analytics
- Use live computed data.
- Do not hardcode KPIs.
- Do not hardcode AI metrics.
- Do not use fake charts.

### Settings
Keep only:
- Store Profile
- AI Defaults
- Business Rules
- Dummy Shipping
- Notifications

Do not include:
- team management
- API access
- system status
- danger zone
- account admin tools

The settings must affect real app behavior.

---

## 8. Money action rules

Every money action must be:

### Explainable
Show:
- why the product was selected
- why the total changed
- why payment is being requested

### Bounded
Apply:
- max order value
- max discount
- stock checks
- shipping details
- approval threshold

### Gated
Do not create or complete payment until:
- the customer reviews the order
- the customer explicitly approves it

### Audit
Log every step:
- customer request
- AI search
- product recommendation
- upsell or cross-sell
- shipping details collected
- order review shown
- approval received
- Razorpay order created
- payment success or failure
- invoice generated
- tracking started

### Failure handling
If payment fails, show:
- failed reason
- order amount
- retry payment
- change payment method
- back to cart
- Ask AI for help

---

## 9. Protocol rules

The app may support:
- A2A
- ACP
- AP2
- UCP
- MCP

These are protocol layers, not UI decoration.

### Protocol rules
- Protocol logic must live in backend or shared protocol modules.
- The model may suggest actions.
- The backend must enforce the rules.
- Do not let the model approve money actions on its own.
- Do not let the model bypass stock, limit, or mandate checks.

### Auth rule for protocols
Any protocol flow that touches money must be gated by:
- authenticated user
- mandate validation
- approval threshold
- audit logging

### Protocol metadata
If a conversation, order, or audit event uses a protocol, store:
- protocol name
- agent id
- mandate id
- delegated limit
- approval status
- receipt status

---

## 10. Security rules

- Never store or show secrets in the UI.
- Never pass CVV, OTP, full card number, or PIN into AI prompts.
- Never let the model bypass limits.
- Never complete payment without approval if approval is required.
- Never trust the client alone for role checks.
- Never leak admin credentials publicly.

If something is unclear, stop and ask.

---

## 11. Testing rules

Before calling a change done, test:
- role access
- real data path
- UI state
- drawer actions
- filter actions
- export / refresh actions
- mobile vs desktop layout
- success and failure states
- payment gating
- audit logging
- protocol metadata if used

If a button does nothing, it is not done.

If a screen still shows fake business data where real data should exist, it is not done.

---

## 12. Change discipline

Before editing:
1. Read the README.
2. Read the blueprint.
3. Read the target files.
4. Check whether the change belongs in UI, state, API, schema, or protocol code.
5. Ask if a needed field or rule is missing.

Do not guess missing business logic.
Do not invent fields.
Do not quietly add fake defaults.

---

## 13. Final rule

If a request conflicts with these rules, stop and ask.
If a request needs data that does not exist yet, ask before building.