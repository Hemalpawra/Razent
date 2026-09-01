import type { AuditSession } from "@/lib/types/audit"

const baseEvents = [
  { type: "Request Received", source: "store" as const, result: "Success" as const },
  { type: "Products Searched", source: "AI Assistant" as const, result: "Success" as const },
  { type: "Product Matched", source: "AI Assistant" as const, result: "Success" as const },
  { type: "Approval Requested", source: "AI Agent" as const, result: "Success" as const },
  { type: "Approval Received", source: "customer" as const, result: "Success" as const },
  { type: "Razorpay Order Created", source: "Razorpay" as const, result: "Success" as const },
  { type: "Payment Successful", source: "Razorpay" as const, result: "Success" as const },
  { type: "Invoice Generated", source: "system" as const, result: "Success" as const },
  { type: "Tracking Started", source: "system" as const, result: "Success" as const },
]

function mkEvents(session_id: string, order_id: string | null, overrides: Partial<Record<string, string>> = {}): AuditSession["events"] {
  return baseEvents.slice(0, 7 + (session_id.charCodeAt(5) % 3)).map((b, i) => {
    const ts = new Date(Date.UTC(2025, 4, 27, 10, 10 + i * 4, 0)).toISOString()
    const actor =
      i <= 1 ? "customer" : i <= 3 ? "AI Assistant" : i === 5 ? "system" : i === 6 ? "customer" : ("system" as const)
    // inject one failed/critical session
    let result = b.result
    if (session_id === "sess_9c2e10" && b.type === "Payment Successful") result = "Failed"
    if (session_id === "sess_4b91ff" && b.type === "Razorpay Order Created") result = "Critical"
    return {
      id: `${session_id}_evt_${i}`,
      type: b.type,
      timestamp: ts,
      actor: (overrides.actor as never) ?? (actor as never),
      source: b.source,
      result,
      reason: result === "Failed" ? "Payment declined by bank" : result === "Critical" ? "Order amount mismatch" : undefined,
      request_id: `req_${session_id.slice(5, 9)}_${i}`,
      payload_summary: JSON.stringify({ session_id, order_id, query: "air purifier under 20k" }, null, 2),
      response_summary: JSON.stringify({ status: result.toLowerCase(), event: b.type }, null, 2),
      status_code: result === "Success" ? 200 : result === "Failed" ? 402 : 500,
      metadata: { ip: "203.0.113.42", region: "IN-KA" },
      related_product: "Air Purifier Pro",
    }
  })
}

export const mockAuditSessions: AuditSession[] = [
  {
    session_id: "sess_7f3a1b",
    order_id: "order_Mk92jd8l90sk",
    customer: "ChatGPT Assistant",
    actor_label: "AI",
    event_count: 7,
    last_event: "Razorpay Order Created",
    status: "Success",
    severity: "Success",
    events: mkEvents("sess_7f3a1b", "order_Mk92jd8l90sk"),
    created_at: "2025-05-27T10:24:00Z",
  },
  {
    session_id: "sess_9c2e10",
    order_id: "order_Pr44ab12cd",
    customer: "Ananya Rao",
    actor_label: "Customer",
    event_count: 7,
    last_event: "Payment Failed",
    status: "Failed",
    severity: "Failed",
    events: mkEvents("sess_9c2e10", "order_Pr44ab12cd"),
    created_at: "2025-05-27T10:28:00Z",
  },
  {
    session_id: "sess_4b91ff",
    order_id: "order_Xy88kl90mn",
    customer: "ChatGPT Assistant",
    actor_label: "AI",
    event_count: 6,
    last_event: "Razorpay Order Created",
    status: "Critical",
    severity: "Critical",
    events: mkEvents("sess_4b91ff", "order_Xy88kl90mn"),
    created_at: "2025-05-27T09:51:00Z",
  },
  {
    session_id: "sess_1a2b3c",
    order_id: "order_Lp77mn34op",
    customer: "Rohan Mehta",
    actor_label: "Customer",
    event_count: 9,
    last_event: "Tracking Started",
    status: "Success",
    severity: "Success",
    events: mkEvents("sess_1a2b3c", "order_Lp77mn34op"),
    created_at: "2025-05-26T16:42:00Z",
  },
  {
    session_id: "sess_8d0e22",
    order_id: null,
    customer: "ChatGPT Assistant",
    actor_label: "AI",
    event_count: 4,
    last_event: "Products Searched",
    status: "Warning",
    severity: "Warning",
    events: mkEvents("sess_8d0e22", null).slice(0, 4),
    created_at: "2025-05-26T11:12:00Z",
  },
  {
    session_id: "sess_5f6a7b",
    order_id: "order_Qw11er99ty",
    customer: "Priya Iyer",
    actor_label: "Customer",
    event_count: 8,
    last_event: "Invoice Generated",
    status: "Success",
    severity: "Success",
    events: mkEvents("sess_5f6a7b", "order_Qw11er99ty"),
    created_at: "2025-05-25T14:05:00Z",
  },
]
