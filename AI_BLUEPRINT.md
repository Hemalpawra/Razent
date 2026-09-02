# AI Blueprint — Merchant AI Gateway (Razent)

> Single source of truth for every future task in `C:\Users\hemal\Ragent\Razent`. Read this before touching any file.

## 1. What the app is

A **Razorpay-themed merchant AI commerce gateway**. One Vite 8 + React 19 + Tailwind v4 + shadcn (`base-mira`) app, **single page, no react-router**. The "pages" are a `Screen` union in state — the `AppShell` renders whichever screen is active.

- **Merchant screens** (dashboard): 8 screens — `dashboard`, `products`, `product_import`, `orders`, `analytics`, `audit_trail`, `ai_agent`, `settings`. Use the ** Sidebar** (slim, fixed `14.5rem`) and the **simple top bar**.
- **Customer screens** (storefront): built inside `StoreHome`. In "Store" mode there is **no merchant sidebar**.

Data: **mocks today, Supabase tomorrow**. Every data call flows through `lib/api/client.ts` (the seam). Swapping mocks → Supabase is a one-file change; call sites never change. Pricing is in **paise** (Razorpay convention).

---

## 2. Repo tree + file jobs + touch rules

```
Razent/
├─ AGENTS.md                 # Figma Make host rules — READ ONLY (don't edit)
├─ AI_RULES.md               # Project rules — READ ONLY (don't edit)
├─ AI_BLUEPRINT.md           # THIS FILE — edit only after planning
├─ AI_BLUEPRINT_INDEX.md     # quick links index
├─ CLAUDE.md                 # dev notes
├─ components.json           # shadcn config (base-mira) — DON'T EDIT
├─ index.html                # Figma-managed shell — DON'T EDIT structure
├─ package.json              # deps — add deps only (pnpm add)
├─ pnpm-lock.yaml            # lock — DON'T edit by hand
├─ tsconfig.json             # TS config — edit only to add paths/types
├─ vite.config.ts            # Vite — Figma-managed plugins — DON'T EDIT
├─ product-import-template-spec.json  # xlsx skill spec — edit when template columns change
├─ public/
│  ├─ product-import-template.csv     # shipped sample CSV (downloadable)
│  └─ product-import-template.xlsx    # shipped sample XLSX (downloadable)
├─ src/
│  ├─ main.tsx              # React entrypoint — touch if changing providers
│  ├─ App.tsx               # root screen router — edit only when adding/removing a Screen
│  ├─ index.css             # theme tokens only — light `#F5F5F5`, dark oklch. Edit ONLY here for theme color
│  ├─ vite-env.d.ts         # Vite types — leave alone
│  ├─ app/
│  │  └─ ThemeProvider.tsx  # `<html class="dark">` toggle — edit when theme logic changes
│  │                         # deps: useTheme. Used by: App, ThemeToggle
│  ├─ lib/
│  │  ├─ utils.ts            # `cn` helper — edit if switching clsx/twMerge
│  │  ├─ api/client.ts       # **DATA SEAM** — returns mocks; future Supabase. Edit here to wire backend
│  │  │                     # deps: lib/mock/*. Used by: Products (listProducts/deleteProduct), Orders, Dashboard, Analytics
│  │  ├─ mock/               # all fake data
│  │  │  ├─ products.ts      # 34 products — add/remove product rows here
│  │  │  ├─ orders.ts        # 14 orders — add/remove orders; source of Track Order truth
│  │  │  ├─ conversations.ts # mockConversations — feed for AI Agent live table + drawer
│  │  │  ├─ analytics.ts     # synthesized analytics (charts) — derives from orders/products
│  │  │  ├─ kpis.ts          # mockDashboard — aggregates for Dashboard KPIs
│  │  │  └─ audit.ts         # mockAuditSessions — 6 sessions, event paths; feeds AuditTrail table + drawer
│  │  └─ types/              # type roots — EDIT these first when a shape changes
│  │     ├─ product.ts       # Product, ProductStatus, formatPrice
│  │     ├─ order.ts         # Order, OrderStatus, ShippingStatus, Address, formatPrice
│  │     ├─ conversation.ts  # Conversation, ChatMessage, ConversationType/Status
│  │     ├─ audit.ts         # AuditSession, AuditEvent, AuditResult/Actor/Source
│  │     ├─ kpi.ts           # KPI, DashboardData
│  │     └─ analytics.ts     # RevenuePoint, StatusCount, CategoryShare, AnalyticsData
│  ├─ state/                # all client state (Zustand)
│  │  ├─ useUI.ts           # global UI: activeScreen, role, drawers. THE nav state. Edit when adding screen/drawer
│  │  ├─ useTheme.ts        # ThemeMode (light/dark/system) + persisted. Used by ThemeProvider, ThemeToggle
│  │  └─ useSettings.ts     # merchant settings + storeProfile (persist). Used by StoreHome, Settings, TrackOrder
│  ├─ hooks/
│  │  └─ use-mobile.ts      # useIsMobile (768bp) — guard mobile layouts
│  ├─ components/
│  │  ├─ ui/                # **shadcn primitives only** — base-mira. Touch only to patch a primitive
│  │  │   (avatar, badge, bubble, button, calendar, card, chart, checkbox, dialog, dropdown-menu, empty,
│  │  │    input, label, message, popover, select, separator, sheet, skeleton, sidebar, switch, table,
│  │  │    tabs, textarea, tooltip)
│  │  ├─ shared/            # cross-cutting
│  │  │  ├─ AppShell.tsx   # **SHELL** — Sidebar + top bar + footer. Role-aware (store=plain, merchant=sidebar). Edit to change chrome, nav groups, switch placement
│  │  │  ├─ ThemeToggle.tsx  # sun/moon/monitor popover → useTheme.setMode
│  │  │  ├─ PageHeader.tsx  # reusable title + actions
│  │  │  └─ EmptyState.tsx  # reusable empty state (uses ui/empty)
│  │  ├─ merchant/          # 8 merchant screens (+ drawers)
│  │  │  ├─ Dashboard/index.tsx          # KPIs + sales area chart + donut + funnel + needs attention + recent activity
│  │  │  ├─ Products/index.tsx           # product table + filters + ProductDrawer wiring
│  │  │  ├─ Products/ProductDrawer.tsx   # 560px right sheet drawer — 4 tabs Overview/Inventory/AI&Visibility/Activity
│  │  │  ├─ Orders/index.tsx             # orders table + KPIs + OrderDrawer wiring
│  │  │  ├─ Orders/OrderDrawer.tsx       # 560px right sheet — 7 sections (items, amount, invoice, customer, payment, timeline, actions)
│  │  │  ├─ Analytics/index.tsx          # Area chart + 2 donut charts + funnel + top products + AI bars
│  │  │  ├─ AIAgent/index.tsx            # live conversations table + right bundle cards; split layout when open
│  │  │  ├─ AIAgent/ConversationDrawer.tsx # 560px sheet — 4-tab conversation (mobile fallback) ChatGPT Assistant header
│  │  │  ├─ AuditTrail/index.tsx         # session-grouped table + filters + AuditDrawer wiring
│  │  │  ├─ AuditTrail/AuditDrawer.tsx   # 560px sheet — 5 tabs Summary/Details/Payload/Timeline/Linked Items
│  │  │  ├─ ProductImport/index.tsx      # Tabs: CSV/Excel/Manual; 2-col validation/preview; Media upload w/ preview
│  │  │  └─ Settings/index.tsx           # hub (5 cards) → 5 pages: store/ai/business/shipping/notifications
│  │  └─ customer/
│  │     └─ StoreHome/index.tsx          # **THE storefront** — home/listing/detail/track/cart/checkout/payment-failed/success + AI split workspace
```

### File touch map (when → what)

| When you need to… | Edit this file(s) | Cascade / depends on |
|---|---|---|
| Add a new merchant screen | `useUI.addScreen`, `App.tsx` screenMap, `AppShell` nav group | rebuild + test screen renders |
| Switch light/dark token | `src/index.css` `:root`/`.dark` | affects every screen | Add a new data entity (e.g. coupon) | `lib/types/*` (new), `lib/mock/*` (new), `lib/api/client.ts` (new fn) | screens using it |
| Fix the shell width / sidebar width / switch placement | `components/shared/AppShell.tsx` | everything (layout anchor) |
| Remove the merchant sidebar from a customer screen | `AppShell.tsx` store branch (already isolated) — confirm `StoreHome` doesn't import merchant nav |
| Make a date picker / export button work | screen header file (Dashboard/Orders/AIAgent/AuditTrail) — date cycle `useState`, export downloads CSV blob |
| Fix a chart w/out tooltip | screen's chart block — every `Area/Bar/Pie/funnel-SVG` must wrap `ChartTooltip` or `Tooltip` |
| Widen a table | `Table` wrapper → `min-w-[900px]` + `overflow-x-auto` card | the parent Card |
| Make a row open a drawer | `TableRow onClick` + Eye button `stopPropagation`; drawer is already 560px Sheet | screen + its `*Drawer` |
| Add a KPI card field | `lib/types/kpi.ts`, `lib/mock/kpis.ts`, `Dashboard/index.tsx` KpiCard |
| Change StoreHome layout / AI split | `StoreHome/index.tsx` (large) | AppShell store branch |
| Add a Settings field | `useSettings.ts` (state+defaults), `Settings/index.tsx` |
| Add a mock product → affects many | `lib/mock/products.ts` | Dashboard/AI Agent/StoreHome/Analytics/Orders |
| Fix Track Order black screen | `StoreHome` `TrackOrder`/`generateMockOrder` + useSettings import |
| Ship a change (process) | `pnpm build` then `pnpm format`, commit, `git push` |

---

## 3. Data flow

```
[lib/types/*]  <- strict shapes
        ▲            (types imported by mocks + client)
[lib/mock/*]   <- seed data + derived (analytics, kpis)
       │             (mock files import from ./orders, ./products)
[lib/api/client.ts] <- single async seam: listProducts, getOrder, getDashboard, getAnalytics
       │
       ▼  every screen calls the client fn, NEVER the mock directly... (exceptions: screens that import mock for derived data: Analytics imports mockOrders/mockProducts for charts, Dashboard imports mockDashboard/kpi, AI Agent imports mockConversations)
       │  (this is acceptable for read-only derived chart data; for mutations swap client fn)
[React screen]  ->  Zustand (useUI / useTheme / useSettings)  ->  shadcn ui component  ->  DOM
       │                       ▲
       │                       └ state: activeScreen, role, drawer ids, theme mode, merchant settings
       ▼
[AppShell] chooses: role === "store" → plain full-width StoreHome; role === "merchant" → Sidebar + top bar + screen child
```

**Paise convention:** all money in DB is `*_paise`. `formatPrice()` converts to `₹` string. Never store rupees as a number.

**Mock derivation rule:** `lib/mock/analytics.ts` and `lib/mock/kpis.ts` import from `orders.ts`/`products.ts` and synthesize. If you change a mock shape, these still derive correctly because they read typed fields.

---

## 4. UI states

### Role switch (in `AppShell`)
- `role === "merchant"` → `SidebarProvider` + slim Sidebar (`14.5rem`) + simple top bar (`h-12`: trigger + page title + ThemeToggle) + `max-w-[1360px]` centered content + footer.
- `role === "store"` → **no Sidebar, no top bar chrome** — just a tiny border strip with Merchant/Store toggle + ThemeToggle, then `StoreHome` full-width.

### Screen rendering (`App.tsx`)
`activeScreen` in `useUI` → `screenMap[activeScreen]` → renders inside `AppShell > SidebarInset > content div`.

### Drawers (all same pattern)
`Sheet`, `SheetContent`, `className="w-[560px] max-w-[96vw]"`, `showCloseButton={false}`, X top-left, scrollable body.
- `OrderDrawer` — opened via `useUI.openOrderDrawer(id)` (so any screen can open it).
- `ProductDrawer` — opened via `useUI.openProductDrawer(id)`.
- `ConversationDrawer` — opened via local state in `AIAgent`.
- `AuditDrawer` — opened via local state in `AuditTrail`.

### AI split workspace (pattern)
Both **StoreHome** and **AIAgent** use the **same layout primitive**:
```tsx
<div className="grid gap-3 lg:grid-cols-[1fr_380px]">
  <main className="lg:col-span-1 xl:h-[calc(100vh-140px)] xl:overflow-auto">store / list content</main>
  <aside className="xl:sticky xl:top-[64px] xl:h-[calc(100vh-140px)] xl:overflow-auto">
    {/* Message / Bubble / Avatar thread, product cards, quick chips, Input at bottom */}
  </aside>
</div>
```
- `aiOpen` state toggles: closed = single column full-width store; open = split.
- Footer is **never** rendered when `aiOpen` is true (wrapped `{!aiOpen && <footer/>}`).
- Never a small drawer for AI — always the split. The `ConversationDrawer` Sheet is **mobile-only fallback**.

### KPI responsive rule (apply everywhere)
- `grid-cols-2 sm:grid-cols-2 lg:grid-cols-5` (mobile 2-col)
- icon wrapper: `hidden size-11 shrink-0 ... sm:flex` (icons hidden on mobile)

---

## 5. API flow / "backend later"

1. Every async function in `lib/api/client.ts` returns its mock today (`await delay(80)`).
2. Types in `lib/types/*` are the contract. Keep field names stable.
3. When Supabase lands: replace the `mock*` import + body of each client fn with a Supabase RPC/REST call. **Do not** change screen call sites.
4. `formatPrice` is duplicated in `product.ts` and `order.ts` — harmless; screens import from whichever their type lives in.

---

## 6. Shared parts (don't duplicate)

- **`@tailwindcss`/theme vars** — `src/index.css` is the only place colors live. No hexes in components.
- **`cn`** — `src/lib/utils.ts`. Import everywhere you merge classes.
- **KPI card shape** — each screen has its own `KpiCard` (slightly different props). That's fine — they're presentational. If it drifts, copy the Dashboard one as the canonical shape.
- **Drawer shell** — 560px Sheet pattern (copy one of the existing `*Drawer.tsx`).
- **Date cycle** — `useState` cycling an array + Export downloads CSV blob via `URL.createObjectURL`.

---

## 7. Rules for what NOT to change

1. **Never touch `AGENTS.md`, `AI_RULES.md`, `components.json`, `index.html` structure, `vite.config.ts` plugins.** These are Figma Make–owned.
2. **Always shadcn primitives only.** No raw `<div>` as a button; reuse `Button`, `Card`, `Sheet`, `Table`, `TooltipProvider` once in `App.tsx`.
3. **No hardcoded hex colors.** Theme tokens only (`bg-card`, `text-foreground`, `primary`, `chart-*`, `muted-foreground`, etc).
4. **Every chart/visual has a tooltip.** `ChartTooltip` on Area/Bar/Pie, `Tooltip` on funnel SVG bars.
5. **Side drawers = 560px (`w-[560px] max-w-[96vw]`).`**
6. **Merchant pages = Sidebar + clean full-width.** Store pages = no Sidebar.
7. **Pricing in paise** in types/mocks; render via `formatPrice`.
8. **`pnpm build` green = ship signal.** Always build before commit/push.
9. **Commit+push every change** (`git push origin main`). Keep `dist/` local-only.
10. **Mobile KPI:** `grid-cols-2` + `hidden sm:flex` on icons — don't regress.

---

## 8. Quick start for an agent working here

1. `read AI_BLUEPRINT.md` + `AI_RULES.md` + `AGENTS.md`.
2. See the **file touch map** in §2 to find where the change lives.
3. Edit → `pnpm build` → fix → commit+push.
4. If the dev server isn't running: `terminal(background=true)` `npx vite --port 8443 --host 0.0.0.0`, then `curl :8443 → 200`.

Last updated: 2026-09-02, post-`fda64ed` layout polish. This file is canonical — when in doubt, follow it.
