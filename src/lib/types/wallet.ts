/**
 * Wallet, Agent Delegation & Autonomous Commerce Types
 * Strictly enforces NPCI (National Payments Corporation of India) e-Mandate and AutoPay requirements.
 */

export const NPCI_TRANSACTION_LIMIT_PAISE = 1500000 // ₹15,000 max per automated mandate without AFA OTP
export const DEFAULT_SPEND_LIMIT_PAISE = 200000 // ₹2,000 default limit
export const DEFAULT_WALLET_BALANCE_PAISE = 500000 // ₹5,000 default balance

export interface CustomerAddress {
  full_name: string
  phone: string
  line1: string
  city: string
  state?: string
  pincode: string
  country?: string
}

export interface CustomerWallet {
  id: string
  customer_id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  wallet_balance_paise: number
  currency: string
  ai_purchases_enabled: boolean
  spend_limit_paise: number
  agent_auth_token: string
  payment_method: "wallet" | "upi_autopay"
  default_address: CustomerAddress
  created_at: string
  updated_at: string
}

export interface AutonomousPurchaseInput {
  auth_token?: string
  customer_id?: string
  items: Array<{ id: string; quantity: number }>
  delivery_address?: Partial<CustomerAddress>
  assistant?: "chatgpt" | "gemini" | "claude" | "store_agent" | "external_agent" | string
}

export interface AutonomousPurchaseRecoveryOptions {
  update_limit_url: string
  add_money_url: string
  manual_checkout_url?: string
}

export interface AutonomousPurchaseResult {
  success: boolean
  status:
    | "confirmed"
    | "limit_exceeded"
    | "insufficient_balance"
    | "npci_limit_exceeded"
    | "auth_required"
    | "ai_disabled"
    | "address_required"
    | "failed"
  order_id?: string
  amount_paid_paise?: number
  balance_remaining_paise?: number
  delivery_eta?: string
  tracking_url?: string
  invoice_url?: string
  message: string
  recovery_options?: AutonomousPurchaseRecoveryOptions
  order?: any
}
