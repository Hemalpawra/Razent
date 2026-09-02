import type { Conversation } from "@/lib/types/conversation"

export const mockConversations: Conversation[] = [
  {
    id: "conv_2026_0001",
    customer_name: "Ananya Rao",
    type: "human_customer",
    status: "paid",
    last_message: "Payment completed — invoice generated",
    amount_paise: 1699900,
    created_at: "2026-08-31T10:16:00Z",
    updated_at: "2026-08-31T10:32:00Z",
    order_id: "ord_2026_0001",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "I need an air purifier for a 2BHK, budget around 18k",
        at: "2026-08-31T10:16:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "I searched your catalog and found 3 air purifiers. Comparing Air Purifier Pro, Compact and HEPA Mini…",
        at: "2026-08-31T10:18:00Z",
      },
      {
        id: "m3",
        role: "ai",
        text: "Recommended: Air Purifier Pro — HEPA-13, 99.97% removal, app control. Adding to cart.",
        at: "2026-08-31T10:20:00Z",
      },
      {
        id: "m4",
        role: "customer",
        text: "Go ahead, ship to Bengaluru",
        at: "2026-08-31T10:24:00Z",
      },
      {
        id: "m5",
        role: "ai",
        text: "Collected shipping details. Created Razorpay order ord_2026_0001. Share payment link.",
        at: "2026-08-31T10:28:00Z",
      },
      { id: "m6", role: "customer", text: "Paid.", at: "2026-08-31T10:30:00Z" },
      {
        id: "m7",
        role: "ai",
        text: "Payment successful. Invoice generated. Tracking will start once shipped.",
        at: "2026-08-31T10:32:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_air_purifier_pro",
        title: "Air Purifier Pro",
        image_url:
          "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop",
        price_paise: 1699900,
      },
      {
        product_id: "prod_smart_bulb_pack",
        title: "Smart Bulb 4-pack",
        image_url:
          "https://images.unsplash.com/photo-1558002038-1055907df827?w=240&q=70&auto=format&fit=crop",
        price_paise: 249900,
      },
    ],
    products_compared: [
      {
        product_id: "prod_air_purifier_pro",
        title: "Air Purifier Pro",
        image_url:
          "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop",
        price_paise: 1699900,
      },
      {
        product_id: "prod_robot_vacuum_x",
        title: "Robot Vacuum X",
        image_url:
          "https://images.unsplash.com/photo-1581578017093-cd30fce4f9d1?w=240&q=70&auto=format&fit=crop",
        price_paise: 2499900,
      },
    ],
    selected_product: {
      product_id: "prod_air_purifier_pro",
      title: "Air Purifier Pro",
      image_url:
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop",
      price_paise: 1699900,
    },
    upsell: {
      product_id: "prod_smart_bulb_pack",
      title: "Smart Bulb 4-pack",
      image_url:
        "https://images.unsplash.com/photo-1558002038-1055907df827?w=240&q=70&auto=format&fit=crop",
      price_paise: 249900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Ananya Rao",
      phone: "+91 98765 43210",
      line1: "12 4th Block, Koramangala",
      city: "Bengaluru",
    },
    tracking_status: "Shipped — Delhivery (simulated)",
  },
  {
    id: "conv_2026_0002",
    customer_name: "Agent — ShopBot",
    type: "agent_to_agent",
    status: "active",
    last_message: "Comparing laptops for customer request…",
    created_at: "2026-08-31T09:40:00Z",
    updated_at: "2026-08-31T09:44:00Z",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Find me a lightweight laptop under 60k with 16GB RAM",
        at: "2026-08-31T09:40:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Searching catalog… found 2 options. Comparing specs and price.",
        at: "2026-08-31T09:42:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_portable_ssd",
        title: "Portable SSD 1TB",
        image_url:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=240&q=70&auto=format&fit=crop",
        price_paise: 299900,
      },
    ],
    products_compared: [
      {
        product_id: "prod_portable_ssd",
        title: "Portable SSD 1TB",
        image_url:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=240&q=70&auto=format&fit=crop",
        price_paise: 299900,
      },
      {
        product_id: "prod_keyboard_mech",
        title: "Mechanical Keyboard 75%",
        image_url:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=240&q=70&auto=format&fit=crop",
        price_paise: 449900,
      },
    ],
    shipping_collected: false,
  },
  {
    id: "conv_2026_0003",
    customer_name: "Rohan Mehta",
    type: "human_customer",
    status: "waiting_for_payment",
    last_message: "Razorpay link sent — waiting for payment",
    amount_paise: 899900,
    created_at: "2026-08-31T08:20:00Z",
    updated_at: "2026-08-31T08:28:00Z",
    order_id: "ord_2026_0002",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Show me smartwatches with ECG",
        at: "2026-08-31T08:20:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Found Smart Watch A2 — AMOLED, ECG, 14-day battery. Added to cart and created order.",
        at: "2026-08-31T08:24:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_smart_watch_a2",
        title: "Smart Watch A2",
        image_url:
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=240&q=70&auto=format&fit=crop",
        price_paise: 899900,
      },
    ],
    products_compared: [],
    selected_product: {
      product_id: "prod_smart_watch_a2",
      title: "Smart Watch A2",
      image_url:
        "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=240&q=70&auto=format&fit=crop",
      price_paise: 899900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Rohan Mehta",
      phone: "+91 99887 76655",
      line1: "B-204, Hiranandani Estate",
      city: "Thane",
    },
    tracking_status: "Order Created — awaiting payment",
  },
  {
    id: "conv_2026_0004",
    customer_name: "Priya Nair",
    type: "human_customer",
    status: "waiting_for_customer",
    last_message: "Asked for human support",
    created_at: "2026-08-31T07:10:00Z",
    updated_at: "2026-08-31T07:14:00Z",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "This kettle is out of stock — when will it be back?",
        at: "2026-08-31T07:10:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Smart Temperature Kettle is currently out of stock. I can notify you or suggest Espresso Machine.",
        at: "2026-08-31T07:12:00Z",
      },
      {
        id: "m3",
        role: "customer",
        text: "Talk to a human please",
        at: "2026-08-31T07:14:00Z",
      },
    ],
    products_recommended: [],
    products_compared: [],
    shipping_collected: false,
  },
  {
    id: "conv_2026_0005",
    customer_name: "Agent — PriceHawk",
    type: "agent_to_agent",
    status: "completed",
    last_message: "Order delivered · ₹15,999",
    amount_paise: 1599900,
    created_at: "2026-08-30T14:02:00Z",
    updated_at: "2026-08-31T18:11:00Z",
    order_id: "ord_2026_0003",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Bulk order: mesh wifi + 2 bulbs",
        at: "2026-08-30T14:02:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Bundle created. Applied savings. Order paid and shipped.",
        at: "2026-08-31T18:11:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_mesh_wifi_3pack",
        title: "Mesh Wi-Fi 3-pack",
        image_url:
          "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=240&q=70&auto=format&fit=crop",
        price_paise: 1599900,
      },
    ],
    products_compared: [],
    selected_product: {
      product_id: "prod_mesh_wifi_3pack",
      title: "Mesh Wi-Fi 3-pack",
      image_url:
        "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=240&q=70&auto=format&fit=crop",
      price_paise: 1599900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Karan Shah",
      phone: "+91 91234 56789",
      line1: "Plot 14, Sector 18",
      city: "Gurugram",
    },
    tracking_status: "Delivered",
  },
  // extras for paging/realism
  {
    id: "conv_2026_0006",
    customer_name: "Sana Ali",
    type: "human_customer",
    status: "checkout_ready",
    last_message: "Cart ready — awaiting checkout",
    amount_paise: 599900,
    created_at: "2026-08-31T06:00:00Z",
    updated_at: "2026-08-31T06:08:00Z",
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Need an air fryer for family of 4",
        at: "2026-08-31T06:00:00Z",
      },
      {
        id: "m2",
        role: "ai",
        text: "Recommended Dual-Basket Air Fryer — 8L, 6 presets. Added to cart, shipping collected.",
        at: "2026-08-31T06:04:00Z",
      },
    ],
    products_recommended: [
      {
        product_id: "prod_airfryer_dual",
        title: "Dual-Basket Air Fryer",
        image_url:
          "https://images.unsplash.com/photo-1626509653291-18d9a934b9db?w=240&q=70&auto=format&fit=crop",
        price_paise: 599900,
      },
    ],
    products_compared: [],
    selected_product: {
      product_id: "prod_airfryer_dual",
      title: "Dual-Basket Air Fryer",
      image_url:
        "https://images.unsplash.com/photo-1626509653291-18d9a934b9db?w=240&q=70&auto=format&fit=crop",
      price_paise: 599900,
    },
    shipping_collected: true,
    shipping_address: {
      full_name: "Sana Ali",
      phone: "+91 90000 11111",
      line1: "House 42, Jubilee Hills",
      city: "Hyderabad",
    },
  },
]
