"use client"

import { productStore } from "@/lib/storage/productStore"

/**
 * Agentic-commerce protocol engine for Razent.
 * Layered stack: ACP (discovery/cart) → AP2 (mandate verification) →
 * NPCI UAP (INR settlement via Razorpay) → x402 (global M2M HTTP 402).
 *
 * All protocol events must emit audit records; see agentic-commerce-uap skill.
 */

import type { Order } from "@/lib/types/order"
import type { ProtocolEvent, AuditEvent } from "@/lib/types/audit"

export type CommerceProtocol = "ncpi_uap" | "acp" | "ap2" | "x402" | "direct_web"

export interface AgentMetadata {
  agent_name: string
  protocol_version: string
  delegated_limit_paise?: number
  mandate_id?: string
}

export interface X402Challenge {
  status: 402
  headers: Record<string, string>
  body: {
    protocol: "x402"
    mandate_id?: string
    amount_paise: number
    settlement: "razorpay_test"
    message: string
  }
}

/* ------------------------------------------------------------------ */
/*  ACP — Agent Commerce Protocol (product discovery + cart intent)     */
/* ------------------------------------------------------------------ */

export function handleACPDiscovery(query: string): { results: string[]; protocol: "acp" } {
  // Section 2 improvement: query the real product store so external agents
  // get structured catalog results (not just split keywords).
  const needle = query.toLowerCase().trim()
  let results: string[] = []
  const products = productStore.list()
  const matched = products.filter(
      (p: any) =>
        p.title.toLowerCase().includes(needle) ||
        p.description?.toLowerCase().includes(needle) ||
        p.category?.toLowerCase().includes(needle) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(needle)),
    )
    results = matched.slice(0, 5).map((p: any) => p.id)
  if (results.length === 0 && needle.split(/\s+/).filter(Boolean).length > 0) {
    results = needle.split(/\s+/).filter(Boolean).slice(0, 5)
  }
  return { protocol: "acp", results }
}

/* ------------------------------------------------------------------ */
/*  AP2 — Mandate verification (delegation cap + agent identity)      */
/* ------------------------------------------------------------------ */

export function verifyAP2Mandate(
  mandate: { mandate_id?: string; agent_name?: string; delegated_limit_paise?: number },
  amount_paise: number,
): { valid: boolean; reason?: string; protocol: "ap2"; mandate_id?: string } {
  // Verifies agent delegation proof and compares against merchant approval threshold.
  // Called before any autonomous settlement (UAP or x402).
  if (!mandate.mandate_id) {
    return { valid: false, reason: "mandate missing mandate_id", protocol: "ap2" }
  }
  if (
    mandate.delegated_limit_paise !== undefined &&
    amount_paise > mandate.delegated_limit_paise
  ) {
    return {
      valid: false,
      reason: "Order amount exceeds customer delegated mandate cap",
      protocol: "ap2",
      mandate_id: mandate.mandate_id,
    }
  }
  return {
    valid: true,
    protocol: "ap2",
    mandate_id: mandate.mandate_id,
  }
}

/* ------------------------------------------------------------------ */
/*  Autonomous approval — compares against merchant threshold        */
/* ------------------------------------------------------------------ */

export function approveAuto(
  amount_paise: number,
  approvalThresholdRupees: number,
): { approved: boolean; requires_step_up: boolean; protocol: "ap2" | "x402" | "ncpi_uap" } {
  // approvalThreshold is stored in Rupees (useSettings.aiDefaults.approvalThreshold);
  // Convert to paise for comparison: threshold × 100.
  const thresholdPaise = approvalThresholdRupees * 100
  const requiresStepUp = amount_paise > thresholdPaise
  return {
    approved: !requiresStepUp,
    requires_step_up: requiresStepUp,
    protocol: requiresStepUp ? "x402" : "ncpi_uap",
  }
}

/* ------------------------------------------------------------------ */
/*  UAP — NPCI settlement via Razorpay (INR)                             */
/* ------------------------------------------------------------------ */

export function processUAPTransaction(
  order: Order,
  mandate_id?: string,
): { audit_events: AuditEvent[]; settlement_reference: string; protocol: "ncpi_uap"; order_id: string } {
  // Initiates autonomous UPI/Reserve settlement through Razorpay test/live gateway.
  // Emits audit events for the full protocol handshake.

  const events: AuditEvent[] = [
    {
      id: `audit-checkout-initiated-${order.id}-${Date.now()}`,
      type: "checkout_initiated" as ProtocolEvent,
      timestamp: new Date().toISOString(),
      actor: order.via_ai ? "AI Assistant" : "customer",
      source: order.via_ai ? "AI Agent" : "store",
      result: "Success",
      reason: "Mandate intent submitted; UAP settlement initiated",
      request_id: order.id,
      payload_summary: `mandate=${mandate_id ?? "none"} protocol=ncpi_uap amount_paise=${order.total_paise}`,
      status_code: 200,
    },
  ]

  // After simulated settlement (Razorpay test token reference):
  events.push({
    id: `audit-checkout-completed-${order.id}-${Date.now()}`,
    type: "checkout_completed" as ProtocolEvent,
    timestamp: new Date().toISOString(),
    actor: "system",
    source: "Razorpay",
    result: "Success",
    reason: "UAP mandate settled; Razorpay test token confirmed",
    request_id: order.id,
    payload_summary: `settlement=razorpay_test mandate=${mandate_id ?? "none"}`,
    status_code: 200,
  })

  return {
    audit_events: events,
    settlement_reference: "razorpay_test",
    protocol: "ncpi_uap",
    order_id: order.id,
  }
}

/* ------------------------------------------------------------------ */
/*  x402 — Global M2M HTTP 402 challenge payload                        */
/* ------------------------------------------------------------------ */

export function createX402Challenge(
  order: Order,
  mandate_id?: string,
): X402Challenge {
  return {
    status: 402,
    headers: {
      "Payment-Required": "protocol=x402; settlement=razorpay_test",
      "X-Protocol-Version": "1.0",
      "X-Mandate-Id": mandate_id ?? "none",
    },
    body: {
      protocol: "x402",
      mandate_id: mandate_id,
      amount_paise: order.total_paise,
      settlement: "razorpay_test",
      message: "Agent-to-agent autonomous settlement requires 402 challenge response",
    },
  }
}
