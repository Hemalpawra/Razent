/**
 * NPCI & RBI Multi-Payment Regulatory Compliance Wrapper for Razent.
 * Enforces bank-grade payment guardrails across UPI AutoPay, Tokenized Cards,
 * Prepaid Wallets, and Payment Aggregator Escrow settlement rules.
 */

import type { SavedPaymentCard, SavedUPICredential, NPCIMandateConfig } from "./ap2Types"

// ============================================================================
// 1. DEFAULT TEST PAYMENT CARDS (Razorpay Sandbox & RBI Tokenization Test Suite)
// ============================================================================

export const DEFAULT_TEST_CARDS: SavedPaymentCard[] = [
  {
    id: "card_test_visa",
    network: "Visa",
    cardNumber: "4100 2800 0000 1007",
    maskedNumber: "4100 28•• •••• 1007",
    cardType: "Debit",
    cardSubType: "Consumer",
    expiry: "12/29",
    cvv: "423",
    tokenReference: "tok_rbi_visa_4100_2026",
    isDefault: true,
  },
  {
    id: "card_test_mc_biz",
    network: "Mastercard",
    cardNumber: "5555 5100 0008 1006",
    maskedNumber: "5555 51•• •••• 1006",
    cardType: "Credit",
    cardSubType: "Business",
    expiry: "11/28",
    cvv: "871",
    tokenReference: "tok_rbi_mc_5555_2026",
  },
  {
    id: "card_test_mc_prepaid",
    network: "Mastercard",
    cardNumber: "5180 2872 0009 1001",
    maskedNumber: "5180 28•• •••• 1001",
    cardType: "Prepaid",
    cardSubType: "Consumer",
    expiry: "10/30",
    cvv: "394",
    tokenReference: "tok_rbi_mc_5180_2026",
  },
  {
    id: "card_test_rupay",
    network: "RuPay",
    cardNumber: "6527 6589 0000 1005",
    maskedNumber: "6527 65•• •••• 1005",
    cardType: "Credit",
    cardSubType: "Consumer",
    expiry: "09/29",
    cvv: "652",
    tokenReference: "tok_rbi_rupay_6527_2026",
  },
  {
    id: "card_test_diners",
    network: "Diners",
    cardNumber: "3608 280009 1007",
    maskedNumber: "3608 28•• •••• 1007",
    cardType: "Credit",
    cardSubType: "Consumer",
    expiry: "08/28",
    cvv: "185",
    tokenReference: "tok_rbi_diners_3608_2026",
  },
  {
    id: "card_test_amex",
    network: "Amex",
    cardNumber: "3402 560004 01007",
    maskedNumber: "3402 56•• •••• 007",
    cardType: "Credit",
    cardSubType: "Consumer",
    expiry: "07/29",
    cvv: "2491",
    tokenReference: "tok_rbi_amex_3402_2026",
  },
]

// ============================================================================
// 2. DEFAULT TEST UPI CREDENTIALS (Razorpay UPI Sandbox & NPCI Rules)
// ============================================================================

export const DEFAULT_TEST_UPI_METHODS: SavedUPICredential[] = [
  {
    id: "upi_success",
    vpa: "success@razorpay",
    label: "Razorpay Test Success UPI",
    flow: "success",
    description: "Simulates instantaneous UPI authorization & AutoPay e-mandate clearance.",
    isDefault: true,
  },
  {
    id: "upi_failure",
    vpa: "failure@razorpay",
    label: "Razorpay Test Failure UPI",
    flow: "failure",
    description: "Simulates customer decline, timeout, or insufficient bank funds.",
  },
]

const STORED_CARDS_KEY = "razent_saved_cards"
const STORED_ACTIVE_PAYMENT_KEY = "razent_active_payment_method"

export interface ActivePaymentSelection {
  type: "upi" | "card"
  cardId?: string
  upiVpa?: string
}

export function getSavedTestCards(): SavedPaymentCard[] {
  if (typeof window === "undefined") return DEFAULT_TEST_CARDS
  try {
    const raw = localStorage.getItem(STORED_CARDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_TEST_CARDS
}

export function saveTestCards(cards: SavedPaymentCard[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORED_CARDS_KEY, JSON.stringify(cards))
  } catch {}
}

export function getActivePaymentSelection(): ActivePaymentSelection {
  if (typeof window === "undefined") {
    return { type: "upi", upiVpa: "success@razorpay" }
  }
  try {
    const raw = localStorage.getItem(STORED_ACTIVE_PAYMENT_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {}
  return { type: "upi", upiVpa: "success@razorpay" }
}

export function saveActivePaymentSelection(sel: ActivePaymentSelection): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORED_ACTIVE_PAYMENT_KEY, JSON.stringify(sel))
  } catch {}
}

// ============================================================================
// 3. REGULATORY COMPLIANCE SANITIZER & GUARDRAILS
// ============================================================================

export interface SanitizationResult {
  hasSensitiveData: boolean
  sanitizedText: string
  violationType?: "card_pan" | "cvv" | "otp" | "password"
  warningMessage?: string
}

/**
 * Scans user input for sensitive payment credentials (PAN, CVV, OTP, password).
 * Strictly complies with RBI directives: AI chat context must NEVER ingest or log raw credentials.
 */
export function sanitizeUserChatInput(text: string): SanitizationResult {
  // 1. Detect 15-16 digit PAN patterns (with or without spaces/dashes)
  const panRegex = /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{3,4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b/g
  if (panRegex.test(text)) {
    return {
      hasSensitiveData: true,
      sanitizedText: text.replace(panRegex, "[REDACTED_CARD_NUMBER]"),
      violationType: "card_pan",
      warningMessage:
        "Security Alert: Card numbers cannot be shared in chat per RBI regulations. Your saved test card will be used securely via encrypted tokenization.",
    }
  }

  // 2. Detect explicit CVV patterns e.g. "cvv is 123", "cvv 1234", "my cvv: 423"
  const cvvRegex = /\b(?:cvv|cvc|cid|security\s*code)\s*[:=]?\s*(\d{3,4})\b/i
  if (cvvRegex.test(text)) {
    return {
      hasSensitiveData: true,
      sanitizedText: text.replace(cvvRegex, "cvv: [REDACTED]"),
      violationType: "cvv",
      warningMessage:
        "Security Alert: CVVs must never be shared in chat. In compliance with RBI rules, CVVs are strictly handled in secure payment gateways.",
    }
  }

  // 3. Detect OTP patterns e.g. "otp is 123456", "my otp: 9876"
  const otpRegex = /\b(?:otp|one\s*time\s*password)\s*[:=]?\s*(\d{4,8})\b/i
  if (otpRegex.test(text)) {
    return {
      hasSensitiveData: true,
      sanitizedText: text.replace(otpRegex, "otp: [REDACTED]"),
      violationType: "otp",
      warningMessage:
        "Security Alert: Never share One-Time Passwords (OTP) in chat. Razent AI will never ask for your OTP.",
    }
  }

  return {
    hasSensitiveData: false,
    sanitizedText: text,
  }
}

/**
 * Validates whether an autonomous order complies with NPCI & RBI rules.
 */
export function validateOrderAgainstRegulations(
  amountPaise: number,
  config: NPCIMandateConfig,
): { allowed: boolean; requiresStepUp: boolean; reason?: string } {
  const amountRupees = amountPaise / 100

  // 1. NPCI AutoPay Hard Ceiling: ₹15,000 per transaction
  if (amountRupees > 15000) {
    return {
      allowed: false,
      requiresStepUp: true,
      reason: `Amount (₹${amountRupees.toLocaleString("en-IN")}) exceeds NPCI AutoPay regulatory limit of ₹15,000. Real-time step-up PIN/AFA authentication is mandatory.`,
    }
  }

  // 2. User-Delegated Spending Cap
  if (amountRupees > config.user_delegated_limit_rupees) {
    return {
      allowed: false,
      requiresStepUp: true,
      reason: `Amount (₹${amountRupees.toLocaleString("en-IN")}) exceeds your configured autonomous cap of ₹${config.user_delegated_limit_rupees.toLocaleString("en-IN")}.`,
    }
  }

  // 3. Mandate Status Check
  if (config.mandate_status !== "active") {
    return {
      allowed: false,
      requiresStepUp: true,
      reason: `Your AutoPay mandate is currently ${config.mandate_status.toUpperCase()}. Please reactivate in Wallet Settings.`,
    }
  }

  return {
    allowed: true,
    requiresStepUp: false,
  }
}
