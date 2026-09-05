import React, { useState, useEffect } from "react"
import {
  X,
  ShieldCheck,
  CreditCard,
  User,
  Sliders,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Trash2,
  Lock,
  ArrowRight,
  ExternalLink,
  Zap,
} from "lucide-react"
import {
  getStoredNPCIConfig,
  saveStoredNPCIConfig,
  DEFAULT_NPCI_CONFIG,
} from "@/lib/protocol/agenticCommerce"
import {
  getSavedTestCards,
  saveTestCards,
  getActivePaymentSelection,
  saveActivePaymentSelection,
  DEFAULT_TEST_UPI_METHODS,
  type ActivePaymentSelection,
} from "@/lib/protocol/regulatoryWrapper"
import type { NPCIMandateConfig, SavedPaymentCard } from "@/lib/protocol/ap2Types"
import { toast } from "sonner"
import { Copy, AlertTriangle } from "lucide-react"

interface WalletSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdateConfig?: (config: NPCIMandateConfig) => void
}

export interface CustomerProfile {
  fullName: string
  email: string
  phone: string
  addressLine: string
  city: string
  postalCode: string
}

const DEFAULT_PROFILE: CustomerProfile = {
  fullName: "Hemal Dave",
  email: "hemal@razent.store",
  phone: "+91 98765 43210",
  addressLine: "Flat 402, Green Meadows Apt, Indiranagar 100ft Rd",
  city: "Bengaluru, Karnataka",
  postalCode: "560038",
}

export const WalletSettingsModal: React.FC<WalletSettingsModalProps> = ({
  isOpen,
  onClose,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<"mandate" | "payment" | "profile" | "protocol">("mandate")
  const [mandateConfig, setMandateConfig] = useState<NPCIMandateConfig>(DEFAULT_NPCI_CONFIG)
  const [profile, setProfile] = useState<CustomerProfile>(DEFAULT_PROFILE)
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>(getSavedTestCards)
  const [activePayment, setActivePayment] = useState<ActivePaymentSelection>(getActivePaymentSelection)
  const [customUpi, setCustomUpi] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMandateConfig(getStoredNPCIConfig())
      setSavedCards(getSavedTestCards())
      const storedActive = getActivePaymentSelection()
      setActivePayment(storedActive)
      if (storedActive.type === "upi" && storedActive.upiVpa) {
        setCustomUpi(storedActive.upiVpa)
      }
      try {
        const storedProfile = localStorage.getItem("razent_customer_profile")
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile))
        }
      } catch {}
      setIsSaved(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    const updatedConfig: NPCIMandateConfig = {
      ...mandateConfig,
      active_payment_type: activePayment.type,
      selected_card_id: activePayment.cardId,
      selected_upi_id: activePayment.upiVpa,
      upi_vpa: activePayment.upiVpa || mandateConfig.upi_vpa,
    }
    saveStoredNPCIConfig(updatedConfig)
    saveActivePaymentSelection(activePayment)
    saveTestCards(savedCards)
    try {
      localStorage.setItem("razent_customer_profile", JSON.stringify(profile))
    } catch {}
    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig)
    }
    setIsSaved(true)
    toast.success("Wallet & delegated payment settings updated successfully.")
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 400)
  }

  const selectCard = (card: SavedPaymentCard) => {
    const next: ActivePaymentSelection = { type: "card", cardId: card.id }
    setActivePayment(next)
    saveActivePaymentSelection(next)
    const updatedConfig: NPCIMandateConfig = {
      ...mandateConfig,
      active_payment_type: "card",
      selected_card_id: card.id,
    }
    setMandateConfig(updatedConfig)
    saveStoredNPCIConfig(updatedConfig)
    if (onUpdateConfig) onUpdateConfig(updatedConfig)
    toast.success(`Selected ${card.network} ${card.cardType} (${card.cardSubType}) as primary payment method`)
  }

  const selectUpi = (vpa: string) => {
    const next: ActivePaymentSelection = { type: "upi", upiVpa: vpa }
    setActivePayment(next)
    setCustomUpi(vpa)
    saveActivePaymentSelection(next)
    const updatedConfig: NPCIMandateConfig = {
      ...mandateConfig,
      active_payment_type: "upi",
      upi_vpa: vpa,
      selected_upi_id: vpa,
    }
    setMandateConfig(updatedConfig)
    saveStoredNPCIConfig(updatedConfig)
    if (onUpdateConfig) onUpdateConfig(updatedConfig)
    toast.success(`Selected UPI (${vpa}) as primary payment method`)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${label} to clipboard`)
  }

  const toggleMandateStatus = () => {
    const nextStatus: "active" | "paused" = mandateConfig.mandate_status === "active" ? "paused" : "active"
    const updated: NPCIMandateConfig = { ...mandateConfig, mandate_status: nextStatus }
    setMandateConfig(updated)
    saveStoredNPCIConfig(updated)
    toast.info(`Mandate is now ${nextStatus.toUpperCase()}`)
  }

  const revokeMandate = () => {
    if (window.confirm("Are you sure you want to revoke this NPCI AutoPay mandate? The AI Agent will no longer be able to place delegated orders.")) {
      const updated: NPCIMandateConfig = { ...mandateConfig, mandate_status: "revoked" }
      setMandateConfig(updated)
      saveStoredNPCIConfig(updated)
      toast.warning("NPCI AutoPay mandate revoked.")
    }
  }

  const reactivateMandate = () => {
    const updated: NPCIMandateConfig = {
      ...mandateConfig,
      mandate_status: "active",
      umn: `RAZENT${Math.floor(1000 + Math.random() * 9000)}MANDATE${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
    }
    setMandateConfig(updated)
    saveStoredNPCIConfig(updated)
    toast.success("New active NPCI AutoPay mandate generated.")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Wallet & Delegated AI Settings
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  NPCI Compliant
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage saved payment methods, delivery profile & autonomous AI spending caps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6 bg-muted/20 gap-1 overflow-x-auto text-sm">
          <button
            onClick={() => setActiveTab("mandate")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "mandate"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="w-4 h-4" />
            AutoPay Mandate
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "payment"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payment Methods
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            Account & Address
          </button>
          <button
            onClick={() => setActiveTab("protocol")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "protocol"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="w-4 h-4" />
            AP2 Protocol
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: AutoPay Mandate */}
          {activeTab === "mandate" && (
            <div className="space-y-5">
              {/* NPCI Notice */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">NPCI UPI AutoPay / e-Mandate Regulatory Framework</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Per NPCI & RBI circulars, pre-authorized AI delegated transactions up to <strong>₹15,000</strong> can be settled autonomously without recurring UPI PIN. Orders exceeding your delegated cap automatically trigger a step-up challenge. You can pause or revoke this mandate anytime.
                  </p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mandate Status</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        mandateConfig.mandate_status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : mandateConfig.mandate_status === "paused"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }`}
                    >
                      {mandateConfig.mandate_status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    UMN: {mandateConfig.umn}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {mandateConfig.mandate_status !== "revoked" ? (
                    <>
                      <button
                        type="button"
                        onClick={toggleMandateStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
                      >
                        {mandateConfig.mandate_status === "active" ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                            Pause
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Resume
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={revokeMandate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={reactivateMandate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Create New Mandate
                    </button>
                  )}
                </div>
              </div>

              {/* Spending Limit Slider */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">
                      Per-Order Autonomous Spending Cap
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Orders below this limit will be placed immediately by Razent AI without asking for PIN.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-primary">
                      ₹{mandateConfig.user_delegated_limit_rupees.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-muted-foreground block">Max: ₹15,000 (NPCI)</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="100"
                  max="15000"
                  step="100"
                  value={mandateConfig.user_delegated_limit_rupees}
                  onChange={(e) =>
                    setMandateConfig({
                      ...mandateConfig,
                      user_delegated_limit_rupees: Number(e.target.value),
                    })
                  }
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>₹100</span>
                  <span>₹2,500</span>
                  <span>₹7,500</span>
                  <span>₹15,000</span>
                </div>
              </div>

              {/* Pre-Debit Notification Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">24-Hour Pre-Debit Alert</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      RBI Mandatory
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send SMS and push notification 24 hours prior to scheduled recurring auto-debits.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={mandateConfig.pre_debit_notification}
                  onChange={(e) =>
                    setMandateConfig({
                      ...mandateConfig,
                      pre_debit_notification: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Payment Methods */}
          {activeTab === "payment" && (
            <div className="space-y-5">
              {/* Active Selection Banner */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    {activePayment.type === "card" ? (
                      <CreditCard className="w-5 h-5" />
                    ) : (
                      <Zap className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Active Payment Method for AI Orders
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {activePayment.type === "card"
                        ? (() => {
                            const c = savedCards.find((x) => x.id === activePayment.cardId)
                            return c
                              ? `${c.network} ${c.cardType} (${c.maskedNumber})`
                              : "Selected Card"
                          })()
                        : `UPI AutoPay: ${activePayment.upiVpa || mandateConfig.upi_vpa}`}
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Primary
                </span>
              </div>

              {/* Section 1: Test UPI Credentials */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-foreground">
                      UPI Test Credentials (NPCI Sandbox)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    Razorpay UPI
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  At Checkout or in AI Assistant, use test UPI IDs to verify instantaneous e-mandate success or simulated failure flows:
                </p>

                {/* Quick Test UPI Flow Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => selectUpi("success@razorpay")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      activePayment.type === "upi" && activePayment.upiVpa === "success@razorpay"
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border border-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      {activePayment.type === "upi" && activePayment.upiVpa === "success@razorpay" && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-foreground">success@razorpay</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                          Success Flow
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Simulates instantaneous AutoPay mandate & payment success.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectUpi("failure@razorpay")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      activePayment.type === "upi" && activePayment.upiVpa === "failure@razorpay"
                        ? "border-destructive bg-destructive/10 ring-1 ring-destructive"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border border-destructive flex items-center justify-center shrink-0 mt-0.5">
                      {activePayment.type === "upi" && activePayment.upiVpa === "failure@razorpay" && (
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-foreground">failure@razorpay</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-semibold">
                          Failure Flow
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Simulates bank decline, insufficient balance, or timeout.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Custom UPI Field */}
                <div className="pt-2 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Or specify a Custom UPI VPA:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customUpi}
                      onChange={(e) => setCustomUpi(e.target.value)}
                      placeholder="e.g. user@okhdfcbank"
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customUpi.trim()) selectUpi(customUpi.trim())
                      }}
                      className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold"
                    >
                      Use Custom
                    </button>
                  </div>
                </div>

                {/* Watch Out Notice */}
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-700 dark:text-amber-300">Watch Out!</span>
                    <span className="leading-relaxed">
                      In test mode, payment cancellation will result in a successful payment. Use live mode to test real payment cancellation on UPI.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Saved Test Cards (RBI Tokenized) */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Saved Test Cards (RBI Network Tokenized)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    CoF Sandbox
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose which card you want the AI assistant and checkout to charge. All cards are tokenized under RBI Card-on-File guidelines:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {savedCards.map((card) => {
                    const isSelected =
                      activePayment.type === "card" && activePayment.cardId === card.id
                    return (
                      <div
                        key={card.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                              {card.network}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted/60 text-muted-foreground">
                                {card.cardType} · {card.cardSubType}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="font-mono text-sm font-semibold tracking-wider text-foreground">
                              {card.cardNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(card.cardNumber.replace(/\s+/g, ""), "Card number")}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              title="Copy card number"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                            <span>Exp: {card.expiry}</span>
                            <span>CVV: {card.cvv}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                            {card.tokenReference}
                          </span>
                          <button
                            type="button"
                            onClick={() => selectCard(card)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-emerald-500 text-white shadow-xs"
                                : "bg-muted hover:bg-muted/80 text-foreground"
                            }`}
                          >
                            {isSelected ? "Active" : "Use this Card"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Security & Privacy Banner */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
                <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>RBI Compliance & Privacy:</strong> Full card numbers, CVVs, and UPI PINs are strictly isolated. The AI assistant receives only encrypted token references and executes orders strictly within your configured spend caps.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Profile & Address */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Mobile Phone</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Delivery Address (Quick Grocery Drop)</label>
                <textarea
                  rows={2}
                  value={profile.addressLine}
                  onChange={(e) => setProfile({ ...profile, addressLine: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">City & State</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">PIN Code</label>
                  <input
                    type="text"
                    value={profile.postalCode}
                    onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Protocol & Architecture */}
          {activeTab === "protocol" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Google AP2 (Agent Payments Protocol) & ACP Integration
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Razent implements Google's <strong>AP2 cryptographic mandate chain</strong>. This guarantees that AI shopping assistants and external agents (ChatGPT, Claude, Gemini) can never charge more than what you authorized.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/40 font-mono">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</span>
                    <span><strong>Intent Mandate:</strong> Customer sets spending limit (₹{mandateConfig.user_delegated_limit_rupees})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/40 font-mono">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</span>
                    <span><strong>Cart Mandate:</strong> Merchant signs items with SHA-256 cart hash</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/40 font-mono">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">3</span>
                    <span><strong>Payment Mandate:</strong> AutoPay executes settlement under NPCI limit</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border text-xs">
                <span className="text-muted-foreground">Universal A2A Discovery Manifest:</span>
                <a
                  href="/.well-known/agent.json"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-mono font-medium"
                >
                  /.well-known/agent.json
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md transition-all active:scale-[0.98]"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WalletSettingsModal
