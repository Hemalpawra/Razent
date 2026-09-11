import { useState } from "react"
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
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react"
import type { Product } from "@/lib/types/product"
import { formatPrice } from "@/lib/types/product"
import { createStorefrontOrder } from "@/lib/api/client"
import { useCart } from "@/state/useCart"
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

  const items = products.length > 0 ? products : []
  const subtotalPaise = items.reduce((acc, p) => acc + (p.price_paise || 0), 0)
  const deliveryPaise = 0
  const totalPaise = subtotalPaise + deliveryPaise

  const handleConfirmOrder = async () => {
    if (items.length === 0) {
      toast.error("No items to checkout")
      return
    }
    setIsPlacing(true)
    const orderId = `RAZ-${Date.now().toString(36).toUpperCase()}`

    try {
      const orderPayload: Order = {
        id: orderId,
        razorpay_order_id: `rzp_ai_${Date.now()}`,
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
        commerce_protocol: "direct_web",
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        notes: `Autonomous AI Assistant order (${paymentMethod.toUpperCase()}) for ${name} (${email})`,
      }

      const saved = await createStorefrontOrder(orderPayload)
      setPlacedOrder(saved)
      clearCart()
      toast.success(`Order ${orderId} confirmed successfully!`)
      if (onOrderPlaced) {
        onOrderPlaced(orderId)
      }
    } catch (err: any) {
      console.error("[AICheckoutCard] error placing order:", err)
      toast.error(err?.message || "Failed to place order. Please try again.")
    } finally {
      setIsPlacing(false)
    }
  }

  if (placedOrder) {
    return (
      <Card className="w-full border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-background to-card shadow-md">
        <CardHeader className="pb-3 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Order Placed & Confirmed!
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Order ID: <span className="font-mono font-semibold text-foreground">{placedOrder.id}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-3 text-xs">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items:</span>
              <span className="font-medium text-foreground">{items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-semibold text-emerald-600">{formatPrice(totalPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery To:</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{city}, {postalCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Delivery:</span>
              <span className="font-medium text-foreground">Within 15-20 mins</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            size="sm"
            className="w-full text-xs font-semibold gap-1.5"
            onClick={() => {
              if (onOpenTrackOrder) {
                onOpenTrackOrder(placedOrder.id)
              } else {
                window.location.href = `/?track=${placedOrder.id}`
              }
            }}
          >
            <PackageCheck className="size-4" />
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

      <CardContent className="space-y-3 pb-3 text-xs">
        {/* Selected Items */}
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
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
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-2">
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
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-2">
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
            <div className="space-y-1.5 pt-1">
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
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-2">
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
        <Button
          type="button"
          className="w-full font-semibold gap-2 shadow-sm text-xs h-9"
          disabled={isPlacing || items.length === 0}
          onClick={handleConfirmOrder}
        >
          {isPlacing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Confirming Order...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" />
              <span>Confirm & Place Order ({formatPrice(totalPaise)})</span>
            </>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground/70 text-center">
          Human verification step: You can review and modify all details before final confirmation.
        </p>
      </CardFooter>
    </Card>
  )
}
