import { useState } from "react"
import DashboardImport from "@/imports/1920WLight/index"
import ProductsImport from "@/imports/1920WLight-1/index"
import OrdersImport from "@/imports/1920WLight-2/index"
import AnalyticsImport from "@/imports/1920WLight-4/index"
import OrderDrawer from "@/components/merchant/OrderDrawer"

type Screen = "dashboard" | "products" | "orders" | "analytics"

// Exact Y positions (px from sidebar top) for each nav hit-area.
// Derived from the sidebar layout in the Figma imports:
//   SidebarNav starts at top-[89px]; each item is py-[10px] + leading-[20px] = 40px tall.
//   Gap between nav groups: 20px.
//
//   Group 0 (3 items) → 89, 129, 169
//   Group 1 (4 items) → 229, 269, 309, 349   (89 + 3×40 + 20 = 229)
//   Group 2 (1 item)  → 409                  (229 + 4×40 + 20 = 409)
const NAV = {
  dashboard:     89,
  products:     129,
  productImport: 169,
  aiAgent:      229,
  orders:       269,
  auditTrail:   309,
  analytics:    349,
  settings:     409,
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard")
  const [drawerOpen, setDrawerOpen] = useState(false)

  function goTo(s: Screen) {
    setScreen(s)
    setDrawerOpen(false)
  }

  return (
    <div className="relative size-full overflow-hidden">
      {/* Scrollable screen content */}
      <div className="size-full overflow-auto">
        {screen === "dashboard" && <DashboardImport />}
        {screen === "products"  && <ProductsImport />}
        {screen === "orders"    && <OrdersImport />}
        {screen === "analytics" && <AnalyticsImport />}
      </div>

      {/* ── Sidebar navigation overlay ──────────────────────────────────
          Transparent click targets sit on top of the 240 px sidebar
          that every import renders. The imports own the active-state
          highlight; we only add the missing click behaviour. */}
      <div
        className="absolute top-0 left-0 w-[240px] h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <NavHit top={NAV.dashboard}     onClick={() => goTo("dashboard")} />
        <NavHit top={NAV.products}      onClick={() => goTo("products")} />
        <NavHit top={NAV.productImport} onClick={() => goTo("products")} />
        <NavHit top={NAV.aiAgent} />
        <NavHit top={NAV.orders}        onClick={() => goTo("orders")} />
        <NavHit top={NAV.auditTrail} />
        <NavHit top={NAV.analytics}     onClick={() => goTo("analytics")} />
        <NavHit top={NAV.settings} />
      </div>

      {/* ── Orders table row click area ─────────────────────────────────
          Covers the table body (below header + KPI cards + filter bar +
          column headers ≈ 325 px) down to just above the pagination
          footer. Clicking any row opens the order detail drawer. */}
      {screen === "orders" && !drawerOpen && (
        <div
          className="absolute pointer-events-auto cursor-pointer"
          style={{ top: 325, left: 240, right: 0, bottom: 52, zIndex: 5 }}
          onClick={() => setDrawerOpen(true)}
          title="Click to view order details"
        />
      )}

      {/* ── Order Drawer ─────────────────────────────────────────────── */}
      {screen === "orders" && drawerOpen && (
        <div className="absolute inset-0" style={{ zIndex: 20 }}>
          <OrderDrawer onClose={() => setDrawerOpen(false)} />
        </div>
      )}
    </div>
  )
}

function NavHit({ top, onClick }: { top: number; onClick?: () => void }) {
  return (
    <div
      className={`absolute w-full h-10 ${onClick ? "pointer-events-auto cursor-pointer" : ""}`}
      style={{ top }}
      onClick={onClick}
    />
  )
}
