---
name: agentic-commerce-uap
description: "Agent-to-agent commerce protocol. UAP→ACP→x402."
version: "0.1"
---

# Agentic-commerce Protocol

Used in the Razent (Merchant AI Gateway) project.

## Layer order (locked)
1. UAP (NPCI Universal Agent Protocol) — INR settlement, Razorpay checkout.
2. ACP (Agent Commerce Protocol) — agent discovery, mandate verification.
3. x402 — global M2M HTTP 402 settlement extension.

## Schema rules
- `types/order.ts`: `mandate_id`, `checkout_session_id`, `via_ai`.
- `types/audit.ts`: `ProtocolEvent` union (`checkout_initiated`, `checkout_completed`, `refund_initiated`, `mandate`).
- `types/conversation.ts`: `agent_id`.

## Non-modal drawer rules
- `drawer.tsx`: `DrawerPrimitive.Root` with `modal={false}` (non-modal).
- No `Backdrop`; width locked at `w-[25vw] min-w-[380px] max-w-[420px]`.
- Mobile: `if (isMobile) return null` with separate full-screen page.

## Model reference + session provider history
- Stable: `minimax/minimax-m3:free` (openrouter); `gemini-3.7-flash` (good for review/code).
- Active: `poolside/laguna-s-2.1:free` (current); also `z-ai/glm-5.2:free` active.
- Rate-limited: `deepseek-v4-flash-free` (opencode-free; `:free` suffix often hits limits).
- Skip NVIDIA `build.nvidia.com` NIM (self-hosted GPU, 2×A100) — user rejected; `agentic-commerce-uap` skill records exclusion.

## What NOT to change
- Protocol order above.
- UAP settlement: INR only.
- Razorpay is the checkout provider (test mode now, keys `.env` later).
- Drawer width / non-modal behavior locked.
- Mobile drawer: `null` + separate screen (`setActiveScreen`).
