/**
 * Universal Commerce Protocol (UCP) Type Definitions
 * Aligned with https://ucp.dev and https://github.com/Universal-Commerce-Protocol/ucp
 * Specification: 2026-01-23 / 2026-04-17
 */

export type UCPTransport = "rest" | "a2a" | "mcp"

export interface UCPServiceBinding {
  rest?: {
    endpoint: string
    openapi?: string
  }
  a2a?: {
    endpoint: string
    agent_card?: string
  }
  mcp?: {
    endpoint: string
    openrpc?: string
  }
}

export interface UCPCapabilityDeclaration {
  id:
    | "dev.ucp.shopping.catalog"
    | "dev.ucp.shopping.cart"
    | "dev.ucp.shopping.checkout"
    | "dev.ucp.shopping.orders"
    | string
  version: string
  description: string
}

export interface UCPExtensionDeclaration {
  id: string
  version: string
  specification: string
  mandates?: string[]
  required_for_autonomous_checkout?: boolean
}

export interface UCPPaymentHandlerDeclaration {
  id: string
  rail: string
  currency: string
  max_recurring_limit_paise?: number
  test_credentials?: Record<string, string>
  networks?: string[]
  requires_3ds_step_up_above_paise?: number
}

export interface UCPBusinessProfile {
  id: string
  name: string
  country: string
  currency: string
  npci_mic?: string
  settlement: string
}

export interface UCPDiscoveryManifest {
  ucp: {
    version: string
    specification: string
    transports_supported: UCPTransport[]
    services: {
      "dev.ucp.shopping": UCPServiceBinding
      "dev.ucp.common": UCPServiceBinding
      [key: string]: UCPServiceBinding
    }
    capabilities: UCPCapabilityDeclaration[]
    extensions: UCPExtensionDeclaration[]
    payment_handlers: UCPPaymentHandlerDeclaration[]
  }
  business: UCPBusinessProfile
}

export interface UCPCatalogQuery {
  q?: string
  category?: string
  max_price_paise?: number
  in_stock_only?: boolean
  limit?: number
  offset?: number
}

export interface UCPCartItemInput {
  product_id: string
  quantity: number
}

export interface UCPCartSession {
  id: string
  merchant_id: string
  items: Array<{
    product_id: string
    title: string
    quantity: number
    unit_price_paise: number
    line_total_paise: number
    image_url?: string
  }>
  subtotal_paise: number
  tax_paise: number
  delivery_fee_paise: number
  total_paise: number
  currency: string
  expires_at: string
  locked?: boolean
}
