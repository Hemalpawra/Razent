import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  PackageCheck,
  CreditCard,
  MapPin,
  User,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
  Wallet,
  LogIn,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import type { Product } from "@/lib/types/product"
import { formatPrice } from "@/lib/types/product"
import { executeAutonomousWalletPurchase } from "@/lib/api/client"
import { useCart } from "@/state/useCart"
import { useCustomerWallet } from "@/state/useCustomerWallet"
import { useUser } from "@clerk/react"
import { toast } from "sonner"
import type { Order } from "@/lib/types/order"
import { NPCI_TRANSACTION_LIMIT_PAISE } from "@/lib/types/wallet"

interface AICheckoutConfirmationCardProps {
  products: Product[]
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  savedAddress?: any
  onOrderPlaced?: (orderId: string) => void
  onOpenTrackOrder?: (orderId: string) => void
}

export function AICheckoutConfirmationCard({
  products,
  customerName,
  customerEmail,
  customerPhone,
  savedAddress,
  onOrderPlaced,
  onOpenTrackOrder,
}: AICheckoutConfirmationCardProps) {
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const { wallet, isLoading: isWalletLoading } = useCustomerWallet()
  const clearCart = useCart((s) => s.clearCart)

  const [isPlacing, setIsPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [placedOrderDetails, setPlacedOrderDetails] = useState<any>(null)

  const [name, setName] = useState(customerName || "")
  const [email, setEmail] = useState(customerEmail || "")
  const [phone, setPhone] = useState(customerPhone || "")
  const [addressLine, setAddressLine] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [isEditingAddress, setIsEditingAddress] = useState(false)

  // Recovery error state for Balise UX
  const [recoveryError, setRecoveryError] = useState<{
    status: string
    title: string
    description: string
    shortfall?: number
  } | null>(null)

  // Sync saved address from wallet or props
  useEffect(() => {
    const addr = wallet?.default_address || savedAddress || {}
    if (addr.line1) setAddressLine(addr.line1)
    if (addr.city) setCity(addr.city)
    if (addr.pincode || addr.postalCode) setPostalCode(addr.pincode || addr.postalCode)
    if (wallet?.customer_name || customerName) setName(wallet?.customer_name || customerName || "")
    if (wallet?.customer_phone || customerPhone) setPhone(wallet?.customer_phone || customerPhone || "")
    if (wallet?.customer_email || customerEmail) setEmail(wallet?.customer_email || customerEmail || "")
  }, [wallet, savedAddress, customerName, customerPhone, customerEmail])

  const items = products.length > 0 ? products : []
  const subtotalPaise = items.reduce((acc, p) => acc + (p.price_paise || 0), 0)
  const deliveryPaise = 0
  const totalPaise = subtotalPaise + deliveryPaise

  const handleConfirmOrder = async () => {
    setRecoveryError(null)

    if (!isSignedIn || !user) {
      toast.error("Authentication required", {
        description: "Please sign in to your Razent account to place orders.",
      })
      navigate("/login?redirect_url=/assistant")
      return
    }

    if (!wallet?.ai_purchases_enabled) {
      setRecoveryError({
        status: "ai_disabled",
        title: "Autonomous Agent Purchases Disabled",
        description: "Ordering is turned off in your Razent Wallet settings. Enable agent purchasing or pay at manual checkout.",
      })
      return
    }

    if (items.length === 0) {
      toast.error("No items selected")
      return
    }

    if (!addressLine.trim() || !city.trim() || !postalCode.trim() || !phone.trim()) {
      setIsEditingAddress(true)
      toast.error("Please provide your delivery address and phone number.")
      return
    }

    // NPCI Regulatory Cap Check (₹15,000)
    if (totalPaise > NPCI_TRANSACTION_LIMIT_PAISE) {
      setRecoveryError({
        status: "npci_limit_exceeded",
        title: "NPCI Regulatory Limit Exceeded (₹15,000 Cap)",
        description: `Order total is ${formatPrice(totalPaise)}, which exceeds the NPCI autonomous transaction limit of ₹15,000. Regulatory guidelines mandate two-factor authentication for this purchase.`,
      })
      return
    }

    // Spend Limit Check
    if (totalPaise > (wallet?.spend_limit_paise || 200000)) {
      setRecoveryError({
        status: "limit_exceeded",
        title: "Agent Spend Limit Exceeded",
        description: `Order total is ${formatPrice(totalPaise)}, which is higher than your configured AI spend limit of ${formatPrice(wallet?.spend_limit_paise || 200000)}.`,
      })
      return
    }

    // Wallet Balance Check
    if (totalPaise > (wallet?.wallet_balance_paise || 0)) {
      const shortfall = totalPaise - (wallet?.wallet_balance_paise || 0)
      setRecoveryError({
        status: "insufficient_balance",
        title: "Insufficient Wallet Balance",
        description: `Order total is ${formatPrice(totalPaise)}, but your available wallet balance is ${formatPrice(wallet?.wallet_balance_paise || 0)}. Shortfall: ${formatPrice(shortfall)}.`,
        shortfall,
      })
      return
    }

    setIsPlacing(true)
    try {
      const result = await executeAutonomousWalletPurchase({
        customer_id: user.id,
        items: items.map((p) => ({
          id: p.id,
          quantity: 1,
        })),
        delivery_address: {
          full_name: name,
          phone,
          line1: addressLine,
          city,
          pincode: postalCode,
          state: "Karnataka",
          country: "India",
        },
        assistant: "store_agent",
      })

      if (!result.success) {
        setRecoveryError({
          status: result.status,
          title: "Order Authorization Notice",
          description: result.message,
        })
        return
      }

      setPlacedOrderDetails(result)
      setPlacedOrder(result.order)
      clearCart()
      toast.success(`Order ${result.order_id} confirmed!`, {
        description: `Settled autonomously via Razent Wallet. ETA: 10-15 mins.`,
      })
      if (onOrderPlaced && result.order_id) {
        onOrderPlaced(result.order_id)
      }
    } catch (err: any) {
      console.error("[AICheckoutCard] error placing order:", err)
      toast.error(err?.message || "Failed to place order. Please try again.")
    } finally {
      setIsPlacing(false)
    }
  }

  // 1. CONFIRMED ORDER VIEW
  if (placedOrder && placedOrderDetails) {
    return (
      <Card className="w-full border-border bg-card shadow-sm">
        <CardHeader className="pb-3 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Order Confirmed & Settled via Wallet!
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Order ID: <span className="font-mono font-semibold text-foreground">{placedOrderDetails.order_id}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-3 text-xs">
          <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items:</span>
              <span className="font-medium text-foreground">{items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-semibold text-foreground">{formatPrice(totalPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Wallet Balance:</span>
              <span className="font-semibold text-primary">{formatPrice(placedOrderDetails.balance_remaining_paise || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Settlement Rail:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Razent Wallet (NPCI e-Mandate)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Address:</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{city}, {postalCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Delivery:</span>
              <span className="font-medium text-foreground">10-15 mins (Express Delivery)</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center gap-2 pt-0">
          <Button
            size="sm"
            className="flex-1 text-xs font-semibold"
            onClick={() => {
              if (onOpenTrackOrder && placedOrderDetails.order_id) {
                onOpenTrackOrder(placedOrderDetails.order_id)
              } else {
                window.location.href = `/?track=${placedOrderDetails.order_id}`
              }
            }}
          >
            <PackageCheck className="size-3.5 mr-1" />
            Track Live Delivery
          </Button>

          {placedOrderDetails.invoice_url && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => window.open(placedOrderDetails.invoice_url, "_blank")}
            >
              <ExternalLink className="size-3.5 mr-1" />
              Invoice
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  // 2. CHECKOUT PREPARATION VIEW
  return (
    <Card className="w-full border-border bg-card shadow-sm">
      <CardHeader className="pb-3 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Autonomous Order Checkout
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Settles directly from your Razent Wallet
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-foreground border-border gap-1">
            <Wallet className="size-3 text-primary" />
            {formatPrice(wallet?.wallet_balance_paise || 0)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pb-3 text-xs">
        {/* Selected Items */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Selected Items ({items.length})
          </p>
          {items.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="size-7 rounded object-cover shrink-0" />
                ) : (
                  <div className="size-7 rounded bg-muted flex items-center justify-center shrink-0">
                    <PackageCheck className="size-3.5 text-muted-foreground" />
                  </div>
                )}
                <span className="truncate font-medium text-foreground">{p.title}</span>
              </div>
              <span className="font-semibold text-foreground shrink-0">
                {formatPrice(p.price_paise, p.currency)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 font-semibold text-foreground">
            <span>Total Payable:</span>
            <span className="text-foreground text-sm font-bold">{formatPrice(totalPaise)}</span>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <MapPin className="size-3.5 text-foreground" />
              Delivery Address
            </span>
            <button
              type="button"
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="text-[11px] text-foreground underline underline-offset-2 font-medium"
            >
              {isEditingAddress ? "Done" : "Change"}
            </button>
          </div>
          {isEditingAddress || !addressLine.trim() ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Street address (e.g. House/Flat No, Area)"
                className="h-7 text-xs"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="h-7 text-xs"
                />
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="PIN Code"
                  className="h-7 text-xs"
                />
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="h-7 text-xs"
              />
            </div>
          ) : (
            <p className="font-medium text-foreground">
              {addressLine}{city ? `, ${city}` : ""}{postalCode ? ` - ${postalCode}` : ""} ({phone})
            </p>
          )}
        </div>

        {/* BALISE UX RECOVERY BOX (Whenever limits or balance are exceeded) */}
        {recoveryError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive text-[11px]">{recoveryError.title}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
                  {recoveryError.description}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-destructive/20 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] font-semibold"
                onClick={() => navigate("/wallet")}
              >
                Update Spend Limit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] font-semibold"
                onClick={() => navigate("/wallet")}
              >
                Add Money to Wallet
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-[11px] font-semibold"
                onClick={() => navigate("/checkout")}
              >
                Pay at Checkout Manual
              </Button>
            </div>
          </div>
        )}

        {/* Unauthenticated State */}
        {!isSignedIn && (
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" />
              <span>Sign in required for autonomous order execution.</span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs font-semibold"
              onClick={() => navigate("/login?redirect_url=/assistant")}
            >
              Sign In
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        <Button
          type="button"
          className="w-full text-xs font-semibold h-9 gap-1.5"
          onClick={handleConfirmOrder}
          disabled={isPlacing || isWalletLoading || items.length === 0}
        >
          {isPlacing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Debiting Wallet & Confirming Order...
            </>
          ) : (
            <>
              <Wallet className="size-3.5" />
              Pay {formatPrice(totalPaise)} with Razent Wallet
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
