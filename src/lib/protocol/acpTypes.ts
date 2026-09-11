/**
 * Agentic Commerce Protocol (ACP) Type Definitions
 * Aligned with https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
 * Standards: RFC Agentic Checkout (2026-01-16 / 2026-04-17)
 */

export type ACPCheckoutStatus =
  | "not_ready_for_payment"
  | "ready_for_payment"
  | "in_progress"
  | "completed"
  | "canceled"
  | "authentication_required"

export interface ACPItemReference {
  id: string
  quantity: number
}

export interface ACPAddress {
  name: string
  line_one: string
  line_two?: string
  city: string
  state: string
  country: string
  postal_code: string
}

export interface ACPFulfillmentDetails {
  name?: string
  phone_number?: string
  email?: string
  address?: ACPAddress
}

export interface ACPTotal {
  type:
    | "items_base_amount"
    | "items_discount"
    | "subtotal"
    | "discount"
    | "fulfillment"
    | "tax"
    | "fee"
    | "total"
  display_text: string
  amount: number // Integer in minor units (paise/cents)
  description?: string
}

export interface ACPLineItem {
  id: string
  item: ACPItemReference
  base_amount: number // Integer in minor units (paise)
  discount: number
  subtotal: number
  tax: number
  total: number
  name?: string
  description?: string
  images?: string[]
  unit_amount?: number
  disclosures?: Array<{
    type: "disclaimer"
    content_type: "plain" | "markdown"
    content: string
  }>
}

export interface ACPFulfillmentOption {
  id: string
  title: string
  description?: string
  carrier?: string
  earliest_delivery_time?: string
  latest_delivery_time?: string
  totals: ACPTotal[]
}

export interface ACPSelectedFulfillmentOption {
  type: "shipping" | "digital" | "pickup" | "local_delivery"
  option_id: string
  item_ids?: string[]
}

export interface ACPPaymentHandler {
  id: string
  name: string // reverse-DNS e.g. "dev.acp.tokenized.card", "dev.acp.upi_autopay"
  version: string
  spec: string
  requires_delegate_payment: boolean
  requires_pci_compliance: boolean
  psp: string
  config?: Record<string, unknown>
  display_order?: number
}

export interface ACPCapabilities {
  payment_methods?: Array<string | { method: string; brands?: string[]; funding_types?: string[] }>
  payment_handlers?: ACPPaymentHandler[]
  interventions?: {
    supported: Array<"3ds" | "biometric">
    required?: Array<"3ds" | "biometric">
    enforcement?: "conditional" | "mandatory"
    display_context?: "webview" | "in_app" | "native"
  }
}

export interface ACPCheckoutSession {
  id: string
  status: ACPCheckoutStatus
  currency: string
  line_items: ACPLineItem[]
  fulfillment_details?: ACPFulfillmentDetails
  fulfillment_options: ACPFulfillmentOption[]
  selected_fulfillment_options: ACPSelectedFulfillmentOption[]
  totals: ACPTotal[]
  capabilities: ACPCapabilities
  messages: Array<{ type: "info" | "error"; message: string; code?: string }>
  links: Array<{ rel: string; href: string }>
  order?: {
    id: string
    checkout_session_id: string
    permalink_url: string
    created_at: string
  }
  mandate_chain_id?: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface ACPCheckoutSessionCreateRequest {
  items: ACPItemReference[]
  buyer?: {
    first_name?: string
    last_name?: string
    email?: string
  }
  fulfillment_details?: ACPFulfillmentDetails
  capabilities?: {
    interventions?: {
      supported: Array<"3ds" | "biometric">
      display_context?: string
      redirect_context?: string
    }
  }
}

export interface ACPCheckoutSessionCompleteRequest {
  payment_data: {
    handler_id: string
    token_reference: string
    mandate_chain_id?: string
    user_authorization?: string
    billing_address?: ACPAddress
  }
  buyer?: {
    first_name?: string
    last_name?: string
    email?: string
  }
  authentication_result?: {
    type: "3ds" | "biometric"
    status: "authenticated" | "failed"
    token?: string
  }
}

export interface ACPErrorResponse {
  type: "invalid_request" | "processing_error" | "service_unavailable"
  code: string
  message: string
  param?: string
}

export interface ACPWebhookEvent {
  id: string
  object: "event"
  api_version: string
  created: number
  type:
    | "checkout_session.created"
    | "checkout_session.updated"
    | "checkout_session.completed"
    | "checkout_session.failed"
    | "order.created"
    | "order.updated"
  data: {
    object: ACPCheckoutSession | Record<string, unknown>
  }
}
