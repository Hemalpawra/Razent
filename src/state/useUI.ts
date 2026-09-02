import { create } from "zustand"

export type Screen = "dashboard" | "products" | "product_import" | "orders" | "analytics" | "ai_agent" | "audit_trail" | "settings" | "order_detail" | "product_detail" | "conversation_detail" | "audit_detail" | "ai_agent_placeholder" | "import_placeholder" | "audit_placeholder" | "settings_placeholder"

export type Role = "merchant" | "store"

type UIStore = {
  activeScreen: Screen
  setActiveScreen: (screen: Screen) => void
  role: Role
  setRole: (role: Role) => void
  drawerOrderId: string | null
  openOrderDrawer: (orderId: string) => void
  closeOrderDrawer: () => void
  drawerProductId: string | null
  openProductDrawer: (productId: string | null) => void
  closeProductDrawer: () => void
}

export const useUI = create<UIStore>((set) => ({
  activeScreen: "dashboard",
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  role: "merchant",
  setRole: (role) => set({ role }),
  drawerOrderId: null,
  openOrderDrawer: (orderId) => set({ drawerOrderId: orderId }),
  closeOrderDrawer: () => set({ drawerOrderId: null }),
  drawerProductId: null,
  openProductDrawer: (productId) => set({ drawerProductId: productId }),
  closeProductDrawer: () => set({ drawerProductId: null }),
}))
