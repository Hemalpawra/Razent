export type AuditResult = "Success" | "Warning" | "Failed" | "Critical"
export type AuditActor =
  | "customer"
  | "Customer"
  | "AI Assistant"
  | "ChatGPT Assistant"
  | "merchant"
  | "Merchant"
  | "system"
  | "System"
  | "Razorpay Gateway"
  | "UPI Gateway"
  | "Banking Network"
  | "Card Network"
  | "Logistics"
  | (string & {})

export type ProtocolEvent = "mandate" | "checkout_initiated" | "checkout_completed" | "refund_initiated"

export type AuditSource =
  | "store"
  | "AI Agent"
  | "AI Assistant"
  | "Razorpay"
  | "NPCI UAP"
  | "UAP Verifier"
  | "Edge Function"
  | "system"
  | "customer"
  | "storefront_checkout"
  | "checkout_address"
  | "checkout_engine"
  | "trusted_surface"
  | "payment_orchestrator"
  | "npci_upi_switch"
  | "catalog_browser"
  | "address_form"
  | "billing_service"
  | "dispatch_engine"
  | "rbi_token_service"
  | "gateway_modal"
  | (string & {})

export type AuditEvent = {
  id: string
  type: string
  timestamp: string
  actor: AuditActor
  source: AuditSource
  result: AuditResult
  reason?: string
  request_id?: string
  payload_summary?: string
  response_summary?: string
  status_code?: number
  metadata?: Record<string, any>
  related_product?: string
}

export type AuditSession = {
  session_id: string
  order_id: string | null
  customer: string
  actor_label: string // Customer / AI / Merchant
  event_count: number
  last_event: string
  status: AuditResult
  severity: AuditResult
  events: AuditEvent[]
  created_at: string
  conversation_id?: string | null
}

