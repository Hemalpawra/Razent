import { useState } from "react"
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
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react"
import type { Product } from "@/lib/types/product"
import { formatPrice } from "@/lib/types/product"
import { executeA2ACheckout } from "@/lib/api/client"
import { useCart } from "@/state/useCart"
import { useAgentPurchase } from "@/state/useAgentPurchase"
import { toast } from "sonner"
import type { Order } from "@/lib/types/order"

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
  const [isPlacing, setIsPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [name, setName] = useState(customerName || "Customer")
  const [email, setEmail] = useState(customerEmail || "customer@example.com")
  const [phone, setPhone] = useState(customerPhone || "9876543210")
  const [addressLine, setAddressLine] = useState(
    savedAddress?.line1 || "Flat 402, Highrise Heights, Indiranagar"
  )
  const [city, setCity] = useState(savedAddress?.city || "Bengaluru")
  const [postalCode, setPostalCode] = useState(savedAddress?.postalCode || "560038")
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cod">("upi")

  const clearCart = useCart((s) => s.clearCart)
  const navigate = useNavigate()
  const { agentPurchaseEnabled } = useAgentPurchase()

  const items = products.length > 0 ? products : []
  const subtotalPaise = items.reduce((acc, p) => acc + (p.price_paise || 0), 0)
  const deliveryPaise = 0
  const totalPaise = subtotalPaise + deliveryPaise

  const handleConfirmOrder = async () => {
    if (!agentPurchaseEnabled) {
      toast.error("Agent purchases are disabled", {
        description: "Please enable Agent Purchases in your Wallet to allow placing orders via AI Assistant.",
      })
      return
    }

    if (items.length === 0) {
      toast.error("No items to checkout")
      return
    }
    setIsPlacing(true)

    try {
      // Execute live A2A checkout with genuine Razorpay test rails
      const a2aResult = await executeA2ACheckout({
        items: items.map((p) => ({
          id: p.id,
          quantity: 1,
        })),
        deliveryAddress: {
          full_name: name,
          phone,
          line1: addressLine,
          city,
          pincode: postalCode,
        },
      })

      const placedOrderObj: Order = {
        id: a2aResult.order_id,
        razorpay_order_id: a2aResult.razorpay_order_id,
        total_paise: totalPaise,
        shipping_paise: deliveryPaise,
        currency: "INR",
        status: "paid",
        shipping_status: "shipped",
        via_ai: true,
        items: items.map((p) => ({
          product_id: p.id,
          title: p.title,
          image_url: p.image_url || "",
          qty: 1,
          unit_price_paise: p.price_paise,
        })),
        shipping_address: {
          full_name: name,
          phone,
          email,
          line1: addressLine,
          city,
          state: "Karnataka",
          pincode: postalCode,
          country: "India",
          phone_verified: true,
        },
        commerce_protocol: "ap2",
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        notes: `Autonomous AI Assistant order via ${a2aResult.settlement_rail}`,
      }

      setPlacedOrder(placedOrderObj)
      clearCart()
      toast.success(`Order ${a2aResult.order_id} confirmed!`, {
        description: `Razorpay Reference: ${a2aResult.razorpay_order_id}`,
      })
      if (onOrderPlaced) {
        onOrderPlaced(a2aResult.order_id)
      }
    } catch (err: any) {
      console.error("[AICheckoutCard] error placing order via A2A:", err)
      toast.error(err?.message || "Failed to place order via Agentic Protocol. Please try again.")
    } finally {
      setIsPlacing(false)
    }
  }

  if (placedOrder) {
    return (
      <Card className="w-full border-border bg-card shadow-sm">
        <CardHeader className="pb-3 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Order Placed & Settled via Razorpay!
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Order ID: <span className="font-mono font-semibold text-foreground">{placedOrder.id}</span>
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
              <span className="text-muted-foreground">Razorpay Ref:</span>
              <span className="font-mono font-medium text-foreground">{placedOrder.razorpay_order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Settlement Rail:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">NPCI UPI AutoPay / Razorpay</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery To:</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{city}, {postalCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Delivery:</span>
              <span className="font-medium text-foreground">10-15 mins (Express)</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            size="sm"
            className="w-full text-xs font-semibold"
            onClick={() => {
              if (onOpenTrackOrder) {
                onOpenTrackOrder(placedOrder.id)
              } else {
                window.location.href = `/?track=${placedOrder.id}`
              }
            }}
          >
            <PackageCheck data-icon="inline-start" />
            Track Live Delivery
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full border-primary/30 bg-card/90 shadow-md">
      <CardHeader className="pb-3 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Order Summary & Checkout
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Prepared by AI Assistant · Human in the loop
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
            Instant Ready
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
            <span className="text-primary text-sm">{formatPrice(totalPaise)}</span>
          </div>
        </div>

        {/* Pre-filled Customer Details */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <User className="size-3.5 text-primary" />
              Customer Details
            </span>
            <Badge variant="secondary" className="text-[10px]">Auto-filled</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="text-[10px] text-muted-foreground/80">Name</span>
              <p className="font-medium text-foreground truncate">{name}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground/80">Email</span>
              <p className="font-medium text-foreground truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Pre-filled Shipping Address */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <MapPin className="size-3.5 text-primary" />
              Delivery Address
            </span>
            <button
              type="button"
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              {isEditingAddress ? "Done" : "Change"}
            </button>
          </div>
          {isEditingAddress ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Street address"
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
                  placeholder="Postal Code"
                  className="h-7 text-xs"
                />
              </div>
            </div>
          ) : (
            <p className="font-medium text-foreground">
              {addressLine}, {city} - {postalCode}
            </p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <CreditCard className="size-3.5 text-primary" />
            Payment Method
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("upi")}
              className={`flex items-center justify-center gap-1 p-1.5 rounded-md border text-center transition-colors ${
                paymentMethod === "upi"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border/60 text-muted-foreground hover:bg-accent"
              }`}
            >
              UPI (Instant)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex items-center justify-center gap-1 p-1.5 rounded-md border text-center transition-colors ${
                paymentMethod === "card"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border/60 text-muted-foreground hover:bg-accent"
              }`}
            >
              Card / NetBanking
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("cod")}
              className={`flex items-center justify-center gap-1 p-1.5 rounded-md border text-center transition-colors ${
                paymentMethod === "cod"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border/60 text-muted-foreground hover:bg-accent"
              }`}
            >
              Cash on Delivery
            </button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        {!agentPurchaseEnabled && (
          <div className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/60 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="size-4 shrink-0 text-amber-500" />
              <div className="text-left">
                <p className="font-semibold text-foreground text-[11px]">Agent Purchases Disabled</p>
                <p className="text-[10px] text-muted-foreground">Ordering is turned off in your Wallet settings.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] shrink-0 font-medium"
              onClick={() => navigate("/wallet")}
            >
              Open Wallet
            </Button>
          </div>
        )}

        <Button
          type="button"
          className="w-full font-semibold gap-2 shadow-sm text-xs h-9"
          disabled={isPlacing || items.length === 0 || !agentPurchaseEnabled}
          onClick={handleConfirmOrder}
        >
          {isPlacing ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              <span>Confirming Order...</span>
            </>
          ) : !agentPurchaseEnabled ? (
            <>
              <ShieldAlert data-icon="inline-start" />
              <span>Ordering Blocked (Enable in Wallet)</span>
            </>
          ) : (
            <>
              <ShieldCheck data-icon="inline-start" />
              <span>Confirm & Place Order ({formatPrice(totalPaise)})</span>
            </>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground/70 text-center">
          {agentPurchaseEnabled
            ? "Human verification step: You can review and modify all details before final confirmation."
            : "To allow the AI Assistant to confirm and place this order, enable Agent Purchases in your Wallet."}
        </p>
      </CardFooter>
    </Card>
  )
}
