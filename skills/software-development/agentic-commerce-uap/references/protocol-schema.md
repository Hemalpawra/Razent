# Protocol Schema Reference (UAP / ACP / x402)

Session detail for the `agentic-commerce-uap` skill.

## UAP settlement flow (current state — Section 4 done)
- `client.ts`: `executeAgentCheckout()` routes: AP2 verify → threshold (`approveAuto`) → `processUAPTransaction()`.
- Audit events: `checkout_initiated` + `checkout_completed` with `auditStore` persistence.
- `types/order.ts`: `mandate_id`, `checkout_session_id`, `payment_method`, `invoice_number`, `subtotal_paise`, `discount_paise`, `tax_paise`.

## Unfinished from implementation_plan.md
- Section 5 (Merchant screens): `AIAgent` split workspace, `AuditTrail` protocol filter, `Dashboard` `getDashboard()` wire.
- `.env` keys: user has not provided Razorpay or Supabase keys; `.env.example` template only.
- `client.ts`: `supabase` lazy init; `supabase` is `null` when env missing (verified by build).

## Build verification pattern
`pnpm build` passes (confirmed 20.41s, then 1.34s, 1.83s, 3.59s). No TypeScript errors.
