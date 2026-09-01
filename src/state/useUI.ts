import { create } from "zustand"

export type Screen =
  | "dashboard"
  | "products"
  | "orders"
  | "analytics"
  | "ai_agent_placeholder"
  | "import_placeholder"
  | "audit_placeholder"
  | "settings_placeholder"

type UIStore = {
  activeScreen: Screen
  setActiveScreen: (screen: Screen) => void
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
  drawerOrderId: null,
  openOrderDrawer: (orderId) => set({ drawerOrderId: orderId }),
  closeOrderDrawer: () => set({ drawerOrderId: null }),
  drawerProductId: null,
  openProductDrawer: (productId) => set({ drawerProductId: productId }),
  closeProductDrawer: () => set({ drawerProductId: null }),
}))