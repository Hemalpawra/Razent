import type { Conversation } from "@/lib/types/conversation"

/**
 * Mock conversations for grocery / quick-commerce demo.
 * Covers: human_customer (default) and agent_to_agent (test).
 * Mirrors the order data in mock/orders.ts.
 */
export const mockConversations: Conversation[] = [
  {
    id: "conv_2026_0001",
    customer_name: "Rahul Sharma",
    type: "human_customer",
    agent_id: "agent_fruit_picker",
    protocol: "acp",
    status: "paid",
    last_message: "Payment completed — order packed at dark store",
    amount_paise: 14900,
    created_at: "2026-08-30T18:32:00Z",
    updated_at: "2026-08-30T18:43:00Z",
    order_id: "ord_2026_0002",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "I need fruit for the week — bananas + apples, healthy stuff",
        at: "2026-08-30T18:32:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "I found 2 great options in stock: Robusta Bananas (6 pcs, ₹49) and Shimla Apples (4 pcs, ₹129). Bananas are at our HSR dark store, 10 min delivery.",
        at: "2026-08-30T18:33:00Z",
      },
      {
        id: "m3",
        role: "customer",
        text: "Go with 2 banana packs and 1 apple pack. Ship to Indiranagar.",
        at: "2026-08-30T18:36:00Z",
      },
      {
        id: "m4",
        role: "ai",
        text: "Added 2× Banana Robusta + 1× Apple Shimla to your cart. Total ₹247. Need your full name, phone, and email for delivery.",
        at: "2026-08-30T18:37:00Z",
      },
      {
        id: "m5",
        role: "customer",
        text: "Rahul Sharma, +91 99887 76655, rahul.sharma@example.com, Flat 304 Indiranagar",
        at: "2026-08-30T18:39:00Z",
      },
      {
        id: "m6",
        role: "ai",
        text: "Shipping saved. Created Razorpay order ord_2026_0002. UAP mandate under your limit, so I'll auto-debit. Share payment link.",
        at: "2026-08-30T18:41:00Z",
      },
      { id: "m7", role: "customer", text: "Paid.", at: "2026-08-30T18:42:00Z" },
      {
        id: "m8",
        role: "ai",
        text: "Payment successful via NPCI UAP. Order packed at Indiranagar dark store. ETA 12 minutes.",
        at: "2026-08-30T18:43:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_banana_robusta",
        title: "Banana - Robusta (6 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=240&q=70&auto=format&fit=crop",
        price_paise: 4900,
      },
      {
        product_id: "prod_apple_shimla",
        title: "Apple - Shimla (4 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=240&q=70&auto=format&fit=crop",
        price_paise: 12900,
      },
    ],
    products_compared: [],
    selected_product: {
      product_id: "prod_banana_robusta",
      title: "Banana - Robusta (6 pcs)",
      image_url:
        "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=240&q=70&auto=format&fit=crop",
      price_paise: 4900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Rahul Sharma",
      phone: "+91 99887 76655",
      line1: "Flat 304, Sai Residency, Indiranagar",
      city: "Bengaluru",
    },
    tracking_status: "shipped",
  },
  {
    id: "conv_2026_0002",
    customer_name: "Vikram Mehta",
    type: "human_customer",
    agent_id: "agent_household",
    protocol: "x402",
    status: "failed",
    last_message: "Step-up authentication required for purchase over ₹2,000",
    amount_paise: 44900,
    created_at: "2026-08-31T12:00:00Z",
    updated_at: "2026-08-31T12:05:00Z",
    order_id: "ord_2026_0004",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Send me a 12-pack of toilet rolls",
        at: "2026-08-31T12:00:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Found Premium Toilet Roll (12 pcs) at ₹449. Adding to cart. Need shipping address.",
        at: "2026-08-31T12:01:00Z",
      },
      {
        id: "m3",
        role: "customer",
        text: "Tower 7, Prestige Shantiniketan, Whitefield. Same as last time.",
        at: "2026-08-31T12:03:00Z",
      },
      {
        id: "m4",
        role: "ai",
        text: "Order amount ₹449 exceeds your UAP auto-approve limit (₹2,000 with this payee). Triggering x402 step-up — please complete verification on the secure page.",
        at: "2026-08-31T12:05:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_toilet_paper",
        title: "Premium Toilet Roll (12 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=240&q=70&auto=format&fit=crop",
        price_paise: 44900,
      },
    ],
    products_compared: [],
    selected_product: {
      product_id: "prod_toilet_paper",
      title: "Premium Toilet Roll (12 pcs)",
      image_url:
        "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=240&q=70&auto=format&fit=crop",
      price_paise: 44900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Vikram Mehta",
      phone: "+91 98456 11223",
      line1: "Tower 7, Prestige Shantiniketan, Whitefield",
      city: "Bengaluru",
    },
  },
  {
    id: "conv_2026_0003",
    customer_name: "Meera Nair",
    type: "human_customer",
    agent_id: "agent_breakfast_run",
    protocol: "ncpi_uap",
    status: "paid",
    last_message: "Auto-settled via NPCI UAP — packed",
    amount_paise: 27400,
    created_at: "2026-09-01T07:08:00Z",
    updated_at: "2026-09-01T07:15:00Z",
    order_id: "ord_2026_0005",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Need breakfast stuff for the week: milk, eggs, snacks, dishwash",
        at: "2026-09-01T07:08:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "I can put together a quick cart: 2× Amul Milk (₹68 each), Farm Eggs 6-pack (₹75), Lay's Classic Salted (₹30), Vim Dishwash Bar (₹25). Total ₹274. All in stock at MG Road dark store.",
        at: "2026-09-01T07:10:00Z",
      },
      {
        id: "m3",
        role: "customer",
        text: "Perfect, ship to 303 Greenfield Apartments MG Road. Use my saved UAP mandate.",
        at: "2026-09-01T07:13:00Z",
      },
      {
        id: "m4",
        role: "ai",
        text: "Mandate verified, amount under auto-approve limit. Debiting via NPCI UAP. Order ord_2026_0005 created and paid.",
        at: "2026-09-01T07:15:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_amul_toned_milk",
        title: "Amul Toned Milk (1L)",
        image_url:
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=70&auto=format&fit=crop",
        price_paise: 6800,
      },
      {
        product_id: "prod_eggs_6pcs",
        title: "Farm Fresh Eggs (6 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=70&auto=format&fit=crop",
        price_paise: 7500,
      },
    ],
    products_compared: [],
    selected_product: {
      product_id: "prod_amul_toned_milk",
      title: "Amul Toned Milk (1L)",
      image_url:
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=70&auto=format&fit=crop",
      price_paise: 6800,
    },
    upsell: {
      product_id: "prod_dark_chocolate",
      title: "Dark Chocolate Bar (70% Cocoa, 80g)",
      image_url:
        "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=240&q=70&auto=format&fit=crop",
      price_paise: 19900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Meera Nair",
      phone: "+91 98770 12340",
      line1: "303, Greenfield Apartments, MG Road",
      city: "Bengaluru",
    },
    tracking_status: "packed",
  },
  {
    id: "conv_2026_0004",
    customer_name: "SwiggyBot (Test Agent)",
    type: "agent_to_agent",
    agent_id: "swiggy_agent_v1",
    protocol: "acp",
    status: "active",
    last_message: "Discovering your catalog for our quick-commerce aggregator",
    amount_paise: undefined,
    created_at: "2026-09-02T10:21:00Z",
    updated_at: "2026-09-02T10:24:00Z",
    messages: [
      {
        id: "m1",
        role: "ai",
        text: "Hello — I'm SwiggyBot, an agent-to-agent commerce client. I'd like to discover your catalog and place a test order for our integration suite.",
        at: "2026-09-02T10:21:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Welcome! I can share our /discover endpoint. Do you have specific SKUs in mind, or want me to send the full grocery catalog?",
        at: "2026-09-02T10:23:00Z",
      },
    ],
    products_recommended: [],
    products_compared: [],
    shipping_collected: false,
  },
]
