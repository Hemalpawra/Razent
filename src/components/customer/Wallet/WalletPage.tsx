/**
 * WalletPage - Dedicated Customer Wallet & AI Payment Credentials Screen
 * Accessible at /wallet
 * 
 * Features:
 * 1. Autonomous Agent Purchase Permission (Toggle ON / OFF)
 *    - When ON: Agent can place orders.
 *    - When OFF: Agent ordering is strictly blocked across the entire app.
 * 2. Complete Tokenized Test Cards (Visa, Mastercard, RuPay, Amex, Diners)
 *    - Full credentials, copy-to-clipboard, token references.
 * 3. Test UPI Credentials (success@razorpay, failure@razorpay)
 * 4. NetBanking & Cash on Delivery configuration
 * 5. NPCI & RBI Regulatory Guardrails
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useAgentPurchase } from "@/state/useAgentPurchase"
import {
  DEFAULT_TEST_CARDS,
  DEFAULT_TEST_UPI_METHODS,
  getActivePaymentSelection,
  saveActivePaymentSelection,
  type ActivePaymentSelection,
} from "@/lib/protocol/regulatoryWrapper"
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Building2,
  Info,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function WalletPage() {
  const navigate = useNavigate()
  const { agentPurchaseEnabled, toggle } = useAgentPurchase()
  const [activePayment, setActivePayment] = useState<ActivePaymentSelection>(() =>
    getActivePaymentSelection()
  )
  const [revealedCvvs, setRevealedCvvs] = useState<Record<string, boolean>>({})

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const toggleCvv = (cardId: string) => {
    setRevealedCvvs((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }))
  }

  const handleSelectPayment = (sel: ActivePaymentSelection) => {
    setActivePayment(sel)
    saveActivePaymentSelection(sel)
    toast.success(
      sel.type === "card"
        ? "Card set as primary for AI assistant"
        : "UPI set as primary for AI assistant"
    )
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
                Wallet & Payment Credentials
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Razorpay Test Sandbox · Autonomous AI Purchasing Settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] hidden sm:inline-flex border-border bg-muted"
            >
              Sandbox Mode
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

        {/* Credentials Tabs */}
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="cards" className="gap-1.5">
              <CreditCard className="size-3.5" />
              Cards ({DEFAULT_TEST_CARDS.length})
            </TabsTrigger>
            <TabsTrigger value="upi" className="gap-1.5">
              <Smartphone className="size-3.5" />
              UPI AutoPay ({DEFAULT_TEST_UPI_METHODS.length})
            </TabsTrigger>
            <TabsTrigger value="netbanking" className="gap-1.5">
              <Building2 className="size-3.5" />
              NetBanking
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5">
              <Info className="size-3.5" />
              Rules & Guardrails
            </TabsTrigger>
          </TabsList>

          {/* CARDS TAB */}
          <TabsContent value="cards" className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">RBI Tokenized Test Cards</h3>
                <p className="text-xs text-muted-foreground">
                  Sandbox cards compliant with RBI Card-on-File Tokenization (COFT). Click to copy numbers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {DEFAULT_TEST_CARDS.map((card) => {
                const isSelected =
                  activePayment.type === "card" && activePayment.cardId === card.id
                const isCvvRevealed = Boolean(revealedCvvs[card.id])

                return (
                  <div
                    key={card.id}
                    className={cn(
                      "flex flex-col justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-2xs transition-all relative",
                      isSelected
                        ? "border-primary ring-1 ring-primary/40 bg-accent/20"
                        : "border-border/70 hover:border-border"
                    )}
                  >
                    {/* Top Row: Network & Type */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-semibold text-[10px]">
                          {card.network}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {card.cardType} · {card.cardSubType}
                        </span>
                      </div>
                      {isSelected ? (
                        <Badge
                          variant="outline"
                          className="border-primary text-primary text-[10px] gap-1"
                        >
                          <Check className="size-2.5" /> Default for AI
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectPayment({ type: "card", cardId: card.id })
                          }
                          className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    {/* Middle: Card Number */}
                    <div className="my-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm tracking-wider font-semibold">
                          {card.cardNumber}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => handleCopy(card.cardNumber, "Card number")}
                          title="Copy card number"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                        Token: {card.tokenReference}
                      </p>
                    </div>

                    {/* Bottom: Expiry & CVV */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Expires</span>
                        <span className="font-mono font-medium">{card.expiry}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div>
                          <span className="text-[10px] text-muted-foreground block text-right">
                            CVV
                          </span>
                          <span className="font-mono font-medium">
                            {isCvvRevealed ? card.cvv : "•••"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleCvv(card.id)}
                          title={isCvvRevealed ? "Hide CVV" : "Show CVV"}
                        >
                          {isCvvRevealed ? (
                            <EyeOff className="size-3" />
                          ) : (
                            <Eye className="size-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* UPI TAB */}
          <TabsContent value="upi" className="mt-4 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold">NPCI UPI Test Handles</h3>
              <p className="text-xs text-muted-foreground">
                Simulate UPI AutoPay mandates and instantaneous payment clearance in the sandbox.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {DEFAULT_TEST_UPI_METHODS.map((upi) => {
                const isSelected =
                  activePayment.type === "upi" && activePayment.upiVpa === upi.vpa

                return (
                  <div
                    key={upi.id}
                    className={cn(
                      "flex flex-col justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-2xs transition-all",
                      isSelected
                        ? "border-primary ring-1 ring-primary/40 bg-accent/20"
                        : "border-border/70 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          upi.flow === "success"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-destructive/40 text-destructive bg-destructive/10"
                        )}
                      >
                        {upi.flow === "success" ? "Simulates Success" : "Simulates Failure"}
                      </Badge>
                      {isSelected ? (
                        <Badge
                          variant="outline"
                          className="border-primary text-primary text-[10px] gap-1"
                        >
                          <Check className="size-2.5" /> Default for AI
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectPayment({ type: "upi", upiVpa: upi.vpa })
                          }
                          className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    <div className="my-3">
                      <p className="text-xs font-semibold text-foreground">{upi.label}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="font-mono text-sm font-semibold text-primary">
                          {upi.vpa}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => handleCopy(upi.vpa, "UPI VPA")}
                          title="Copy VPA"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {upi.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* NETBANKING TAB */}
          <TabsContent value="netbanking" className="mt-4 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold">NetBanking Sandbox</h3>
              <p className="text-xs text-muted-foreground">
                Supported sandbox banks for direct account debit testing.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "HDFC Bank", code: "HDFC", status: "Operational" },
                { name: "ICICI Bank", code: "ICIC", status: "Operational" },
                { name: "State Bank of India", code: "SBIN", status: "Operational" },
                { name: "Axis Bank", code: "UTIB", status: "Operational" },
              ].map((bank) => (
                <div
                  key={bank.code}
                  className="p-3.5 rounded-xl border border-border/70 bg-card flex flex-col gap-1.5"
                >
                  <Building2 className="size-5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">{bank.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">Code: {bank.code}</p>
                  <Badge variant="secondary" className="text-[9px] w-fit mt-1">
                    {bank.status}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* RULES TAB */}
          <TabsContent value="rules" className="mt-4 flex flex-col gap-3">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Regulatory Compliance & Guardrails
                </CardTitle>
                <CardDescription className="text-xs">
                  Razent operates under strict RBI (Reserve Bank of India) and NPCI frameworks for autonomous agent commerce.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/30">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">NPCI AutoPay Ceiling (₹15,000)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Per RBI guidelines, transactions exceeding ₹15,000 strictly require step-up AFA (Additional Factor of Authentication) via OTP.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/30">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Card-on-File Tokenization (COFT)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Raw credit/debit card numbers are never stored on Razent servers or exposed to language model prompts. All transactions leverage cryptographic RBI tokens.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/30">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Human-in-the-Loop Safeguard</p>
                    <p className="text-[11px] text-muted-foreground">
                      The customer retains complete authority over the Agent Purchase toggle at all times. When disabled, the AI cannot initiate or confirm orders under any circumstance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
