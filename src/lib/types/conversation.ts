export type ConversationType = "human_customer" | "agent_to_agent"
export type ConversationStatus =
  | "active"
  | "waiting_for_customer"
  | "waiting_for_payment"
  | "checkout_ready"
  | "paid"
  | "completed"
  | "failed"
  | "cancelled"

export type ChatMessage = {
  id: string
  role: "customer" | "ai"
  text: string
  at: string
}

export type Conversation = {
  id: string
  customer_name: string
  type: ConversationType
  status: ConversationStatus
  last_message: string
  amount_paise?: number
  created_at: string
  updated_at: string
  order_id?: string
  messages: ChatMessage[]
  products_recommended: { product_id: string; title: string; image_url: string; price_paise: number }[]
  products_compared: { product_id: string; title: string; image_url: string; price_paise: number }[]
  selected_product?: { product_id: string; title: string; image_url: string; price_paise: number }
  upsell?: { product_id: string; title: string; image_url: string; price_paise: number }
  shipping_collected: boolean
  shipping_address?: { full_name: string; phone: string; line1: string; city: string }
  tracking_status?: string
}
