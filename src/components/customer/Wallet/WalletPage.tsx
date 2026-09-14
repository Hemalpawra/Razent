/**
 * WalletPage - Customer Wallet, Delivery Address & Autonomous AI Agent Authorization
 * Accessible at /wallet
 *
 * Implements:
 * 1. Customer Authentication via Clerk
 * 2. Razent Wallet Balance & Instant Top-Up
 * 3. Default Delivery Address Management
 * 4. Autonomous AI Purchasing Switch (ON / OFF)
 * 5. Auto-Spend Limit with strict NPCI ₹15,000 regulatory e-Mandate cap
 * 6. MCP Agent Passkey (Token generation, copyable snippets for ChatGPT, Claude, Gemini)
 * 7. Balise UX Writing guidelines for all status and recovery messaging
 */

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useCustomerWallet } from "@/state/useCustomerWallet"
import { formatPrice } from "@/lib/types/product"
import { NPCI_TRANSACTION_LIMIT_PAISE } from "@/lib/types/wallet"
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  CreditCard,
  Key,
  Lock,
  MapPin,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sliders,
  ShoppingCart,
  Shield,
  Wallet as WalletIcon,
  UserCheck,
  AlertCircle,
  LogIn,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const SPEND_LIMIT_PRESETS = [
  { label: "₹500", value: 50000 },
  { label: "₹1,000", value: 100000 },
  { label: "₹2,000", value: 200000, recommended: true, note: "Recommended" },
  { label: "₹5,000", value: 500000 },
  { label: "₹10,000", value: 1000000 },
  { label: "₹15,000", value: 1500000, note: "NPCI Max Cap" },
]

const TOP_UP_PRESETS = [
  { label: "+₹500", value: 50000 },
  { label: "+₹1,000", value: 100000 },
  { label: "+₹2,000", value: 200000 },
  { label: "+₹5,000", value: 500000 },
]

export default function WalletPage() {
  const navigate = useNavigate()
  const {
    wallet,
    isLoading,
    isSignedIn,
    topUp,
    updateSpendLimit,
    toggleAIPurchasing,
    updateAddress,
    regenerateToken,
  } = useCustomerWallet()

  const [customLimit, setCustomLimit] = useState("")
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)

  const baseMcpUrl = "https://razent.vercel.app/mcp"
  const remoteMcpUrl = wallet?.agent_auth_token
    ? `${baseMcpUrl}?token=${wallet.agent_auth_token}`
    : baseMcpUrl

  const handleCopyBaseUrl = () => {
    navigator.clipboard.writeText(baseMcpUrl)
    setCopiedBaseUrl(true)
    toast.success("Standard MCP URL copied!")
    setTimeout(() => setCopiedBaseUrl(false), 2500)
  }

  const handleCopyUrl = () => {
    if (!wallet?.agent_auth_token) return
    navigator.clipboard.writeText(remoteMcpUrl)
    setCopiedUrl(true)
    toast.success("Authenticated Remote MCP URL copied! Paste into Claude or ChatGPT.")
    setTimeout(() => setCopiedUrl(false), 2500)
  }

  // Address form state
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [line1, setLine1] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("Karnataka")
  const [pincode, setPincode] = useState("")

  // Sync address form when wallet loads
  useEffect(() => {
    if (wallet?.default_address) {
      const addr = wallet.default_address
      setFullName(addr.full_name || wallet.customer_name || "")
      setPhone(addr.phone || wallet.customer_phone || "")
      setLine1(addr.line1 || "")
      setCity(addr.city || "")
      setState(addr.state || "Karnataka")
      setPincode(addr.pincode || "")
    }
  }, [wallet])

  const handleCopyToken = () => {
    if (!wallet?.agent_auth_token) return
    navigator.clipboard.writeText(wallet.agent_auth_token)
    setCopiedToken(true)
    toast.success("Agent Passkey copied to clipboard")
    setTimeout(() => setCopiedToken(false), 2500)
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!line1.trim() || !city.trim() || !pincode.trim() || !phone.trim()) {
      toast.error("Please fill in all address fields (address line, city, pincode, phone).")
      return
    }
    await updateAddress({
      full_name: fullName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country: "India",
    })
    setIsEditingAddress(false)
  }

  const handleSetCustomLimit = async () => {
    const num = parseFloat(customLimit)
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount in ₹")
      return
    }
    const paise = Math.round(num * 100)
    if (paise > NPCI_TRANSACTION_LIMIT_PAISE) {
      toast.error(`Limit cannot exceed NPCI regulatory ceiling of ₹${NPCI_TRANSACTION_LIMIT_PAISE / 100}`)
      return
    }
    await updateSpendLimit(paise)
    setCustomLimit("")
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
                  navigate("/")
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
                Autonomous AI Purchasing, Spend Controls & NPCI Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] hidden sm:inline-flex border-border bg-muted/50 gap-1"
            >
              <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
              NPCI e-Mandate Compliant
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-6">
        {/* UNAUTHENTICATED NOTICE */}
        {!isSignedIn && (
          <Card className="border-amber-500/40 bg-amber-500/5 shadow-xs">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Sign In to Authorize AI Purchases</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your AI assistants (ChatGPT, Claude, Gemini, and in-app assistant) require an authenticated customer account, saved delivery address, and configured spend limits to place orders.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-2 shrink-0 font-semibold text-xs"
                onClick={() => navigate("/login?redirect_url=/wallet")}
              >
                <LogIn className="size-4" />
                <span>Sign In / Register</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 1. WALLET BALANCE & INSTANT TOP-UP */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <WalletIcon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Razent Wallet Balance</CardTitle>
                  <CardDescription className="text-xs">
                    Pre-authorized customer funds for autonomous AI agent ordering and 1-click checkout.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {formatPrice(wallet?.wallet_balance_paise || 0)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">available</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
              <div className="text-xs">
                <p className="font-semibold text-foreground">Add Money to Wallet</p>
                <p className="text-[11px] text-muted-foreground">
                  Instant balance top-up using test payment rails.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {TOP_UP_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold hover:border-primary"
                    disabled={!isSignedIn}
                    onClick={() => topUp(preset.value)}
                  >
                    <PlusCircle className="size-3.5 mr-1 text-primary" />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. AUTONOMOUS PURCHASING TOGGLE */}
        <Card
          className={cn(
            "border transition-all shadow-sm",
            wallet?.ai_purchases_enabled
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
                    wallet?.ai_purchases_enabled
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {wallet?.ai_purchases_enabled ? (
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
                    {wallet?.ai_purchases_enabled ? (
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
                    Control whether connected MCP agents and the in-app AI assistant have permission to place confirmed orders.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                <Switch
                  id="agent-purchase-toggle"
                  disabled={!isSignedIn}
                  checked={wallet?.ai_purchases_enabled ?? false}
                  onCheckedChange={toggleAIPurchasing}
                  aria-label="Toggle autonomous agent purchases"
                />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {wallet?.ai_purchases_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 text-xs">
            <div
              className={cn(
                "p-3 rounded-xl border flex flex-col gap-1.5",
                wallet?.ai_purchases_enabled
                  ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                  : "bg-destructive/5 border-destructive/20 text-foreground"
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-[11px]">
                {wallet?.ai_purchases_enabled ? (
                  <>
                    <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Guardrail Active: Autonomous Order Placement Allowed within Limit</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-3.5 text-destructive" />
                    <span>Guardrail Enforced: Autonomous Order Placement Strictly Blocked</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {wallet?.ai_purchases_enabled
                  ? "When enabled, your connected MCP assistants (ChatGPT, Claude, Gemini) and the in-app assistant can autonomously settle orders up to your spend limit without manual checkout links."
                  : "When disabled, any attempt by an AI agent to place an order is blocked. The assistant will return a clear message with a manual checkout link."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. AI SPEND LIMIT & NPCI CEILING */}
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
                      Autonomous Spend Limit & Fund Cap
                    </CardTitle>
                    <Badge variant="secondary" className="font-semibold text-[11px] text-primary bg-primary/10">
                      Cap: {formatPrice(wallet?.spend_limit_paise || 0)}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Maximum order value an AI Agent can execute automatically. Orders above this require manual checkout or 2FA step-up.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-3.5 text-xs">
            {/* Presets */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Limit Presets (Max ₹15,000 per NPCI Framework)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {SPEND_LIMIT_PRESETS.map((preset) => {
                  const isSelected = wallet?.spend_limit_paise === preset.value
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={!isSignedIn}
                      onClick={() => updateSpendLimit(preset.value)}
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
                  Enter any custom limit up to ₹15,000 (NPCI regulatory ceiling).
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
                    max="15000"
                    step="100"
                    disabled={!isSignedIn}
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    placeholder={((wallet?.spend_limit_paise || 200000) / 100).toString()}
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
                  disabled={!isSignedIn}
                  className="h-8 text-xs font-medium shrink-0"
                  onClick={handleSetCustomLimit}
                >
                  Save Limit
                </Button>
              </div>
            </div>

            {/* NPCI Notice */}
            <div className="p-2.5 rounded-lg border border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Orders ≤ {formatPrice(wallet?.spend_limit_paise || 0)}: Instant Wallet Auto-Debit</span>
              <span className="text-foreground font-medium">Orders &gt; {formatPrice(wallet?.spend_limit_paise || 0)}: Manual Checkout Link</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. DEFAULT DELIVERY ADDRESS */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Default Delivery Address</CardTitle>
                  <CardDescription className="text-xs">
                    Autonomous orders are automatically dispatched to this location without asking on every turn.
                  </CardDescription>
                </div>
              </div>

              {isSignedIn && !isEditingAddress && wallet?.default_address?.line1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsEditingAddress(true)}
                >
                  Edit Address
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0 text-xs">
            {!isEditingAddress && wallet?.default_address?.line1 ? (
              <div className="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>{wallet.default_address.full_name || "Recipient"}</span>
                  <span className="text-muted-foreground text-[11px] font-normal">
                    {wallet.default_address.phone}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {wallet.default_address.line1}, {wallet.default_address.city} - {wallet.default_address.pincode},{" "}
                  {wallet.default_address.state || "Karnataka"}, India
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveAddress} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Full Name</Label>
                    <Input
                      required
                      placeholder="Recipient Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Phone Number</Label>
                    <Input
                      required
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px]">Address Line (House / Flat, Street)</Label>
                  <Input
                    required
                    placeholder="e.g. Flat 402, Greenfield Heights, 12th Main"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px]">City</Label>
                    <Input
                      required
                      placeholder="e.g. Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">State</Label>
                    <Input
                      required
                      placeholder="e.g. Karnataka"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">PIN Code</Label>
                    <Input
                      required
                      placeholder="e.g. 560038"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {wallet?.default_address?.line1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setIsEditingAddress(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" size="sm" className="h-8 text-xs font-semibold" disabled={!isSignedIn}>
                    Save Default Address
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* 5. MCP AGENT AUTHORIZATION PASSKEY */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Key className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Connected MCP Agent Passkey</CardTitle>
                  <CardDescription className="text-xs">
                    Authorize ChatGPT, Claude Desktop, or Gemini to act on your behalf using your personal delegation key.
                  </CardDescription>
                </div>
              </div>

              {isSignedIn && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={regenerateToken}
                >
                  <RefreshCw className="size-3" />
                  Regenerate Key
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-3.5 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Connect your Razent Wallet to Claude Desktop, ChatGPT, or Cursor via Model Context Protocol (MCP).
              Your AI assistant will be automatically authenticated, able to inspect your wallet balance, and will <strong>always ask for your confirmation</strong> before finalizing any order.
            </p>

            {/* Remote MCP URLs */}
            <div className="space-y-2.5">
              {/* Remote MCP URL with Token (Recommended) */}
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                      Recommended
                    </Badge>
                    <span className="text-[11px] font-semibold text-foreground">
                      Authenticated MCP URL (with Passkey)
                    </span>
                  </div>
                  <code className="text-xs font-mono font-medium text-foreground/90 truncate block select-all bg-background/60 px-2 py-1 rounded border border-border/60">
                    {remoteMcpUrl}
                  </code>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Add as an SSE/HTTP MCP server in Claude Desktop, ChatGPT, or Cursor. Carries your passkey for autonomous wallet checks and purchasing.
                  </p>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs gap-1.5 shrink-0 w-full sm:w-auto"
                  disabled={!isSignedIn || !wallet?.agent_auth_token}
                  onClick={handleCopyUrl}
                >
                  {copiedUrl ? <Check className="size-3.5 text-white" /> : <Copy className="size-3.5" />}
                  <span>{copiedUrl ? "Copied URL" : "Copy Authenticated URL"}</span>
                </Button>
              </div>

              {/* Standard MCP URL without Token */}
              <div className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Standard
                    </Badge>
                    <span className="text-[11px] font-semibold text-foreground">
                      Standard MCP URL (without Token)
                    </span>
                  </div>
                  <code className="text-xs font-mono font-medium text-foreground/80 truncate block select-all bg-background/60 px-2 py-1 rounded border border-border/60">
                    {baseMcpUrl}
                  </code>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Base endpoint for catalog discovery and manual checkout links. Passkey can be passed in prompts or environment variables.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 shrink-0 w-full sm:w-auto"
                  onClick={handleCopyBaseUrl}
                >
                  {copiedBaseUrl ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copiedBaseUrl ? "Copied URL" : "Copy Base URL"}</span>
                </Button>
              </div>
            </div>

            {/* Passkey & Stdio Config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex flex-col justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                    Your Personal Agent Passkey
                  </span>
                  <code className="text-xs font-mono font-bold text-primary truncate block select-all">
                    {wallet?.agent_auth_token || "rz_agt_live_..."}
                  </code>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Pass this token directly to the assistant in chat if using an unauthenticated connector.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 w-full mt-1"
                  disabled={!isSignedIn || !wallet?.agent_auth_token}
                  onClick={handleCopyToken}
                >
                  {copiedToken ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedToken ? "Copied Passkey" : "Copy Passkey"}</span>
                </Button>
              </div>

              {/* MCP Local Config Example */}
              <div className="rounded-xl border border-border/70 bg-zinc-950 p-3 text-zinc-300 font-mono text-[10px] overflow-x-auto">
                <p className="text-[9px] text-zinc-500 uppercase font-sans font-bold tracking-wider mb-1">
                  Local MCP Config (claude_desktop_config.json)
                </p>
                <pre className="text-[10px] leading-relaxed">
{`{
  "mcpServers": {
    "razent": {
      "command": "node",
      "args": ["scripts/mcp-server.mjs"],
      "env": {
        "RAZENT_CUSTOMER_TOKEN": "${wallet?.agent_auth_token ? wallet.agent_auth_token.slice(0, 14) + "..." : "YOUR_PASSKEY"}"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>

            {/* Two-Choice Protocol Guarantee Notice */}
            <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-start gap-2 text-[11px] text-muted-foreground">
              <Sparkles className="size-3.5 text-primary mt-0.5 shrink-0" />
              <span>
                <strong>Mandatory Confirmation Protocol</strong>: Even with full wallet access, our server enforces that the AI assistant must always ask for your explicit consent before debiting funds, offering you the choice between autonomous wallet payment or a manual checkout link.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 6. NPCI REGULATORY COMPLIANCE BANNER */}
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                NPCI & RBI Autonomous Commerce Guardrails
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Compliant with the National Payments Corporation of India (NPCI) circular for automated e-mandates.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong>₹15,000 Transaction Ceiling</strong>: Automated purchases strictly cannot exceed ₹15,000 without 2FA step-up.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong>Instant Revocation</strong>: Toggling AI Agent Purchasing OFF instantly disables all autonomous ordering.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong>Full Auditability</strong>: Every agent authorization and wallet debit is cryptographically recorded in the transaction audit trail.
              </span>
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
            <span>Open In-App Shopping Assistant</span>
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
