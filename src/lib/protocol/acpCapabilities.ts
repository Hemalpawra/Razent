/**
 * ACP Capability Negotiation Engine
 * Aligned with RFC: Agentic Checkout — Capability Negotiation (2026-01-16)
 *
 * Implements intersection-based capability negotiation between AI Agents and Merchant.
 * Sellers return only the intersection of mutually supported capabilities, eliminating
 * complex client-side matching logic.
 */

import type { ACPCapabilities, ACPPaymentHandler } from "./acpTypes"

export const DEFAULT_RAZENT_PAYMENT_HANDLERS: ACPPaymentHandler[] = [
  {
    id: "dev.acp.tokenized.card",
    name: "dev.acp.tokenized.card",
    version: "2026-01-30",
    spec: "https://agenticcommerce.dev/handlers/tokenized-card",
    requires_delegate_payment: true,
    requires_pci_compliance: false,
    psp: "razorpay",
    config: {
      supported_networks: ["Visa", "Mastercard", "RuPay", "Diners", "Amex"],
      token_format: "rbi_cof_network_token",
      currency: "INR",
    },
    display_order: 1,
  },
  {
    id: "dev.acp.upi_autopay",
    name: "dev.acp.upi_autopay",
    version: "2026-01-30",
    spec: "https://agenticcommerce.dev/handlers/upi-autopay",
    requires_delegate_payment: true,
    requires_pci_compliance: false,
    psp: "razorpay",
    config: {
      rail: "NPCI_UPI_AUTOPAY",
      ceiling_paise: 1500000, // ₹15,000 NPCI Limit
      test_vpa: {
        success: "success@razorpay",
        failure: "failure@razorpay",
      },
    },
    display_order: 2,
  },
  {
    id: "dev.acp.seller_backed.saved_card",
    name: "dev.acp.seller_backed.saved_card",
    version: "2026-02-05",
    spec: "https://agenticcommerce.dev/handlers/seller-backed",
    requires_delegate_payment: true,
    requires_pci_compliance: false,
    psp: "seller_managed",
    config: {
      type: "saved_card",
      vault: "razorpay_customer_vault",
    },
    display_order: 3,
  },
  {
    id: "dev.acp.seller_backed.store_credit",
    name: "dev.acp.seller_backed.store_credit",
    version: "2026-02-05",
    spec: "https://agenticcommerce.dev/handlers/seller-backed",
    requires_delegate_payment: true,
    requires_pci_compliance: false,
    psp: "seller_managed",
    config: {
      type: "store_credit",
      instant_settlement: true,
    },
    display_order: 4,
  },
]

export const RAZENT_SUPPORTED_INTERVENTIONS: Array<"3ds" | "biometric"> = ["3ds", "biometric"]

/**
 * Calculates the exact mathematical intersection of capabilities between the Agent and Merchant.
 */
export function negotiateCapabilities(
  agentCapabilities?: {
    interventions?: {
      supported: Array<"3ds" | "biometric">
      display_context?: string
      redirect_context?: string
    }
  },
): ACPCapabilities {
  // 1. Calculate intersection of supported interventions
  const agentSupported = agentCapabilities?.interventions?.supported || []
  const intersectedInterventions = agentSupported.filter((i) =>
    RAZENT_SUPPORTED_INTERVENTIONS.includes(i),
  )

  return {
    payment_methods: [
      {
        method: "card",
        brands: ["visa", "mastercard", "rupay", "diners", "amex"],
        funding_types: ["credit", "debit", "prepaid"],
      },
      "card.network_token",
      "wallet.upi",
    ],
    payment_handlers: DEFAULT_RAZENT_PAYMENT_HANDLERS,
    interventions: {
      supported: intersectedInterventions,
      required: [],
      enforcement: "conditional",
      display_context: (agentCapabilities?.interventions?.display_context as any) || "webview",
    },
  }
}
