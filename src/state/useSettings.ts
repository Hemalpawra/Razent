import { create } from "zustand"
import { persist } from "zustand/middleware"

type StoreProfile = {
  storeName: string
  businessName: string
  logo: string
  supportEmail: string
  supportPhone: string
}
type AIDefaults = {
  enabled: boolean
  tone: "friendly" | "helpful" | "concise"
  language: "English" | "Hinglish" | "Hindi"
  askShipping: boolean
  askEmail: boolean
  askPhone: boolean
  enableUpsell: boolean
  enableCrossSell: boolean
  autoCreateRazorpay: boolean
  approvalThreshold: number
}
type BusinessRules = {
  currency: "INR" | "USD"
  taxDisplay: "inclusive" | "exclusive"
  orderNumbering: "RAZ-YYYY-####" | "ORD-####" | "RZP-####"
  minOrderAmount: number
  maxDiscount: number
  outOfStockRule: "block" | "hide" | "warn"
}
type DummyShipping = {
  enabled: boolean
  defaultDeliveryTime: string
  cutoffTime: string
  stages: string[]
}
type Notifications = {
  newConversation: boolean
  orderCreated: boolean
  paymentFailed: boolean
  lowStock: boolean
  orderCompleted: boolean
  humanSupport: boolean
}

type SettingsState = {
  storeProfile: StoreProfile
  aiDefaults: AIDefaults
  businessRules: BusinessRules
  dummyShipping: DummyShipping
  notifications: Notifications
  setStoreProfile: (p: Partial<StoreProfile>) => void
  setAiDefaults: (p: Partial<AIDefaults>) => void
  setBusinessRules: (p: Partial<BusinessRules>) => void
  setDummyShipping: (p: Partial<DummyShipping>) => void
  setNotifications: (p: Partial<Notifications>) => void
  resetAll: () => void
}

const defaults: Omit<SettingsState, "setStoreProfile" | "setAiDefaults" | "setBusinessRules" | "setDummyShipping" | "setNotifications" | "resetAll"> =
  {
    storeProfile: {
      storeName: "Merchant Store",
      businessName: "Razent Commerce Pvt Ltd",
      logo: "",
      supportEmail: "help@merchant.store",
      supportPhone: "+91 98765 43210",
    },
    aiDefaults: {
      enabled: true,
      tone: "friendly",
      language: "English",
      askShipping: true,
      askEmail: true,
      askPhone: true,
      enableUpsell: true,
      enableCrossSell: true,
      autoCreateRazorpay: true,
      approvalThreshold: 15000,
    },
    businessRules: {
      currency: "INR",
      taxDisplay: "inclusive",
      orderNumbering: "RAZ-YYYY-####",
      minOrderAmount: 0,
      maxDiscount: 20,
      outOfStockRule: "block",
    },
    dummyShipping: {
      enabled: true,
      // Q18: per-store delivery promise. Grocery default mirrors
      // Blinkit/Swiggy Instamart (10–30 min). Stored on profiles in SQL
      // (delivery_promise_minutes); this is the local mirror that the UI
      // reads until useMerchant (PR 5) replaces it with the live profile.
      defaultDeliveryTime: "10–30 min",
      cutoffTime: "11:00 PM",
      stages: [
        "Preparing",
        "Packed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
      ],
    },
    notifications: {
      newConversation: true,
      orderCreated: true,
      paymentFailed: true,
      lowStock: true,
      orderCompleted: false,
      humanSupport: true,
    },
  }

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setStoreProfile: (p) =>
        set((s) => ({ storeProfile: { ...s.storeProfile, ...p } })),
      setAiDefaults: (p) =>
        set((s) => ({ aiDefaults: { ...s.aiDefaults, ...p } })),
      setBusinessRules: (p) =>
        set((s) => ({ businessRules: { ...s.businessRules, ...p } })),
      setDummyShipping: (p) =>
        set((s) => ({ dummyShipping: { ...s.dummyShipping, ...p } })),
      setNotifications: (p) =>
        set((s) => ({ notifications: { ...s.notifications, ...p } })),
      resetAll: () => set({ ...defaults }),
    }),
    { name: "razent-settings" },
  ),
)
