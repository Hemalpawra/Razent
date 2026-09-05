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
import type { NPCIMandateConfig } from "@/lib/protocol/ap2Types"
import { toast } from "sonner"

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
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMandateConfig(getStoredNPCIConfig())
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
    saveStoredNPCIConfig(mandateConfig)
    try {
      localStorage.setItem("razent_customer_profile", JSON.stringify(profile))
    } catch {}
    if (onUpdateConfig) {
      onUpdateConfig(mandateConfig)
    }
    setIsSaved(true)
    toast.success("Wallet & NPCI AutoPay settings updated successfully.")
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 400)
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
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved UPI Virtual Payment Address (VPA)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mandateConfig.upi_vpa}
                    onChange={(e) =>
                      setMandateConfig({ ...mandateConfig, upi_vpa: e.target.value })
                    }
                    placeholder="e.g. yourname@okhdfcbank"
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This UPI ID will be charged for AI-ordered grocery deliveries via UPI AutoPay.
                </p>
              </div>

              {/* Saved Tokenized Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">HDFC Bank RuPay Debit Card</p>
                      <p className="text-xs text-muted-foreground font-mono">•••• •••• •••• 4242</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                    Tokenized
                  </span>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border pt-2 flex justify-between">
                  <span>Network: RuPay Global</span>
                  <span>Expires: 08/29</span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Razorpay & RBI tokenization active. Your full card numbers, CVV, and UPI PIN are never accessible to Razent AI or any model.
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
