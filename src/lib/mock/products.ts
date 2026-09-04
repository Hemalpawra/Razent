import type { Product } from "@/lib/types/product"

/**
 * Razent grocery catalog — Blinkit / Swiggy Instamart style.
 *
 * 12 starter SKUs spanning 6 categories:
 *   - Fruits
 *   - Vegetables
 *   - Dairy & Bakery
 *   - Snacks & Munchies
 *   - Beverages
 *   - Household
 *
 * Each product carries Q16 fields (unit, mrp_paise, gst_pct) so the
 * storefront can show strike-through MRP, GST line in cart, and unit
 * labels (500g, 1L, 12 pcs) — same pattern as Blinkit.
 *
 * Once Supabase is the source of truth (Q15a — seed migration
 * 20260310000005), this file is kept for offline / preview builds
 * only and is not imported by client.ts.
 */
export const mockProducts: Product[] = [
  // ── Fruits ──────────────────────────────────────────────
  {
    id: "prod_banana_robusta",
    title: "Banana - Robusta (6 pcs)",
    description:
      "Fresh, ripe Robusta bananas. Rich in potassium, perfect for breakfast or smoothies. ~600g.",
    price_paise: 4900,
    currency: "INR",
    stock: 120,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=480&q=80&auto=format&fit=crop",
    category: "Fruits",
    tags: ["bestseller", "fresh", "fruit"],
    created_at: "2026-01-04T08:30:00Z",
    updated_at: "2026-08-31T11:21:00Z",
  },
  {
    id: "prod_apple_shimla",
    title: "Apple - Shimla (4 pcs)",
    description:
      "Crisp, sweet Shimla apples. ~600g. Hand-picked, refrigerated transport.",
    price_paise: 12900,
    currency: "INR",
    stock: 80,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=480&q=80&auto=format&fit=crop",
    category: "Fruits",
    tags: ["fresh", "imported"],
    created_at: "2026-01-04T08:31:00Z",
    updated_at: "2026-08-29T09:11:00Z",
  },

  // ── Vegetables ──────────────────────────────────────────
  {
    id: "prod_tomato_local",
    title: "Tomato - Local (500g)",
    description:
      "Farm-fresh local tomatoes. ~500g. Source of lycopene + vitamin C.",
    price_paise: 3500,
    currency: "INR",
    stock: 200,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=480&q=80&auto=format&fit=crop",
    category: "Vegetables",
    tags: ["fresh", "local"],
    created_at: "2026-01-05T08:30:00Z",
    updated_at: "2026-08-30T11:00:00Z",
  },
  {
    id: "prod_onion_red",
    title: "Onion - Red (1 kg)",
    description:
      "Premium red onions, ~1kg. Essential for every Indian kitchen.",
    price_paise: 4500,
    currency: "INR",
    stock: 350,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=480&q=80&auto=format&fit=crop",
    category: "Vegetables",
    tags: ["fresh", "staple"],
    created_at: "2026-01-05T08:31:00Z",
    updated_at: "2026-08-30T11:00:00Z",
  },

  // ── Dairy & Bakery ──────────────────────────────────────
  {
    id: "prod_amul_toned_milk",
    title: "Amul Toned Milk (1L)",
    description:
      "Amul Taaza Toned Fresh Milk, 1L tetra pack. Pasteurised, homogenised.",
    price_paise: 6800,
    currency: "INR",
    stock: 240,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=480&q=80&auto=format&fit=crop",
    category: "Dairy & Bakery",
    tags: ["bestseller", "dairy", "refrigerated"],
    created_at: "2026-01-06T08:30:00Z",
    updated_at: "2026-08-30T11:30:00Z",
  },
  {
    id: "prod_eggs_6pcs",
    title: "Farm Fresh Eggs (6 pcs)",
    description:
      "Free-range country chicken eggs. Pack of 6. Protein-rich, ~360g total.",
    price_paise: 7500,
    currency: "INR",
    stock: 90,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=480&q=80&auto=format&fit=crop",
    category: "Dairy & Bakery",
    tags: ["protein", "fresh"],
    created_at: "2026-01-06T08:31:00Z",
    updated_at: "2026-08-30T11:30:00Z",
  },

  // ── Snacks & Munchies ───────────────────────────────────
  {
    id: "prod_layrs_masala",
    title: "Lay's Classic Salted (90g)",
    description:
      "Lay's Classic Salted Potato Chips. 90g pack. India's favourite snack.",
    price_paise: 3000,
    currency: "INR",
    stock: 500,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=480&q=80&auto=format&fit=crop",
    category: "Snacks & Munchies",
    tags: ["bestseller", "snack", "packaged"],
    created_at: "2026-01-07T08:30:00Z",
    updated_at: "2026-08-30T11:45:00Z",
  },
  {
    id: "prod_dark_chocolate",
    title: "Dark Chocolate Bar (70% Cocoa, 80g)",
    description:
      "Premium 70% cocoa dark chocolate, 80g bar. Rich, smooth, low sugar.",
    price_paise: 19900,
    currency: "INR",
    stock: 60,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=480&q=80&auto=format&fit=crop",
    category: "Snacks & Munchies",
    tags: ["premium", "imported"],
    created_at: "2026-01-07T08:31:00Z",
    updated_at: "2026-08-30T11:45:00Z",
  },

  // ── Beverages ───────────────────────────────────────────
  {
    id: "prod_coca_cola_750",
    title: "Coca-Cola Original (750ml)",
    description:
      "Coca-Cola Original Taste, 750ml PET bottle. Best served chilled.",
    price_paise: 4000,
    currency: "INR",
    stock: 320,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=480&q=80&auto=format&fit=crop",
    category: "Beverages",
    tags: ["bestseller", "cold-drink"],
    created_at: "2026-01-08T08:30:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  },
  {
    id: "prod_tata_gold_tea",
    title: "Tata Tea Gold (500g)",
    description:
      "Tata Tea Gold, premium blend of Assam + Kerala tea leaves, 500g pouch.",
    price_paise: 29500,
    currency: "INR",
    stock: 110,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=480&q=80&auto=format&fit=crop",
    category: "Beverages",
    tags: ["staple", "tea"],
    created_at: "2026-01-08T08:31:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  },

  // ── Household ───────────────────────────────────────────
  {
    id: "prod_vim_bar",
    title: "Vim Dishwash Bar (200g)",
    description:
      "Vim Lemon Dishwash Bar with 100% lime juice, 200g. Cuts grease fast.",
    price_paise: 2500,
    currency: "INR",
    stock: 400,
    status: "active",
    image_url:
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=480&q=80&auto=format&fit=crop",
    category: "Household",
    tags: ["staple", "cleaning"],
    created_at: "2026-01-09T08:30:00Z",
    updated_at: "2026-08-30T12:15:00Z",
  },
  {
    id: "prod_toilet_paper",
    title: "Premium Toilet Roll (12 pcs)",
    description:
      "Soft, 2-ply toilet tissue rolls, pack of 12. Total ~600 sheets.",
    price_paise: 44900,
    currency: "INR",
    stock: 75,
    status: "draft",
    image_url:
      "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=480&q=80&auto=format&fit=crop",
    category: "Household",
    tags: ["essentials"],
    created_at: "2026-01-09T08:31:00Z",
    updated_at: "2026-08-30T12:15:00Z",
  },
]

export const mockCategories = Array.from(
  new Set(mockProducts.map((p) => p.category)),
).sort()
