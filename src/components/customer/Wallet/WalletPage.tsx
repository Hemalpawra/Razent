/**
 * WalletPage - Customer Wallet & Autonomous AI Purchasing Settings
 * Accessible at /wallet
 * 
 * Features:
 * 1. Autonomous Agent Purchase Permission (Toggle ON / OFF)
 *    - When ON: AI Assistant can draft and confirm orders within limits.
 *    - When OFF: AI ordering is strictly blocked across the entire app.
 * 2. Auto-Spend Limit & Fund Cap (Quick Presets + Custom Limit)
 * 3. Secure Razorpay Payment Gateway Overview (Zero raw credential storage)
 * 4. RBI & NPCI Autonomous Agent Commerce Guardrails
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useAgentPurchase } from "@/state/useAgentPurchase"
import { formatPrice } from "@/lib/types/product"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Bot,
  Check,
  CreditCard,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Building2,
  Banknote,
  Sliders,
  ShoppingCart,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const SPEND_LIMIT_PRESETS = [
  { label: "₹500", value: 50000 },
  { label: "₹1,000", value: 100000 },
  { label: "₹2,000", value: 200000, recommended: true, note: "NPCI Cap" },
  { label: "₹5,000", value: 500000 },
  { label: "₹10,000", value: 1000000 },
]

export default function WalletPage() {
  const navigate = useNavigate()
  const { agentPurchaseEnabled, spendLimitPaise, setSpendLimitPaise, toggle } = useAgentPurchase()
  const [customLimit, setCustomLimit] = useState("")

  const handleSetCustomLimit = () => {
    const num = parseFloat(customLimit)
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount in ₹")
      return
    }
    const paise = Math.round(num * 100)
    setSpendLimitPaise(paise)
    setCustomLimit("")
    toast.success(`AI Assistant spend limit set to ${formatPrice(paise)}`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1)
                } else {
                  navigate("/assistant")
                }
              }}
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold leading-tight flex items-center gap-2">
                Wallet & Agent Authorization
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Autonomous AI Purchasing & Spend Controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] hidden sm:inline-flex border-border bg-muted"
            >
              RBI & NPCI Verified
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-6">
        {/* HERO CARD: Agent Purchases Toggle */}
        <Card
          className={cn(
            "border transition-all shadow-sm",
            agentPurchaseEnabled
              ? "border-emerald-500/40 bg-card"
              : "border-destructive/40 bg-card"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0",
                    agentPurchaseEnabled
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {agentPurchaseEnabled ? (
                    <ShieldCheck className="size-6" />
                  ) : (
                    <ShieldAlert className="size-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold">
                      Autonomous AI Purchasing Permission
                    </CardTitle>
                    {agentPurchaseEnabled ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 gap-1 font-semibold"
                      >
                        <Check className="size-3" /> ON · Agent Can Place Orders
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] border-destructive/40 text-destructive bg-destructive/10 gap-1 font-semibold"
                      >
                        <Lock className="size-3" /> OFF · Ordering Blocked
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Control whether the AI Shopping Assistant has permission to autonomously confirm and execute orders.
                  </CardDescription>
                </div>
              </div>

              {/* The Toggle */}
              <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                <Switch
                  id="agent-purchase-toggle"
                  checked={agentPurchaseEnabled}
                  onCheckedChange={async () => {
                    const next = await toggle()
                    toast(
                      next
                        ? "Agent purchases enabled: The AI assistant is now authorized to place orders."
                        : "Agent purchases disabled: The AI assistant is strictly blocked from placing orders."
                    )
                  }}
                  aria-label="Toggle autonomous agent purchases"
                />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {agentPurchaseEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 text-xs">
            <div
              className={cn(
                "p-3 rounded-xl border flex flex-col gap-1.5",
                agentPurchaseEnabled
                  ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                  : "bg-destructive/5 border-destructive/20 text-foreground"
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-[11px]">
                {agentPurchaseEnabled ? (
                  <>
                    <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Active Guardrail: Automated Order Execution Allowed</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-3.5 text-destructive" />
                    <span>Enforced Guardrail: Automated Order Execution Blocked</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {agentPurchaseEnabled
                  ? "When enabled, you can ask the AI Assistant to 'place order' or 'buy this'. The assistant will prepare items and allow instant 1-click confirmation using your saved credentials."
                  : "When disabled, the AI Assistant is strictly blocked from creating or placing orders. All checkout attempts within the AI Assistant will show a lock screen until you re-enable this toggle."}
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-0 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Enforced via RBI multi-factor guardrails</span>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => navigate("/assistant")}
            >
              Test in Assistant →
            </Button>
          </CardFooter>
        </Card>

        {/* FUND SETTINGS CARD: AI Assistant Auto-Spend Limit */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sliders className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold">
                      AI Assistant Auto-Spend Limit & Fund Cap
                    </CardTitle>
                    <Badge variant="secondary" className="font-semibold text-[11px] text-primary bg-primary/10">
                      Cap: {formatPrice(spendLimitPaise)}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Maximum order value the AI Shopping Assistant can automatically approve and settle. Orders above this threshold require manual 2FA / OTP step-up.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-3.5 text-xs">
            {/* Presets */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Limit Presets
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SPEND_LIMIT_PRESETS.map((preset) => {
                  const isSelected = spendLimitPaise === preset.value
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setSpendLimitPaise(preset.value)
                        toast.success(`AI spend limit set to ${preset.label}`)
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs ring-1 ring-primary/40"
                          : "border-border/70 bg-card hover:border-border hover:bg-accent/30 text-foreground"
                      )}
                    >
                      <span className="text-sm font-semibold">{preset.label}</span>
                      {preset.note && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {preset.note}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Limit Input */}
            <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Custom Spending Limit</p>
                <p className="text-[11px] text-muted-foreground">
                  Set any maximum spend ceiling in INR for autonomous shopping turns.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step="50"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    placeholder={(spendLimitPaise / 100).toString()}
                    className="h-8 pl-6 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSetCustomLimit()
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium shrink-0"
                  onClick={handleSetCustomLimit}
                >
                  Save Limit
                </Button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Orders ≤ {formatPrice(spendLimitPaise)}: Instant Auto-Debit</span>
              <span className="text-foreground font-medium">Orders &gt; {formatPrice(spendLimitPaise)}: Human Approval Required</span>
            </div>
          </CardContent>
        </Card>

        {/* PAYMENT EXPERIENCE CARD: Direct Razorpay Modal Checkout */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Direct Payment via Razorpay Gateway
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose any payment method on-demand during checkout
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                PCI-DSS Level 1
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Razent does not store your credit/debit card numbers or bank credentials. Whenever an order is initiated, the official Razorpay payment popup opens where you can choose your preferred method and enter details manually.
            </p>

            {/* Methods Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border/70 bg-card flex items-start gap-2.5">
                <Smartphone className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground text-xs block">UPI Apps & VPA</span>
                  <span className="text-[11px] text-muted-foreground">
                    Google Pay, PhonePe, Paytm, BHIM, or enter any personal UPI ID manually.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card flex items-start gap-2.5">
                <CreditCard className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground text-xs block">Credit & Debit Cards</span>
                  <span className="text-[11px] text-muted-foreground">
                    Visa, Mastercard, RuPay with zero server credential retention.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card flex items-start gap-2.5">
                <Building2 className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground text-xs block">NetBanking & Wallets</span>
                  <span className="text-[11px] text-muted-foreground">
                    Direct netbanking across 50+ banks, plus Mobikwik and Paytm wallets.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card flex items-start gap-2.5">
                <Banknote className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground text-xs block">Cash on Delivery</span>
                  <span className="text-[11px] text-muted-foreground">
                    Optional doorstep settlement via cash or delivery partner UPI QR.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COMPLIANCE & SAFETY CARD */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Regulatory Guardrails & Compliance
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Operating under strict Reserve Bank of India (RBI) and NPCI frameworks for autonomous agent commerce.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/70 bg-muted/20">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">NPCI AutoPay Ceiling (₹15,000)</p>
                <p className="text-[11px] text-muted-foreground">
                  Transactions exceeding ₹15,000 strictly require step-up Additional Factor of Authentication (AFA) via OTP.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/70 bg-muted/20">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Card-on-File Tokenization (COFT)</p>
                <p className="text-[11px] text-muted-foreground">
                  Raw card numbers are never exposed to language model prompts. All transactions leverage standard certified tokenization.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/70 bg-muted/20">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Human-in-the-Loop Override</p>
                <p className="text-[11px] text-muted-foreground">
                  You maintain absolute control over the Agent Purchase switch. Toggling it off immediately disallows all automated transactions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation Shortcuts */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 pb-6">
          <Button
            className="w-full sm:flex-1 gap-2 font-semibold text-xs h-9"
            onClick={() => navigate("/assistant")}
          >
            <Bot className="size-4" />
            <span>Open AI Assistant</span>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:flex-1 gap-2 font-medium text-xs h-9"
            onClick={() => navigate("/")}
          >
            <ShoppingCart className="size-4" />
            <span>Browse Storefront</span>
          </Button>
        </div>
      </main>
    </div>
  )
}
