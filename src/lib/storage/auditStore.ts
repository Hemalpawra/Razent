/**
 * In-memory audit-event store. Seeded from mockAuditSessions. Events
 * emitted by executeAgentCheckout (and merchant/customer action handlers
 * in later sections) are appended here so the Audit Trail table reflects
 * them in-session.
 */
import { mockAuditSessions } from "@/lib/mock/audit"
import type { AuditSession, AuditEvent } from "@/lib/types/audit"

const sessions = new Map<string, AuditSession>(
  mockAuditSessions.map((s) => [s.session_id, s]),
)

function newSessionId() {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function rollup(events: AuditEvent[]): Pick<AuditSession, "event_count" | "last_event" | "status" | "severity"> {
  const event_count = events.length
  const last_event = events.at(-1)?.type ?? ""
  // Status precedence: Critical > Failed > Warning > Success
  const order: AuditSession["status"][] = ["Success", "Warning", "Failed", "Critical"]
  const worst = [...events]
    .map((e) => e.result)
    .sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? "Success"
  return { event_count, last_event, status: worst, severity: worst }
}

export const auditStore = {
  listSessions(): AuditSession[] {
    return Array.from(sessions.values()).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
  },
  getSession(id: string): AuditSession | null {
    return sessions.get(id) ?? null
  },
  createSession(input: { order_id?: string | null; customer: string; actor_label: string; events: AuditEvent[] }): AuditSession {
    const session_id = newSessionId()
    const created_at = new Date().toISOString()
    const session: AuditSession = {
      session_id,
      order_id: input.order_id ?? null,
      customer: input.customer,
      actor_label: input.actor_label,
      events: input.events,
      created_at,
      ...rollup(input.events),
    }
    sessions.set(session_id, session)
    return session
  },
  appendEvent(session_id: string, event: AuditEvent): AuditSession | null {
    const s = sessions.get(session_id)
    if (!s) return null
    s.events = [...s.events, event]
    const next = rollup(s.events)
    s.event_count = next.event_count
    s.last_event = next.last_event
    s.status = next.status
    s.severity = next.severity
    return s
  },
  /** Convenience: persist a single event, auto-create session if needed. */
  log(input: { order_id?: string | null; customer?: string; actor_label?: string; event: AuditEvent }): AuditSession {
    const customer = input.customer ?? "system"
    const actor_label = input.actor_label ?? (input.event.actor === "AI Assistant" ? "AI" : "Customer")
    // Reuse the latest session for the same order, else create new.
    const existing = Array.from(sessions.values()).find(
      (s) => s.order_id && input.order_id && s.order_id === input.order_id,
    )
    if (existing) {
      const updated = auditStore.appendEvent(existing.session_id, input.event)
      if (updated) return updated
    }
    return auditStore.createSession({
      order_id: input.order_id ?? null,
      customer,
      actor_label,
      events: [input.event],
    })
  },
}
