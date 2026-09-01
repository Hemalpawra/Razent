# AI Rules — Merchant AI Gateway

> Read this **before** touching any source. These rules are enforced by every AI agent working in this repo (Figma Make, Claude Code, Codex, OpenCode, and Hermes).

## 1. What we are building

**Merchant AI Gateway** — a Razorpay-powered merchant store where customers can shop two ways:

1. Browse the store normally.
2. Talk to an AI assistant (in-store drawer, or from their own AI tool via an agent-to-agent API — ChatGPT, Gemini, Claude, Grok).

The AI handles product discovery, comparison, cross/upsell, address collection, Razorpay order creation, and hands off to **Razorpay Checkout** for payment. After payment: success screen, invoice, and **dummy** shipping/tracking.

There is **no customer login** and **no order history page**. Customers track orders with order ID + phone + email.

### Merchant screens (dashboard)

`Dashboard` · `Products` · `Product Import` · `AI Agent` · `Orders` · `Audit Trail` · `Analytics` · `Settings`

### Customer screens (store)

`Store home` · `Product listing` · `Product detail` · `AI chat drawer` · `Cart` · `Delivery address + shipping` · `Razorpay payment` · `Success (invoice + dummy tracking)` · `Track order (order ID + phone + email)`

### What is dummy vs real

| Thing | Status |
|---|---|
| Razorpay order + payment | **Real** (test-mode keys) |
| Invoice | **Real** (rendered in app) |
| Shipping | **Simulated** |
| Tracking | **Simulated** |

## 2. Workflow rules

- **Local working directory:** `C:\Users\hemal\Ragent\Razent` on Windows. Always work there.
- **Figma Make owns the screens:** screens are designed in Figma Make and pushed to the `Hemalpawra/Razent` repo. **Always `git pull` before editing.**
- **Local ↔ GitHub in sync:** commit + `git push origin main` at the end of every change.
- **Never start the dev server manually.** A Vite server is already running on `$PORT` (default 8443) via Figma Make; preview is in the Figma Make preview panel.
- **Never modify `.figma/make/`, `index.html` root structure, or `vite.config.ts` plugins.** These are Figma-managed.
- **Run `vite build` before claiming "done."** Build must pass with no TypeScript errors.
- **Format with `oxfmt`** (`pnpm format`). Do **not** introduce Prettier/ESlint config.

## 3. Component library — shadcn (Base UI, preset `base-mira`)

`components.json` pins style to `base-mira`. All UI must come from `@/components/ui/*`.

### Composition

Always import from the **aggregate namespace**, never from primitives:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableFooter } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } from "@/components/ui/popover"
import { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter, MessageGroup } from "@/components/ui/message"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
```

### Component patterns (Base UI, NOT Radix)

1. **Never use `asChild`.** Base UI uses the `render` prop instead:
   ```tsx
   <Button render={<a href="/orders" />}>View orders</Button>
   ```
2. **Dialog:** top-level `Dialog` accepts `open` + `onOpenChange`. Content goes in `DialogContent`; structure with `DialogHeader > DialogTitle + DialogDescription`, then body, then `DialogFooter`.
3. **Popover:** `Popover > PopoverTrigger render={<Button variant="outline" />} > open <PopoverContent > PopoverHeader > PopoverTitle + PopoverDescription`.
4. **Forms:** wrap fields in `FieldGroup` + `Field + FieldLabel + FieldDescription + FieldError`. Use the AI-chosen primitives — do not roll your own form layout.
5. **Tooltips:** wrap the app in `<TooltipProvider>` once (in `App.tsx`).
6. **AI chat surfaces:** use `Message / MessageGroup / Bubble` for the conversation. Don't reimplement message rows.
7. **Empty states:** use `Empty` for "no orders yet", "no products", etc. Don't write blank divs.

### Do not

- Don't add `@radix-ui/*` packages — the project is on Base UI (`@base-ui/react`).
- Don't pull in MUI, Chakra, Mantine, or Ant — conflict with `base-mira`.
- Don't import directly from `@base-ui/react/*` in screens; go through the shadcn wrappers so the preset theming applies.

## 4. Design tokens

`components.json`: style `base-mira`, base color `neutral`, CSS variables enabled, icons `lucide`, RTL off.

**Always use the CSS variables defined in `src/index.css`** (`--background`, `--foreground`, `--primary`, `--card`, `--muted`, etc.) via Tailwind utilities (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-card`, `text-card-foreground`).

**Never hardcode:**

- ❌ `bg-white`, `bg-black`, `bg-gray-100`, `text-slate-500`, `border-zinc-200`
- ❌ Inline `style={{ color: '#…' }}` or hex/rgb literals
- ❌ `dark:` hardcoded dark colors — instead use the variables and the `.dark` class on `<html>` (defined in `src/index.css`)
- ❌ Custom font families — fonts come from theme tokens (`--font-sans`, `--font-heading` already set to Public Sans Variable)

**Color usage guide:**

| Use | Token |
|---|---|
| Page background | `bg-background` |
| Body text | `text-foreground` |
| Muted text (descriptions, captions) | `text-muted-foreground` |
| Primary CTA | `bg-primary text-primary-foreground` |
| Secondary surface (cards) | `bg-card text-card-foreground` |
| Subtle surface (inputs, hover) | `bg-muted` or `bg-input` |
| Destructive (delete order, error) | `bg-destructive text-destructive-foreground` |
| Borders | `border-border` |
| Focus rings | `ring-ring` |

**Spacing & layout:**

- Section padding: `px-4 py-16` on `<section>`, `mx-auto max-w-5xl` on the wrapper.
- Card grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`.
- Stat cards: `Card` with `CardHeader > CardTitle` + numeric value + `CardDescription`.
- Radius: theme default (`--radius` ≈ 0.625rem). Don't set `rounded-xl` etc. on shadcn components.

## 5. File structure

This is a single-page Vite app — there are no routes.**

All app screens live as components under `src/components/<screen>/<Screen>.tsx` and are mounted from `src/App.tsx` behind a tab/nav switcher. Suggested folder shape:

```
src/
  components/
    store/        StoreHome, ProductListing, ProductDetail, Cart, Checkout, OrderSuccess, TrackOrder
    merchant/     Dashboard, Products, ProductImport, AIAgent, Orders, AuditTrail, Analytics, Settings
    ai/           ChatDrawer, MessageList, Composer, Bubble
    ui/           shadcn primitives (do not edit)
  lib/
    razorpay.ts   client wrapper
    tracking.ts   dummy tracking simulator
  App.tsx
  main.tsx
  index.css
```

`src/App.tsx` is the router/nav — keep it light; delegate to components.

## 6. What the AI should mention when building frontend

When the AI agent (Hermes, Claude Code, etc.) is implementing or reviewing frontend code in Merchant AI Gateway, it must surface **all** of the following where relevant:

1. **Razorpay integration:** every order must be created via `lib/razorpay.ts` (real API in test mode). Never fake order IDs client-side.
2. **AI conversation → order linkage:** when the AI creates an order, link it back to the conversation id and surface it on the AI Agent page.
3. **Merchant dashboard signal-to-noise:** prefer **fewer, business-meaningful cards** (AI status, active conversations, orders, revenue). Don't dump raw logs.
4. **AI Agent page must include:** AI status, active conversations count, orders created, revenue, a few live conversation previews, conversation detail drilldown, business insights, and a clear path to Orders / Invoice / Tracking / Audit Trail.
5. **Customer tracking:** must accept `order_id + phone + email`. No login. No history page.
6. **Invoice is real; shipping + tracking are simulated** — make that visible in the UI ("simulated for demo").
7. **No fake data shown as production data.** Anything dummy must be labeled.
8. **Accessibility:** the AI chat drawer must be keyboard-navigable; icon-only buttons need `aria-label`; status updates use `role="status"`.
9. **Responsive:** the store must work on mobile (the customer side); the merchant dashboard is desktop-first.
10. **The Vite dev server is already running** — do not start another one; do not bind to a new port.
11. **Never commit `node_modules`, `dist`, `.env*`, or `.vite` cache.** `.gitignore` already covers these; verify before `git status`.
12. **Build verification:** run `vite build` before claiming "done." Fix all TS errors.
13. **After every change:** commit + `git push origin main` so GitHub stays in sync with Figma Make.

## 7. Out of scope

- Real shipping carrier API integration (use the dummy tracker).
- Customer login / accounts / order history pages.
- Production Razorpay keys — only test keys allowed in this build.