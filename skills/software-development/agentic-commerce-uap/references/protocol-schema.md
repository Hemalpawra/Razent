# Protocol Schema Reference (UAP / ACP / x402)

Session detail for the `agentic-commerce-uap` skill.

## UAP settlement flow (current state — Sections 1-5 complete)
- `client.ts`: `executeAgentCheckout()` routes: `verifyAP2Mandate()` → `approveAuto()` (paise conversion: `approvalThresholdRupees * 100`) → `processUAPTransaction()` (audit events emitted) → `createX402Challenge()` (settlement: `razorpay_test`).
- Audit events: `checkout_initiated` + `checkout_completed` with `auditStore` persistence (`lib/storage/auditStore.ts`).
- `types/order.ts`: `mandate_id?: string` (optional per Section 2 fix), `checkout_session_id?: string`, `payment_method`, `invoice_number`, `subtotal_paise`, `discount_paise`, `tax_paise`, `via_ai`, `conversation_id`.
- `types/conversation.ts`: `protocol?: CommerceProtocol` (`"ncpi_uap" | "acp" | "ap2" | "x402" | "direct_web"`) + `agent_id?: string`.
- `types/audit.ts`: `ProtocolEvent` union (`checkout_initiated`, `checkout_completed`, `refund_initiated`, `mandate`).
- `agenticCommerce.ts`: `handleACPDiscovery()` (store lookup), `verifyAP2Mandate()` (identity + delegated cap check), `approveAuto()`, `processUAPTransaction()`, `createX402Challenge()`.
- `drawer.tsx`: `DrawerPrimitive.Root` with `modal={false}` (non-modal, no Backdrop), width `w-[25vw] min-w-[380px] max-w-[420px]`. Mobile: `if (isMobile) return null` (parent screen handles `setActiveScreen`).
- `StoreHome/index.tsx`: checkout → real `executeAgentCheckout()`; `TrackOrder` → `await trackOrder()`; `addToCart` → audit event `checkout_initiated` with lowercase `"store"`/`"customer"`/`"ai_agent"`; `trackPrefill` uses `lastOrderId` (not `paymentId`); `generateMockOrder` delegates to `orderStore.get()`.
- `lib/storage/*.ts`: singleton `Map` stores (`productStore`, `orderStore`, `conversationStore`, `auditStore`) — never throw; seeded from mocks.
- Section 5 wire (`53c6131`): `Dashboard` (`getDashboard()` dynamic derivation), `Orders` (`listOrders()`), `AIAgent` (`listConversations()` + protocol badges), `AuditTrail` (`listAuditSessions()`), `ProductImport` (`upsertProduct()` in CSV loop + manual form).

## Completed per blueprint (AI_BLUEPRINT.md reference)
- Non-modal drawer spec: desktop width locked; mobile separate full-screen (`AppShell` `setActiveScreen`).
- Protocol architecture: `UAP` (INR/Razorpay) first, `ACP` discovery, `AP2` mandate verification, `x402` step-up.
- `client.ts`: unified seam — all reads go through `client` functions (`listOrders`, `getOrder`, `trackOrder`, `executeAgentCheckout`, `getDashboard`, `getAnalytics`, `listProducts`, `upsertProduct`, `listAuditSessions`, `logAuditEvent`, `listConversations`, `getConversation`).
- Schema updates preserved; build clean.

## Unfinished (beyond this session)
- `.env` keys: user has not provided Razorpay test/live keys or Supabase `URL`/`ANON_KEY`; `.env.example` template exists but no real keys configured. `supabase` remains `null` → in-memory mode active (intentional per user confirmation).
- `AIAgent` conversation drawer: split workspace (`AIAgent/index.tsx`) still renders static mock message bubbles instead of `selected.messages`. The `ConversationDrawer.tsx` (`AuditDrawer` pattern: `Summary/Details/Payload/Timeline/Linked Items`) has 5 tab structure but dynamic message binding requires a follow-up session.
- `Dashboard` charts (`recharts`): data wired dynamically via `getDashboard()` derivation (`revenue_series` rebuilt, `orders_today`, `conversion_rate_pct`, `upsell_revenue_paise`, `aov_paise`, `recent_orders`). Full chart prop mapping verified structurally but not stress-tested with large real datasets.
- `ProductImport`: CSV parsing (`xlsx`) validates and imports; `manualSaved` form calls `upsertProduct()`. No full backend persistence (Supabase not active).
- `StoreHome`: `AI Assistant` workspace splits correctly; `Ask AI` opens split layout; no chat history persistence beyond session (no `supabase` conversation table write).
- `AuditTrail`: `AuditDrawer` has 5 tabs (`Summary`, `Details`, `Payload`, `Timeline`, `Linked Items`). `AuditTrailScreen` uses `auditData` from `listAuditSessions()`; drawer receives `session` + `event`; protocol filter pills (`All`, `NPCI UAP`, `ACP`, `x402`, `Razorpay`) not yet implemented (filter dropdown present but no protocol filter logic applied — can be added in next session).

## Build verification history (this session)
- `pnpm build`: 20.41s (before fix), 19.21s (drawer fix), 1.34s (protocol engine), 20.41s (types), 1.83s (storefront wire), 3.59s (storefront + audit), 1.85s (Section 5 wire + protocol fixes), 1.70s (final fix).
- TypeScript errors: `Orders/index.tsx` missing `orders` variable + implicit `any` resolved (`useState<Order[]>`, `(orders || [])`, typed `(o: Order)`). `AuditTrail/index.tsx` mock references replaced. `AIAgent/index.tsx` mock references + protocol badge added. No remaining errors.
- Commit sequence: `c785b56` → `19791e4` → `02ade35` → `fc7210e` → `4f082fb` → `cbf6c6a` → `326d81e` → `53c6131` → `21e73cf`.

## Model reference + environment
- Active: `poolside/laguna-s-2.1:free` (current); `z-ai/glm-5.2:free` active during session.
- Stable alternatives: `minimax/minimax-m3:free`, `gemini-3.7-flash`.
- Rate-limited: `deepseek-v4-flash-free` (`:free` suffix; avoided for critical work).
- NVIDIA `build.nvidia.com` NIM (self-hosted GPU, 2×A100 required): SKIP — user rejected; `agentic-commerce-uap` skill records exclusion.
- `hermes-agent` skill: loaded (`SKILL.md` reviewed); `hermes` agent docs referenced but not edited (bundled skill, protected). `grill-me` skill loaded; `requesting-code-review` available.
- `hermes` desktop: `AppShell` + preview pane available; `desktop_project` (`Ragent`) active; `focus_pane` available.
