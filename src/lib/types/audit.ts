export type AuditResult = "Success" | "Warning" | "Failed" | "Critical"
export type AuditActor = "customer" | "AI Assistant" | "ChatGPT Assistant" | "merchant" | "system"
export type ProtocolEvent = "mandate" | "checkout_initiated" | "checkout_completed" | "refund_initiated"

export type AuditSource = "store" | "AI Agent" | "AI Assistant" | "Razorpay" | "system" | "customer"

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
  metadata?: Record<string, string>
  related_product?: string
}

export type AuditSession = {
  session_id: string
  order_id: string | null
  customer: string
  actor_label: string // Customer / AI
  event_count: number
  last_event: string
  status: AuditResult
  severity: AuditResult
  events: AuditEvent[]
  created_at: string
}
