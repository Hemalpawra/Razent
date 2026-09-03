import type { Order } from "@/lib/types/order"

/**
 * Mock grocery orders. Statuses cover the matrix the merchant UI needs
 * to render. Tracking events are simulated (AI_RULES §5: shipping +
 * tracking are simulated for demo); Razorpay ids are realistic shape.
 *
 * Mirrors Blinkit/Swiggy quick-commerce:
 *   - cart typically < ₹2,000
 *   - 3-5 items per order
 *   - 10-30 min delivery promise
 *   - mix of paid / created / failed
 */
export const mockOrders: Order[] = [
  {
    id: "ord_2026_0001",
    razorpay_order_id: "rzp_2026_0001_AB12CD",
    razorpay_payment_id: "pay_9X7Y3KAB12",
    status: "paid",
    shipping_status: "delivered",
    currency: "INR",
    total_paise: 7800,
    shipping_paise: 0,
    items: [
      {
        product_id: "prod_amul_toned_milk",
        title: "Amul Toned Milk (1L)",
        image_url:
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 6800,
      },
      {
        product_id: "prod_tata_gold_tea",
        title: "Tata Tea Gold (500g)",
        image_url:
          "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 1000,
      },
    ],
    shipping_address: {
      full_name: "Ananya Rao",
      phone: "+91 98765 43210",
      email: "ananya.rao@example.com",
      line1: "12 4th Block, Koramangala",
      city: "Bengaluru",
      state: "KA",
      pincode: "560034",
      country: "IN",
    },
    via_ai: false,
    created_at: "2026-08-29T09:14:00Z",
    paid_at: "2026-08-29T09:16:42Z",
    shipped_at: "2026-08-29T09:18:00Z",
    delivered_at: "2026-08-29T09:32:00Z",
    tracking: {
      carrier: "Razent Express (simulated)",
      tracking_number: "RZT2026082909IN",
      events: [
        { at: "2026-08-29T09:32:00Z", status: "Delivered", location: "Koramangala, Bengaluru" },
        { at: "2026-08-29T09:28:00Z", status: "Out for delivery", location: "Koramangala hub" },
        { at: "2026-08-29T09:18:00Z", status: "Packed at dark store", location: "HSR dark store" },
      ],
    },
  },
  {
    id: "ord_2026_0002",
    razorpay_order_id: "rzp_2026_0002_EF34GH",
    razorpay_payment_id: "pay_Q8W2NM5PQ9",
    status: "paid",
    shipping_status: "shipped",
    currency: "INR",
    total_paise: 14900,
    shipping_paise: 0,
    items: [
      {
        product_id: "prod_banana_robusta",
        title: "Banana - Robusta (6 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=240&q=70&auto=format&fit=crop",
        qty: 2,
        unit_price_paise: 4900,
      },
      {
        product_id: "prod_apple_shimla",
        title: "Apple - Shimla (4 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 12900,
      },
    ],
    shipping_address: {
      full_name: "Rahul Sharma",
      phone: "+91 99887 76655",
      email: "rahul.sharma@example.com",
      line1: "Flat 304, Sai Residency, Indiranagar",
      city: "Bengaluru",
      state: "KA",
      pincode: "560038",
      country: "IN",
    },
    via_ai: true,
    conversation_id: "conv_2026_0001",
    created_at: "2026-08-30T18:42:00Z",
    paid_at: "2026-08-30T18:43:11Z",
    shipped_at: "2026-08-30T18:46:00Z",
    tracking: {
      carrier: "Razent Express (simulated)",
      tracking_number: "RZT2026083018IN",
      events: [
        { at: "2026-08-30T18:46:00Z", status: "Out for delivery", location: "Indiranagar hub" },
        { at: "2026-08-30T18:44:00Z", status: "Packed at dark store", location: "Indiranagar dark store" },
      ],
    },
  },
  {
    id: "ord_2026_0003",
    razorpay_order_id: "rzp_2026_0003_JK56LM",
    status: "created",
    shipping_status: "pending",
    currency: "INR",
    total_paise: 16400,
    shipping_paise: 0,
    items: [
      {
        product_id: "prod_tomato_local",
        title: "Tomato - Local (500g)",
        image_url:
          "https://images.unsplash.com/photo-1546470427-227df1ed3a1d?w=240&q=70&auto=format&fit=crop",
        qty: 2,
        unit_price_paise: 3500,
      },
      {
        product_id: "prod_onion_red",
        title: "Onion - Red (1 kg)",
        image_url:
          "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 4500,
      },
      {
        product_id: "prod_layrs_masala",
        title: "Lay's Classic Salted (90g)",
        image_url:
          "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 3000,
      },
      {
        product_id: "prod_coca_cola_750",
        title: "Coca-Cola Original (750ml)",
        image_url:
          "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 4000,
      },
    ],
    shipping_address: {
      full_name: "Priya Iyer",
      phone: "+91 99001 22334",
      email: "priya.iyer@example.com",
      line1: "A-12, Brigade Meadows, Kanakapura Road",
      city: "Bengaluru",
      state: "KA",
      pincode: "560062",
      country: "IN",
    },
    via_ai: false,
    created_at: "2026-08-31T08:21:00Z",
    tracking: undefined,
  },
  {
    id: "ord_2026_0004",
    razorpay_order_id: "rzp_2026_0004_NP78QR",
    status: "failed",
    shipping_status: "pending",
    currency: "INR",
    total_paise: 44900,
    shipping_paise: 0,
    items: [
      {
        product_id: "prod_toilet_paper",
        title: "Premium Toilet Roll (12 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 44900,
      },
    ],
    shipping_address: {
      full_name: "Vikram Mehta",
      phone: "+91 98456 11223",
      email: "vikram.mehta@example.com",
      line1: "Tower 7, Prestige Shantiniketan, Whitefield",
      city: "Bengaluru",
      state: "KA",
      pincode: "560066",
      country: "IN",
    },
    via_ai: true,
    conversation_id: "conv_2026_0002",
    created_at: "2026-08-31T12:05:00Z",
    notes: "UAP mandate verification failed — step-up required",
  },
  {
    id: "ord_2026_0005",
    razorpay_order_id: "rzp_2026_0005_ST90UV",
    razorpay_payment_id: "pay_A4B7C1D8E2",
    status: "paid",
    shipping_status: "packed",
    currency: "INR",
    total_paise: 27400,
    shipping_paise: 0,
    items: [
      {
        product_id: "prod_amul_toned_milk",
        title: "Amul Toned Milk (1L)",
        image_url:
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=70&auto=format&fit=crop",
        qty: 2,
        unit_price_paise: 6800,
      },
      {
        product_id: "prod_eggs_6pcs",
        title: "Farm Fresh Eggs (6 pcs)",
        image_url:
          "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 7500,
      },
      {
        product_id: "prod_layrs_masala",
        title: "Lay's Classic Salted (90g)",
        image_url:
          "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 3000,
      },
      {
        product_id: "prod_vim_bar",
        title: "Vim Dishwash Bar (200g)",
        image_url:
          "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=240&q=70&auto=format&fit=crop",
        qty: 1,
        unit_price_paise: 2500,
      },
    ],
    shipping_address: {
      full_name: "Meera Nair",
      phone: "+91 98770 12340",
      email: "meera.nair@example.com",
      line1: "303, Greenfield Apartments, MG Road",
      city: "Bengaluru",
      state: "KA",
      pincode: "560001",
      country: "IN",
    },
    via_ai: true,
    conversation_id: "conv_2026_0003",
    created_at: "2026-09-01T07:14:00Z",
    paid_at: "2026-09-01T07:15:22Z",
  },
]
